# 常驻系统底层设计

当前文档均为 Draft，尚无实现、正式接口或通过验证的能力。

| 正文 | 回答的问题 |
| --- | --- |
| [底层设计总览](foundation-design.md) | 常驻职责、依赖、运行边界与活动生命周期 |
| [账号、登录与会话](accounts-and-sessions.md) | 身份建立、登录状态、权限、退出与账号恢复 |
| [玩家数据与持久化](player-data-and-persistence.md) | 玩家资产模型、事务、重试、存档、迁移与恢复 |

输入来自[核心玩法](../game-design/core-rules.md)、[1.0 大纲](../versions/1.0/outline.md)与[具体内容](../content/README.md)。实现位置是 [framework/](../../framework/README.md) 和 [app/](../../app/README.md)，验收入口是 [tests/](../../tests/README.md)。

账号和数据是跨版本常驻能力，不属于具体活动或 1.0 的临时文档。总览维护整体关系，专题各维护一份详细规则；不因文档拆分而拆服务器、软件包或空接口。

后续只有出现真实拆分需要才增加专题。邀请制、数据库和会话参数等建议必须确认后再实现，不将文档更新视为全部选型获批。
