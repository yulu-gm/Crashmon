import test from 'node:test';
import assert from 'node:assert/strict';
import { createBattle, advanceBattle, applyCommand, effectiveStats, calculateDamage, captureChance, previewTimeline, projectBattle } from '../../framework/battle.js';
import { catalog } from '../../content/pets/catalog.js';
import { encounters } from '../../content/encounters/index.js';
const clone = x => structuredClone(x);
const create = (species = 'starter_a', encounter = 'b0_tutorial_scout', extra = {}, content = catalog) => createBattle({ id: 'test', party: [{ id: 'pet1', speciesId: species }], encounter: encounters[encounter], seed: 42, inventory: { captureBall: 10, potion: 3 }, ...extra }, content);
function playerTurn(state, content = catalog) { for (let i = 0; i < 100 && state.phase !== 'finished'; i++) { if (state.phase === 'awaiting' && state.units.find(u => u.id === state.currentActorId).side === 'player') return state; state = advanceBattle(state, content).state; } return state; }
function actorTurn(state, id) { state.phase = 'ready'; for (const u of state.units) u.progress = u.id === id ? 10000 : 0; return advanceBattle(state, catalog).state; }
test('五只完整定义与三选一稳定ID；队伍数量与重复校验', () => {
  assert.equal(Object.values(catalog).filter(p => p.id !== 'boss_scrap_sorter').length, 5);
  for (const p of Object.values(catalog).slice(0, 5)) { assert.equal(p.skills.length, 2); assert.ok(p.design.silhouette && p.design.motion && p.design.acquisition); }
  assert.throws(() => create('starter_a', undefined, { party: [] }), /1–4/);
  assert.throws(() => create('starter_a', undefined, { party: [{ id: 'p', speciesId: 'starter_a' }, { id: 'p', speciesId: 'starter_b' }] }), /1–4/);
});
test('150/100/75连续时间轴、同刻tieOrder、JSON恢复及预览不修改状态', () => {
  let s = create('starter_a', 'b0_four_mixed'); s.units = s.units.slice(0, 3); s.units.forEach((u, i) => u.stats.spd = [150, 100, 75][i]); s.tieOrder = s.units.map(u => u.id);
  const saved = JSON.stringify(s); const preview = previewTimeline(s, catalog, 8); assert.equal(JSON.stringify(s), saved);
  assert.deepEqual(preview.map(x => Math.round(x.time * 1000) / 1000), [66.667, 100, 133.333, 133.333, 200, 200, 266.667, 266.667]);
  assert.deepEqual(previewTimeline(JSON.parse(saved), catalog), preview);
  assert.deepEqual(preview.slice(2, 4).map(p => p.unitId), [s.units[0].id, s.units[2].id]);
});
test('加减速保留行动进度、修正上限及满进度不取消', () => {
  const s = create(); const a = s.units[0]; a.progress = 6000; a.statuses.push({ id: 'haste', amount: 0.25, remaining: 2, instance: 1 });
  assert.equal((10000 - a.progress) / effectiveStats(a).spd, 32);
  a.statuses.push({ id: 'haste2', remaining: 2, instance: 2 }); a.progress = 10000;
  a.statuses = [{ id: 'slow', amount: -0.9, remaining: 2, instance: 3 }]; assert.equal(effectiveStats(a).spd, 50); assert.equal(previewTimeline(s, catalog)[0].time, 0);
});
test('伤害取整链为40/50/62/31，护盾先吸收；纯函数不修改旧状态', () => {
  let s = create(); const a = s.units[0], b = s.units[1]; b.stats.def = 50;
  const effect = { type: 'damage', multiplier: 1.5, element: 'neutral' };
  assert.equal(calculateDamage(a, b, effect), 40); b.element = 'T2'; effect.element = 'T1'; assert.equal(calculateDamage(a, b, effect), 50);
  assert.equal(calculateDamage(a, b, effect, true), 62); b.statuses.push({ id: 'defend', remaining: 1, instance: 1 }); assert.equal(calculateDamage(a, b, effect, true), 31);
  s = actorTurn(s, a.id); s.units[1].statuses.push({ id: 'mark', remaining: 2, instance: 2 }); s.units[1].shield = { amount: 20, remaining: 2, instance: 3 };
  const before = JSON.stringify(s); const result = applyCommand(s, { type: 'skill', skillId: 'starter_a_burst', targetId: b.id }, catalog);
  assert.equal(JSON.stringify(s), before); assert.equal(result.events.find(e => e.type === 'damage').hpLoss, 11);
});
test('资源不足、非法目标、满血道具、教学未压血均不消耗或抽随机', () => {
  const s = playerTurn(create()); const saved = JSON.stringify(s); s.points.player = 0;
  assert.throws(() => applyCommand(s, { type: 'skill', skillId: 'starter_a_burst', targetId: s.units[1].id }, catalog), /战术点不足/); s.points.player = 3;
  assert.throws(() => applyCommand(s, { type: 'basic', targetId: 'outside' }, catalog), /合法目标/);
  s.units[0].hp = s.units[0].maxHp; assert.throws(() => applyCommand(s, { type: 'item', targetId: s.units[0].id }, catalog), /已满/);
  assert.throws(() => applyCommand(s, { type: 'capture', targetId: s.units[1].id }, catalog), /半血/);
  assert.equal(s.rng, JSON.parse(saved).rng); assert.equal(s.inventory.potion, 3);
});
test('单盾池弱盾不刷新、同强刷新；自身新状态不当回合扣时长', () => {
  let s = actorTurn(create('starter_b'), 'pet1'); s.units[0].shield = { amount: 60, remaining: 1, instance: 500 }; s.turnStatusIds = [500];
  s = applyCommand(s, { type: 'skill', skillId: 'starter_b_cover', targetId: 'pet1' }, catalog).state; assert.equal(s.units[0].shield, null);
  s = actorTurn(s, 'pet1'); s.units[0].shield = { amount: 36, remaining: 1, instance: 501 }; s.turnStatusIds = [501];
  s = applyCommand(s, { type: 'skill', skillId: 'starter_b_cover', targetId: 'pet1' }, catalog).state; assert.equal(s.units[0].shield.remaining, 2);
  let a = actorTurn(create(), 'pet1'); a = applyCommand(a, { type: 'skill', skillId: 'starter_a_focus' }, catalog).state;
  assert.equal(a.units[0].statuses[0].remaining, 2);
});
test('旧标记加成多段并消费，新标记不倒用也不误删', () => {
  const content = clone(catalog); content.starter_a.skills[0].effects = [{ type: 'damage', multiplier: 0.5, element: 'neutral' }, { type: 'status', status: 'mark', duration: 2 }, { type: 'damage', multiplier: 0.5, element: 'neutral' }];
  let s = actorTurn(create(), 'pet1'); s.units[1].statuses = [{ id: 'mark', remaining: 2, instance: 500 }];
  let r = applyCommand(s, { type: 'skill', skillId: 'starter_a_burst', targetId: s.units[1].id }, content);
  assert.deepEqual(r.events.filter(e => e.type === 'damage').map(e => e.amount), [20, 20]); assert.equal(r.state.units[1].statuses[0].id, 'mark'); assert.notEqual(r.state.units[1].statuses[0].instance, 500);
  s.units[1].statuses = []; r = applyCommand(s, { type: 'skill', skillId: 'starter_a_burst', targetId: s.units[1].id }, content);
  assert.deepEqual(r.events.filter(e => e.type === 'damage').map(e => e.amount), [16, 16]);
});
test('灼烧先扣盾不受防御，开始死亡立即终局，恢复不重复DOT', () => {
  let s = create(); s.units[0].progress = 10000; s.units[0].hp = 3; s.units[0].shield = { amount: 2, remaining: 2, instance: 1 }; s.units[0].statuses = [{ id: 'burn', remaining: 2, instance: 2 }, { id: 'defend', remaining: 1, instance: 3 }];
  const r = advanceBattle(s, catalog); assert.equal(r.state.outcome, 'defeat'); assert.equal(r.events.find(e => e.type === 'dot').absorbed, 2);
  assert.deepEqual(advanceBattle(JSON.parse(JSON.stringify(r.state)), catalog).events, []);
  s = create(); s.units[0].progress = 10000; s.units[0].statuses = [{ id: 'burn', remaining: 2, instance: 1 }]; s = advanceBattle(s, catalog).state; const hp = s.units[0].hp;
  assert.equal(advanceBattle(s, catalog).state.units[0].hp, hp);
});
test('普通捕获20%/65%，容量拒绝，教学成功退场不插队且保留捕获', () => {
  let s = create('starter_a', 'b0_pair_scout'); const target = s.units[1]; assert.ok(Math.abs(captureChance(s, target.id, catalog) - 0.2) < 1e-10); target.hp = target.maxHp / 4; assert.equal(captureChance(s, target.id, catalog), 0.65);
  s = actorTurn(s, 'pet1'); s.capacityRemaining = 0; assert.throws(() => applyCommand(s, { type: 'capture', targetId: target.id }, catalog), /空间不足/);
  s = actorTurn(create(), 'pet1'); s.units[1].hp = 50;
  const r = applyCommand(s, { type: 'capture', targetId: s.units[1].id }, catalog); assert.equal(r.state.outcome, 'victory'); assert.equal(r.state.captures.length, 1); assert.equal(r.state.units.length, 2); assert.equal(r.state.inventory.captureBall, 10); assert.equal(r.state.rng, s.rng);
});
test('三初始×两教学均能普攻压血捕获，无初始选择软锁', () => {
  for (const species of ['starter_a', 'starter_b', 'starter_c']) for (const encounter of ['b0_tutorial_scout', 'b0_tutorial_shell']) {
    let s = create(species, encounter); let n = 0;
    while (s.phase !== 'finished' && n++ < 30) { s = playerTurn(s); if (s.phase === 'finished') break; const target = s.units.find(u => u.side === 'enemy'); s = applyCommand(s, { type: target.hp <= target.maxHp / 2 ? 'capture' : 'basic', targetId: target.id }, catalog).state; }
    assert.equal(s.outcome, 'victory', `${species}/${encounter}`); assert.equal(s.captures.length, 1);
  }
});
test('首领循环、群攻与费用不足兜底不推进阶段，意图可见但随机不可见', () => {
  let s = create('starter_b', 'b0_scrap_boss'); const bossId = s.units[1].id;
  s = actorTurn(s, bossId); s = advanceBattle(s, catalog).state; assert.equal(s.units[1].aiStep, 1); assert.equal(s.units[1].shield.amount, 30); assert.equal(s.points.enemy, 4);
  s = actorTurn(s, bossId); s = advanceBattle(s, catalog).state; assert.equal(s.units[1].aiStep, 2);
  s = actorTurn(s, bossId); s.points.enemy = 0; s = advanceBattle(s, catalog).state; assert.equal(s.units[1].aiStep, 2); assert.equal(s.points.enemy, 1);
  s = actorTurn(s, bossId); s.points.enemy = 2; s = advanceBattle(s, catalog).state; assert.equal(s.units[1].aiStep, 0); assert.equal(s.points.enemy, 0); assert.ok(s.units[1].statuses.some(st => st.id === 'defDown' && st.remaining === 2));
  const publicState = projectBattle(s, catalog); assert.equal(publicState.rng, undefined); assert.ok(publicState.units[1].intention);
});
test('四对四群攻伤害完整结算、普通攻击回点封顶，被动每主行动一次', () => {
  const content = clone(catalog); content.starter_a.basic.target = 'allEnemies'; content.starter_a.basic.effects = [{ type: 'damage', multiplier: 99, element: 'neutral' }]; content.starter_a.passive = { trigger: 'afterAction', effects: [{ type: 'shield', multiplier: 0, fixed: 7, duration: 2 }] };
  let s = create('starter_a', 'b0_four_mixed', { party: ['starter_a', 'starter_b', 'starter_c', 'wild_scout'].map((speciesId, i) => ({ id: `p${i}`, speciesId })) }, content); s = actorTurn(s, 'p0'); s.points.player = 5;
  const r = applyCommand(s, { type: 'basic' }, content); assert.equal(r.state.outcome, 'victory'); assert.equal(r.events.filter(e => e.type === 'damage').length, 4); assert.equal(r.events.filter(e => e.type === 'shield').length, 1); assert.equal(r.state.points.player, 5);
});
test('空指令、缺属性与负效果拒绝；防御不回点，恢复药仅扣一次', () => {
  let s = actorTurn(create(), 'pet1'); const saved = JSON.stringify(s);
  assert.throws(() => applyCommand(s, null, catalog), /指令格式/); assert.equal(JSON.stringify(s), saved);
  const content = clone(catalog); delete content.starter_a.stats.spd; assert.throws(() => create('starter_a', undefined, {}, content), /基础值/);
  const broken = clone(catalog); broken.starter_a.basic.effects[0].multiplier = -1;
  assert.throws(() => applyCommand(s, { type: 'basic', targetId: s.units[1].id }, broken), /效果数值/);
  s = applyCommand(s, { type: 'defend' }, catalog).state; assert.equal(s.points.player, 3);
  s = actorTurn(s, 'pet1'); assert.ok(!s.units[0].statuses.some(st => st.id === 'defend'));
  s.units[0].hp = 110; s = applyCommand(s, { type: 'item', targetId: 'pet1' }, catalog).state;
  assert.equal(s.units[0].hp, 120); assert.equal(s.inventory.potion, 2); assert.equal(s.points.player, 3);
});
test('普通捕获失败消耗球和行动；成功后撤退仍保留捕获及消耗', () => {
  let s = actorTurn(create('starter_a', 'b0_pair_scout'), 'pet1'); s.rng = 8192;
  const enemyId = s.units[1].id; const failed = applyCommand(s, { type: 'capture', targetId: enemyId }, catalog);
  assert.equal(failed.events[0].success, false); assert.equal(failed.state.inventory.captureBall, 9); assert.equal(failed.state.phase, 'ready'); assert.equal(failed.state.units[1].hp, s.units[1].hp);
  s.rng = 1; const captured = applyCommand(s, { type: 'capture', targetId: enemyId }, catalog); assert.equal(captured.events[0].success, true);
  s = actorTurn(captured.state, 'pet1'); s = applyCommand(s, { type: 'retreat' }, catalog).state;
  assert.equal(s.outcome, 'retreat'); assert.equal(s.captures.length, 1); assert.equal(s.inventory.captureBall, 9);
});
test('捕获胜利、战败与撤退共享终局清理，保留最终生命及结果事件', () => {
  for (const outcome of ['victory', 'defeat', 'retreat']) {
    let s = actorTurn(create(), 'pet1');
    s.units[0].statuses = [{ id: 'atkUp', amount: 0.2, remaining: 2, instance: 10 }];
    s.units[0].shield = { amount: 10, remaining: 2, instance: 11 }; s.turnStatusIds = [10, 11];
    let result;
    if (outcome === 'victory') { s.units[1].hp = 50; result = applyCommand(s, { type: 'capture', targetId: s.units[1].id }, catalog); }
    else if (outcome === 'retreat') result = applyCommand(s, { type: 'retreat' }, catalog);
    else { s.phase = 'ready'; s.units[0].hp = 0; result = advanceBattle(s, catalog); }
    assert.equal(result.state.outcome, outcome); assert.equal(result.state.currentActorId, null); assert.deepEqual(result.state.turnStatusIds, []);
    assert.ok(result.state.units.every(unit => !unit.shield && unit.statuses.length === 0));
    assert.ok(result.events.some(e => e.type === 'finished' && e.outcome === outcome));
    assert.equal(result.state.units[0].hp, s.units[0].hp);
  }
});
