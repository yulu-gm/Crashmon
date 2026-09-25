# 多人同屏验证记录

基线 a7933b8 加本轮未提交工作区，2026-09-25，macOS / Node.js 25.8.0。

- npm test：18 项通过，0 失败，0 跳过，约 12.9 秒。涵盖原有账号/领宠回归、共享房间、速度与边界、碰撞、断线、会话状态、接管、乱序请求及十人合法出生点。
- npm run check、git diff --check、本地文档链接检查：通过。
- 使用独立临时 SQLite 数据库，在 3001 端口启动测试服务。
- 浏览器玩家 room_alice 与独立 HTTP 登录客户端 room_bob 同时进入；截图确认两名角色与“据点在线 2 人”，两次截图确认远端角色移动。客户端不是虚构或写死的画面角色。
- 浏览器点击移动到 NPC 后出现交谈提示，位置来自服务器快照。
- Bob 退出后，浏览器人数变为 1，角色移除。
- Alice 第二标签页接管后，旧页显示接管提示并停止控制；关闭新页并手动重入可恢复。
- 实际停止服务，浏览器显示断线重连；重启相同数据库服务后，不刷新页面即自动恢复连接。
- 第二个独立浏览器控制连接不可用，未完成两独立浏览器完整端到端试玩；上述第二玩家使用独立 HTTP 会话。未做公网延迟、负载和多服务进程验证。

原 3000 端口本地服务已重启为新版，数据库 schema 不变，不修改用户伙伴。没有公开部署、提交或推送。

## 候选源码摘要

| 文件 | SHA-256 |
| --- | --- |
| `app/server.js` | `b1e4f92921076749d3414c58769ed267e6d5237c7dbc2346f75d320147d367d7` |
| `app/public/app.js` | `b0e8b6b4b7bf8462afbf1cbb0efa56625d7d0c0f1cbf1fc1fffb16f603d168e4` |
| `app/public/world.js` | `2840563b7b403535d4802581afbb7f053565ccd8173d52bb82274fb38828dcd4` |
| `app/public/room-client.js` | `217988289780cda4058bdaf0b76a88140af3d5aa08f732bb3823e6f2ca25cd21` |
| `app/shared/hub-map.js` | `2276b06c2187587f10f45ad986a6cfd39bb37f591906fd2db02daa8853c2c877` |
| `framework/room.js` | `7abb8fc20f01d0b65454edf41a4bbd7779fae8ae7e579078dc8d4da6fe925381` |
| `framework/store.js` | `f2aef010528afcff892032fc39a08ce956660ae4de6f4b7ca4274c1ee01f9113` |
| `tests/integration/room.test.js` | `0f17713634f82f4c4cfa439ee338969581209b22c5c6cd05ee2f85233892802d` |
| `tests/integration/accounts.test.js` | `dbea8dd553c1d027b330a1a416496c4a90b220cdb3a1699d88df910ba66d52b1` |
