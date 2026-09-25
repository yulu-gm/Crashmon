import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { starters } from '../content/pets/starters.js';
import { openStore } from '../framework/store.js';
import { HttpError, credentials, hashPassword, verifyPassword, fields } from '../framework/auth.js';

export function createApp({ databasePath = resolve('data/crashmon.sqlite'), origin, now = Date.now } = {}) {
  const store = openStore(databasePath, now, starters.map(p => p.id));
  const assets = new Map([
    ['/', ['index.html', 'text/html; charset=utf-8']],
    ['/world.js', ['world.js', 'text/javascript; charset=utf-8']],
    ['/world.css', ['world.css', 'text/css; charset=utf-8']],
    ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
    ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ].map(([path, [file, type]]) => [path, { type, body: readFileSync(new URL(`./public/${file}`, import.meta.url)) }]));
  const attempts = new Map();
  const limitAuth = address => {
    const time = now();
    for (const [key, bucket] of attempts) if (bucket.until <= time) attempts.delete(key);
    const bucket = attempts.get(address) ?? { count: 0, until: time + 15 * 60 * 1000 };
    bucket.count++; attempts.set(address, bucket);
    if (bucket.count > 20) throw new HttpError(429, '尝试次数过多，请在 15 分钟后重试。');
  };
  const json = (res, status, body, extra = {}) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...extra });
    res.end(JSON.stringify(body));
  };
  const readBody = async req => {
    if (req.headers['content-type']?.split(';')[0].trim() !== 'application/json') throw new HttpError(415, '请使用 JSON 请求。');
    let size = 0; const chunks = [];
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 8192) throw new HttpError(413, '请求内容过大。');
      chunks.push(chunk);
    }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { throw new HttpError(400, 'JSON 格式不正确。'); }
  };
  const cookie = (value, clear = false) => `crashmon_session=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${clear ? 0 : 604800}${origin?.startsWith('https:') ? '; Secure' : ''}`;
  const server = createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    try {
      if (!origin || req.headers.host !== new URL(origin).host) throw new HttpError(403, '访问地址不匹配。');
      const path = new URL(req.url, origin).pathname;
      if (req.method === 'GET' && assets.has(path)) {
        const asset = assets.get(path); res.writeHead(200, { 'Content-Type': asset.type }); res.end(asset.body); return;
      }
      if (!['GET', 'POST', 'PATCH'].includes(req.method)) throw new HttpError(405, '请求方法不支持。');
      if (req.method !== 'GET' && (req.headers.origin !== origin || req.headers['x-crashmon-request'] !== '1')) throw new HttpError(403, '请求来源未通过校验，请刷新页面。');
      const secret = req.headers.cookie?.split(';').map(s => s.trim()).find(s => s.startsWith('crashmon_session='))?.slice('crashmon_session='.length);
      if (path === '/api/register' && req.method === 'POST') {
        limitAuth(req.socket.remoteAddress);
        const input = credentials(await readBody(req), true);
        const hash = await hashPassword(input.password);
        json(res, 201, store.register(input.username, hash, input.invite)); return;
      }
      if (path === '/api/login' && req.method === 'POST') {
        limitAuth(req.socket.remoteAddress);
        const input = credentials(await readBody(req));
        const account = store.account(input.username);
        const valid = await verifyPassword(input.password, account?.password_hash);
        if (!valid || !account?.active) throw new HttpError(401, '账号或密码不正确。');
        const session = store.createSession(account.id);
        // 同一浏览器重新登录时撤销旧 Cookie 对应会话，其他设备不受影响。
        store.logout(secret);
        json(res, 200, store.player(account.id), { 'Set-Cookie': cookie(session) }); return;
      }
      if (path === '/api/logout' && req.method === 'POST') {
        fields(await readBody(req), []); store.logout(secret);
        json(res, 200, { ok: true }, { 'Set-Cookie': cookie('', true) }); return;
      }
      if (path === '/api/starters' && req.method === 'GET') {
        store.authenticate(secret); json(res, 200, starters); return;
      }
      if (path === '/api/starter' && req.method === 'POST') {
        const body = await readBody(req);
        const id = store.authenticate(secret);
        if (req.headers['x-crashmon-player'] !== id) throw new HttpError(409, '登录账号已改变，请重新登录后再领取。');
        json(res, 200, store.claimStarter(id, body)); return;
      }
      if (path === '/api/player' && req.method === 'GET') {
        json(res, 200, store.player(store.authenticate(secret))); return;
      }
      if (path === '/api/player' && req.method === 'PATCH') {
        const body = await readBody(req);
        const id = store.authenticate(secret);
        if (req.headers['x-crashmon-player'] !== id) throw new HttpError(409, '登录账号已改变，请重新读取档案后再保存。');
        json(res, 200, store.savePlayer(id, body)); return;
      }
      throw new HttpError(404, '没有找到该接口。');
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      if (status === 500) console.error('请求失败：内部存储或服务异常。');
      if (!res.headersSent && !res.destroyed) json(res, status, { error: status === 500 ? '服务暂时无法完成操作，请稍后重试。' : error.message }, status === 429 ? { 'Retry-After': '900' } : {});
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  return {
    server, store, setOrigin(value) { origin = value; },
    async close() {
      await new Promise((done, reject) => server.close(error => error ? reject(error) : done()));
      store.close();
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.env.NODE_ENV === 'production') throw new Error('当前版本仅用于本地验证，尚未完成生产开放验收。');
  process.umask(0o077);
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT 必须为 1–65535。');
  const app = createApp({ databasePath: resolve(process.env.CRASHMON_DB ?? 'data/crashmon.sqlite'), origin: `http://127.0.0.1:${port}` });
  app.server.listen(port, '127.0.0.1', () => console.log(`Crashmon 已启动：http://127.0.0.1:${port}`));
  app.server.on('error', error => { console.error(`启动失败：${error.code}`); process.exit(1); });
  let closing = false;
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => {
    if (closing) return; closing = true; await app.close(); process.exit(0);
  });
}
