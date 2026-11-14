<div align="center">

# Escaping Notes · 逃逸笔记

**STAR TRAILS · 一次对夜空的长曝光**

[**在线体验 → escaping.top**](https://escaping.top)

[![Release](https://img.shields.io/github/v/release/Escap1ng/Escaping-Notes)](https://github.com/Escap1ng/Escaping-Notes/releases)
[![Pages](https://img.shields.io/github/actions/workflow/status/Escap1ng/Escaping-Notes/deploy.yml?label=Pages)](https://github.com/Escap1ng/Escaping-Notes/actions/workflows/deploy.yml)
[![Live](https://img.shields.io/badge/live-escaping.top-2f81f7)](https://escaping.top)
[![Vue 3](https://img.shields.io/badge/Vue%203-4FC08D?logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![Vite 5](https://img.shields.io/badge/Vite%205-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Node.js 22+](https://img.shields.io/badge/Node.js-22%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/Content%20CC%20BY--NC--SA%20·%20Code%20Apache--2.0-4d4d4d)](#许可与使用声明)

[中文](README.md) · [English](README.en.md)

</div>

<table>
  <tr>
    <td width="50%"><img src="docs/assets/readme/plate-deep-space.png" alt="深色主题的长曝光底片：数十道同心星轨弧绕天极累积，冷蓝与暖白之间点着几枚琥珀，大片夜空留白" title="深色"></td>
    <td width="50%"><img src="docs/assets/readme/plate-paper.png" alt="浅色主题的同一张底片：石板与石墨蓝的轨迹压在干版上，朱砂点在最亮的那几根" title="浅色"></td>
  </tr>
</table>

左 深色 / 右 浅色。两张都不是截图，是按站点同一套常数离线复算的底片（`npm run art:build`），只画星轨层——复算的正是 `prefers-reduced-motion` 访客看到的那张稳态底片。出图与站点共用同一对显示增益（×2.0 / ×1.42，`StarTrails.vue` 的 `DEV_DEEP` / `DEV_PAPER`），所以这两张的浓淡就是页面上的浓淡。深色那张在增益之后还做了一步锁色相的高光压缩：三通道按同一比例收进上限，不让冷蓝与朱砂被逐通道截顶漂成奶白。

一个把博客做成相机长曝光的个人站点：首页是一台开着快门的相机，文章按时间排，合集按主题分。纯静态，构建期定稿，push 即发布。

**技术栈**：Vue 3 · Vue Router 4 · Vite 5 · Canvas 2D。没有后端、第三方 UI 库或字体 CDN。

**目录**

- [这台相机在数时间](#这台相机在数时间)
- [星环是怎么画出来的](#星环是怎么画出来的)
- [界面](#界面)
- [三处承重设计](#三处承重设计)
- [跑起来](#跑起来)
- [往里加东西](#往里加东西)
- [页面地图](#页面地图)
- [目录结构](#目录结构)
- [部署](#部署)
- [文档](#文档)
- [许可与使用声明](#许可与使用声明)

---

## 这台相机在数时间

把书写当作对夜空的长曝光：首页架着一台相机替我数着时间。三条设定——

- **滚动即时间**：首屏之内越往下滑，曝光窗口越长、天空转得越快（1 → 3.2 倍），滚过 1.1 倍视口高到底
- **指针即时间膨胀**：光标 180px 半径内的星轨局部加速卷曲，越靠中心越快（最高 2.8 倍）；进出光锥有一秒左右的惯性包络，不是硬边光斑
- **流星即叙事**：每 6–9 秒随机落一颗，单颗活 900ms，同屏最多九颗；播放器放歌时间隔压到四成，停下即自然回弹

星轨只在首页那一格里画；底片像素与全站时钟是 `src/lib/sky.js` 里的单例——换页不重铺，回到首页时弧接着上一次的曝光继续长。折线以下交给照片。

流速曲线、遮罩剖面与流星参数记在 [docs/design.md](docs/design.md) §3。

## 星环是怎么画出来的

这一节记的是几次「看着不对」之后的返工。三个问题都不是审美分歧，是能量出来的：

**一、星等与角度撞了同一组数列。** 档位原先写成 `(i·0.381966…) mod 1`，而 `0.381966… = 1 − 0.618034…` 恰好是角度序列的补数——两者相加恒为 1，星等于是完全由角度决定。实测 220 根时 12 根亮星的圆统计集中度 **R=0.996**，全部挤在同一个 45° 扇区里，读起来就是「一侧全是粗亮弧、另一侧只剩细淡弧」。现在每档根数按星数精确配额（亮 24% / 中 60% / 暗 16%），亮星与中星的起始角等分圆周。

**二、半径与角度同步递增 = 一条螺线。** 等分圆周还不够：槽位序号同时决定半径，实测相关系数 **0.998**，亮星从 `(r=0.075, θ=10°)` 一路盘到 `(r=0.955, θ=345°)`——那是阿基米德螺线，不是同心环。角度槽位现在先过一道与档内根数互质的步长排列，相关系数降到 **0.205**，而槽位集合不变，角向均匀性一分不丢。

**三、每根弧长短不一，物理上就不成立。** 真实长曝光里所有恒星在同一时段走过相同角度。现在全部共享一个曝光窗口（`EXPOSURE_DEG = 64`），只留 ±5% 的快门不匀；层次改由星等承担——线宽、亮度、星核，那才是照片里区分恒星的东西。

另外两条：**亚像素笔画是「细密淡线」的物理来源**，所以任何笔画都不细于 `LW_MIN = 1.25` CSS px，暗档靠颜色退成背景而不是靠画不清楚；**星核画在当帧层**（不累积，累积了就又变成一道弧），每道弧的前沿因此有一颗点状的星，与它那道弧同步呼吸。

当前星数：浅色 96 / 深色 62（窄屏 50 / 33）。底片按视口分配，`MAXPX = 6e6` 封顶、`MIN_DPR = 1.25` 兜底——每帧一次全屏 `destination-out` 加一次 `drawImage`，像素数就是固定开销。

## 界面

**视觉**

- 首屏只有英文刊头：桌面单行 8.8vw（整行约 81% 视口），手机断成两行 15vw；折线以下按章分卡
- 双主题同一座山：深色首屏是同一取景的压暗版，两套共用一条山脊折线；底片按主题各沉积一张，不串色。切主题时旧底片拍一张快照淡出、新的分片重新显影，不再当场清空成一片空天
- 默认浅色，首帧刻意不读系统 `prefers-color-scheme`——首屏是一张亮底照片，跟着系统翻深色会变成亮图压在黑底上
- 星轨由离屏累积缓冲逐帧绘制（Canvas 2D），沿山脊以 `destination-in` 遮挡：脊线附近保留六成亮度，26px 羽化
- 折线以下压着一张全站共用的照片底片，单张常驻，深色是它自己的压暗底，夜里不跳景
- 全部界面由同一套令牌搭成：间距 6 档、字号 11 档、行高 4 档、字重 3 档、圆角 3 档、指针反馈 4 枚；卡片令牌一组，按钮 2 尺寸 × 4 语义。组件内不写裸字号与裸时长，改刻度即全站同步
- 两套自托管字体：正文衬线 Noto Serif SC 按 `unicode-range` 分片、按需下载；刊头 Didone 取 Playfair Display，单文件只含大写与空格。没有字体 CDN
- 中文正文启用了中西文自动间距（`text-autospace`）与标点悬挂；标题折行走 `text-wrap: balance`，段落走 `pretty`。旧浏览器忽略这些属性，保持原状

**交互**

- 底片模糊与卡面颜色是运行时参数：设置卡里一条 0–12px 滑杆（默认拉满）与两档单选（不透底 / 半透明），偏好记在 `localStorage`
- 焦点陷阱在顶栏抽屉、搜索卡、播放器卡、设置卡与文章看片框，关闭后焦点回到触发元素；`Esc` 或点正文底板以外的空白即退回列表；任意页面裸按 `/` 或 `Ctrl/⌘+K` 开搜索；路由切换由 `App.vue` 的 `aria-live` 区域播报
- **键盘焦点与指针同享一套反馈**：卡片光带、衍射星芒、按钮扫光各有与 hover 并列的 `:focus-visible` 规则，复用同一条过渡
- **播放器**是一张控制台：绕极唱盘随播放转动、外圈环形进度可拖可点可键盘（方向键 ±5s、Shift ±15s）、由文件名派生的波形指纹、真静音开关（记状态、再按恢复）。空格切播放，但不抢原生控件的行为；记住曲目与位置，接系统媒体键；音频取不到时直接写明「无法播放」，不停在载入中
- **窄屏菜单**是全屏抽屉：三根线形变成叉、每条导航带一句说明、当前页除冷色高亮外另有左缘竖线与圆点记号，下方一排带文字的快捷操作。换页即收（含浏览器前进后退），快捷操作错开两层浮层的滚动锁
- 列表有骨架屏，「本来没有内容」与「筛选无结果」分文案；标签与关键词筛选写进 URL query，可分享、刷新不丢；归档页顶着一排全站读数，标签胶囊各带计数

**降级与可读性**

- `prefers-reduced-motion` 有完整的静态降级：星轨停在稳态底片、转场不糊、晕影关停；触控目标撑到 44px，最小字号 11.5px
- 无纱的风景照片上放裸字到不了 WCAG AA，实测最坏点 1.0~1.8:1，与渐变形状无关。所以底片只当风景，正文一律落在卡面与阅读底板上。`npm run check:contrast` 每次提交前重算主题令牌对纯色底，核不到照片合成底
- 常驻顶栏不用 `backdrop-filter`；玻璃只给阅读底板（半透明档）与导航抽屉。文章看片框是实底，首页章节底卡是常驻面，都不建这层模糊——糊感由底片自己的 `--plate-blur` 提供

## 三处承重设计

### 底片层挂在 `App.vue` 上——一处 `fixed` 的包含块陷阱

<img src="docs/assets/readme/plate-layer-light.svg#gh-light-mode-only" alt="全站风景底片的剖面图：照片只在上沿全亮、52% 到 100% 沉回页面底色，以及裸字与卡面上前景对比度的实测值" width="920">
<img src="docs/assets/readme/plate-layer.svg#gh-dark-mode-only" alt="全站风景底片的剖面图：照片只在上沿全亮、52% 到 100% 沉回页面底色，以及裸字与卡面上前景对比度的实测值" width="920">

折线以下那张风景是 `App.vue` 里一层 `position: fixed` 的 `.sub-plate`，首页章节区与全部次级页共用。它必须挂在那里：`fall` 转场给页根加了 `filter`，而 `filter` 会成为 `position: fixed` 后代的包含块——同一层挂在 `HomeView` 里时实测被解析成 `.home` 的盒子（587×1629、跟着滚动），不是不动的底图。抽屉底是单张常驻（源图清单与收敛口径见 `site.css` §3）。这些决定的实测过程记在 `src/App.vue` 与 `src/lib/plate.js` 的注释里。

### `fall` 叠影——两页同时在场

<img src="docs/assets/readme/fall-timing-light.svg#gh-light-mode-only" alt="fall 转场的时序图：进入方 0.56 秒与离开方 0.38 秒并行，进出场重叠 380 毫秒" width="920">
<img src="docs/assets/readme/fall-timing.svg#gh-dark-mode-only" alt="fall 转场的时序图：进入方 0.56 秒与离开方 0.38 秒并行，进出场重叠 380 毫秒" width="920">

底片跨路由常驻之后，换页只剩 `fall` 一处转场：进入方与离开方并行跑，不用 `out-in`，重叠的 380ms 里两页同时在场、都带模糊——叠影就是这层影。这段时间里底片必须是同一张还在感光的像素：星轨如今只有首页一台相机，离开首页时它还在场、还在每帧画，底片不会冻在半帧上。`sky.js` 里的 `claimPlate()` 交接互斥（只锁沉积、不锁重绘）留着当护栏，只剩一台相机时不会触发。

首页另有一档：出入场是纯 opacity 的交叉淡化（0.5s / 0.45s、重叠 450ms），不带 scale、模糊与色偏。首页是全站最高的页——收掉坍缩感的同时，也收掉了整页 blur 的每帧重栅格化，那是本站最贵的一处绘制。其余页面维持上图的 fall。

还有一处不显眼但看得见的修正：路由的 `scrollBehavior` 是**瞬时回顶**，而离开方还要淡出近半秒。从折线以下点导航时，`scrollY` 归零会让首屏照片与刊头在淡出期间「闪回」一次。现在 `before-leave` 记下当前滚动量，把离开方整页上移同样的距离——位移走 `translate` 而不是 `transform`，因为 `fall-out` 的关键帧自己在动 `transform: scale()`，写进去会被整条盖掉。

### 首屏的加载次序——照片先行，其余排队

首屏那张地景照片是首页的 LCP。`index.html` 的首帧内联脚本按当前主题 `preload` 它，与样式表并行起跑；≤720px 取 1800px 重采样版（亮 1.45MB → 0.09MB，深 0.62MB → 0.05MB）。照片默认透明，底下先垫一张 36px 宽、约 0.5KB 的模糊替身（`--hero-lqip`，随样式表到），闸门开了再 240ms 淡入真图，刊头同时从轻微散焦里落位。

闸门是 `src/lib/hero.js` 的 `whenHeroReady()`：从 `--hero-img` 令牌取同一个 URL 再等一次 `load`，图名不抄第二份；图卡住或出错都放行，不把整页扣死。其余的事排在照片后面——

- **星轨**：块在照片下载期间就预取（那会儿下行基本闲着，小块抢不动带宽），挂载仍等闸门——届时 loader 命中模块缓存，省一个块的往返
- **章节数据**：折线以下的 `loadPosts()` 排在闸门后；合集与项目是同步数据，照常先渲染
- **字体**：手机首页展示衬线的 CJK 分片（约 147KB）也等照片到位再取，此前标题暂用系统宋体
- **抽屉底片**（手机首页，1280px 重采样版）排在最后：它只在折线以下露脸，照片到位那一拍下行让给字体与章节数据，底片等第一次滚动再取——不滚动就不下载。刷新时已滚过首屏、或离开首页去次级页，都立即放行（次级页的底片就是正文背景）

因此首屏的次序是**照片 → 星轨挂载 / 章节数据 / 字体，手机抽屉底片等滚动**。实测过程记在 [docs/design.md](docs/design.md) §3 与 `src/App.vue` 的注释里。

## 跑起来

要求：Node.js 22 以上（`npm test` 交给 node 自己展开测试目录里的用例，那是 21 之后才有的能力；CI 与作者本机跑的是 24）。

```bash
git clone https://github.com/Escap1ng/Escaping-Notes.git
cd Escaping-Notes && npm install

npm run dev              # 开发服务器，改文件即时热更
npm run build            # 发文回执 + dist/（rss.xml、sitemap.xml、每条路由一份静态壳）
npm run check            # 四道门禁连跑（content / docs / naming / contrast），提交前跑这条
npm test                 # tests/ 下的 .mjs 用例全收，零测试框架
```

CI 在 `.github/workflows/deploy.yml` 里按 `npm ci` → `npm test` → `npm run check` → `npm run build` 的顺序跑，全绿才发布 Pages。

### 常用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | Vite 开发服务器，改文件即时热更 |
| `npm run build` | 先跑发文门禁与回执，再出 `dist/`（含 `rss.xml`、`sitemap.xml`、每条路由一份静态壳） |
| `npm run preview` | 本地模拟线上环境预览 `dist/` |
| `npm test` | `tests/` 下 23 个 `.mjs` 文件、154 项用例全收，零测试框架 |
| `npm run check` | 四道门禁连跑：内容 / 文档 / 命名 / 对比度 |
| `npm run seo:build` | 只重跑 SEO 产物（`dist/rss.xml` 取最近 20 条、带全文与标签，`dist/sitemap.xml`） |
| `npm run og:build` | 重绘分享卡片 `public/og.png`（1200×630，纯 Node 画的程序化星轨，无文字，需提交） |
| `npm run art:build` | 重绘 README 顶部那两张底片图（常数从源码里正则读，读不到直接抛错；改星轨参数后要重跑） |
| `npm run bg:build` | 重烘站点底图 `public/plates/*.jpg`（原图在 `plates-src/`，需本机 PowerShell，产物需提交） |
| `npm run cover:build` | 重烘文章封面：逐卷把 `content/posts/<slug>/` 里那张 `*-src.jpg` 就地烘成 `cover.jpg`（脚本里没有映射表，同上） |
| `npm run font:build` | 重切正文衬线子集并按 `unicode-range` 分片（需本机装有 Noto Serif SC；产物已提交，日常不用跑；新标题用到片外字时跑一次） |
| `npm run font:build:didone` | 重切刊头 Didone 子集（Playfair Display，只留大写与空格；源可变字体在 `fonts-src/`、不进仓库，取回步骤写在脚本头部） |
| `npm run check:content` | 发文门禁与回执：日期写歪 / 键名拼错 / 正文引用了本卷没有的图都会在这里红（`npm run build` 与 CI 都含它） |
| `npm run check:docs` | 扫文档里的文件引用与 § 节号是否还指得到东西，并核对下面的路由表与 `src/router` 一致 |
| `npm run check:naming` | 命名规约扫描，违规即退出码非 0 |
| `npm run check:contrast` | 从 `site.css` 两组主题令牌重算 WCAG 对比度，文本令牌不达标即退出码非 0 |

`npm test` 的口径按 `tests/` 的文件名分组：内容层（发文判据逐条拿假样本验一遍，证明两个岸共用一份解析、取数只许走 `src/data/index.js` 那道门、草稿与别名的规则）、发布层（按页静态壳的 head 与落点、sitemap 里每条网址都有文件顶着、旧 `#/` 链接的放行与拦截、站内只有一种路由模式）、渲染与 URL 注入面、参数不漂移（底片模糊三处默认值、卡面档位、首帧主题、hero 预加载与 `site.css` 同值（两主题 × 两屏宽））、首屏加载顺序（照片 → 星轨挂载 / 章节数据，星轨块预取，手机抽屉底片等滚动）、首页转场例外（只留 opacity、减弱动效显式覆盖）、文案契约、指针反馈与令牌的单一来源、项目介绍三件写满、两处详情页共用同一处返回机制。

多数判据带**负向对照**：同一把尺子去量一份刻意改坏的样本，必须变红——只会报通过的检查器不算证据。

## 往里加东西

站内没有后台，改的都是仓库里的文件，push 即上线：

- **写一篇文章 = 建一个目录**。`content/posts/<slug>/index.md`，目录名就是网址（`/blog/<slug>`）。封面不用登记路径：同目录里有 `cover.jpg`，它就是封面——列表那格、正文顶部那张满栏图、分享卡三处共用同一张；没有封面也是合法状态，列表留一张等高的斜纹空版。原图以 `-src.jpg` 收尾丢进同一目录，`npm run cover:build` 就地烘；正文插图也放这一卷里，只写文件名，写错或漏放会在构建时被拦。
- **frontmatter**：六个键管显示（`title` / `date` / `tags` / `summary` / `alt` / `imagePos`）；`collection` 必填，写这篇挂进哪个合集，`order` 选填，是它在合集里排第几；另外两个键管发布：`draft: true` 只在 `npm run dev` 里露面，`movedFrom: [旧slug]` 让改过的目录名留着旧链接。写了不认识的键会被门禁报出来，而不是静默失效。
- **合集**：清单在 `src/data/collections.js`，`parent` 指向另一个合集就再分一级；文章只挂在最末那一层，上级合集页自动汇总所有后代的文章。`/collections` 是总览，每篇正文页眉标着所属合集与篇序，上下篇在合集内翻。
- **发文即进动态**：每一卷已发布文章按 `date` 自动进 `/updates` 与首页最近动态，链向正文；`src/data/updates.js` 只记文章之外的事，别再手写「某篇上线」。合并口径在 `src/lib/feed.js`，同一天文章排在手写条目前。
- **项目**：`src/data/projects.js` 一处写全卡面四字段与介绍三件（`detail` 段落 / `points` 要点 / `stack`）。数组顺序就是页面顺序，按 GitHub star 降序、并列按最近推送，不收录 fork；URL 由 `name` 现算，不另设 slug 字段。
- **站点自有内容**：合集 / 动态 / 项目 / 友链各有一份数据文件，装备在 `src/data/site.js` 的 `gear` 字段里；它们进界面只经 `src/data/index.js` 那道门。加一类内容 = 放一份文件 + 门上挂一行，视图不用新开一条路。
- **改站点信息与文案**：站点名、作者、社交、标语、装备在 `src/data/site.js`；界面文案（含播放器与菜单）全在 `src/data/narrative.js`，组件里不写字面量；外观令牌在 `src/styles/site.css`。
- **构建就是发文自检**。`npm run build` 先逐卷校验再出产物：日期写歪、键名拼错、正文引用了本卷没有的图、两个旧名撞车，任一条红就不发布。跑绿之后顺手产出 `rss.xml`、`sitemap.xml` 与每条路由一份静态壳。

## 页面地图

10 条路由全部懒加载，每条带 `meta.t` 供标题与读屏播报使用；顶栏导航放 6 条，三条 `:slug` 详情页与最后那条 catch-all 不在栏上——任何未匹配的路由都落到「这里没有页面」。

| 路由 | 页面 | 说明 |
| --- | --- | --- |
| `/` | 首页 · 长曝光星轨 | 照片地景 + 星轨 + 英文刊头 + 抽屉 |
| `/blog` | 文章 | 归档：四枚全站读数、带计数的标签筛选；搜索词写进 URL，页内不放输入框 |
| `/blog/:slug` | 正文 | 单篇正文 + 自动置顶的封面；文中图片可点进看片框 |
| `/collections` | 合集 | 顶层合集与它们的子合集，按主题成组 |
| `/collections/:slug` | 合集目录 | 合集的子集与文章；上级合集汇总所有后代文章 |
| `/updates` | 动态 | 手写动态与发文自动条目，文章条可点进正文 |
| `/projects` | 项目 | 项目卡片栅格，当前 8 个 |
| `/projects/:slug` | 项目介绍 | 与文章页共用阅读底板；`Esc` 或点空白退回列表 |
| `/about` | 关于 | 自述 + 读数 · 社交 / 友链 · 技术栈 |
| `/:pathMatch(.*)*` | 404 | 未匹配路由的兜底页，标题与页内大字同一句「这里没有页面」 |

## 目录结构

```text
├── .github/workflows/     # CI：npm ci → test → check → build → GitHub Pages
├── LICENSE                # 源代码与设计的许可全文（Apache-2.0）
├── package.json           # scripts + 两条运行时依赖（vue / vue-router）
├── vite.config.js         # Vite；构建期把每卷的素材清单交给前端（virtual:rolls）
├── index.html             # 壳层：首帧内联脚本（主题 / 底片模糊 / 卡面档位 / 按主题预加载首屏地景，都不闪一下）+ SEO/OG 元信息
├── content/posts/         # 文章：一篇一个目录（`<slug>/index.md` + 它的封面与插图），目录名就是网址
├── public/                # favicon、robots.txt、og.png + 两个必须入库的派生素材目录（plates/ · audio/）
├── scripts/               # 构建期与内容刷新脚本，命名按动词分族（build_* / check_*）
├── tests/                 # 零依赖防护网：node --test，23 个文件 / 154 项
├── docs/                  # design.md 设计依据 · manual.md 使用手册 · assets/readme/ README 配图
└── src/
    ├── assets/fonts/      # 自托管 woff2 子集 + OFL 许可
    ├── components/        # 平铺七件：星轨相机 / 首屏排版 / 顶栏+抽屉 / 页脚 / 播放器卡 / 设置卡 / 搜索卡
    ├── data/              # 站点自有内容全在这一目录，index.js 是唯一的取数门
    ├── lib/               # sky 底片与时钟 · ridge 山脊遮罩 · plate 底片层 · schema 发文口径 · posts 取数 · feed 动态合并 · markdown · theme / storage / …
    ├── styles/site.css    # 唯一的样式表：结构刻度 + 两套主题配色 + 全站基元
    └── views/             # 10 个视图平铺，一页一个文件
```

原图（`plates-src/` · `music/` · `fonts-src/` · 各卷的 `*-src.*`）在 `.gitignore` 里，别当泄漏报。逐文件的注解版见 **[docs/manual.md §0](docs/manual.md)**。

## 部署

两种方式（GitHub Pages / Vercel 只读镜像）的完整步骤见 **[docs/manual.md §4](docs/manual.md#4-上传方法部署上线)**。要点：

- GitHub Pages 已绑裸域名 `escaping.top`，DNS 记录、验证命令与证书步骤见 `docs/manual.md` §4.2
- 因为域名绑的是根路径，`base` 固定 `/`，产物不带仓库名前缀；站内只有一种路由模式（history）
- Pages 不会把未知路径回退到 `index.html`，所以构建期为每条真实路由写一份静态壳（`dist/blog/<slug>/index.html` 等）并留一份 `dist/404.html`——真实路由的深链因此是 200 而不是 404，分享卡也是那一篇文章自己的封面；拼错或已删的地址仍走 404
- Vercel 是同一份产物的只读镜像，`vercel.json` 把未知路径 rewrite 到 `index.html`，刷新任何子页面都不会 404
- 旧的 `/#/blog/<slug>` 链接由 `src/main.js` 在挂载前改道成路径形状，别处贴过的链接不会静默落到首页

## 文档

- [docs/design.md](docs/design.md) —— 界面设计唯一依据（概念、色彩与令牌、组件契约、开发指南）
- [docs/manual.md](docs/manual.md) —— 使用手册（编辑 / 适配 / 部署 / 常见问题）
- [docs/assets/readme/README.md](docs/assets/readme/README.md) —— README 四张配图的来源、重跑方式与「想换真截图该怎么做」
- [README.en.md](README.en.md) —— English version

## 许可与使用声明

本节分开授权：**博客内容**走 CC BY-NC-SA 4.0，**源代码与设计**走 Apache-2.0。

| 客体 | 许可 |
| --- | --- |
| **博客内容** —— 文章正文、站内原创图片与文案 | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)：可复制、可改编、可转载，须署名作者、不得用于商业用途、衍生作品须以同一协议发布 |
| **源代码与设计** —— `src/`、`scripts/`、`docs/`、视觉与交互设计、星轨交互装置 | [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0)：可自由使用、修改、分发与商用，须保留版权与许可声明；条款全文见 [LICENSE](LICENSE) |
| **字体** | 展示层子集（正文衬线按 unicode-range 分片）与刊头 Didone 分别取自 Noto Serif SC 与 Playfair Display（均 SIL OFL 1.1），条款全文见 [src/assets/fonts/LICENSE-OFL.txt](src/assets/fonts/LICENSE-OFL.txt) |
| **第三方素材** | 嵌入的友链与站外内容各自依其原许可，不在本节授权范围内 |

以下补充说明只针对上表第二行的「源代码与设计」，条款本身以 Apache-2.0 全文为准：

1. **保留声明**：再分发时须保留 `LICENSE` 与 `package.json` 中的版权与许可信息，修改过的文件须注明改动。
2. **商标不随许可授予**：Apache-2.0 不授予商标权；「Escaping Notes」名称与标识不得用于暗示作者对本项目的背书。
3. **免责条款**：本项目按「现状」提供，不附任何明示或暗示的担保；因使用产生的任何损失或纠纷，作者不承担责任（Apache-2.0 第 7、8 条）。
4. **授权联系**：chunqi-yu@outlook.com。

© 2026 Escap1ng · 博客内容依 CC BY-NC-SA 4.0 授权，源代码与设计依 Apache-2.0 授权
