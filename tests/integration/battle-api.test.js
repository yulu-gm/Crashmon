import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createApp } from '../../app/server.js';

async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), 'crashmon-battle-')); let time = Date.now(); let app, base;
  const start = async () => {
    app = createApp({ databasePath: join(dir, 'isolated.sqlite'), now: () => time });
    await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve)); base = `http://127.0.0.1:${app.server.address().port}`; app.setOrigin(base);
  };
  await start(); t.after(async () => { await app.close(); await rm(dir, { recursive: true, force: true }); });
  const user = (name = 'battle_player', starter = 'starter_a') => {
    app.store.register(name, 'unused-test-hash', app.store.createInvite().token);
    const id = app.store.account(name).id; const cookie = `crashmon_session=${app.store.createSession(id)}`;
    app.store.claimStarter(id, { definitionId: starter, requestId: randomUUID() }); return { id, cookie };
  };
  const call = async (u, path, body, method = body === undefined ? 'GET' : 'POST') => {
    const res = await fetch(base + path, { method, headers: { Origin: base, 'Content-Type': 'application/json', 'X-Crashmon-Request': '1', 'X-Crashmon-Player': u.id, Cookie: u.cookie }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, data: await res.json() };
  };
  const ok = async (...args) => { const r = await call(...args); assert.equal(r.status, 200, JSON.stringify(r.data)); return r.data; };
  const begin = (u, encounterId = 'b0_tutorial_scout') => ok(u, '/api/battle/start', { encounterId, requestId: randomUUID() });
  const body = (battle, command) => ({ battleId: battle.id, revision: battle.revision, actionId: battle.actionId, command, requestId: randomUUID() });
  const act = (u, battle, command) => ok(u, '/api/battle/action', body(battle, command));
  const tutorial = async (u, encounter) => {
    let result = await begin(u, encounter);
    for (let i = 0; i < 12; i++) {
      const target = result.battle.units.find(p => p.side === 'enemy' && p.hp > 0);
      const capture = target.hp <= target.maxHp / 2;
      result = await act(u, result.battle, { type: capture ? 'capture' : 'basic', targetId: target.id });
      if (capture) { assert.equal(result.battle.phase, 'finished'); assert.equal(result.player.pets.length, 2); return result; }
    }
    assert.fail('教学没有可捕获机会');
  };
  return { user, call, ok, begin, body, act, tutorial, get app() { return app; }, advanceTime(ms) { time += ms; }, restart: async () => { await app.close(); await start(); } };
}

test('三初始与两野生的六条教学路径可捕获，教学资格唯一且无正式球消耗', async t => {
  const f = await fixture(t);
  for (const starter of ['starter_a', 'starter_b', 'starter_c']) for (const encounter of ['b0_tutorial_scout', 'b0_tutorial_shell']) {
    const u = f.user(`${starter}_${encounter}`, starter); const result = await f.tutorial(u, encounter);
    assert.equal(result.player.tutorialCompleted, true); assert.equal(result.player.inventory.captureBall, 0);
    assert.equal(result.player.team.length, 2);
    assert.equal((await f.call(u, '/api/battle/start', { encounterId: encounter, requestId: randomUUID() })).status, 409);
  }
});

test('战斗API拒绝越权、重复开场、旧机会和非法命令，重试回执跨重启不变', async t => {
  const f = await fixture(t); const a = f.user(), b = f.user('battle_other');
  const initial = await f.begin(a);
  assert.equal((await f.call(a, '/api/battle/start', { encounterId: 'b0_tutorial_shell', requestId: randomUUID() })).status, 409);
  const targetId = initial.battle.units.find(u => u.side === 'enemy').id;
  const command = f.body(initial.battle, { type: 'basic', targetId });
  assert.equal((await f.call(b, '/api/battle/action', command)).status, 404);
  assert.equal((await f.call(a, '/api/battle/action', { ...command, command: { type: 'capture', targetId } })).status, 400);
  assert.deepEqual((await f.ok(a, '/api/battle')).battle, initial.battle);
  const first = await f.ok(a, '/api/battle/action', command);
  assert.deepEqual(await f.ok(a, '/api/battle/action', command), first);
  assert.equal((await f.call(a, '/api/battle/action', { ...command, requestId: randomUUID() })).status, 409);
  assert.equal((await f.call(a, '/api/battle/action', { ...command, command: { type: 'defend' } })).status, 409);
  await f.restart(); assert.deepEqual(await f.ok(a, '/api/battle'), first);
  assert.deepEqual(await f.ok(a, '/api/battle/action', command), first);
});

test('捕获、结算和请求回执故障整体回滚，重试只发一个永久实例', async t => {
  const f = await fixture(t); const u = f.user(); let current = await f.begin(u);
  while (true) {
    const target = current.battle.units.find(p => p.side === 'enemy');
    if (target.hp <= target.maxHp / 2) break;
    current = await f.act(u, current.battle, { type: 'basic', targetId: target.id });
  }
  const body = f.body(current.battle, { type: 'capture', targetId: current.battle.units.find(p => p.side === 'enemy').id });
  for (const table of ['battle_captures', 'battle_settlements', 'battle_receipts']) {
    f.app.store.db.exec(`CREATE TRIGGER injected_failure BEFORE INSERT ON ${table} BEGIN SELECT RAISE(ABORT, 'injected'); END;`);
    assert.equal((await f.call(u, '/api/battle/action', body)).status, 500);
    f.app.store.db.exec('DROP TRIGGER injected_failure');
    const rolledBack = await f.ok(u, '/api/battle');
    assert.equal(rolledBack.battle.suspended, true);
    rolledBack.battle.suspended = false;
    assert.deepEqual(rolledBack, current);
    assert.equal(f.app.store.db.prepare('SELECT count(*) AS n FROM battle_captures').get().n, 0);
  }
  const captured = await f.ok(u, '/api/battle/action', body);
  assert.equal(captured.player.pets.length, 2);
  assert.deepEqual(await f.ok(u, '/api/battle/action', body), captured);
  await f.restart(); assert.deepEqual((await f.ok(u, '/api/battle')).player, captured.player);
});

test('队伍1–4且必须持有；一次补给不能重复领；24小时读取不续期并解除占用', async t => {
  const f = await fixture(t); const u = f.user(), other = f.user('foreign_pet');
  const supply = { requestId: randomUUID() }; const stocked = await f.ok(u, '/api/supplies', supply);
  assert.deepEqual(stocked.player.inventory, { captureBall: 10, potion: 3 });
  assert.deepEqual(await f.ok(u, '/api/supplies', supply), stocked);
  assert.equal((await f.call(u, '/api/supplies', { requestId: randomUUID() })).status, 409);
  const own = stocked.player.pets[0].id; const foreign = f.app.store.player(other.id).pets[0].id;
  for (const petIds of [[], [own, own], [foreign], [own, 'a', 'b', 'c', 'd']]) assert.equal((await f.call(u, '/api/team', { petIds, revision: stocked.player.revision, requestId: randomUUID() }, 'PATCH')).status, 400);
  const battle = await f.begin(u); const deadline = battle.battle.expiresAt;
  f.advanceTime(23 * 3600000);
  assert.equal((await f.ok(u, '/api/battle')).battle.expiresAt, deadline);
  f.advanceTime(3600000); // 上一次读操作保持登录会话有效，但不能延长战斗期限。
  const abandoned = await f.ok(u, '/api/battle'); assert.equal(abandoned.battle.outcome, 'abandoned');
  assert.equal(abandoned.player.inventory.captureBall, 10);
  await f.begin(u);
});

test('版本缺失安全挂起、恢复冻结期限；技术写入失败期间读状态不会恢复计时', async t => {
  const f = await fixture(t); const u = f.user(); const initial = await f.begin(u);
  const db = f.app.store.db; const battleId = initial.battle.id;
  db.prepare('UPDATE battles SET rules_version = ? WHERE id = ?').run('missing-rules', battleId);
  const suspended = await f.ok(u, '/api/battle'); assert.equal(suspended.battle.suspended, true);
  assert.equal(suspended.battle.rng, undefined);
  f.advanceTime(25 * 3600000);
  // 长期离线后重新认证，仅换会话，不影响战斗。
  u.cookie = `crashmon_session=${f.app.store.createSession(u.id)}`;
  assert.equal((await f.ok(u, '/api/battle')).battle.phase, 'awaiting');
  db.prepare('UPDATE battles SET rules_version = ? WHERE id = ?').run('B0-C1', battleId);
  const targetId = initial.battle.units.find(x => x.side === 'enemy').id;
  const body = f.body(initial.battle, { type: 'basic', targetId });
  db.exec("CREATE TRIGGER fail_battle_receipt BEFORE INSERT ON battle_receipts BEGIN SELECT RAISE(ABORT, 'injected'); END;");
  assert.equal((await f.call(u, '/api/battle/action', body)).status, 500);
  db.exec('DROP TRIGGER fail_battle_receipt');
  const failed = await f.ok(u, '/api/battle'); assert.equal(failed.battle.suspended, true);
  assert.equal(failed.battle.expiresAt, initial.battle.expiresAt + 25 * 3600000);
  f.advanceTime(25 * 3600000); u.cookie = `crashmon_session=${f.app.store.createSession(u.id)}`;
  assert.equal((await f.ok(u, '/api/battle')).battle.suspended, true);
  const recovered = await f.ok(u, '/api/battle/action', body);
  assert.equal(recovered.battle.suspended, false); assert.equal(recovered.battle.phase, 'awaiting');
  assert.equal(recovered.battle.expiresAt, initial.battle.expiresAt + 50 * 3600000);
});

test('满四队伍的普通捕获留在持有列表，撤退保留捕获和扣球，回执重试优先于期限', async t => {
  const f = await fixture(t); const u = f.user(); await f.tutorial(u, 'b0_tutorial_scout');
  const db = f.app.store.db;
  // 隔离夹具补足四个实例，不为应用增加发宠接口。
  for (const [index, definition] of [[2, 'starter_b'], [3, 'starter_c']]) db.prepare('INSERT INTO pet_instances VALUES (?,?,?,?,?,?,?)').run(randomUUID(), u.id, definition, index, Date.now(), index, 0);
  await f.ok(u, '/api/supplies', { requestId: randomUUID() });
  let current = await f.begin(u, 'b0_pair_shell');
  // 固定隔离存档随机源、敌方生命，使一次普通捕捉成功且另一敌人留场。
  const raw = JSON.parse(db.prepare('SELECT state FROM battles WHERE id = ?').get(current.battle.id).state);
  raw.rng = 1; raw.units.filter(x => x.side === 'enemy').forEach(x => { x.hp = 1; });
  db.prepare('UPDATE battles SET state = ? WHERE id = ?').run(JSON.stringify(raw), raw.id);
  current = await f.ok(u, '/api/battle');
  const command = f.body(current.battle, { type: 'capture', targetId: current.battle.units.find(x => x.side === 'enemy').id });
  const captured = await f.ok(u, '/api/battle/action', command);
  assert.equal(captured.player.pets.length, 5); assert.equal(captured.player.team.length, 4);
  assert.equal(captured.player.pets.filter(x => x.teamPosition === null).length, 1);
  assert.equal(captured.player.inventory.captureBall, 9);
  assert.equal(captured.battle.units.filter(x => x.side === 'player').length, 4);
  f.advanceTime(25 * 3600000); u.cookie = `crashmon_session=${f.app.store.createSession(u.id)}`;
  assert.deepEqual(await f.ok(u, '/api/battle/action', command), captured);
  assert.equal(db.prepare('SELECT status FROM battles WHERE id = ?').get(raw.id).status, 'active');
  const expired = await f.ok(u, '/api/battle'); assert.equal(expired.battle.outcome, 'abandoned');
  assert.equal(expired.player.pets.length, 5); assert.equal(expired.player.inventory.captureBall, 9);
});

test('普通胜利补球与首领首胜经验仅结算一次，失败结算不半发奖励', async t => {
  const f = await fixture(t); const u = f.user(); await f.tutorial(u, 'b0_tutorial_scout');
  const db = f.app.store.db;
  let priorExp = f.app.store.player(u.id).pets.map(p => p.experience);
  for (const [index, encounterId, expectedExperience] of [[0, 'b0_pair_scout', 10], [1, 'b0_scrap_boss', 50], [2, 'b0_scrap_boss', 30]]) {
    let current = await f.begin(u, encounterId);
    const raw = JSON.parse(db.prepare('SELECT state FROM battles WHERE id = ?').get(current.battle.id).state);
    const enemies = raw.units.filter(x => x.side === 'enemy');
    enemies.forEach((x, i) => { x.hp = i === 0 ? 1 : 0; x.statuses = []; x.shield = null; });
    db.prepare('UPDATE battles SET state = ? WHERE id = ?').run(JSON.stringify(raw), raw.id);
    current = await f.ok(u, '/api/battle');
    const body = f.body(current.battle, { type: 'basic', targetId: enemies[0].id });
    db.exec("CREATE TRIGGER fail_final_receipt BEFORE INSERT ON battle_receipts BEGIN SELECT RAISE(ABORT, 'injected'); END;");
    assert.equal((await f.call(u, '/api/battle/action', body)).status, 500);
    db.exec('DROP TRIGGER fail_final_receipt');
    assert.equal(f.app.store.player(u.id).inventory.captureBall, index);
    assert.deepEqual(f.app.store.player(u.id).pets.map(p => p.experience), priorExp);
    const won = await f.ok(u, '/api/battle/action', body);
    assert.equal(won.battle.outcome, 'victory'); assert.equal(won.player.inventory.captureBall, index + 1);
    assert.deepEqual(won.player.pets.map(p => p.experience), priorExp.map(n => n + expectedExperience));
    assert.deepEqual(await f.ok(u, '/api/battle/action', body), won);
    priorExp = won.player.pets.map(p => p.experience);
  }
  assert.equal(db.prepare("SELECT count(*) AS n FROM battle_first_wins WHERE encounter_id = 'b0_scrap_boss'").get().n, 1);
});

test('已开战内容快照损坏时使用安全展示缓存并冻结，恢复内容后继续同一机会', async t => {
  const f = await fixture(t); const u = f.user(); const initial = await f.begin(u);
  const db = f.app.store.db; const id = initial.battle.id;
  const saved = db.prepare('SELECT catalog FROM battles WHERE id = ?').get(id).catalog;
  db.prepare('UPDATE battles SET catalog = ? WHERE id = ?').run('{}', id);
  const safelyShown = await f.ok(u, '/api/battle'); assert.equal(safelyShown.battle.suspended, true);
  assert.equal(safelyShown.battle.rng, undefined); assert.deepEqual(safelyShown.battle.units, initial.battle.units);
  const suspendedAt = db.prepare('SELECT suspended_at FROM battles WHERE id = ?').get(id).suspended_at;
  const body = f.body(initial.battle, { type: 'basic', targetId: initial.battle.units.find(x => x.side === 'enemy').id });
  f.advanceTime(3600000);
  assert.equal((await f.call(u, '/api/battle/action', body)).status, 500);
  assert.equal(db.prepare('SELECT suspended_at FROM battles WHERE id = ?').get(id).suspended_at, suspendedAt);
  db.prepare('UPDATE battles SET catalog = ? WHERE id = ?').run(saved, id);
  const resumed = await f.ok(u, '/api/battle/action', body); assert.equal(resumed.battle.suspended, false);
  assert.equal(resumed.battle.revision, initial.battle.revision + 1);
});

test('主动放弃与到期放弃统一清理行动者、护盾和状态，最终生命与消耗保留且重启一致', async t => {
  const f = await fixture(t);
  for (const mode of ['manual', 'timeout']) {
    const u = f.user(`abandon_${mode}`, 'starter_b'); const initial = await f.begin(u);
    const db = f.app.store.db;
    const raw = JSON.parse(db.prepare('SELECT state FROM battles WHERE id = ?').get(initial.battle.id).state);
    raw.units.forEach((unit, index) => {
      unit.hp = unit.maxHp - 10;
      unit.statuses = [{ id: 'atkUp', remaining: 2, instance: index + 10, amount: 0.2 }];
      unit.shield = { amount: 30, remaining: 2, instance: index + 20 };
    });
    raw.turnStatusIds = [10, 20];
    db.prepare('UPDATE battles SET state = ? WHERE id = ?').run(JSON.stringify(raw), raw.id);
    let result;
    if (mode === 'manual') result = await f.ok(u, '/api/battle/abandon', { battleId: raw.id, revision: initial.battle.revision, requestId: randomUUID() });
    else {
      f.advanceTime(24 * 3600000); u.cookie = `crashmon_session=${f.app.store.createSession(u.id)}`;
      result = await f.ok(u, '/api/battle');
    }
    assert.equal(result.battle.outcome, 'abandoned'); assert.equal(result.battle.currentActorId, null); assert.equal(result.battle.actionId, null);
    assert.deepEqual(result.battle.units.map(unit => unit.hp), raw.units.map(unit => unit.hp));
    assert.ok(result.battle.units.every(unit => unit.shield === null && unit.statuses.length === 0));
    assert.deepEqual(result.battle.inventory, raw.inventory); assert.deepEqual(result.battle.timeline, []);
    const saved = JSON.parse(db.prepare('SELECT state FROM battles WHERE id = ?').get(raw.id).state);
    assert.deepEqual(saved.turnStatusIds, []);
    await f.restart(); assert.deepEqual(await f.ok(u, '/api/battle'), result);
  }
});
