# 文档导航与归档规则

## 文档放在哪里

| 问题 | 位置 |
| --- | --- |
| 此前完整方案是什么？ | [overview/](overview/README.md) |
| 公共系统如何实现？ | [architecture/](architecture/README.md) |
| 玩家怎样注册、登录、退出和找回账号？ | [账号与会话](architecture/accounts-and-sessions.md) |
| 玩家资产怎样保存、授权、结算和恢复？ | [玩家数据与持久化](architecture/player-data-and-persistence.md) |
| 初次进入后怎样移动、领宠、探索并组成小队？ | [首次体验](game-design/first-session.md) |
| 玩家如何组队、行动、捕捉和成长？ | [game-design/](game-design/README.md) |
| 某只宠物怎样设计？ | [content/pets/](content/pets/README.md) |
| 某个活动怎么玩、如何退场？ | [content/activities/](content/activities/README.md) |
| 1.0 包含什么、不做什么、如何验收？ | [versions/](versions/README.md) |
| 哪些决定已确认，为什么？ | [decisions/](decisions/README.md) |
| 怎样发布、维护、备份和恢复？ | [operations/](operations/README.md) |

底层设计不放进 1.0 临时目录。永久宠物也不只存在于某个会结束的活动目录。

## 当前工作入口

当前多人能力见[共享据点](architecture/shared-hub.md)：同屏角色、移动同步、连接与离线处理。

当前可运行内容及命令见[注册、登录与存档里程碑](architecture/account-save-milestone.md)。战斗暂缓收束，先验证账号与持久化闭环。

[首次体验](game-design/first-session.md)、[核心玩法规则](game-design/core-rules.md)、[1.0 内容大纲](versions/1.0/outline.md)与[底层总览](architecture/foundation-design.md)共同收敛第一条可玩流程。

账号和玩家数据的详细边界已拆为两个有实际需求的专题，底层总览只保留职责和链接。上述文档目前均为 Draft，不是正式接口或已实现能力。

## 单一正文与引用

护盾在玩法上怎样计算写进核心玩法规则；服务器怎样执行和保存写进底层设计；某只宠物提供多少护盾写进宠物设计；1.0 是否包含它写进版本大纲。

账号认证、会话和恢复写进账号专题；永久数据结构、事务和备份写进数据专题；1.0 只引用它们并定义交付范围。首次移动、NPC 领宠、探索和组队教学维护在 game-design/first-session.md，1.0 引用该正文；不复制认证规则，也不把退出重登等工程验收写成玩家任务。

每只宠物、每个活动只维护一份具体设计，不按版本复制。版本文档链接它们，实际发布记录注明对应提交或内容版本。代码目录只链接设计，不另写一份策划。

## 文档状态

新设计默认 Draft。Approved 需要人类确认记录；实现状态和验证证据单独记录。提交到 main 不等于批准或实现。

原始 overview/design-v0.1.md 保留为历史快照，不持续覆盖。当前设计维护在主题正文；重要变化记录确认依据与被替代规则。草稿不能覆盖已确认约定。

Markdown 是仓库维护正文，Word/PDF 仅作为需要时导出的快照，不同时维护两套设计。
