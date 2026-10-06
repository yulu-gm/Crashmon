# 角色制作资料

标准参考候选：`player-model.png`、`flame-model.png`。运行时使用副本位于 `app/public/assets/characters/`。

`player-south-rejected.png` 为首次正面行走：同一条腿重复迈出，未作为最终样本使用。`player-south-v2-candidate.png` 保留返修中间稿；最终运行图已修正第三帧的前进脚。

图集 PNG 保留原始生成画布，运行时根据 `app/public/character-assets.js` 的整段共享比例、人工锚点和逐帧原点绘制。不逐帧按透明包围盒缩放，也不把最低不透明像素强行贴到地面。当前没有额外骨骼制作文件或 Spine 工程，不宣称已经建立量产骨骼流程。

所有新素材均是候选样本，程序验收通过不等于人类美术批准。提示词与验证记录见 `docs/art/character-sample.md`。
