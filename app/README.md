# 应用入口与装配

`server.js` 提供本地 HTTP 服务和明确列出的静态资源；`public/` 为注册、登录与冒险档案网页。网页不持有数据库或密码哈希，不用 localStorage 保存会话。

在仓库根目录运行 `npm start`。详细参数、接口与限制见[首个实现里程碑](../docs/architecture/account-save-milestone.md)。`world.js` 提供二维据点表现，五只伙伴和遭遇定义由服务端装配；`battle-client.js`、`battle-renderer.js` 与 `battle.css` 提供遭遇卡片、战斗舞台、图鉴和编队。见[据点原型](../docs/game-design/hub-prototype.md)。

当前战斗为本地 PvE，固定基础值且经验仅记账；完整野外、升级进化与部署未实现。接口见[战斗框架](../docs/architecture/battle-framework.md)，验证见[本轮记录](../docs/verification/battle-2026-10-06.md)。

`room-client.js` 负责共享据点连接与重连，`shared/hub-map.js` 保存公开碰撞几何，由服务端和客户端使用。
