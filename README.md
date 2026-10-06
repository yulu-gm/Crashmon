# Crashmon

面向约 10–20 名玩家、5–10 人同时在线的共创抓宠回合制页游。

**常驻系统 + 活动插件；人类负责设计，Agent 负责实现与技术维护。**

## 当前阶段

M4：本地 PvE 战斗框架与五只伙伴已接通。在据点三选一领取伙伴，从右上角「探索 · 伙伴」进入遭遇、捕捉两种野生伙伴、管理 1–4 只队伍，并挑战示范首领。战斗与捕获自动保存，刷新后恢复；共享据点继续支持多人同屏。野外目前使用遭遇卡片，完整探索地图与公开部署尚未完成。

实现范围见[战斗框架](docs/architecture/battle-framework.md)，实际验收见[本轮验证](docs/verification/battle-2026-10-06.md)。五只伙伴均有普攻、两个主动技能及独立设计；当前固定基础值，经验仅记录，升级与进化尚未实现。

本轮采用 Node.js 内置模块与 SQLite，不安装第三方依赖。未来游戏引擎与多人战斗形式仍待确认；当前选择与边界见[首个实现里程碑](docs/architecture/account-save-milestone.md)。

2026-10-06 战斗设计已归档为[多单位回合制战斗策划案 v0.1 / B0](docs/game-design/battle-system.md)：最多四只同时上场、速度决定行动频率。框架已有本地实现，数值仍待实战平衡。

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
| 设计四单位、速度、技能、捕捉与胜负 | [多单位战斗策划案](docs/game-design/battle-system.md) |
| 设计首次冒险与 NPC 领宠流程 | [首次体验](docs/game-design/first-session.md) |
| 定义美术、幽默表达与查看参考图 | [美术方向 v1](docs/game-design/art-direction-v1.md) |
| 讨论首章宇宙探索内容 | [首章内容提案](docs/versions/1.0/universe-content-proposal.md) |
| 规划游戏 1.0 | [1.0 内容大纲](docs/versions/1.0/outline.md) |
| 规划下一阶段物品、经济与养成 | [P0 实施计划](docs/versions/1.0/p0-items-economy-growth-plan.md) |
| 设计具体宠物和活动 | [内容设计](docs/content/README.md) |
| 查确认记录与待决项 | [设计决策](docs/decisions/README.md) |
| Agent 接手 | [AGENTS.md](AGENTS.md) |

## 目录

```text
app/                 HTTP 入口与账号/档案网页
framework/           认证、会话与 SQLite 存档实现
content/pets/        五只伙伴、技能与表现定义
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

题材与视觉方向现已进入讨论：宇宙探索、细线与柔和色块的复古幻想场景、性格幽默的伙伴。先用少量样张验证，再逐步替换占位素材；参考截图仅用于文档，不作为运行素材或授权证明。具体首章名称、种族与配色仍为提案。

当前 [B0-C1 五只伙伴](docs/content/pets/README.md)与[教学及示范首领遭遇](docs/content/encounters/b0-encounters.md)已接入本地战斗。下一步继续试玩平衡、设计成长与进化、把遭遇接入可探索野外地图。[首次体验工作稿](docs/game-design/first-session.md)继续提供体验输入。

注册、登录、档案恢复、一次性初始领宠、战斗与捕捉已接通；活动后续接入。这些不是要求玩家执行的新手任务；也不能把独立账号登录视为已经实现合作玩法。

用具体内容反推需要的公共功能，不先建设万能框架。具体宠物与活动各维护一份设计，版本大纲引用它们。活动可以退场，但已获得宠物需要的定义、技能与素材不能消失。

## 美术与动作样本

本地服务启动后访问 `/creature-lab`，可免登录检查五只伙伴的左右战斗待机、普攻、两个技能、四方向地图待机及四对四队形。苔伞龟、星签雀、巡游仔、收纳仔已替换几何占位图，接入地图、领宠卡片、图鉴与本地战斗；火焰伙伴裁切已修复。可复用制作方法与 skill 见[伙伴素材生产流程](docs/art/creature-pipeline.md)。`npm run art:check` 校验实际 PNG、采样框、锚点与技能覆盖。

原有 `/animation-lab` 保留宇航员及火焰伙伴的四向行走、逐帧与喷嚏样本，资源历史见[第一轮角色动画](docs/art/character-sample.md)。新增四只伙伴本轮只补四向待机与呼吸，没有四方向行走。

访问 `/scene-lab` 可免登录检查营地场景，切换到飞船、研究站前后观察遮挡，并显示原有碰撞范围。正式营地共用同一套地面、独立建筑、道具、岸边前景和水面／灯光表现；右上角小地图显示建筑、引导员与玩家位置。素材组织与验证范围见[营地场景模块](docs/art/scene-modules.md)。
