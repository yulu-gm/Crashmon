# 账号与存档验证记录

日期：2026-09-25。环境：macOS，Node.js 25.8.0，npm 11.11.0。
候选基线：`22c0e9d` 加本轮未提交工作区。下表绑定实际测试的源码摘要；尚未创建提交或推送。

## 实际结果

- `npm test`：8 项通过、0 失败、0 跳过，约 7.7 秒。两条“内部存储或服务异常”日志来自测试主动注入数据库故障，不是意外失败。
- `npm run check`：通过。
- `git diff --check`：通过。
- 文档本地链接检查：通过。
- 浏览器：完成创建账号、登录、保存中文昵称和两项偏好、退出、再次登录；昵称及偏好恢复正确。查看桌面截图，内容可读。
- 服务重启后浏览器刷新：原会话与保存数据恢复；最终版本重新保存成功。
- 自动化真实进程恢复：子进程提交存档后被 SIGKILL，重新启动并登录，返回完整相同档案。

集成测试使用独立临时数据库，结束后清理；浏览器使用本地体验数据库中的合成测试账号。没有生产数据、发布或正式发奖。未验证手机实机、生产恢复、完整账号管理、宠物或战斗。

## 候选文件 SHA-256

| 文件 | 摘要 |
| --- | --- |
| `app/public/app.js` | `49e0efda11a81d544390586a7a396b6398721dc54ebe7efeadf7f6e348072128` |
| `app/public/index.html` | `eae36fdda5da954a6ec276313d1c9cf1d442b410deda2cce08700b8dc5006a6a` |
| `app/public/style.css` | `df302de42cb6b3d4fd0eafd61820e669bafa64b637a3f782c72324a8a1f5a1a8` |
| `app/server.js` | `84dfea06a0e025a8f762406bf4483d379f5528c49cee6666e813a0c9e63f076a` |
| `framework/auth.js` | `5aae35102e5cebee9018e267208a923bf60921df2a7052efc23a729b9c326222` |
| `framework/store.js` | `5dcc01c37bb064dd18cb154bd4d97703c7a7e1cc941f799444965a2d0e8a780c` |
| `package.json` | `b022bacf51da8ec9a96afa35105039305391dcb0f4d6e068deb76e7fe748834d` |
| `scripts/invite.js` | `fd6a8e1a42c886a067bcfb00011e173860c1755323457cac1fbdf61aa1b9812c` |
| `tests/integration/accounts.test.js` | `c4e252dd1637821c497eeed22a2cf4983ba12ee59ff7d2289475505dc3789f2b` |
| `tests/integration/restart.test.js` | `25eb6e576a36e4ee4e17928486fed0bbfdc80472885ba57830a06bce4b899caa` |
