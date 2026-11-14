# README 配图

十二张文件，两类来源：四张 PNG 由脚本复算（两张底片 + 两张首图），四组手写示意图各有一深一浅两版（底片层剖面、转场时序、首屏加载次序、星环返工对照）。首图与示意图在 README 里用
GitHub 的 `#gh-light-mode-only` / `#gh-dark-mode-only` 片段按阅读者的界面主题切换（本地预览会把两版都画出来）。
**都不是一张照片**——它们要么是从源码复算出来的，要么是从 CSS 里抄出来的，
所以改了代码必须回来重跑，否则图就开始说谎。

| 文件 | 怎么来的 | 改动后要不要重跑 |
| --- | --- | --- |
| `hero-deep-space.png` | `ART_HERO=1 npm run art:build`，同一套常数的横幅取景（1568×560，天极居中） | 要 |
| `hero-paper.png` | 同上，浅色主题 | 要 |
| `plate-deep-space.png` | `npm run art:build` 按 `StarTrails.vue` 的常数离线复算稳态底片 | 要 |
| `plate-paper.png` | 同上，浅色主题（墨压干版，`source-over`） | 要 |
| `plate-layer.svg` · `plate-layer-light.svg` | 手写深 / 浅两版；数字取自 `src/App.vue`（`.sub-plate` 的 52% → 100% 压暗渐变、单张常驻、四周外撑 3 倍模糊半径）与 `site.css` 的 `--plate-*` / `--ink-0`，对比度两档实测取自 `App.vue` 注释与 `check_contrast` 输出 | 改底片层几何/节奏/实测值时手改，两版一起 |
| `fall-timing.svg` · `fall-timing-light.svg` | 手写深 / 浅两版；时长与缓动取自 `site.css` §8 | 改转场时手改，两版一起 |
| `hero-load-order.svg` · `hero-load-order-light.svg` | 手写深 / 浅两版；次序与数值取自 `src/lib/hero.js`（`whenHeroReady` 的 load/error/20s 兜底）、`HorizonHero.vue`（0.24s 淡入、36px 替身、0.9s 星轨淡入）、`site.css`（≤720px 1800px 重采样）、`StarTrails.vue`（`RETURN_HOLD=240`）与 `App.vue`（抽屉底片等首滚）；泳道长度表次序、不表毫秒 | 改首屏排程时手改，两版一起 |
| `ring-rework.svg` · `ring-rework-light.svg` | 手写深 / 浅两版；返工前后亮星位置的示意，数值取自 `docs/design.md` §3.1（R=0.996 / 相关 0.998→0.205 / `EXPOSURE_DEG=64`）；点位是示意排布，非逐根复算 | 改星等分层或曝光口径时手改，两版一起 |

两版配色分别照抄 `site.css` §2（深色）/ §3（浅色）的 `--ink-1` / `--text-0` / `--text-1` / `--cold` / `--hot`；改主题令牌时两版都要跟。

> 前身 `dark-band.svg`（暗带契约剖面）已于 2026-10-10 随该机制退休一并撤下——星轨现在只由首页那台相机绘制，次级页文字底下是照片底片，`--sky-band` / `--sky-feather` / `--sky-k` 目前无消费方。要找回那张图：`git log --diff-filter=A -- docs/assets/readme/dark-band.svg`。

## 底片两张（PNG）

`scripts/build_readme_art.mjs` 不画"像星空的图"：常数是从源码里正则读出来的，读不到就直接抛错，
所以图与代码不会悄悄分叉。它复算的是 `buildPlate()`（`PLATE_OM` / `PLATE_FADE` / `PLATE_STEPS`）
那张稳态底片，也就是 `prefers-reduced-motion` 用户实际看到的同一张。

```bash
npm run art:build                       # 底片双图，默认 1280×760、2× 超采样
ART_HERO=1 npm run art:build            # 首图双图，默认 1568×560、天极居中
ART_W=1600 ART_H=950 npm run art:build  # 换尺寸
ART_DEV_DEEP=1 ART_DEV_PAPER=1 npm run art:build  # 关掉冲印增益，看底片本来的浓度
```

首图与底片共用全部星群与尾迹常数，只有取景不同：横幅把天极摆在正中（沿用 `sky.js` 的分数会把星环推出画外），
外环出框是裁切的结果，不是模型变了。改星轨参数后两种取景都要重跑。

**必须知道的一处加工**：底片按星等幂分布压向暗端，原样出图在 README 的缩略尺寸下几乎看不见，
所以出图时乘了一档显示增益（当前 深色 ×2.0 / 浅色 ×1.42，见脚本末尾的 `冲印增益=` 日志）。
这对增益**与组件共用同一来源**（`StarTrails.vue` 的 `DEV_DEEP` / `DEV_PAPER`，脚本以 `1 + num(...)` 读入），
所以图上的浓淡就是页面上的浓淡，README 图注也这么写。要换浓度只改组件并重跑；
`ART_DEV_DEEP` / `ART_DEV_PAPER` 仍可临时覆盖出图，覆盖后记得同步图注。

**深色那张还有一道锁色相的高光压缩**：加色合成的色相由三通道比例决定，线性增益的亮部逐通道截顶
会把冷蓝 / 朱砂一起漂成奶白；所以合成末段按整像素等比收进上限（三通道乘同一系数），色相锁住、
亮度观感不变。浅色那张走 source-over 的线性插值，不需要这一步。

## 想要真截图时

这个仓库的图是"复算"的，不是"拍"的。要换成真实截图，步骤是：

1. `npm run dev`，用**系统浏览器**（不是编辑器内嵌的网页视图——那边 rAF 不动，星轨长不出来）打开首页；
2. 等约 30 秒让底片累积到稳态，再截 1280×760 的视口，存成同名文件覆盖；
3. 覆盖后 README 图注里"离线复算"那半句要一起改掉，否则图注就不成立了。
