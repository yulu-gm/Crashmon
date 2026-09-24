# 文档导航与归档规则

## 文档放在哪里

| 问题 | 位置 |
| --- | --- |
| 此前完整方案是什么？ | [overview/](overview/README.md) |
| 公共系统如何实现？ | [architecture/](architecture/README.md) |
| 玩家如何组队、行动、捕捉和成长？ | [game-design/](game-design/README.md) |
| 某只宠物怎样设计？ | [content/pets/](content/pets/README.md) |
| 某个活动怎么玩、如何退场？ | [content/activities/](content/activities/README.md) |
| 1.0 包含什么、不做什么、如何验收？ | [versions/](versions/README.md) |
| 哪些决定已确认，为什么？ | [decisions/](decisions/README.md) |
| 怎样发布、维护、备份和恢复？ | [operations/](operations/README.md) |

底层设计不放进 1.0 临时目录。永久宠物也不只存在于某个会结束的活动目录。

## 当前三个工作入口

[底层设计](architecture/foundation-design.md)、[核心玩法规则](game-design/core-rules.md)、[1.0 内容大纲](versions/1.0/outline.md)。目前均为工作稿，后续围绕第一条可玩流程共同收敛。

## 单一正文与引用

护盾在玩法上怎样计算写进核心玩法规则；服务器怎样执行和保存写进底层设计；某只宠物提供多少护盾写进宠物设计；1.0 是否包含它写进版本大纲。

每只宠物、每个活动只维护一份具体设计，不按版本复制。版本文档链接它们，实际发布记录注明对应提交或内容版本。代码目录只链接设计，不另写一份策划。

## 文档状态

新设计默认 Draft。Approved 需要人类确认记录；实现状态和验证证据单独记录。提交到 main 不等于批准或实现。

原始 overview/design-v0.1.md 保留为历史快照，不持续覆盖。当前设计维护在主题正文；重要变化记录确认依据与被替代规则。草稿不能覆盖已确认约定。

Markdown 是仓库维护正文，Word/PDF 仅作为需要时导出的快照，不同时维护两套设计。
