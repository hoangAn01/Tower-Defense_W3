# Wildwood art

`forest.webp` and `units.webp` were generated for this project with OpenAI image generation on 2026-10-04. No third-party asset pack or external runtime download is used. The generated PNG originals are retained outside the checkout in `/workspace/generated_images`; the WebP files here are optimized delivery copies with unit transparency preserved.

`forest.webp`: 1448 × 1086 forest clearing background, rendered beneath both map routes.

`units.webp`: 1254 × 1254 transparent atlas, divided into nine 418 × 418 cells in row-major order:

| Row | Left | Middle | Right |
| --- | --- | --- | --- |
| 1 | Basic turret | Sniper turret | Cannon turret |
| 2 | Frost obelisk | Normal goblin | Fast imp |
| 3 | Tank golem | Boss demon | Scout wolf |

The game samples cells directly when drawing canvas sprites. Menu portraits use the same atlas through CSS background positions. Terrain and route are cached after image loading; grid overlays appear only during tower placement. Image-loading failure falls back to the vector rendering so play remains available.
