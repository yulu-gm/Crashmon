# Crashmon 资源契约

从当前仓库读取 `content/pets/catalog.js` 与 `docs/content/pets/<物种 ID>.md`。2026-10-06 的接入入口如下；以后以代码为准。

| 用途 | 路径 |
| --- | --- |
| 标准图、动作关键姿势 | `app/public/assets/characters/<角色键>/{model,poses}.png` |
| 地图/战斗资源清单 | `app/public/character-assets.js` |
| 图像缓存、实际取样 | `app/public/character-renderer.js` |
| 身体姿势、技能映射、演出顺序 | `app/public/creature-animation.js` |
| 战场与同一套队形坐标 | `app/public/battle-renderer.js` |
| 地图转向待机与跟随 | `app/public/world.js` |
| HTTP 素材白名单 | `app/server.js` |
| 免登录逐姿势与四对四检查 | `/creature-lab` |
| 原有行走及火焰动作检查 | `/animation-lab` |
| 提示词记录 | `art-source/characters/b0/prompts.json` |

## 清单格式

`idle` 保存 `src, columns, rows, frames, origins`。`frames` 的键是 `south/north/west/east`，值为真实视角槽号。`origins` 是相对采样框的落脚/骨盆坐标，不是每帧自动包围盒中心。

战斗 `poses` 的前三槽是右向蓄势、接触、辅助，后三槽是真实左向对应姿势。`rects` 为 `[x,y,width,height]` 源图整像素矩形；省略时使用均匀格子。`referenceHeight` 是整段共同的原始像素高度，即使矩形高度不同也不能逐帧换比例。`heightScale` 只做整段比例校准。

动作 ID 必须与内容定义的 `basic.id`、`skills[].id` 一致。`creatureActions` 覆盖本轮每只伙伴的普攻和两个技能。地图新角色目前使用四向待机加轻微呼吸；没有新增四向行走。用户提出行走后再制作，不冒用别的角色的图。

## 裁切实例

旧火焰撞击原图 2172×724，第三个身体到 x=1693；按四等分在 x=1629 截断。现在实际矩形为 `[1090,0,614,724]`，参考高度仍是 724。最后一格也因此调整。战斗待机从完整标准侧面取样，不能把被截断的攻击最后一格当待机。

在临时数据库上验证登录、地图、领宠图、图鉴和战斗。不要用既有玩家数据做自动化试验。美术与动画不修改 SQLite、共享碰撞、战斗数值或资产结算。
