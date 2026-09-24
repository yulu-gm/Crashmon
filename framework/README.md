# 常驻系统实现

未来放账号与登录会话、玩家档案与资产、公共战斗与成长、持久化与事务、活动宿主、受控运营和公开能力。当前没有实现或正式接口。

设计入口：[底层总览](../docs/architecture/foundation-design.md)、[账号与会话](../docs/architecture/accounts-and-sessions.md)、[玩家数据与持久化](../docs/architecture/player-data-and-persistence.md)。

按真实用例拆模块，不生成空类；框架不主动导入具体宠物和活动，由应用入口装配。账号、数据库和服务端秘密不能进入客户端依赖；活动不能绕过身份、归属与资产结算。目录划分不意味着独立服务或实际安全沙箱。
