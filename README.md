# Crashmon

面向约 10–20 名玩家、5–10 人同时在线的共创抓宠回合制页游。

**常驻系统 + 活动插件；人类负责设计，Agent 负责实现与技术维护。**

## 当前阶段

M3：多人同屏据点与初始伙伴本地原型已实现。登录后可移动、与 NPC 对话、三选一领取初始伙伴，刷新或重登后恢复队伍。已有账号和基础档案保留；同一服务内可看见其他玩家与移动；战斗、野外和公开部署尚未实现。

本轮采用 Node.js 内置模块与 SQLite，不安装第三方依赖。未来游戏引擎与多人战斗形式仍待确认；当前选择与边界见[首个实现里程碑](docs/architecture/account-save-milestone.md)。

## 本地运行

需要 Node.js 24+（本机实际验证 25.8.0），在仓库根目录运行：

```sh
npm run invite
npm start
```

打开 http://127.0.0.1:3000，使用生成的一次性邀请码注册，再登录、修改昵称与偏好并保存。登录后直接进入据点：WASD／方向键或点击地面移动，靠近引导员按 E 交谈。领取伙伴会自动保存，退出重登或重启服务后可恢复。每个新账号需要新的邀请码。无需 npm install。

数据默认保存在 `data/crashmon.sqlite`，不提交 Git。`npm test` 运行隔离集成测试，`npm run check` 检查语法。详细参数、接口与限制见[运行说明](docs/architecture/account-save-milestone.md)。

## 开始工作

| 任务 | 入口 |
| --- | --- |
| 阅读完整讨论方案 | [总体设计 v0.1](docs/overview/design-v0.1.md) |
| 确认文档归档位置 | [文档导航](docs/README.md) |
| 设计底层结构 | [常驻系统底层设计](docs/architecture/foundation-design.md) |
| 设计注册、登录、会话和账号恢复 | [账号与会话](docs/architecture/accounts-and-sessions.md) |
| 设计用户数据、资产结算与存档 | [玩家数据与持久化](docs/architecture/player-data-and-persistence.md) |
| 设计全局玩法规则 | [核心玩法规则](docs/game-design/core-rules.md) |
| 设计首次冒险与 NPC 领宠流程 | [首次体验](docs/game-design/first-session.md) |
| 规划游戏 1.0 | [1.0 内容大纲](docs/versions/1.0/outline.md) |
| 设计具体宠物和活动 | [内容设计](docs/content/README.md) |
| 查确认记录与待决项 | [设计决策](docs/decisions/README.md) |
| Agent 接手 | [AGENTS.md](AGENTS.md) |

## 目录

```text
app/                 HTTP 入口与账号/档案网页
framework/           认证、会话与 SQLite 存档实现
content/pets/        具体宠物实现；尚未实现
content/activities/  活动插件实现；尚未实现
playground/          独立创作试玩环境；尚未实现
tests/               账号与存档集成测试、公共验收规格
docs/
  overview/          原始总体方案
  architecture/      底层技术设计：系统如何实现
  game-design/       常驻玩法规则：玩家如何游玩
  content/           具体宠物与活动设计
  versions/1.0/      本版范围、内容组合与验收
  decisions/         重要确认记录与待决问题
  templates/         宠物、活动设计模板
  operations/        发布、维护和恢复文档入口
```

目录表示职责，不代表独立服务、软件包或已冻结的技术栈。

当前玩法与数据迁移说明见[二维据点原型](docs/game-design/hub-prototype.md)。

多人体验方法与范围见[共享据点说明](docs/architecture/shared-hub.md)：两个独立浏览器登录不同账号、连接同一个本地服务。

## 下一步

按本轮方向，先验证账号与存档闭环；战斗规则暂缓收束。[首次体验工作稿](docs/game-design/first-session.md)保留为后续地图、NPC 领宠与冒险实现的设计输入。

注册、登录、档案恢复与一次性初始领宠已接通；战斗和活动后续接入。这些不是要求玩家执行的新手任务；也不能把独立账号登录视为已经实现合作玩法。

用具体内容反推需要的公共功能，不先建设万能框架。具体宠物与活动各维护一份设计，版本大纲引用它们。活动可以退场，但已获得宠物需要的定义、技能与素材不能消失。
