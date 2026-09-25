import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../../app/server.js';

const password = 'test-password-for-crashmon';
async function fixture(t, options = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'crashmon-test-'));
  let app;
  let base;
  const start = async () => {
    app = createApp({ databasePath: join(dir, 'test.sqlite'), ...options });
    await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${app.server.address().port}`;
    app.setOrigin(base);
  };
  await start();
  t.after(async () => { await app.close(); await rm(dir, { recursive: true, force: true }); });
  const owners = new Map();
  const request = async (path, { method = 'GET', body, cookie, headers = {} } = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: { Origin: base, 'Content-Type': 'application/json', 'X-Crashmon-Request': '1', ...(cookie ? { Cookie: cookie, 'X-Crashmon-Player': owners.get(cookie) ?? '' } : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json();
    const nextCookie = res.headers.get('set-cookie')?.split(';')[0];
    if (nextCookie && data.userId) owners.set(nextCookie, data.userId);
    return { status: res.status, body: data, cookie: nextCookie, headers: res.headers };
  };
  const register = async (username = 'player_one', invite = app.store.createInvite().token) => request('/api/register', { method: 'POST', body: { username, password, invite } });
  const login = async (username = 'player_one') => request('/api/login', { method: 'POST', body: { username, password } });
  return { request, register, login, get app() { return app; }, restart: async () => { await app.close(); await start(); } };
}
const save = (nickname, revision = 0, requestId = crypto.randomUUID()) => ({ nickname, soundEnabled: false, reducedMotion: true, revision, requestId });

test('注册、保存、退出、重新登录及重新打开数据库恢复同一份档案', async t => {
  const f = await fixture(t);
  assert.equal((await f.register()).status, 201);
  const session = await f.login();
  assert.equal(session.status, 200);
  assert.match(session.headers.get('set-cookie'), /HttpOnly/);
  assert.match(session.headers.get('set-cookie'), /SameSite=Lax/);
  const original = (await f.request('/api/player', { cookie: session.cookie })).body;
  assert.equal(original.onboarding, 'awaiting_starter');
  const saved = await f.request('/api/player', { method: 'PATCH', cookie: session.cookie, body: save('林间旅人') });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.revision, 1);
  assert.equal((await f.request('/api/logout', { method: 'POST', cookie: session.cookie, body: {} })).status, 200);
  assert.equal((await f.request('/api/player', { cookie: session.cookie })).status, 401);
  const again = await f.login();
  assert.notEqual(again.cookie, session.cookie);
  assert.deepEqual((await f.request('/api/player', { cookie: again.cookie })).body, saved.body);
  await f.restart();
  assert.deepEqual((await f.request('/api/player', { cookie: again.cookie })).body, saved.body);
  const afterRestart = await f.login();
  assert.deepEqual((await f.request('/api/player', { cookie: afterRestart.cookie })).body, saved.body);
  assert.equal(saved.body.userId, original.userId);
});

test('账号隔离、拒绝客户端指定归属和注入正式资产', async t => {
  const f = await fixture(t);
  await f.register(); await f.register('player_two');
  const a = await f.login(); const b = await f.login('player_two');
  const before = (await f.request('/api/player', { cookie: b.cookie })).body;
  assert.equal((await f.request('/api/player', { method: 'PATCH', cookie: a.cookie, body: { ...save('越权'), userId: before.userId } })).status, 400);
  assert.equal((await f.request('/api/player', { method: 'PATCH', cookie: a.cookie, body: { ...save('资产注入'), pets: ['fake'] } })).status, 400);
  assert.equal((await f.request('/api/player', { method: 'PATCH', cookie: a.cookie, body: save('自己的昵称') })).status, 200);
  assert.equal((await f.request('/api/player', { method: 'PATCH', cookie: b.cookie, body: save('旧标签页'), headers: { 'X-Crashmon-Player': a.body.userId } })).status, 409);
  assert.deepEqual((await f.request('/api/player', { cookie: b.cookie })).body, before);
  assert.equal((await f.request('/api/player')).status, 401);
});

test('请求重试返回原结果，参数冲突及并发旧版本不会覆盖存档', async t => {
  const f = await fixture(t); await f.register(); const { cookie } = await f.login();
  const body = save('第一份存档');
  const first = await f.request('/api/player', { method: 'PATCH', cookie, body });
  const retry = await f.request('/api/player', { method: 'PATCH', cookie, body });
  assert.deepEqual(retry.body, first.body);
  assert.equal((await f.request('/api/player', { method: 'PATCH', cookie, body: { ...body, nickname: '变更参数' } })).status, 409);
  const results = await Promise.all(['并发一', '并发二'].map(n => f.request('/api/player', { method: 'PATCH', cookie, body: save(n, 1) })));
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
  assert.equal((await f.request('/api/player', { cookie })).body.revision, 2);
  assert.deepEqual((await f.request('/api/player', { method: 'PATCH', cookie, body })).body, first.body);
});

test('邀请并发只能消费一次，注册事务故障不消耗邀请或留下账号', async t => {
  const f = await fixture(t);
  const { token } = f.app.store.createInvite();
  const registrations = await Promise.all([f.register('race_one', token), f.register('race_two', token)]);
  assert.deepEqual(registrations.map(r => r.status).sort(), [201, 400]);
  const another = f.app.store.createInvite().token;
  f.app.store.db.exec("CREATE TRIGGER fail_profile BEFORE INSERT ON players BEGIN SELECT RAISE(ABORT, 'injected'); END;");
  assert.equal((await f.register('retry_account', another)).status, 500);
  f.app.store.db.exec('DROP TRIGGER fail_profile');
  assert.equal((await f.register('retry_account', another)).status, 201);
});

test('写入失败整体回滚，原请求可重试', async t => {
  const f = await fixture(t); await f.register(); const { cookie } = await f.login();
  const body = save('不能半份保存');
  f.app.store.db.exec("CREATE TRIGGER fail_receipt BEFORE INSERT ON receipts BEGIN SELECT RAISE(ABORT, 'injected'); END;");
  assert.equal((await f.request('/api/player', { method: 'PATCH', cookie, body })).status, 500);
  assert.equal((await f.request('/api/player', { cookie })).body.revision, 0);
  f.app.store.db.exec('DROP TRIGGER fail_receipt');
  assert.equal((await f.request('/api/player', { method: 'PATCH', cookie, body })).body.revision, 1);
});

test('无效凭据、过期会话、跨站写入及错误输入被拒绝', async t => {
  let now = Date.now();
  const f = await fixture(t, { now: () => now });
  await f.register();
  const bad = await f.request('/api/login', { method: 'POST', body: { username: 'player_one', password: 'wrong-password' } });
  const unknown = await f.request('/api/login', { method: 'POST', body: { username: 'unknown_user', password: 'wrong-password' } });
  assert.equal(bad.status, 401); assert.deepEqual(bad.body, unknown.body);
  const { cookie } = await f.login();
  assert.equal((await f.request('/api/player', { method: 'PATCH', cookie, body: save('跨站'), headers: { Origin: 'https://evil.example' } })).status, 403);
  assert.equal((await f.request('/api/player', { method: 'PATCH', cookie, body: save('无请求头'), headers: { 'X-Crashmon-Request': '' } })).status, 403);
  assert.equal((await f.request('/api/player', { method: 'PATCH', cookie, body: save('x'.repeat(100)) })).status, 400);
  assert.equal((await f.request('/api/player', { method: 'PATCH', cookie, body: null })).status, 400);
  now += 25 * 60 * 60 * 1000;
  assert.equal((await f.request('/api/player', { cookie })).status, 401);
  assert.equal((await f.login()).status, 200);
});

test('邀请过期、撤销、登录名规范化与认证限流', async t => {
  let now = Date.now(); const f = await fixture(t, { now: () => now });
  const expired = f.app.store.createInvite().token;
  now += 8 * 24 * 60 * 60 * 1000;
  assert.equal((await f.register('expired_user', expired)).status, 400);
  const revoked = f.app.store.createInvite(); f.app.store.revokeInvite(revoked.token);
  assert.equal((await f.register('revoked_user', revoked.token)).status, 400);
  assert.equal((await f.register('Player_One')).status, 201);
  assert.equal((await f.register('PLAYER_ONE')).status, 400);
  assert.equal((await f.login('PLAYER_ONE')).status, 200);
  for (let i = 0; i < 20; i++) await f.request('/api/login', { method: 'POST', body: {} });
  assert.equal((await f.login()).status, 429);
});

test('初始伙伴三选一：确认后永久保存，重试与并发不重复发宠，重登恢复原实例', async t => {
  const f = await fixture(t); await f.register(); const a = await f.login();
  const catalog = await f.request('/api/starters', { cookie: a.cookie });
  assert.equal(catalog.status, 200); assert.equal(catalog.body.length, 3);
  const choice = { definitionId: catalog.body[0].id, requestId: crypto.randomUUID() };
  const claim = () => f.request('/api/starter', { method: 'POST', cookie: a.cookie, body: choice });
  const [one, two] = await Promise.all([claim(), claim()]);
  assert.equal(one.status, 200); assert.deepEqual(one.body, two.body);
  assert.equal(one.body.pets.length, 1); assert.equal(one.body.pets[0].teamPosition, 0);
  assert.equal(one.body.onboarding, 'starter_received');
  assert.equal((await f.request('/api/starter', { method: 'POST', cookie: a.cookie, body: { ...choice, requestId: crypto.randomUUID() } })).body.pets.length, 1);
  assert.equal((await f.request('/api/starter', { method: 'POST', cookie: a.cookie, body: { ...choice, definitionId: catalog.body[1].id } })).status, 409);
  await f.request('/api/logout', { method: 'POST', cookie: a.cookie, body: {} });
  await f.restart(); const again = await f.login(); assert.deepEqual(again.body, one.body);
});

test('领宠拒绝未知定义和跨账号操作，事务失败不消耗领取资格', async t => {
  const f = await fixture(t); await f.register(); await f.register('other_player');
  const a = await f.login(); const b = await f.login('other_player');
  const def = (await f.request('/api/starters', { cookie: a.cookie })).body[0].id;
  const body = { definitionId: def, requestId: crypto.randomUUID() };
  assert.equal((await f.request('/api/starter', { method: 'POST', body })).status, 401);
  assert.equal((await f.request('/api/starter', { method: 'POST', cookie: a.cookie, body: { ...body, definitionId: 'made_up' } })).status, 400);
  assert.equal((await f.request('/api/starter', { method: 'POST', cookie: b.cookie, body, headers: { 'X-Crashmon-Player': a.body.userId } })).status, 409);
  f.app.store.db.exec("CREATE TRIGGER fail_claim BEFORE INSERT ON starter_claims BEGIN SELECT RAISE(ABORT, 'injected'); END;");
  assert.equal((await f.request('/api/starter', { method: 'POST', cookie: a.cookie, body })).status, 500);
  assert.equal(f.app.store.db.prepare('SELECT COUNT(*) AS n FROM pet_instances').get().n, 0);
  assert.equal((await f.request('/api/player', { cookie: a.cookie })).body.onboarding, 'awaiting_starter');
  f.app.store.db.exec('DROP TRIGGER fail_claim');
  assert.equal((await f.request('/api/starter', { method: 'POST', cookie: a.cookie, body })).body.pets.length, 1);
  assert.equal((await f.request('/api/player', { cookie: b.cookie })).body.pets.length, 0);
});

test('v1 存档迁移保留账号、会话、偏好与保存回执，领取后旧版保存不能覆盖进度', async t => {
  const f = await fixture(t); await f.register(); const a = await f.login();
  const body = save('旧版本旅人');
  const saved = await f.request('/api/player', { method: 'PATCH', cookie: a.cookie, body });
  // 还原上一个里程碑的真实 v1 表结构；新表尚无数据。
  f.app.store.db.exec('DROP TABLE starter_claims; DROP TABLE pet_instances; PRAGMA user_version = 1;');
  await f.restart();
  assert.equal(f.app.store.db.prepare('PRAGMA user_version').get().user_version, 2);
  assert.deepEqual((await f.request('/api/player', { cookie: a.cookie })).body, saved.body);
  assert.deepEqual((await f.request('/api/player', { method: 'PATCH', cookie: a.cookie, body })).body, saved.body);
  const options = (await f.request('/api/starters', { cookie: a.cookie })).body;
  const results = await Promise.all(options.slice(1).map(p => f.request('/api/starter', { method: 'POST', cookie: a.cookie, body: { definitionId: p.id, requestId: crypto.randomUUID() } })));
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
  assert.equal((await f.request('/api/player', { method: 'PATCH', cookie: a.cookie, body: save('过期编辑',1) })).status, 409);
  assert.equal((await f.request('/api/player', { cookie: a.cookie })).body.pets.length, 1);
});
