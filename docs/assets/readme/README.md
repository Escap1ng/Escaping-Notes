# README 配图

四张图，两类来源。**都不是一张照片**——它们要么是从源码复算出来的，要么是从 CSS 里抄出来的，
所以改了代码必须回来重跑，否则图就开始说谎。

| 文件 | 怎么来的 | 改动后要不要重跑 |
| --- | --- | --- |
| `plate-deep-space.png` | `npm run art:build` 按 `StarTrails.vue` 的常数离线复算稳态底片 | 要 |
| `plate-paper.png` | 同上，纸面主题（墨压干版，`source-over`） | 要 |
| `dark-band.svg` | 手写；数字取自 `neo.css` §1/§2/§3 与 `design-neo.md` §3.3 | 改令牌/改实测值时手改 |
| `fall-timing.svg` | 手写；时长与缓动取自 `neo.css` §8/§8.5 | 改转场时手改 |

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
所以出图时乘了一档显示增益（当前 深空 ×2.8 / 纸面 ×1.6，见脚本末尾的 `冲印增益=` 日志）。
**站点实际观感比图更暗**，README 的图注里也这么写着。要换倍数就改 `ART_DEV_DEEP` / `ART_DEV_PAPER`
并重跑，然后同步图注。

## 想要真截图时

这个仓库的图是"复算"的，不是"拍"的。要换成真实截图，步骤是：

1. `npm run dev`，用**系统浏览器**（不是编辑器内嵌的网页视图——那边 rAF 不动，星轨长不出来）打开首页；
2. 等约 30 秒让底片累积到稳态，再截 1280×760 的视口，存成同名文件覆盖；
3. 覆盖后 README 图注里"离线复算"那半句要一起改掉，否则图注就不成立了。
