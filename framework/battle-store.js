import { randomUUID, randomBytes } from 'node:crypto';
import { HttpError, fields } from './auth.js';
import { createBattle, advanceBattle, applyCommand, projectBattle, abandonBattle, BattleError } from './battle.js';

const DAY = 86400000;
const CAPACITY = 20;
const RULES = 'B0-C1';
const requestId = value => {
  if (typeof value !== 'string' || !/^[\w-]{16,80}$/.test(value)) throw new HttpError(400, '请求编号无效。');
};

// 内容由 app 注入，存档层不导入任何具体宠物或遭遇。
export function createBattleStore({ store, catalog, encounters, now = Date.now }) {
  const { db, transaction } = store;
  db.exec(`
    CREATE TABLE IF NOT EXISTS battles (
      id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES accounts(id), status TEXT NOT NULL,
      revision INTEGER NOT NULL, action_id TEXT, state TEXT NOT NULL, catalog TEXT NOT NULL,
      rules_version TEXT NOT NULL, deadline INTEGER NOT NULL, suspended_at INTEGER,
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    ) STRICT;
    CREATE UNIQUE INDEX IF NOT EXISTS one_active_battle ON battles(owner_id) WHERE status = 'active';
    CREATE TABLE IF NOT EXISTS battle_receipts (
      owner_id TEXT NOT NULL REFERENCES accounts(id), request_id TEXT NOT NULL, payload TEXT NOT NULL,
      result TEXT NOT NULL, PRIMARY KEY(owner_id, request_id)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS battle_captures (
      battle_id TEXT NOT NULL REFERENCES battles(id), target_id TEXT NOT NULL,
      pet_id TEXT NOT NULL UNIQUE REFERENCES pet_instances(id), PRIMARY KEY(battle_id,target_id)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS battle_settlements (
      battle_id TEXT PRIMARY KEY REFERENCES battles(id), outcome TEXT NOT NULL, experience INTEGER NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS battle_first_wins (
      owner_id TEXT NOT NULL REFERENCES accounts(id), encounter_id TEXT NOT NULL, round TEXT NOT NULL,
      battle_id TEXT NOT NULL REFERENCES battles(id), PRIMARY KEY(owner_id,encounter_id,round)
    ) STRICT;
  `);
  const assets = id => {
    db.prepare('INSERT OR IGNORE INTO battle_accounts(user_id) VALUES (?)').run(id);
    return store.player(id);
  };
  const bump = id => db.prepare('UPDATE players SET revision = revision + 1, updated_at = ? WHERE user_id = ?').run(now(), id);
  const latest = id => db.prepare("SELECT * FROM battles WHERE owner_id = ? ORDER BY status = 'active' DESC, created_at DESC, rowid DESC LIMIT 1").get(id);
  const project = (state, definitions) => {
    for (const unit of state.units) if (!definitions[unit.speciesId]?.stats || !definitions[unit.speciesId]?.basic) throw new BattleError('missing_content', '本场内容快照不完整。');
    return projectBattle(state, definitions);
  };
  const view = row => {
    if (!row) return null;
    const state = JSON.parse(row.state);
    const result = row.rules_version === RULES && row.suspended_at === null ? project(state, JSON.parse(row.catalog)) : (state.publicView ?? { id: row.id, phase: 'suspended', units: [], events: [] });
    delete result.publicView;
    return { ...result, revision: row.revision, actionId: row.action_id, expiresAt: row.deadline, suspended: row.suspended_at !== null, captureChances: Object.fromEntries(result.units.map(u => [u.id, u.captureChance ?? null])) };
  };
  const response = (id, row = latest(id)) => ({ battle: view(row), player: store.player(id) });
  const idempotent = (id, body, route, fn) => {
    requestId(body.requestId);
    const payload = JSON.stringify({ route, ...body });
    try { return transaction(() => {
      const receipt = db.prepare('SELECT * FROM battle_receipts WHERE owner_id = ? AND request_id = ?').get(id, body.requestId);
      if (receipt) {
        if (receipt.payload !== payload) throw new HttpError(409, '同一请求编号的内容已改变。');
        return JSON.parse(receipt.result);
      }
      const result = fn();
      db.prepare('INSERT INTO battle_receipts VALUES (?,?,?,?)').run(id, body.requestId, payload, JSON.stringify(result));
      return result;
    }); } catch (error) {
      if (!(error instanceof HttpError)) db.prepare("UPDATE battles SET suspended_at = coalesce(suspended_at, ?) WHERE owner_id = ? AND status = 'active'").run(now(), id);
      throw error;
    }
  };
  const settle = (id, row, state) => {
    if (state.phase !== 'finished' || db.prepare('SELECT 1 FROM battle_settlements WHERE battle_id = ?').get(row.id)) return;
    let experience = 0;
    let captureBall = 0;
    if (state.outcome === 'victory' && !state.encounter.tutorial) {
      experience = state.encounter.rewards?.experience ?? 0;
      captureBall = state.encounter.rewards?.captureBall ?? 0;
      db.prepare('UPDATE battle_accounts SET capture_ball = capture_ball + ? WHERE user_id = ?').run(captureBall, id);
      const first = db.prepare('INSERT OR IGNORE INTO battle_first_wins VALUES (?,?,?,?)').run(id, state.encounter.id, state.encounter.rewards?.round ?? RULES, row.id);
      if (first.changes) experience += state.encounter.rewards?.firstWinExperience ?? 0;
      for (const unit of state.units.filter(u => u.side === 'player')) db.prepare('UPDATE pet_instances SET experience = experience + ? WHERE id = ? AND owner_id = ?').run(experience, unit.id, id);
    }
    db.prepare('INSERT INTO battle_settlements VALUES (?,?,?)').run(row.id, state.outcome, experience);
    const occupied = new Set(db.prepare('SELECT active_position FROM pet_instances WHERE owner_id = ? AND active_position IS NOT NULL').all(id).map(p => p.active_position));
    for (const pet of db.prepare('SELECT pet_id FROM battle_captures WHERE battle_id = ? ORDER BY rowid').all(row.id)) {
      const slot = [0, 1, 2, 3].find(i => !occupied.has(i));
      if (slot === undefined) break;
      db.prepare('UPDATE pet_instances SET active_position = ? WHERE id = ? AND active_position IS NULL').run(slot, pet.pet_id); occupied.add(slot);
    }
    state.reward = { experiencePerParticipant: experience, captureBall };
  };
  const persist = (id, row, state, events, deadline = row.deadline) => {
    const before = JSON.parse(row.state);
    db.prepare('UPDATE battle_accounts SET capture_ball = capture_ball + ?, potion = potion + ? WHERE user_id = ?').run(state.inventory.captureBall - before.inventory.captureBall, state.inventory.potion - before.inventory.potion, id);
    for (const capture of state.captures) {
      if (db.prepare('SELECT 1 FROM battle_captures WHERE battle_id = ? AND target_id = ?').get(row.id, capture.targetId)) continue;
      if (db.prepare('SELECT count(*) AS n FROM pet_instances WHERE owner_id = ?').get(id).n >= CAPACITY) throw new HttpError(409, '持有列表已满。');
      const petId = randomUUID();
      const ordinal = db.prepare('SELECT coalesce(max(team_position),-1)+1 AS n FROM pet_instances WHERE owner_id = ?').get(id).n;
      db.prepare('INSERT INTO pet_instances(id,owner_id,definition_id,team_position,created_at) VALUES (?,?,?,?,?)').run(petId, id, capture.speciesId, ordinal, now());
      db.prepare('INSERT INTO battle_captures VALUES (?,?,?)').run(row.id, capture.targetId, petId);
      if (state.encounter.tutorial) db.prepare('UPDATE battle_accounts SET tutorial_completed = 1 WHERE user_id = ?').run(id);
    }
    settle(id, row, state);
    state.events = events;
    delete state.publicView;
    state.publicView = project(state, JSON.parse(row.catalog));
    db.prepare('UPDATE battles SET status = ?, revision = revision + 1, action_id = ?, state = ?, deadline = ?, updated_at = ? WHERE id = ?').run(state.phase === 'finished' ? 'finished' : 'active', state.phase === 'awaiting' ? randomUUID() : null, JSON.stringify(state), deadline, now(), row.id);
    bump(id);
    return db.prepare('SELECT * FROM battles WHERE id = ?').get(row.id);
  };
  const expire = (id, resume = false) => {
    let row = latest(id);
    if (row?.status === 'active' && row.rules_version !== RULES) {
      db.prepare('UPDATE battles SET suspended_at = coalesce(suspended_at, ?) WHERE id = ?').run(now(), row.id);
      return latest(id);
    }
    if (row?.status === 'active' && row.suspended_at !== null) {
      if (!resume) return row;
      project(JSON.parse(row.state), JSON.parse(row.catalog));
      db.prepare('UPDATE battles SET deadline = deadline + ?, suspended_at = NULL WHERE id = ?').run(now() - row.suspended_at, row.id); row = latest(id);
    }
    if (row?.status === 'active' && row.deadline <= now()) {
      const result = abandonBattle(JSON.parse(row.state), '战斗已超过 24 小时未操作，自动放弃。');
      row = persist(id, row, result.state, result.events);
    }
    return row;
  };
  const advance = (state, definitions, events) => {
    let count = 0;
    while (state.phase === 'ready' || (state.phase === 'awaiting' && state.units.find(u => u.id === state.currentActorId)?.side === 'enemy')) {
      if (++count > 1000) throw new Error('战斗自动步骤超过限制');
      const next = advanceBattle(state, definitions); state = next.state; events.push(...next.events);
    }
    return state;
  };
  const core = fn => {
    try { return fn(); } catch (error) { if (error instanceof BattleError && !['missing_content', 'invalid_content', 'invalid_resources'].includes(error.code)) throw new HttpError(400, error.message); throw error; }
  };
  return {
    get(id) {
      try { return transaction(() => response(id, expire(id))); }
      catch (error) {
        if (error instanceof HttpError) throw error;
        db.prepare("UPDATE battles SET suspended_at = coalesce(suspended_at, ?) WHERE owner_id = ? AND status = 'active'").run(now(), id);
        return response(id);
      }
    },
    supplies(id, body) {
      fields(body, ['requestId']);
      return idempotent(id, body, 'supplies', () => {
        const profile = assets(id);
        if (profile.suppliesClaimed) throw new HttpError(409, '本账号已领取一次性原型补给。');
        if (latest(id)?.status === 'active') throw new HttpError(409, '请结束当前战斗后领取补给。');
        db.prepare('UPDATE battle_accounts SET capture_ball = capture_ball + 10, potion = potion + 3, supplies_claimed = 1 WHERE user_id = ?').run(id); bump(id);
        return response(id);
      });
    },
    team(id, body) {
      fields(body, ['petIds', 'revision', 'requestId']);
      if (!Array.isArray(body.petIds) || body.petIds.length < 1 || body.petIds.length > 4 || new Set(body.petIds).size !== body.petIds.length || body.petIds.some(v => typeof v !== 'string') || !Number.isSafeInteger(body.revision)) throw new HttpError(400, '队伍必须包含 1–4 只不同的持有伙伴。');
      return idempotent(id, body, 'team', () => {
        const active = expire(id); const profile = assets(id);
        if (active?.status === 'active') throw new HttpError(409, '战斗进行中不能修改队伍。');
        if (profile.revision !== body.revision) throw new HttpError(409, '档案版本已变化，请刷新。');
        if (body.petIds.some(p => !profile.pets.some(owned => owned.id === p))) throw new HttpError(400, '队伍含有未持有的伙伴。');
        db.prepare('UPDATE pet_instances SET active_position = NULL WHERE owner_id = ?').run(id);
        body.petIds.forEach((pet, index) => db.prepare('UPDATE pet_instances SET active_position = ? WHERE id = ? AND owner_id = ?').run(index, pet, id)); bump(id);
        return response(id);
      });
    },
    start(id, body) {
      fields(body, ['encounterId', 'requestId']);
      return idempotent(id, body, 'start', () => core(() => {
        const active = expire(id); const profile = assets(id); const encounter = encounters[body.encounterId];
        if (!encounter || encounter.enabled === false) throw new HttpError(400, '没有这个遭遇。');
        if (active?.status === 'active') throw new HttpError(409, '请先完成当前战斗。');
        if (profile.onboarding !== 'starter_received' || profile.team.length < 1) throw new HttpError(409, '请先领取伙伴并配置队伍。');
        if (encounter.tutorial && profile.tutorialCompleted) throw new HttpError(409, '教学捕捉已经完成。');
        if (encounter.requiresTutorial && !profile.tutorialCompleted) throw new HttpError(409, '请先完成教学捕捉。');
        const battleId = randomUUID();
        let state = createBattle({ id: battleId, party: profile.pets.filter(p => p.teamPosition !== null).map(p => ({ id: p.id, speciesId: p.definitionId })), encounter, seed: randomBytes(4).readUInt32LE(), inventory: profile.inventory, capacityRemaining: CAPACITY - profile.pets.length }, catalog);
        db.prepare('INSERT INTO battles VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(battleId, id, 'active', -1, null, JSON.stringify(state), JSON.stringify(catalog), RULES, now() + DAY, null, now(), now());
        const row = db.prepare('SELECT * FROM battles WHERE id = ?').get(battleId); const events = [];
        state = advance(state, catalog, events);
        return response(id, persist(id, row, state, events));
      }));
    },
    action(id, body, abandon = false) {
      fields(body, abandon ? ['battleId', 'revision', 'requestId'] : ['battleId', 'revision', 'actionId', 'requestId', 'command']);
      if (typeof body.battleId !== 'string' || !Number.isSafeInteger(body.revision)) throw new HttpError(400, '战斗版本无效。');
      requestId(body.requestId);
      const prior = db.prepare('SELECT payload,result FROM battle_receipts WHERE owner_id = ? AND request_id = ?').get(id, body.requestId);
      if (prior) {
        if (prior.payload !== JSON.stringify({ route: abandon ? 'abandon' : 'action', ...body })) throw new HttpError(409, '同一请求编号的内容已改变。');
        return JSON.parse(prior.result);
      }
      // 到期状态独立提交，不会被随后对过期指令的拒绝回滚。
      try { transaction(() => expire(id, true)); } catch (error) {
        if (!(error instanceof HttpError)) db.prepare("UPDATE battles SET suspended_at = coalesce(suspended_at, ?) WHERE owner_id = ? AND status = 'active'").run(now(), id);
        throw error;
      }
      return idempotent(id, body, abandon ? 'abandon' : 'action', () => core(() => {
        const row = db.prepare('SELECT * FROM battles WHERE id = ? AND owner_id = ?').get(body.battleId, id);
        if (!row) throw new HttpError(404, '没有找到该战斗。');
        if (row.suspended_at !== null) throw new HttpError(409, '战斗暂时挂起，等待匹配规则版本恢复。');
        if (row.status !== 'active' || row.revision !== body.revision || (!abandon && row.action_id !== body.actionId)) throw new HttpError(409, '行动已经变化，请重新读取战斗。');
        let state = JSON.parse(row.state); const definitions = JSON.parse(row.catalog); let events = [];
        if (abandon) { const result = abandonBattle(state); state = result.state; events = result.events; }
        else {
          const result = applyCommand(state, body.command, definitions); state = result.state; events = result.events;
          state = advance(state, definitions, events);
        }
        return response(id, persist(id, row, state, events, now() + DAY));
      }));
    },
  };
}
