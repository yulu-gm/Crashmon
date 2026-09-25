import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { digest, token, HttpError, fields } from './auth.js';
const DAY = 86400000;

export function openStore(path, now = Date.now, starterIds = []) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path, { timeout: 5000 });
  if (path !== ':memory:') chmodSync(path, 0o600);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL;');
  const transaction = fn => {
    db.exec('BEGIN IMMEDIATE');
    try { const result = fn(); db.exec('COMMIT'); return result; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  };
  const version = db.prepare('PRAGMA user_version').get().user_version;
  if (version > 2) { db.close(); throw new Error('数据库版本比当前代码新，请使用匹配版本。'); }
  if (version === 0) transaction(() => db.exec(`
    CREATE TABLE accounts (
      id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), created_at INTEGER NOT NULL
    ) STRICT;
    CREATE TABLE invites (
      hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL, revoked INTEGER NOT NULL DEFAULT 0,
      used_by TEXT REFERENCES accounts(id)
    ) STRICT;
    CREATE TABLE players (
      user_id TEXT PRIMARY KEY REFERENCES accounts(id), nickname TEXT NOT NULL,
      sound_enabled INTEGER NOT NULL DEFAULT 1 CHECK(sound_enabled IN (0,1)),
      reduced_motion INTEGER NOT NULL DEFAULT 0 CHECK(reduced_motion IN (0,1)),
      onboarding TEXT NOT NULL DEFAULT 'awaiting_starter' CHECK(onboarding = 'awaiting_starter'),
      revision INTEGER NOT NULL DEFAULT 0 CHECK(revision >= 0), updated_at INTEGER NOT NULL
    ) STRICT;
    CREATE TABLE sessions (
      hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES accounts(id),
      created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, last_seen INTEGER NOT NULL
    ) STRICT;
    CREATE INDEX sessions_user ON sessions(user_id);
    CREATE TABLE receipts (
      user_id TEXT NOT NULL REFERENCES accounts(id), request_id TEXT NOT NULL,
      payload TEXT NOT NULL, result TEXT NOT NULL, created_at INTEGER NOT NULL,
      PRIMARY KEY(user_id, request_id)
    ) STRICT;
    PRAGMA user_version = 1;
  `));
  if (version < 2) transaction(() => db.exec(`
    CREATE TABLE pet_instances (
      id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES accounts(id), definition_id TEXT NOT NULL,
      team_position INTEGER NOT NULL CHECK(team_position >= 0), created_at INTEGER NOT NULL,
      UNIQUE(owner_id, team_position), UNIQUE(owner_id, id)
    ) STRICT;
    CREATE TABLE starter_claims (
      user_id TEXT PRIMARY KEY REFERENCES accounts(id), pet_id TEXT NOT NULL UNIQUE,
      definition_id TEXT NOT NULL, request_id TEXT NOT NULL, result TEXT NOT NULL,
      FOREIGN KEY(user_id, pet_id) REFERENCES pet_instances(owner_id, id)
    ) STRICT;
    PRAGMA user_version = 2;
  `));
  const player = id => {
    const row = db.prepare('SELECT * FROM players WHERE user_id = ?').get(id);
    const pets = db.prepare('SELECT id, definition_id AS definitionId, team_position AS teamPosition FROM pet_instances WHERE owner_id = ? ORDER BY team_position').all(id).map(p => ({ ...p }));
    const claimed = db.prepare('SELECT user_id FROM starter_claims WHERE user_id = ?').get(id);
    return { pets, userId: row.user_id, nickname: row.nickname, soundEnabled: Boolean(row.sound_enabled), reducedMotion: Boolean(row.reduced_motion), onboarding: claimed ? 'starter_received' : 'awaiting_starter', revision: row.revision, savedAt: row.updated_at };
  };
  return {
    db,
    close: () => db.close(),
    createInvite() {
      const secret = token(); const expiresAt = now() + 7 * DAY;
      db.prepare('INSERT INTO invites(hash, expires_at) VALUES (?,?)').run(digest(secret), expiresAt);
      return { token: secret, expiresAt };
    },
    revokeInvite(secret) { db.prepare('UPDATE invites SET revoked = 1 WHERE hash = ?').run(digest(secret)); },
    account(username) { return db.prepare('SELECT * FROM accounts WHERE username = ?').get(username); },
    register(username, passwordHash, invite) {
      return transaction(() => {
        const valid = db.prepare('SELECT hash FROM invites WHERE hash = ? AND expires_at > ? AND revoked = 0 AND used_by IS NULL').get(digest(invite), now());
        if (!valid || this.account(username)) throw new HttpError(400, '注册未成功，请检查邀请码和账号。');
        const id = randomUUID();
        db.prepare('INSERT INTO accounts(id,username,password_hash,created_at) VALUES (?,?,?,?)').run(id, username, passwordHash, now());
        db.prepare('INSERT INTO players(user_id,nickname,updated_at) VALUES (?,?,?)').run(id, username, now());
        db.prepare('UPDATE invites SET used_by = ? WHERE hash = ?').run(id, valid.hash);
        return { username };
      });
    },
    createSession(userId) {
      const secret = token(); const time = now();
      db.prepare('DELETE FROM sessions WHERE expires_at <= ? OR last_seen <= ?').run(time, time - DAY);
      db.prepare('INSERT INTO sessions VALUES (?,?,?,?,?)').run(digest(secret), userId, time, time + 7 * DAY, time);
      return secret;
    },
    authenticate(secret, touch = true) {
      if (!secret || !/^[\w-]{43}$/.test(secret)) throw new HttpError(401, '请重新登录。');
      const hash = digest(secret);
      const session = db.prepare(`SELECT s.user_id FROM sessions s JOIN accounts a ON a.id = s.user_id
        WHERE s.hash = ? AND s.expires_at > ? AND s.last_seen > ? AND a.active = 1`).get(hash, now(), now() - DAY);
      if (!session) throw new HttpError(401, '登录已失效，请重新登录。');
      if (touch) db.prepare('UPDATE sessions SET last_seen = ? WHERE hash = ?').run(now(), hash);
      return session.user_id;
    },
    logout(secret) { if (secret) db.prepare('DELETE FROM sessions WHERE hash = ?').run(digest(secret)); },
    player,
    claimStarter(id, body) {
      fields(body, ['definitionId', 'requestId']);
      if (!starterIds.includes(body.definitionId) || typeof body.requestId !== 'string' || !/^[\w-]{16,80}$/.test(body.requestId)) throw new HttpError(400, '请选择有效的初始伙伴。');
      return transaction(() => {
        const existing = db.prepare('SELECT * FROM starter_claims WHERE user_id = ?').get(id);
        if (existing) {
          if (existing.definition_id !== body.definitionId) throw new HttpError(409, '你已经领取过初始伙伴，不能重新选择。');
          return existing.request_id === body.requestId ? JSON.parse(existing.result) : player(id);
        }
        const petId = randomUUID();
        db.prepare('INSERT INTO pet_instances VALUES (?,?,?,?,?)').run(petId, id, body.definitionId, 0, now());
        db.prepare('INSERT INTO starter_claims VALUES (?,?,?,?,?)').run(id, petId, body.definitionId, body.requestId, '{}');
        db.prepare('UPDATE players SET revision = revision + 1, updated_at = ? WHERE user_id = ?').run(now(), id);
        const result = player(id);
        db.prepare('UPDATE starter_claims SET result = ? WHERE user_id = ?').run(JSON.stringify(result), id);
        return result;
      });
    },
    savePlayer(id, body) {
      fields(body, ['nickname', 'soundEnabled', 'reducedMotion', 'revision', 'requestId']);
      if (typeof body.nickname !== 'string' || body.nickname.trim().length < 1 || [...body.nickname.trim()].length > 24 || /[\p{Cc}\p{Cf}]/u.test(body.nickname) ||
          typeof body.soundEnabled !== 'boolean' || typeof body.reducedMotion !== 'boolean' || !Number.isSafeInteger(body.revision) || body.revision < 0 ||
          typeof body.requestId !== 'string' || !/^[\w-]{16,80}$/.test(body.requestId)) throw new HttpError(400, '请检查昵称、偏好设置和存档版本。');
      const payload = JSON.stringify({ nickname: body.nickname.trim(), soundEnabled: body.soundEnabled, reducedMotion: body.reducedMotion, revision: body.revision });
      return transaction(() => {
        const receipt = db.prepare('SELECT payload,result FROM receipts WHERE user_id = ? AND request_id = ?').get(id, body.requestId);
        if (receipt) {
          if (receipt.payload !== payload) throw new HttpError(409, '同一保存请求的内容已改变，请重新读取存档。');
          return JSON.parse(receipt.result);
        }
        const change = db.prepare(`UPDATE players SET nickname = ?, sound_enabled = ?, reduced_motion = ?, revision = revision + 1, updated_at = ? WHERE user_id = ? AND revision = ?`)
          .run(body.nickname.trim(), Number(body.soundEnabled), Number(body.reducedMotion), now(), id, body.revision);
        if (change.changes !== 1) throw new HttpError(409, '存档已在其他页面更新，请重新读取后再保存。');
        const result = player(id);
        db.prepare('INSERT INTO receipts VALUES (?,?,?,?,?)').run(id, body.requestId, payload, JSON.stringify(result), now());
        return result;
      });
    },
  };
}
