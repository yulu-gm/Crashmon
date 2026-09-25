import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const derive = promisify(scrypt);
const options = { N: 131072, r: 8, p: 1, maxmem: 192 * 1024 * 1024 };
let activeHashes = 0;
export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const token = () => randomBytes(32).toString('base64url');
export const digest = value => createHash('sha256').update(value).digest('hex');
async function key(password, salt) {
  if (activeHashes >= 2) throw new HttpError(429, '登录服务繁忙，请稍后重试。');
  activeHashes++;
  try { return await derive(password, salt, 64, options); }
  finally { activeHashes--; }
}
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$131072$8$1$${salt}$${(await key(password, salt)).toString('hex')}`;
}
export async function verifyPassword(password, stored) {
  const parts = stored?.split('$');
  const salt = parts?.[4] ?? '00000000000000000000000000000000';
  const computed = await key(password, salt);
  const expected = Buffer.from(parts?.[5] ?? '00'.repeat(64), 'hex');
  return expected.length === computed.length && timingSafeEqual(computed, expected) && Boolean(stored);
}
export function fields(body, names) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(k => !names.includes(k))) {
    throw new HttpError(400, '请求字段不正确。');
  }
}
export function credentials(body, registration = false) {
  fields(body, registration ? ['username', 'password', 'invite'] : ['username', 'password']);
  if (typeof body.username !== 'string' || !/^[a-zA-Z0-9_]{3,24}$/.test(body.username)) throw new HttpError(400, '账号需为 3–24 位字母、数字或下划线。');
  if (typeof body.password !== 'string' || body.password.length < (registration ? 12 : 1) || body.password.length > 128) throw new HttpError(400, '密码需为 12–128 个字符。');
  if (registration && (typeof body.invite !== 'string' || !/^[\w-]{43}$/.test(body.invite))) throw new HttpError(400, '注册未成功，请检查邀请码和账号。');
  return { ...body, username: body.username.toLowerCase() };
}
