# Crashmon

面向约 10–20 名玩家、5–10 人同时在线的共创抓宠回合制页游。

**常驻系统 + 活动插件；人类负责设计，Agent 负责实现与技术维护。**

## 当前阶段

M0：设计与目录初始化。当前只有设计文档、工作稿与目录说明，没有可运行游戏、依赖配置、测试、CI 或部署环境。

多人形式、技术栈、队伍人数、具体战斗规则和首版热插拔范围仍待确认。账号与玩家数据已补充专项草稿，登录方式和参数尚未冻结。草稿不等于已确认需求，更不等于已实现能力。

## 开始工作

| 任务 | 入口 |
| --- | --- |
| 阅读完整讨论方案 | [总体设计 v0.1](docs/overview/design-v0.1.md) |
| 确认文档归档位置 | [文档导航](docs/README.md) |
| 设计底层结构 | [常驻系统底层设计](docs/architecture/foundation-design.md) |
| 设计注册、登录、会话和账号恢复 | [账号与会话](docs/architecture/accounts-and-sessions.md) |
| 设计用户数据、资产结算与存档 | [玩家数据与持久化](docs/architecture/player-data-and-persistence.md) |
| 设计全局玩法规则 | [核心玩法规则](docs/game-design/core-rules.md) |
| 规划游戏 1.0 | [1.0 内容大纲](docs/versions/1.0/outline.md) |
| 设计具体宠物和活动 | [内容设计](docs/content/README.md) |
| 查确认记录与待决项 | [设计决策](docs/decisions/README.md) |
| Agent 接手 | [AGENTS.md](AGENTS.md) |

## 目录

```text
app/                 应用入口与内容装配；尚未实现
framework/           常驻系统实现；尚未实现
content/pets/        具体宠物实现；尚未实现
content/activities/  活动插件实现；尚未实现
playground/          独立创作试玩环境；尚未实现
tests/               公共验收与回归测试；尚未实现
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

## 下一步

并行细化 1.0 的首条可玩流程、核心玩法规则和底层能力。先验证注册、登录、初始资产只领取一次、退出重进与重启恢复，再接入战斗和活动；不能把独立账号登录视为已经实现合作玩法。

用具体内容反推需要的公共功能，不先建设万能框架。具体宠物与活动各维护一份设计，版本大纲引用它们。活动可以退场，但已获得宠物需要的定义、技能与素材不能消失。
