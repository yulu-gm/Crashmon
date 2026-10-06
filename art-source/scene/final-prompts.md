# 最终地表返修提示词

方式：内置 ImageGen。文件复制到项目后运行，不依赖生成工具的临时路径。

## 沙地 `app/public/assets/scene/terrain.png`

```text
Use case: style-transfer.
Asset type: production ground-only region background for the Crashmon native 2D Canvas game, 3:2 landscape, opaque.
Input image 1 is the current ground-only texture to edit; image 2 is the USER'S visual style reference, not a composition to copy.
Primary request: edit only the ground texture of image 1 to closely match the quieter muted pale peach/beige sand and flat hand-painted blue-gray pebbles in image 2. Remove the intense orange/yellow saturation and noisy granular 3D-looking texture. Use delicate irregular ink outlines, calm watercolor/gouache fills, subtle worn paper, larger quiet patches between sparse tiny flat pebble marks, sparse flat pink/blue coral traces near edges. Preserve the current general ground composition and broad open middle area.
Constraints: ground surface only; no buildings, ships, gates, characters, UI, text, shadows from objects, water, tall rocks or large new obstacles. No horizon. Same 3:2 frame. Do not composite the reference screenshot into the ground. This will be beneath separately drawn objects, so the surface must stay uncluttered and readable. Match image 2's muted palette faithfully.
```

## 潮池 `app/public/assets/scene/pool.png`

```text
Use case: style-transfer.
Asset type: transparent independent low coastal tide pool sprite, 2:1 landscape.
Input image 1 is the pool edit target; input image 2 is the user's painterly game reference for style only.
Edit ONLY the material rendering and colors of the pool and its low rock edge: match image 2's muted slate blue / teal water with a few small pale peach reflected glints, thin irregular ink outlines, flat watercolor/gouache rock faces, worn paper texture. Quiet readable water, not dense bright cyan sparkle or yellow webbing. Remove excessive noise and saturation. Preserve the same shallow horizontally oval pool silhouette, low border rocks, sparse coral, elevated three-quarter view and full framing. Keep all exterior background genuinely transparent. No new terrain or ground plane, no buildings, characters, text, shadows, decorative frame or UI. This will sit over a separate sand terrain in the game; must fit its existing footprint.
```
