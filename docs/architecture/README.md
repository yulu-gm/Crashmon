# 常驻系统底层设计

总体设计仍为 Draft；账号、共享据点与 B0 战斗已有本地实现，实施边界分别记录，不代表完整底层或正式运营能力通过验收。

| 正文 | 回答的问题 |
| --- | --- |
| [战斗框架与资产接入](battle-framework.md) | 时间轴、快照、捕获、回执、队伍、奖励和挂起恢复 |
| [底层设计总览](foundation-design.md) | 常驻职责、依赖、运行边界与活动生命周期 |
| [账号、登录与会话](accounts-and-sessions.md) | 身份建立、登录状态、权限、退出与账号恢复 |
| [玩家数据与持久化](player-data-and-persistence.md) | 玩家资产模型、事务、重试、存档、迁移与恢复 |

输入来自[核心玩法](../game-design/core-rules.md)、[1.0 大纲](../versions/1.0/outline.md)与[具体内容](../content/README.md)。实现位置是 [framework/](../../framework/README.md) 和 [app/](../../app/README.md)，验收入口是 [tests/](../../tests/README.md)。

账号和数据是跨版本常驻能力，不属于具体活动或 1.0 的临时文档。总览维护整体关系，专题各维护一份详细规则；不因文档拆分而拆服务器、软件包或空接口。

当前采用 Node.js 内置模块与 SQLite；后续只有出现真实拆分需要才增加专题。正式运营参数需另行确认；本轮独立验证见[战斗验收](../verification/battle-2026-10-06.md)。
