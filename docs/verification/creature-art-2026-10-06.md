# 伙伴素材与演出验证

日期：2026-10-06。在本地工作区验证，当前包含另一轮已存在的 B0 战斗改动；没有把这些未提交改动当作本轮独立提交。测试使用 `/tmp/crashmon-creature-art-qa.sqlite` 与本轮单独启动的 3021 服务，未操作既有玩家数据库。

## 已验证

- `npm run check`、`git diff --check` 通过。
- `npm test`：47/47 通过。本轮只增加两项有实际回归风险的检查：火焰真实取样框/共同像素比例，以及多次行动顺序/减少动态效果；没有给配色和静态检查页增加测试。
- `npm run art:check`：5 只、11 张 PNG、72 个地图/战斗采样框通过；普攻和两个主动技能映射齐全。
- `crashmon-sprite-production` 通过官方 `quick_validate.py`。检查脚本缺少的 PyYAML 放在独立临时验证环境中，游戏与 skill 的 PNG 检查仍只使用 Node 内置模块。
- 浏览器：Chrome，1360×1000 与 390×844。检查台 5 只 × 2 朝向 × 4 动作，共 40 组；暂停定位接触/辅助姿势，减少动态效果回到静止图。无脚本错误、素材 HTTP 错误或横向溢出。
- 同一套 `createBattleRenderer` 的四对四布局检查：桌面左右两阵营、窄屏上下两阵营，名字、生命条与角色保持分离。这里是表现样本，未把它称为多人战斗或完整四对四浏览器玩法测试。
- 实际页面：临时账号持有苔伞龟，营地显示四向待机伙伴，图鉴显示新形象。通过界面进入收纳仔教学遭遇并执行碰撞、撑伞；服务器返回对应技能及敌方普攻，演出重绘保留同轮进度。护盾与生命来自服务器结果。
- 补充实战：独立临时账号持有 starter_a，通过界面进入巡游仔教学遭遇，检查完整侧面待机与撞击接触姿势，未出现鼻尖裁切或邻帧；动作图集在进入战斗时加载，关闭战斗正常停止。

## 图像证据

| 证据 | 文件 |
| --- | --- |
| 五位伙伴向右动作总览 | [actions-east.png](creature-art-2026-10-06/actions-east.png) |
| 五位伙伴真实左向总览 | [actions-west.png](creature-art-2026-10-06/actions-west.png) |
| 桌面检查台与四对四队形 | [lab-desktop.png](creature-art-2026-10-06/lab-desktop.png) |
| 收纳仔辅助姿势与窄屏队形 | [lab-mobile.png](creature-art-2026-10-06/lab-mobile.png) |
| 营地新伙伴 | [camp-turtle.png](creature-art-2026-10-06/camp-turtle.png) |
| 实际图鉴 | [dex.png](creature-art-2026-10-06/dex.png) |
| 实际碰撞行动 | [battle-basic.png](creature-art-2026-10-06/battle-basic.png) |
| 实际撑伞行动 | [battle-cover.png](creature-art-2026-10-06/battle-cover.png) |
| 实际战斗手机布局 | [battle-mobile.png](creature-art-2026-10-06/battle-mobile.png) |
| 火焰伙伴完整待机 | [battle-fire-idle.png](creature-art-2026-10-06/battle-fire-idle.png) |
| 火焰伙伴完整撞击接触帧 | [battle-fire-contact.png](creature-art-2026-10-06/battle-fire-contact.png) |
| 检查结果 | [result.json](creature-art-2026-10-06/result.json) |

## 限制

新动作采用三种关键姿势加时间轴与独立效果，帧之间仍有轮廓/纸纹变化，尚未具备高帧率逐帧或骨骼动画的连贯性。美术候选未经用户外观批准。地图有四向待机和呼吸，新四只尚无四向行走。旧火焰攻击只有向右原图，敌方攻击使用镜像；其左右待机及四只新增角色使用真实视图。

没有修改战斗数值、存档、永久资产或地图碰撞；没有部署、升级进化或完整野外探索。测试通过只覆盖以上具体范围。
