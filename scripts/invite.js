import { resolve } from 'node:path';
import { openStore } from '../framework/store.js';
process.umask(0o077);
const store = openStore(resolve(process.env.CRASHMON_DB ?? 'data/crashmon.sqlite'));
try {
  const invite = store.createInvite();
  console.log(`一次性邀请码：${invite.token}\n有效期至：${new Date(invite.expiresAt).toLocaleString('zh-CN')}\n请只分享给受邀玩家；每个账号需要一个邀请码。`);
} finally { store.close(); }
