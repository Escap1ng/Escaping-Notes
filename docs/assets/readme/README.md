# README 配图

六张文件，两类来源：两张 PNG 由脚本复算，两张手写剖面图各有一深一浅两版。两张剖面图在 README 里用
GitHub 的 `#gh-light-mode-only` / `#gh-dark-mode-only` 片段按阅读者的界面主题切换（本地预览会把两版都画出来）。
**都不是一张照片**——它们要么是从源码复算出来的，要么是从 CSS 里抄出来的，
所以改了代码必须回来重跑，否则图就开始说谎。

| 文件 | 怎么来的 | 改动后要不要重跑 |
| --- | --- | --- |
| `plate-deep-space.png` | `npm run art:build` 按 `StarTrails.vue` 的常数离线复算稳态底片 | 要 |
| `plate-paper.png` | 同上，浅色主题（墨压干版，`source-over`） | 要 |
| `plate-layer.svg` · `plate-layer-light.svg` | 手写深 / 浅两版；数字取自 `src/App.vue`（`.sub-plate` 的 52% → 100% 压暗渐变、单张常驻、四周外撑 3 倍模糊半径）与 `site.css` 的 `--plate-*` / `--ink-0`，对比度两档实测取自 `App.vue` 注释与 `check_contrast` 输出 | 改底片层几何/节奏/实测值时手改，两版一起 |
| `fall-timing.svg` · `fall-timing-light.svg` | 手写深 / 浅两版；时长与缓动取自 `site.css` §8 | 改转场时手改，两版一起 |

两版配色分别照抄 `site.css` §2（深色）/ §3（浅色）的 `--ink-1` / `--text-0` / `--text-1` / `--cold` / `--hot`；改主题令牌时两版都要跟。

> 前身 `dark-band.svg`（暗带契约剖面）已于 2026-10-10 随该机制退休一并撤下——星轨现在只由首页那台相机绘制，次级页文字底下是照片底片，`--sky-band` / `--sky-feather` / `--sky-k` 目前无消费方。要找回那张图：`git log --diff-filter=A -- docs/assets/readme/dark-band.svg`。

## 底片两张（PNG）

`scripts/build_readme_art.mjs` 不画"像星空的图"：常数是从源码里正则读出来的，读不到就直接抛错，
所以图与代码不会悄悄分叉。它复算的是 `buildPlate()`（`PLATE_OM` / `PLATE_FADE` / `PLATE_STEPS`）
那张稳态底片，也就是 `prefers-reduced-motion` 用户实际看到的同一张。

```bash
npm run art:build                       # 默认 1280×760、2× 超采样
ART_W=1600 ART_H=950 npm run art:build  # 换尺寸
ART_DEV_DEEP=1 ART_DEV_PAPER=1 npm run art:build  # 关掉冲印增益，看底片本来的浓度
```

**必须知道的一处加工**：底片按星等幂分布压向暗端，原样出图在 README 的缩略尺寸下几乎看不见，
所以出图时乘了一档显示增益（当前 深色 ×2.8 / 浅色 ×1.6，见脚本末尾的 `冲印增益=` 日志）。
**站点实际观感比图更暗**，README 的图注里也这么写着。要换倍数就改 `ART_DEV_DEEP` / `ART_DEV_PAPER`
并重跑，然后同步图注。

**深色那张还有一道锁色相的高光压缩**：加色合成的色相由三通道比例决定，线性增益的亮部逐通道截顶
会把冷蓝 / 朱砂一起漂成奶白；所以合成末段按整像素等比收进上限（三通道乘同一系数），色相锁住、
亮度观感不变。浅色那张走 source-over 的线性插值，不需要这一步。

## 想要真截图时

这个仓库的图是"复算"的，不是"拍"的。要换成真实截图，步骤是：

1. `npm run dev`，用**系统浏览器**（不是编辑器内嵌的网页视图——那边 rAF 不动，星轨长不出来）打开首页；
2. 等约 30 秒让底片累积到稳态，再截 1280×760 的视口，存成同名文件覆盖；
3. 覆盖后 README 图注里"离线复算"那半句要一起改掉，否则图注就不成立了。
