# 宠物设计

每只宠物一份按稳定 ID 命名的规格，不按版本复制。公共规则引用[战斗 B0](../../game-design/battle-system.md)。

## B0-C1 最小内容表

设计状态：Draft；更新：2026-10-06。五只常驻定义与技能已实现，三选一 ID 保持兼容。内核测试覆盖三初始 × 两教学目标；人类手动试玩和平衡尚待记录。

| ID | 定位 | 正文 |
| --- | --- | --- |
| `starter_a` | 主动输出 | [炉尾狐](starter_a.md) |
| `starter_b` | 保护兼输出 | [苔伞龟](starter_b.md) |
| `starter_c` | 高速标记兼输出 | [星签雀](starter_c.md) |
| `wild_scout` | 教学捕获：速度与标记 | [巡游仔](wild_scout.md) |
| `wild_shell` | 教学捕获：护盾与输出 | [收纳仔](wild_shell.md) |

教学资格、遭遇 AI、奖励与示范首领统一维护在[遭遇内容表](../encounters/b0-encounters.md)。新 ID 是候选内容身份，不擅自改动现有 `starter_a/b/c`。显示名称、测试属性和数值不是正式图鉴定案。

完整成长与进化后续从[宠物模板](../../templates/pet-design.md)补充。永久定义、技能和素材不随活动退场；实现对应 [content/pets/](../../../content/pets/README.md)。

## 实现入口

常驻可序列化图鉴见 `content/pets/catalog.js`，五只均含基础数值、属性、普攻、两个主动、角色外观/性格/动作、获得方式。`starters.js` 从同一图鉴投影三选一显示，不复制技能规则。初始技能获得即解锁，无被动；B0 经验不转换等级或进化。后续素材可替换，但永久定义与稳定 ID 保留。
