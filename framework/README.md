# 常驻系统实现

`auth.js` 提供凭据校验、scrypt 密码哈希与随机令牌；`store.js` 提供 SQLite 迁移、邀请、账号、会话、档案和幂等保存事务。

目前已实现基础账号、存档、一次性初始伙伴领取和 B0 战斗。`battle.js` 为纯内核；`battle-store.js` 接通快照、队伍、背包、永久捕获、幂等回执和唯一结算。数据库身份决定读写归属，客户端只能提交明确允许的档案编辑与战斗指令。实现边界见[首个里程碑](../docs/architecture/account-save-milestone.md)。

战斗接口、v3 迁移与技术挂起边界见[框架说明](../docs/architecture/battle-framework.md)，实际验证见[验收记录](../docs/verification/battle-2026-10-06.md)。固定基础值与经验记账已经接通，升级进化未实现。

框架不主动导入具体宠物和活动，由应用装配。账号凭据、数据库与服务端秘密不能进入客户端。

`room.js` 管理单进程共享房间与权威移动，地图碰撞由 app 注入；公开数据与会话校验边界见[共享据点](../docs/architecture/shared-hub.md)。
