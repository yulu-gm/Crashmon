import { randomUUID } from 'node:crypto';
import { HttpError, fields } from './auth.js';

// 服务端单房间，只有移动中的短期状态；不向其他玩家暴露账号 ID 或完整存档。
export function createRoom({ now = Date.now, authenticate, profile, canWalk, speed }) {
  const members = new Map();
  const LEASE = 6000, INPUT_TIMEOUT = 400;
  function advance() {
    const time = now();
    for (const [userId, p] of members) {
      try { if (time - p.seen >= LEASE || authenticate(p.secret, false) !== userId) { members.delete(userId); continue; } }
      catch { members.delete(userId); continue; }
      const until = Math.min(time, p.seen + INPUT_TIMEOUT);
      let remaining = Math.max(0, until - p.tick) / 1000;
      while (remaining > 0) {
        const dt = Math.min(remaining, 1 / 60); remaining -= dt;
        let dx = 0, dy = 0;
        if (p.input.type === 'direction') { dx = p.input.x; dy = p.input.y; }
        if (p.input.type === 'target') { dx = p.input.x - p.x; dy = p.input.y - p.y; }
        const length = Math.hypot(dx, dy);
        if (length) {
          const distance = p.input.type === 'target' ? Math.min(speed * dt, length) : speed * dt;
          const x = p.x + dx / length * distance, y = p.y + dy / length * distance;
          let moved = false;
          if (canWalk(x, p.y)) { moved ||= x !== p.x; p.x = x; }
          if (canWalk(p.x, y)) { moved ||= y !== p.y; p.y = y; }
          if (!moved || (p.input.type === 'target' && length < 1)) p.input = { type: 'stop' };
        }
      }
      p.tick = time;
    }
  }
  function snapshot(self) {
    return { roomId: 'hub', selfId: self.id, connectionId: self.connectionId, players: [...members.values()].map(p => {
      const data = profile(p.userId);
      return { id: p.id, nickname: data.nickname, x: p.x, y: p.y, starterId: data.pets[0]?.definitionId ?? null };
    }) };
  }
  function current(userId, secret, connectionId) {
    const p = members.get(userId);
    if (!p) throw new HttpError(410, '地图连接已过期，请重新进入。');
    if (p.secret !== secret || p.connectionId !== connectionId) throw new HttpError(409, '该账号已在其他页面进入据点。');
    return p;
  }
  return {
    join(userId, secret) {
      advance();
      // 避免多个玩家出生在完全相同的位置；不加入玩家之间的阻挡规则。
      let spawn = { x: 480, y: 452 };
      for (let i = 0; i < 30; i++) {
        const candidate = { x: 384 + (i % 5) * 48, y: 420 + Math.floor(i / 5) * 30 };
        if (canWalk(candidate.x, candidate.y) && ![...members.values()].some(p => Math.hypot(p.x-candidate.x,p.y-candidate.y)<32)) { spawn = candidate; break; }
      }
      const p = { userId, secret, id: randomUUID(), connectionId: randomUUID(), ...spawn, input: { type: 'stop' }, seq: -1, seen: now(), tick: now() };
      members.set(userId,p); return snapshot(p);
    },
    sync(userId, secret, body) {
      fields(body, ['connectionId','sequence','input']);
      if (typeof body.connectionId !== 'string' || !Number.isSafeInteger(body.sequence) || body.sequence < 0) throw new HttpError(400, '地图请求编号不正确。');
      const input = body.input; fields(input,['type','x','y']);
      if (!['stop','direction','target'].includes(input.type)) throw new HttpError(400,'移动指令不正确。');
      if (input.type !== 'stop' && (!Number.isFinite(input.x) || !Number.isFinite(input.y))) throw new HttpError(400,'坐标必须是有效数字。');
      if (input.type === 'direction' && (Math.abs(input.x)>1 || Math.abs(input.y)>1)) throw new HttpError(400,'移动方向超出范围。');
      if (input.type === 'target' && (input.x<36 || input.x>924 || input.y<66 || input.y>598)) throw new HttpError(400,'移动目标超出地图。');
      advance(); const p = current(userId,secret,body.connectionId);
      if (body.sequence > p.seq) { p.input = { ...input }; p.seq = body.sequence; p.seen = now(); }
      return snapshot(p);
    },
    leave(userId, secret, connectionId) {
      const p = members.get(userId);
      if (p?.secret === secret && p.connectionId === connectionId) members.delete(userId);
    },
    disconnect(secret) { for (const [id,p] of members) if (p.secret === secret) members.delete(id); },
  };
}
