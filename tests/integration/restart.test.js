import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openStore } from '../../framework/store.js';

test('真实服务进程被终止后，重新启动并登录仍恢复已提交数据', { timeout: 20000 }, async t => {
  const dir = await mkdtemp(join(tmpdir(), 'crashmon-process-'));
  const databasePath = join(dir, 'save.sqlite');
  const store = openStore(databasePath); const invite = store.createInvite().token; store.close();
  const probe = createServer(); probe.listen(0, '127.0.0.1'); await once(probe, 'listening');
  const port = probe.address().port; await new Promise(r => probe.close(r));
  const base = `http://127.0.0.1:${port}`;
  let child;
  const stop = async () => { if (child && child.exitCode === null && child.signalCode === null) { const done = once(child, 'exit'); child.kill('SIGKILL'); await done; } };
  t.after(async () => { await stop(); await rm(dir, { recursive: true, force: true }); });
  const start = async () => {
    child = spawn(process.execPath, ['app/server.js'], { cwd: new URL('../../', import.meta.url), env: { ...process.env, NODE_ENV: 'test', PORT: String(port), CRASHMON_DB: databasePath }, stdio: ['ignore', 'pipe', 'pipe'] });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('启动超时')), 5000);
      child.once('error', e => { clearTimeout(timer); reject(e); });
      child.once('exit', () => { clearTimeout(timer); reject(new Error('启动失败')); });
      child.stdout.on('data', data => { if (String(data).includes('已启动')) { clearTimeout(timer); resolve(); } });
    });
  };
  const request = async (path, body, method = 'POST', cookie, userId) => {
    const response = await fetch(base + path, { method, headers: { Origin: base, 'Content-Type': 'application/json', 'X-Crashmon-Request': '1', ...(cookie ? { Cookie: cookie, 'X-Crashmon-Player': userId } : {}) }, body: JSON.stringify(body) });
    assert.ok(response.ok, `请求失败 ${response.status}`);
    return { data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
  };
  await start();
  const credentials = { username: 'restart_test', password: 'process-restart-password' };
  await request('/api/register', { ...credentials, invite });
  const first = await request('/api/login', credentials);
  const saved = await request('/api/player', { nickname: '重启后仍在', soundEnabled: false, reducedMotion: true, revision: 0, requestId: crypto.randomUUID() }, 'PATCH', first.cookie, first.data.userId);
  const claimed = await request('/api/starter', { definitionId: 'starter_b', requestId: crypto.randomUUID() }, 'POST', first.cookie, first.data.userId);
  assert.equal(claimed.data.nickname, saved.data.nickname);
  assert.equal(claimed.data.pets.length, 1);
  await stop(); await start();
  const second = await request('/api/login', credentials);
  assert.deepEqual(second.data, claimed.data);
});
