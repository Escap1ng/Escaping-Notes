<div align="center">

# Escaping Notes · 逃逸笔记

**一次对夜空的长曝光**

首页是一台开着快门的相机：往下滚，曝光加深、天空转快；文章按时间排，合集按主题分。纯静态，构建期定稿，push 即发布。

[**在线体验 → escaping.top**](https://escaping.top) · [English](README.en.md)

[![Pages](https://img.shields.io/github/actions/workflow/status/Escap1ng/Escaping-Notes/deploy.yml?label=Pages&style=flat-square)](https://github.com/Escap1ng/Escaping-Notes/actions/workflows/deploy.yml)
[![Release](https://img.shields.io/github/v/release/Escap1ng/Escaping-Notes?style=flat-square)](https://github.com/Escap1ng/Escaping-Notes/releases)
[![Vue 3](https://img.shields.io/badge/Vue%203-4FC08D?style=flat-square&logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![Vite 5](https://img.shields.io/badge/Vite%205-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev/)
[![Node 22+](https://img.shields.io/badge/Node%2022%2B-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/Content%20CC%20BY--NC--SA%20·%20Code%20Apache--2.0-4d4d4d?style=flat-square)](#许可)

</div>

<img src="docs/assets/readme/hero-deep-space.png#gh-dark-mode-only" alt="深色首图：同心星轨弧绕居中的天极累积，冷蓝与暖白之间点着几枚琥珀，外环出框" width="100%">
<img src="docs/assets/readme/hero-paper.png#gh-light-mode-only" alt="浅色首图：石板与石墨蓝的轨迹压在干版上，朱砂点在最亮的那几根，外环出框" width="100%">

<sub>首图不是截图：按站点同一套常数离线复算（`npm run art:build`，首图加 `ART_HERO=1` 取横幅景），复算的正是 `prefers-reduced-motion` 访客看到的稳态底片。出图与页面共用同一对显示增益（×2.0 / ×1.42），缩略图上的浓度与页面一致。</sub>

---

## 这台相机在数时间

星轨只在首页那一格里画。底片像素与全站时钟是 `src/lib/sky.js` 里的单例：换页不重铺，回到首页时弧接着上一次的曝光继续长；折线以下交给照片。交互上有三个旋钮：

- **滚动即时间**：首屏之内越往下滑，曝光窗口越长、天空转得越快（1 → 3.2 倍），滚过 1.1 倍视口高到底
- **指针即时间膨胀**：光标 180px 半径内的星轨局部加速卷曲，越靠中心越快（最高 2.8 倍）；进出光锥有一秒左右的惯性包络，不是硬边光斑
- **流星即叙事**：每 6–9 秒随机落一颗，单颗活 900ms，同屏最多九颗；播放器放歌时间隔压到四成，停下即自然回弹

流速曲线、遮罩剖面与流星参数记在 [docs/design.md](docs/design.md) §3。

## 星环是怎么画出来的

这一节记几次「看着不对」之后的返工，依据是三个实测数。

<img src="docs/assets/readme/ring-rework-light.svg#gh-light-mode-only" alt="星环返工示意：返工前亮星挤在一个 45° 扇区、半径随角度盘成螺线；返工后亮星铺满圆周、同心环" width="920">
<img src="docs/assets/readme/ring-rework.svg#gh-dark-mode-only" alt="星环返工示意：返工前亮星挤在一个 45° 扇区、半径随角度盘成螺线；返工后亮星铺满圆周、同心环" width="920">

**星等与角度撞了同一组数列。** 档位原先写成 `(i·0.381966…) mod 1`，而 `0.381966… = 1 − 0.618034…` 恰好是角度序列的补数，两者相加恒为 1，星等完全由角度决定。实测 220 根时 12 根亮星的圆统计集中度 R=0.996，全部挤在同一个 45° 扇区，画面一侧全是粗亮弧、另一侧只剩细淡弧。现在每档根数按星数精确配额（亮 24% / 中 60% / 暗 16%），亮星与中星的起始角等分圆周。

**半径与角度同步递增。** 等分圆周还不够：槽位序号同时决定半径，实测相关系数 0.998，亮星从 `(r=0.075, θ=10°)` 一路盘到 `(r=0.955, θ=345°)`，那是阿基米德螺线。角度槽位现在先过一道与档内根数互质的步长排列，相关系数降到 0.205，槽位集合不变，角向均匀性保持不变。

**每根弧长短不一。** 真实长曝光里所有恒星在同一时段走过相同角度；长短不一的短弧会被眼睛连成螺旋臂。现在全部共享一个曝光窗口（`EXPOSURE_DEG = 64`），只留 ±5% 的快门不匀；层次改由星等承担：线宽、亮度、星核。

还有两条结构性的兜底：任何笔画不细于 `LW_MIN = 1.25` CSS px——亚像素笔画在 1× 屏上被采样成断续灰点，是「细密淡线」的来源，暗档改靠颜色退成背景；星核画在当帧层、不累积（累积了就又变成一道弧），每道弧前沿因此有一颗点状的星。

当前星数：浅色 96 / 深色 62（窄屏 50 / 33）。底片按视口分配，`MAXPX = 6e6` 封顶、`MIN_DPR = 1.25` 兜底——每帧一次全屏 `destination-out` 加一次 `drawImage`，像素数就是固定开销。

## 界面

**视觉**

- 首屏只有英文刊头：桌面单行 8.8vw（整行约 81% 视口），手机断成两行 15vw；折线以下按章分卡
- 深色首屏是同一取景的压暗版，两套主题共用一条山脊折线；底片按主题各沉积一张，不串色。切主题时旧底片拍快照淡出、新底片分片显影，不整屏清空
- 默认浅色，首帧刻意不读系统 `prefers-color-scheme`：首屏是亮底照片，跟系统翻深色会变成亮图压黑底
- 星轨由离屏累积缓冲逐帧绘制（Canvas 2D），沿山脊以 `destination-in` 遮挡：脊线附近保留六成亮度，26px 羽化
- 全部界面由同一套令牌搭成：间距 6 档、字号 11 档、行高 4 档、字重 3 档、圆角 3 档；组件内不写裸字号与裸时长，改刻度即全站同步
- 两套自托管字体：正文衬线 Noto Serif SC 按 `unicode-range` 分片、按需下载；刊头 Didone 取 Playfair Display，单文件只含大写与空格
- 中文正文启用中西文自动间距与标点悬挂；标题折行 `text-wrap: balance`、段落 `pretty`；旧浏览器忽略这些属性，保持原状

**交互**

- 底片模糊与卡面颜色是运行时参数：设置卡里一条 0–12px 滑杆与两档单选（不透底 / 半透明），偏好记在 `localStorage`
- 焦点陷阱在顶栏抽屉、搜索卡、播放器卡、设置卡与文章看片框，关闭后焦点回到触发元素；`Esc` 或点阅读底板以外的空白退回列表；任意页面裸按 `/` 或 `Ctrl/⌘+K` 开搜索
- 键盘焦点与指针同享一套反馈：卡片光带、衍射星芒、按钮扫光各有与 hover 并列的 `:focus-visible` 规则，复用同一条过渡
- 播放器是一张控制台：绕极唱盘随播放转动、环形进度可拖可点可键盘（方向键 ±5s、Shift ±15s）、文件名派生的波形指纹、真静音开关记状态；空格切播放但不抢原生控件，接系统媒体键，音频取不到直接写明「无法播放」
- 窄屏菜单是全屏抽屉：三根线形变成叉、每条导航带一句说明、当前页除冷色高亮外另有左缘竖线与圆点，下方一排带文字的快捷操作；换页即收（含前进后退），快捷操作错开两层浮层的滚动锁
- 列表有骨架屏，「本来没有内容」与「筛选无结果」是两句文案；标签与关键词筛选写进 URL query，可分享、刷新不丢

**降级与可读性**

- `prefers-reduced-motion` 有完整静态出口：星轨停在稳态底片、转场不糊、晕影关停；触控目标撑到 44px，最小字号 11.5px
- 无纱的风景照片上放裸字到不了 WCAG AA（实测最坏点 1.0~1.8:1，与渐变形状无关），所以底片只当风景，正文一律落在卡面与阅读底板上；`npm run check:contrast` 每次提交前重算主题令牌对纯色底
- 常驻顶栏不用 `backdrop-filter`；玻璃只给阅读底板（半透明档）与导航抽屉

## 三处承重设计

### 底片层挂在 `App.vue` 上

<img src="docs/assets/readme/plate-layer-light.svg#gh-light-mode-only" alt="全站风景底片的剖面图：照片只在上沿全亮、52% 到 100% 沉回页面底色，以及裸字与卡面上前景对比度的实测值" width="920">
<img src="docs/assets/readme/plate-layer.svg#gh-dark-mode-only" alt="全站风景底片的剖面图：照片只在上沿全亮、52% 到 100% 沉回页面底色，以及裸字与卡面上前景对比度的实测值" width="920">

折线以下那张风景是 `App.vue` 里一层 `position: fixed` 的 `.sub-plate`，首页章节区与全部次级页共用。它必须挂在那里：`fall` 转场给页根加了 `filter`，而 `filter` 会成为 `position: fixed` 后代的包含块——同一层挂在 `HomeView` 里时实测被解析成 `.home` 的盒子（587×1629、跟着滚动），不是不动的底图。这些决定的实测过程记在 `src/App.vue` 与 `src/lib/plate.js` 的注释里。

### `fall` 叠影

<img src="docs/assets/readme/fall-timing-light.svg#gh-light-mode-only" alt="fall 转场的时序图：进入方 0.56 秒与离开方 0.38 秒并行，进出场重叠 380 毫秒" width="920">
<img src="docs/assets/readme/fall-timing.svg#gh-dark-mode-only" alt="fall 转场的时序图：进入方 0.56 秒与离开方 0.38 秒并行，进出场重叠 380 毫秒" width="920">

底片跨路由常驻之后，换页只剩 `fall` 一处转场：进入方与离开方并行跑，不用 `out-in`，重叠的 380ms 里两页同时在场、都带模糊，叠影就是这层糊。这段时间里底片必须是同一张还在感光的像素：星轨如今只有首页一台相机，离开首页时它还在每帧画，底片不会冻在半帧上。首页另有一档纯 opacity 的交叉淡化（0.5s / 0.45s、重叠 450ms），不带 scale 与模糊——首页是全站最高的页，整页 blur 的每帧重栅格化是本站最贵的一处绘制。

还有一处不显眼但看得见的修正：路由的 `scrollBehavior` 瞬时回顶，而离开方还要淡出近半秒，从折线以下点导航时首屏照片与刊头会「闪回」一次。现在 `before-leave` 记下当前滚动量，把离开方整页上移同样的距离；位移走 `translate` 而不是 `transform`，因为 `fall-out` 的关键帧自己在动 `transform: scale()`，写进去会被整条盖掉。

### 首屏的加载次序

<img src="docs/assets/readme/hero-load-order-light.svg#gh-light-mode-only" alt="首屏加载次序图：照片由首帧脚本预载、load 后开闸；星轨挂载、章节数据与字体分片排在闸后，手机抽屉底片等第一次滚动" width="920">
<img src="docs/assets/readme/hero-load-order.svg#gh-dark-mode-only" alt="首屏加载次序图：照片由首帧脚本预载、load 后开闸；星轨挂载、章节数据与字体分片排在闸后，手机抽屉底片等第一次滚动" width="920">

首屏那张地景照片是首页的 LCP。`index.html` 的首帧内联脚本按当前主题 `preload` 它，与样式表并行起跑；≤720px 取 1800px 重采样版（亮 1.45MB → 0.09MB，深 0.62MB → 0.05MB）。照片默认透明，底下先垫一张 36px 宽、约 0.5KB 的模糊替身，闸门开了再 240ms 淡入真图。闸门是 `src/lib/hero.js` 的 `whenHeroReady()`：从 `--hero-img` 令牌取同一个 URL 再等一次 `load`，图卡住或出错都放行，不把整页扣死。其余的事排在照片后面：星轨块在照片下载期间预取、挂载仍等闸门；折线以下的章节数据排在闸门后；手机展示衬线的 CJK 分片也等照片；手机抽屉底片排最后，等第一次滚动再取。实测过程记在 [docs/design.md](docs/design.md) §3 与 `src/App.vue` 的注释里。

## 两套主题的底片

<table>
  <tr>
    <td width="50%"><img src="docs/assets/readme/plate-deep-space.png" alt="深色底片：同心星轨弧绕天极累积，冷蓝与暖白之间点着几枚琥珀，大片夜空留白" title="深色"></td>
    <td width="50%"><img src="docs/assets/readme/plate-paper.png" alt="浅色底片：石板与石墨蓝的轨迹压在干版上，朱砂点在最亮的那几根" title="浅色"></td>
  </tr>
</table>

<sub>左深右浅，同一台相机的两张稳态底片。深色加色合成（`lighter`），浅色墨压干版（`source-over`）；深色那张在增益之后按整像素等比压高光，三通道乘同一系数，锁住色相，不让冷蓝与朱砂被逐通道截顶漂成奶白。首图是它们的横幅取景。</sub>

## 跑起来

要求 Node.js 22 以上（`npm test` 交给 node 自己展开测试目录里的用例，那是 21 之后才有的能力；CI 与作者本机跑 24）。

```bash
git clone https://github.com/Escap1ng/Escaping-Notes.git
cd Escaping-Notes && npm install

npm run dev      # 开发服务器，改文件即时热更
npm run build    # 发文门禁 + dist/（rss.xml、sitemap.xml、每条路由一份静态壳）
npm run check    # 四道门禁连跑：内容 / 文档 / 命名 / 对比度
npm test         # tests/ 下的 .mjs 用例全收，零测试框架
```

构建自带发文校验：日期写歪、frontmatter 键拼错、正文引用了本卷没有的图、两卷认领同一个旧名，任一条红就不出产物。跑绿后产出 RSS、sitemap 与每条真实路由一份静态壳。多数判据带负向对照：把同一份检查指向刻意改坏的样本，必须报红——只会报成功的检查不算证据。

| 命令 | 说明 |
| --- | --- |
| `npm run preview` | 本地按线上方式预览 `dist/` |
| `npm run art:build` | 重算底片双图；加 `ART_HERO=1` 出首图（常数从源码读，改星轨参数后重跑） |
| `npm run bg:build` | 重烘站点底图（需本机 PowerShell，产物需提交） |
| `npm run cover:build` | 逐卷把 `*-src.jpg` 烘成 `cover.jpg` |
| `npm run og:build` | 重绘分享卡 `public/og.png` |
| `npm run seo:build` | 只重跑 RSS 与 sitemap |
| `npm run font:build` · `font:build:didone` | 重切字体子集（产物已提交，日常不用跑） |

## 往里加东西

没有后台，改仓库里的文件再 push 即上线。

- **一篇文章 = 一个目录**：`content/posts/<slug>/index.md`，目录名就是网址。同目录放 `cover.jpg` 就是封面，列表格、正文顶图、分享卡共用它；插图只写文件名，写错会在构建时被拦
- **frontmatter**：`collection` 必填；`draft: true` 只在 `npm run dev` 可见；`movedFrom: [旧slug]` 让改名后的旧链接继续有效；不认识的键会被门禁报出来，而不是静默忽略
- **合集**：清单在 `src/data/collections.js`，`parent` 指向另一合集即加一级；文章只挂叶子级，父页聚合全部后代
- **动态**：每篇发布按 `date` 自动进 `/updates` 与首页时间线；`src/data/updates.js` 只记文章以外的事，不要手写「某文已发」
- **项目**：`src/data/projects.js` 一处写全卡片与介绍三段，数组顺序即页面顺序（GitHub star 降序、最近推送作并列判据、不收录 fork），URL 由名字现算
- **文案与外观**：界面文案全在 `src/data/narrative.js`，组件里不写字面量；外观令牌在 `src/styles/site.css`

细节见 [docs/manual.md](docs/manual.md)。

## 页面地图

10 条路由全部懒加载；顶栏放 6 条，详情页与兜底不在栏上。

| 路由 | 页面 |
| --- | --- |
| `/` | 首页 · 长曝光星轨 |
| `/blog` | 文章归档 · 全站读数与带计数的标签筛选 |
| `/blog/:slug` | 正文 · 自动置顶封面与看片框 |
| `/collections` | 合集总览 |
| `/collections/:slug` | 合集目录 · 上级汇总后代 |
| `/updates` | 动态 · 手写条目与发文自动条目 |
| `/projects` | 项目卡片 |
| `/projects/:slug` | 项目介绍 |
| `/about` | 关于 |

未匹配的地址落到 404，浏览器标题与页内大字是同一句。

## 部署

GitHub Pages 绑裸域名 `escaping.top`，push 后 CI 按 `npm ci → test → check → build` 跑，全绿才发布。因为绑在根域，`base` 保持 `/`，产物不带仓库前缀，路由只有 history 一种模式。

- Pages 不回退未知路径，所以构建期为每条真实路由写一份静态壳（`dist/blog/<slug>/index.html` 等）加一份 `dist/404.html`：真路由深链返回 200、分享卡是那一篇自己的封面，写错或已删的地址仍落 404
- Vercel 是同一份产物的只读镜像，`vercel.json` 把未知路径 rewrite 到 `index.html`，刷新任何子页不 404
- 旧的 `/#/blog/<slug>` 链接在挂载前由 `src/main.js` 改道成路径形状，不会静默落在首页

完整步骤（DNS、验证、证书）见 [docs/manual.md §4](docs/manual.md#4-上传方法部署上线)。

## 文档

[docs/design.md](docs/design.md) 是界面设计的唯一依据：概念、令牌、组件契约，以及被否掉的方案和量出来的数。
[docs/manual.md](docs/manual.md) 是使用手册：编辑、适配、部署、FAQ。
[docs/assets/readme/README.md](docs/assets/readme/README.md) 说明配图从哪来、怎么重跑、怎么换真截图。

## 许可

**博客内容**（文章、原创图片与文案）依 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)：署名、非商业、同协议分享。

**源代码与设计**（`src/`、`scripts/`、`docs/`、视觉与交互设计）依 [Apache-2.0](LICENSE)：可自由使用、修改、分发与商用，须保留版权与许可声明，修改过的文件要标明改动。商标不随许可授予，「Escaping Notes」之名不得用于暗示作者背书。

字体取自 Noto Serif SC 与 Playfair Display，均 SIL OFL 1.1，条款见 [LICENSE-OFL.txt](src/assets/fonts/LICENSE-OFL.txt)。

本项目按「现状」提供，不附任何担保。授权联系 chunqi-yu@outlook.com。

<div align="center">
<sub>© 2026 Escap1ng</sub>
</div>
