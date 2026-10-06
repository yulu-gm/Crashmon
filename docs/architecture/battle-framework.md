# B0 战斗框架与资产接入

更新：2026-10-06。实现状态：本地原型已接通；平衡、正式运营权益与部署仍待验收。规则正文是[战斗 B0](../game-design/battle-system.md)，内容是[B0-C1 宠物](../content/pets/README.md)与[遭遇](../content/encounters/b0-encounters.md)。

## 模块边界

- `framework/battle.js` 是可序列化的纯战斗内核，负责连续速度时间轴、合法指令、伤害、状态、AI、捕捉与终局；随机状态由服务器产生并持久化，响应不暴露随机状态。
- `framework/battle-store.js` 负责每账号唯一进行中战斗、事务、请求回执、背包差量、永久捕获和最终奖励。
- `content/pets/catalog.js` 与 `content/encounters/index.js` 定义五只宠物、示范首领及遭遇。`app/server.js` 装配这些定义，常驻存档层不导入具体内容。
- 客户端只提交指令和目标，按服务端结果显示。游戏思考、演出和刷新不推进虚拟时间。

## 持久化与恢复

账号数据库从 v2 升级为 v3：已有宠物的 `id`、`definition_id`、原收藏序号和领取资格保留；新增可空 `active_position` 区分最多四个队员与后备，以及仅记账的 `experience`。旧队伍前四个位置迁为在队；没有重发初始宠。`player.pets` 是完整持有列表，在队优先；`player.team` 是按出场位置排列的实例 ID。

每场保存参战快照、完整内容定义快照、规则版本、虚拟时间、进度、状态寿命、固定同刻顺序、AI 阶段、随机状态、背包、捕获列表、当前阶段、revision、行动机会 UUID 和现实截止时间。当前构建的规则标识是 `B0-C1`；以后修改解释语义时必须更新规则标识，不能直接用新解释器覆盖旧状态。

每次接受玩家行动后，在同一事务内执行指令及随后必要的 AI/回合开始步骤，停到下一位玩家等待或终局；事务期间没有网络等待。保存后的等待阶段不重复结算回合开始灼烧。SQLite WAL + FULL 同步；重启读取原状态，不重抽随机数。

请求先按账号与 requestId 查回执；同 ID 同内容原样返回，同 ID 改参数拒绝。新请求同时校验战斗归属、revision 和行动机会 ID。更换 requestId 不能复用旧机会。回执、随机变化、成本、捕获、经验和终局在同一事务提交；捕获记录由战斗 ID + 敌实例 ID 唯一，终局由战斗 ID 唯一，首胜由账号 + 遭遇 + 轮次唯一。

捕获立即加入永久持有，本场不入行动队列。战后若有合法队伍空位才自动入队，满四只则留在持有列表。战败、撤退及超时不会删除捕获或返还已消费道具。所有原参战实例获得配置经验；本场新捕获者不分经验。当前只有经验记账，没有升级或进化。

## 暂停与超时

最后一次有效玩家操作后 24 小时未活动，按放弃结算；读取、无效操作、回执重试不续期。判断使用持久截止时间，重启也会检查。

规则版本不匹配时挂起，返回上次保存的安全展示快照，不调用新解释器解释旧规则。技术事务异常会先整体回滚，再将已有战斗标为挂起。挂起期不自动放弃，GET 只读取；规则匹配后重试新行动时恢复，截止时间增加挂起时长。再次失败则重新挂起。数据库整体不可写或进程崩溃时无法可靠写挂起标记，须按后续运营恢复流程处理，当前未实现灾难恢复控制台。

## API

所有接口要求登录，写接口另外验证 Origin、请求标记和 `X-Crashmon-Player`。请求体拒绝未知字段；不接受客户端传入基础属性、概率、经验或资产归属。

| 方法与路径 | 请求内容 | 响应 |
| --- | --- | --- |
| GET `/api/battle-content` | 无 | 五宠定义、遭遇定义 |
| GET `/api/battle` | 无 | `{battle, player}`；未开过战斗时 battle 为 null |
| POST `/api/battle/start` | encounterId、requestId | battle、player |
| POST `/api/battle/action` | battleId、revision、actionId、requestId、command | battle、player |
| POST `/api/battle/abandon` | battleId、revision、requestId | battle、player |
| PATCH `/api/team` | petIds、revision、requestId | battle、player |
| POST `/api/supplies` | requestId | battle、player |

`command.type` 为 basic、skill、defend、item、capture 或 retreat；只按需要附 skillId、targetId。`battle` 包含 timeline、每单位 definition/effectiveStats/captureChance/intention、captureChances 索引、events、expiresAt、suspended 和服务器行动校验字段。结束时 reward 显示每名原参战者经验与补球数量。

每账号最多一场进行中战斗；进行中不能修改队伍或领取补给。1–4 个不同、确属账号的实例才可入队。遭遇 `enabled:false` 可拒绝新入场，既有战斗使用原快照继续。

## 原型经济边界

本轮为完整本地试玩明确加入：每账号主动领取一次基础球 10、恢复药 3；每场非教学胜利按配置补 1 基础球，避免球耗尽后永久失去普通捕捉能力。领取、重连、重试都不能重复增加补给。失败、撤退、超时及任何教学结束不发球。教学成功本身唯一发宠，不消耗正式球，不额外发经验。

持有容量为 20；满容量拒绝捕捉，不先扣球。恢复药只有一次补给来源，耗尽后仍可正常战斗，下场满血。上述是本地原型规则，正式经济尚未冻结；没有隐藏调试发宠或重置背包 API，不改现有真实 data 文件。

## 验证

`tests/integration/battle-api.test.js` 使用临时 SQLite 与独立临时端口，覆盖三初始 × 两教学路径、越权与旧机会、幂等与重启、捕获/终局/回执注入失败、队伍资格、一次补给、24 小时边界、版本及技术挂起、四人满队后备捕获、奖励唯一与首胜唯一。`accounts.test.js` 保留原 v1 迁移、会话与旧回执验证，并更新夹具到真实旧表结构。

测试不代表公开部署或多人战斗已实现。人工验收、浏览器表现与最终执行结果由主 Agent 单独记录。
