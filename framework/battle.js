// B0 权威战斗内核。无 I/O、无具体内容导入；随机游标与所有阶段均可 JSON 保存。
export class BattleError extends Error { constructor(code, message) { super(message); this.name = 'BattleError'; this.code = code; } }
const fail = (code, message) => { throw new BattleError(code, message); };
const copy = value => structuredClone(value);
const alive = unit => unit.hp > 0 && !unit.captured;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const EPS = 1e-7;
const modifiers = { atkUp: ['atk', 0.2], atkDown: ['atk', -0.2], defUp: ['def', 0.2], defDown: ['def', -0.2], haste: ['spd', 0.2], slow: ['spd', -0.2] };
function random(state) { let x = state.rng >>> 0; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; state.rng = x >>> 0; return state.rng / 4294967296; }
export function effectiveStats(unit) {
  const result = { ...unit.stats };
  for (const key of ['atk', 'def', 'spd']) {
    const sum = unit.statuses.reduce((n, s) => n + (modifiers[s.id]?.[0] === key ? (s.amount ?? modifiers[s.id][1]) : 0), 0);
    result[key] = Math.max(key === 'def' ? 0 : 1, Math.floor(unit.stats[key] * (1 + clamp(sum, -0.5, key === 'spd' ? 0.5 : 1))));
  }
  return result;
}
function elementMultiplier(attack, defense) {
  const ring = ['T1', 'T2', 'T3']; const a = ring.indexOf(attack), d = ring.indexOf(defense);
  return a < 0 || d < 0 || a === d ? 1 : (a + 1) % 3 === d ? 1.25 : 0.8;
}
export function calculateDamage(actor, target, effect, marked = false) {
  return Math.max(1, Math.floor(effectiveStats(actor).atk * effect.multiplier * 100 / (100 + effectiveStats(target).def) * elementMultiplier(effect.element, target.element) * (marked ? 1.25 : 1) * (target.statuses.some(s => s.id === 'defend') ? 0.5 : 1)));
}
function complete(state, outcome) {
  state.phase = 'finished'; state.outcome = outcome; state.currentActorId = null; state.turnStatusIds = [];
  for (const unit of state.units) { unit.statuses = []; unit.shield = null; }
}
// 放弃由持久层校验时限/权限；只清战斗临时状态，保留捕获、库存与最终生命供结算和表现。
export function abandonBattle(input, text = '已放弃本场战斗。') {
  const state = copy(input);
  if (state.phase === 'finished') return { state, events: [] };
  complete(state, 'abandoned');
  return { state, events: [{ type: 'abandoned', text }] };
}
function finish(state, events) {
  const players = state.units.some(u => u.side === 'player' && alive(u));
  const enemies = state.units.some(u => u.side === 'enemy' && alive(u));
  if (!players || !enemies) { complete(state, players ? 'victory' : 'defeat'); events.push({ type: 'finished', outcome: state.outcome }); }
  return state.phase === 'finished';
}
function clearDown(unit, events) {
  if (unit.hp <= 0) { unit.hp = 0; unit.statuses = []; unit.shield = null; unit.progress = 0; events.push({ type: 'down', targetId: unit.id }); }
}
function hurt(target, amount, events, sourceId, dot = false) {
  const absorbed = Math.min(target.shield?.amount ?? 0, amount);
  if (target.shield) { target.shield.amount -= absorbed; if (!target.shield.amount) target.shield = null; }
  const loss = Math.min(target.hp, amount - absorbed); target.hp -= loss;
  events.push({ type: dot ? 'dot' : 'damage', sourceId, targetId: target.id, amount, hpLoss: loss, absorbed });
}
function addStatus(state, target, id, duration = 2, amount) {
  if (!alive(target)) return;
  if (!(id in modifiers) && !['mark', 'burn', 'defend'].includes(id)) fail('invalid_content', `不支持状态 ${id}`);
  const old = target.statuses.find(s => s.id === id);
  const next = { id, remaining: Math.max(old?.remaining ?? 0, duration), instance: ++state.effectSerial };
  if (id in modifiers) {
    const base = amount ?? modifiers[id][1];
    next.amount = Math.abs(old?.amount ?? 0) > Math.abs(base) ? old.amount : base;
  }
  target.statuses = target.statuses.filter(s => s.id !== id); target.statuses.push(next);
}
function shield(state, target, amount, duration, events) {
  if (!alive(target) || amount < (target.shield?.amount ?? 0)) return;
  target.shield = { amount, remaining: duration, instance: ++state.effectSerial };
  events.push({ type: 'shield', targetId: target.id, amount, remaining: duration });
}
export function createBattle({ id, party, encounter, seed = 1, inventory = {}, capacityRemaining = 20 }, catalog) {
  if (!Number.isInteger(capacityRemaining) || capacityRemaining < 0 || ['captureBall', 'potion'].some(key => !Number.isInteger(inventory[key] ?? 0) || (inventory[key] ?? 0) < 0)) fail('invalid_resources', '背包与容量必须为非负整数。');
  if (!Array.isArray(party) || party.length < 1 || party.length > 4 || new Set(party.map(p => p.id)).size !== party.length) fail('invalid_party', '队伍必须包含 1–4 个不同宠物实例。');
  if (!encounter || !Array.isArray(encounter.enemies) || encounter.enemies.length < 1 || encounter.enemies.length > 4) fail('invalid_encounter', '遭遇必须包含 1–4 名敌人。');
  const make = (entry, side, index) => {
    const definition = catalog[entry.speciesId]; if (!definition) fail('missing_content', '宠物内容版本不可用。');
    const stats = copy(definition.stats);
    if (!['hp', 'atk', 'def', 'spd'].every(key => Number.isFinite(stats[key])) || stats.hp <= 0 || stats.atk < 1 || stats.def < 0 || stats.spd < 1) fail('invalid_content', '宠物基础值不合法。');
    return { id: side === 'player' ? entry.id : `${id}:enemy:${index}`, speciesId: entry.speciesId, side, name: definition.name, stats, maxHp: stats.hp, hp: stats.hp, element: definition.element ?? 'neutral', progress: 0, statuses: [], shield: null, captured: false, aiStep: 0 };
  };
  const units = [...party.map((p, i) => make(p, 'player', i)), ...encounter.enemies.map((speciesId, i) => make({ speciesId }, 'enemy', i))];
  if (new Set(units.map(u => u.id)).size !== units.length) fail('invalid_party', '战斗单位 ID 冲突。');
  const state = { id, rulesVersion: 'B0', contentVersion: 'B0-C1', encounter: copy(encounter), units, time: 0, turn: 0, effectSerial: 0, rng: (seed >>> 0) || 1, phase: 'ready', currentActorId: null, points: { player: 3, enemy: 3 }, inventory: { captureBall: inventory.captureBall ?? 0, potion: inventory.potion ?? 0 }, capacityRemaining, captures: [], outcome: null, turnStatusIds: [] };
  state.tieOrder = units.map(u => u.id);
  for (let i = state.tieOrder.length - 1; i > 0; i--) { const j = Math.floor(random(state) * (i + 1)); [state.tieOrder[i], state.tieOrder[j]] = [state.tieOrder[j], state.tieOrder[i]]; }
  // 被动只支持白名单的一次开战/自身主行动后效果，不执行内容脚本。
  for (const unitId of state.tieOrder) { const unit = units.find(u => u.id === unitId); if (catalog[unit.speciesId].passive?.trigger === 'start') applyPassive(state, unit, catalog, []); }
  return state;
}
function nextReady(state) {
  const live = state.units.filter(alive);
  const wait = Math.max(0, Math.min(...live.map(u => (10000 - u.progress) / effectiveStats(u).spd)));
  state.time += wait;
  for (const unit of live) unit.progress = Math.min(10000, unit.progress + effectiveStats(unit).spd * wait);
  return live.filter(u => u.progress >= 10000 - EPS).sort((a, b) => state.tieOrder.indexOf(a.id) - state.tieOrder.indexOf(b.id))[0];
}
export function advanceBattle(input, catalog) {
  const state = copy(input), events = [];
  if (state.phase === 'finished') return { state, events };
  if (state.phase === 'awaiting') {
    const actor = state.units.find(u => u.id === state.currentActorId);
    if (actor.side === 'player') return { state, events };
    return resolveCommand(state, chooseEnemyCommand(state, catalog), catalog, true);
  }
  if (state.phase !== 'ready') fail('invalid_phase', '战斗当前不可推进。');
  if (finish(state, events)) return { state, events };
  const actor = nextReady(state); state.turn++; state.currentActorId = actor.id;
  actor.statuses = actor.statuses.filter(s => s.id !== 'defend');
  state.turnStatusIds = actor.statuses.map(s => s.instance); if (actor.shield) state.turnStatusIds.push(actor.shield.instance);
  events.push({ type: 'turn', actorId: actor.id, time: state.time });
  if (actor.statuses.some(s => s.id === 'burn')) { hurt(actor, Math.max(1, Math.floor(actor.maxHp * 0.05)), events, null, true); clearDown(actor, events); }
  if (!finish(state, events)) { state.phase = alive(actor) ? 'awaiting' : 'ready'; if (!alive(actor)) state.currentActorId = null; }
  return { state, events };
}
export function captureChance(state, targetId, catalog) {
  const target = state.units.find(u => u.id === targetId);
  if (!target || !alive(target) || target.side !== 'enemy' || !catalog[target.speciesId]?.capturable) return 0;
  if (state.encounter.tutorial) return target.hp <= target.maxHp / 2 ? 1 : 0;
  return clamp((catalog[target.speciesId].captureFactor ?? 0.8) * (1 - 0.75 * target.hp / target.maxHp), 0.05, 0.95);
}
function legalTargets(state, actor, target) {
  if (target === 'self') return [actor];
  return state.units.filter(u => alive(u) && (target === 'ally' ? u.side === actor.side : u.side !== actor.side));
}
function validateSkill(state, actor, skill, command) {
  if (!skill || ![0, 1, 2].includes(skill.cost) || !['basic', 'skill'].includes(skill.kind) || !Array.isArray(skill.effects) || skill.effects.length < 1 || skill.effects.length > 4 || !['enemy', 'ally', 'self', 'allEnemies'].includes(skill.target)) fail('invalid_skill', '技能不可用。');
  for (const effect of skill.effects) {
    if (!['damage', 'heal', 'shield', 'status'].includes(effect.type) || (effect.target && effect.target !== 'self')) fail('invalid_content', '技能效果不合法。');
    if (['damage', 'heal', 'shield'].includes(effect.type) && (!Number.isFinite(effect.multiplier) || effect.multiplier < 0 || (effect.type === 'damage' && effect.multiplier === 0) || !Number.isFinite(effect.fixed ?? 0) || (effect.fixed ?? 0) < 0)) fail('invalid_content', '效果数值不合法。');
    if (['status', 'shield'].includes(effect.type) && (!Number.isInteger(effect.duration ?? 2) || (effect.duration ?? 2) < 1)) fail('invalid_content', '效果时长不合法。');
    if (effect.amount !== undefined && !Number.isFinite(effect.amount)) fail('invalid_content', '状态幅度不合法。');
  }
  if (state.points[actor.side] < skill.cost) fail('insufficient_points', '战术点不足。');
  let targets = legalTargets(state, actor, skill.target);
  if (!['self', 'allEnemies'].includes(skill.target)) targets = targets.filter(t => t.id === command.targetId);
  else if (skill.target === 'self' && command.targetId && command.targetId !== actor.id) targets = [];
  if (!targets.length) fail('invalid_target', '请选择本场存活的合法目标。');
  if (skill.effects.every(e => e.type === 'heal') && targets.every(t => t.hp === t.maxHp)) fail('full_health', '目标生命已满。');
  return targets;
}
function applyEffects(state, actor, targets, effects, events) {
  const marksAtStart = new Map(state.units.map(u => [u.id, u.statuses.find(s => s.id === 'mark')?.instance]));
  const usedMarks = new Map();
  for (const effect of effects) {
    const selected = (effect.target === 'self' ? [actor] : targets).filter(alive);
    if (effect.type === 'damage') {
      for (const target of selected) {
        const mark = marksAtStart.get(target.id); if (mark) usedMarks.set(target.id, mark);
        hurt(target, calculateDamage(actor, target, effect, Boolean(mark)), events, actor.id);
      }
      for (const target of selected) clearDown(target, events);
    } else for (const target of selected) {
      if (effect.type === 'status') { addStatus(state, target, effect.status, effect.duration, effect.amount); events.push({ type: 'status', targetId: target.id, status: effect.status }); }
      else if (effect.type === 'shield') shield(state, target, Math.floor(effectiveStats(actor).atk * effect.multiplier + (effect.fixed ?? 0)), effect.duration ?? 2, events);
      else if (effect.type === 'heal') { const amount = Math.min(target.maxHp - target.hp, Math.floor(effectiveStats(actor).atk * effect.multiplier + (effect.fixed ?? 0))); target.hp += amount; events.push({ type: 'heal', targetId: target.id, amount }); }
      else fail('invalid_content', '不支持的技能效果。');
    }
  }
  return usedMarks;
}
function applyPassive(state, actor, catalog, events) {
  const passive = catalog[actor.speciesId].passive;
  if (!passive || !alive(actor)) return;
  if (!Array.isArray(passive.effects) || passive.effects.some(e => !['heal', 'shield', 'status'].includes(e.type) || (e.type === 'status' && !(e.status in modifiers)))) fail('invalid_content', '被动超出 B0 白名单。');
  applyEffects(state, actor, [actor], passive.effects.map(e => ({ ...e, target: 'self' })), events);
}
function endTurn(state, actor, events) {
  if (alive(actor)) {
    for (const status of actor.statuses) if (state.turnStatusIds.includes(status.instance) && status.id !== 'defend') status.remaining--;
    actor.statuses = actor.statuses.filter(s => s.remaining > 0);
    if (actor.shield && state.turnStatusIds.includes(actor.shield.instance) && --actor.shield.remaining <= 0) actor.shield = null;
    actor.progress = 0;
  }
  state.phase = 'ready'; state.currentActorId = null; state.turnStatusIds = [];
  finish(state, events);
}
function resolveCommand(state, command, catalog, enemy = false) {
  const events = [];
  if (state.phase !== 'awaiting') fail('invalid_phase', '当前没有等待指令的行动。');
  const actor = state.units.find(u => u.id === state.currentActorId);
  if (!actor || !alive(actor) || (actor.side === 'enemy') !== enemy) fail('not_your_turn', '现在不是己方行动。');
  if (!command || typeof command !== 'object' || Array.isArray(command)) fail('invalid_command', '指令格式不合法。');
  const definition = catalog[actor.speciesId];
  let skill, targets, usedMarks = new Map();
  if (command.type === 'basic' || command.type === 'skill') {
    skill = command.type === 'basic' ? definition.basic : definition.skills.find(s => s.id === command.skillId);
    targets = validateSkill(state, actor, skill, command);
    state.points[actor.side] -= skill.cost;
    events.push({ type: 'action', actorId: actor.id, skillId: skill.id, name: skill.name });
    usedMarks = applyEffects(state, actor, targets, skill.effects, events);
  } else if (command.type === 'defend') {
    addStatus(state, actor, 'defend', 1); events.push({ type: 'defend', actorId: actor.id });
  } else if (command.type === 'item') {
    const target = state.units.find(u => u.id === command.targetId && u.side === actor.side && alive(u));
    if (!target) fail('invalid_target', '恢复道具需要存活队友。');
    if (target.hp === target.maxHp) fail('full_health', '目标生命已满。');
    if (enemy || state.inventory.potion < 1) fail('insufficient_items', '恢复道具不足。');
    state.inventory.potion--; const amount = Math.min(target.maxHp - target.hp, Math.max(1, Math.floor(target.maxHp * 0.3))); target.hp += amount;
    events.push({ type: 'heal', targetId: target.id, amount, item: 'potion' });
  } else if (command.type === 'capture') {
    const target = state.units.find(u => u.id === command.targetId);
    if (enemy || !target || !alive(target) || target.side !== 'enemy' || !catalog[target.speciesId].capturable) fail('invalid_target', '此目标不可捕捉。');
    if (state.capacityRemaining < 1) fail('capacity_full', '持有空间不足。');
    if (state.encounter.tutorial && target.hp > target.maxHp / 2) fail('tutorial_health', '教学捕捉需要目标不高于半血。');
    if (!state.encounter.tutorial && state.inventory.captureBall < 1) fail('insufficient_items', '捕捉球不足。');
    if (!state.encounter.tutorial) state.inventory.captureBall--;
    const chance = captureChance(state, target.id, catalog); const success = chance === 1 || random(state) < chance;
    events.push({ type: 'capture', targetId: target.id, speciesId: target.speciesId, success, chance });
    if (success) { target.captured = true; target.statuses = []; target.shield = null; target.progress = 0; state.capacityRemaining--; state.captures.push({ targetId: target.id, speciesId: target.speciesId }); }
  } else if (command.type === 'retreat') {
    if (enemy) fail('invalid_command', '敌人不能执行此指令。');
    complete(state, 'retreat'); events.push({ type: 'finished', outcome: 'retreat' }); return { state, events };
  } else fail('invalid_command', '不支持的指令。');
  if (catalog[actor.speciesId].passive?.trigger === 'afterAction') applyPassive(state, actor, catalog, events);
  for (const [id, instance] of usedMarks) { const target = state.units.find(u => u.id === id); target.statuses = target.statuses.filter(s => s.instance !== instance); }
  if (skill?.kind === 'basic') state.points[actor.side] = Math.min(5, state.points[actor.side] + 1);
  if (enemy && state.encounter.ai === 'boss') {
    const planned = state.encounter.aiPlan?.[actor.aiStep];
    if (planned && (planned.type === 'defend' ? command.type === 'defend' : skill?.id === planned.skillId)) actor.aiStep = (actor.aiStep + 1) % state.encounter.aiPlan.length;
  }
  endTurn(state, actor, events); return { state, events };
}
export function applyCommand(input, command, catalog) { return resolveCommand(copy(input), command, catalog); }
export function chooseEnemyCommand(state, catalog) {
  const actor = state.units.find(u => u.id === state.currentActorId);
  const target = state.units.filter(u => u.side !== actor.side && alive(u)).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp || state.tieOrder.indexOf(a.id) - state.tieOrder.indexOf(b.id))[0];
  if (!target) fail('invalid_target', '敌人没有合法目标。');
  const basic = { type: 'basic', targetId: target.id };
  const definition = catalog[actor.speciesId];
  const select = id => ({ type: 'skill', skillId: id, targetId: target.id });
  if (state.encounter.ai === 'basic') return basic;
  if (state.encounter.ai === 'boss') {
    const planned = state.encounter.aiPlan?.[actor.aiStep];
    if (!planned) fail('invalid_content', '首领策略版本不可用。');
    if (state.points.enemy < (planned.cost ?? 0)) return basic;
    return { type: planned.type, ...(planned.skillId ? { skillId: planned.skillId, targetId: target.id } : {}) };
  }
  // 策略来自内容的技能效果，核心不依赖物种身份。
  const mark = definition.skills.find(s => s.effects.some(e => e.type === 'status' && e.status === 'mark'));
  const cover = definition.skills.find(s => s.effects.some(e => e.type === 'shield'));
  const burst = definition.skills.find(s => s.cost === 2 && s.effects.some(e => e.type === 'damage'));
  if (cover && actor.hp <= actor.maxHp / 2 && !actor.shield && state.points.enemy >= cover.cost) return { type: 'skill', skillId: cover.id, targetId: actor.id };
  if (mark && !target.statuses.some(s => s.id === 'mark') && state.points.enemy >= mark.cost) return select(mark.id);
  if (burst && state.points.enemy >= burst.cost) return select(burst.id);
  return basic;
}
export function previewTimeline(input, catalog, count = 8) {
  const state = copy(input), result = [];
  if (state.phase === 'finished') return result;
  if (state.phase === 'awaiting') { result.push({ unitId: state.currentActorId, time: state.time, current: true }); const actor = state.units.find(u => u.id === state.currentActorId); actor.progress = 0; }
  while (result.length < count && state.units.some(alive)) { const actor = nextReady(state); result.push({ unitId: actor.id, time: state.time, current: false }); actor.progress = 0; }
  return result;
}
export function projectBattle(input, catalog) {
  const state = copy(input); delete state.rng; delete state.turnStatusIds; delete state.effectSerial;
  state.timeline = previewTimeline(input, catalog);
  for (const unit of state.units) {
    unit.definition = copy(catalog[unit.speciesId]); unit.effectiveStats = effectiveStats(unit); unit.captureChance = captureChance(input, unit.id, catalog);
    if (unit.side === 'enemy' && state.encounter.ai === 'boss') unit.intention = input.points.enemy < (state.encounter.aiPlan?.[unit.aiStep]?.cost ?? 0) ? '普攻补充战术点，之后执行预告技能' : state.encounter.aiPlan?.[unit.aiStep]?.intention;
  }
  return state;
}
