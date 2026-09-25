# 应用入口与装配

`server.js` 提供本地 HTTP 服务和明确列出的静态资源；`public/` 为注册、登录与冒险档案网页。网页不持有数据库或密码哈希，不用 localStorage 保存会话。

在仓库根目录运行 `npm start`。详细参数、接口与限制见[首个实现里程碑](../docs/architecture/account-save-milestone.md)。`world.js` 提供二维据点表现，初始伙伴定义由服务端装配；战斗仍未实现。见[据点原型](../docs/game-design/hub-prototype.md)。
