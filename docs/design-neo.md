# Escaping Notes · 界面设计文档（neo · 长曝光星轨 Star-Trails Descent）

> 2026-09 起生效，取代 Aurora Glass 方案。本文是本站界面（`data-skin='neo'` 样式网关）的唯一设计依据。
> **版本：v1.1.0**（增补：完整令牌对照表、样式网关与类库清单、壳层/组件契约、文案字段说明、开发指南；并在 1.1.0 加入星轨防饱和尾部渐隐、文章页磨砂玻璃阅读底板与 WCAG AA 可读性、阅读栏加宽；此前 v1.0.0 的概念与交互草案冻结不变）。

---

## 0. 阅读指引（这一版怎么用）

- 想**改颜色 / 字体 / 栏宽 / 圆角** → 只改 `src/styles/tokens.css` + `src/styles/neo.css` 里的变量，见 §4、§5。
- 想**加页面 / 加组件 / 复刻微交互** → 先看 §5 类库与 §6 组件契约，再照 §9 开发指南。
- 想**改界面文案** → 只改 `src/config/narrative.js`，字段含义见 §7。
- 想**改站点信息** → 只改 `src/config/site.js`（名字/简介/社交/坐标）。
- 想**理解为什么这么设计** → §1 核心概念 + §2 设计原则。

---

## 1. 核心概念（≤200 字）

首页是一台架在三脚架上的相机在长曝光：数千条星轨弧绕一枚偏心天极刚体旋转累积，恒星周日视运动是全场一致的时间流速。文章是定点脉动的变星，驻目绽开锥形衍射十字芒，点击即坠入正文。色彩取自夜空的两副面孔——深空为冷白/暖白/琥珀三档星轨色温，纸面为墨与 sepia 干版轨迹 + 朱砂点睛；冷暖分工不混用。滚动即曝光加深：晕影收紧、天空转快。每一页背景沉着一枚巨型幽灵汉字，是创作者的签名。

访客一句话复述：**"这是一个把博客做成相机长曝光的网站，文章是星图里的变星，滚动就是这一夜在加速。"**

---

## 2. 设计原则（增补：所有后续决策需遵守）

1. **冷暖分工，严格不混用。**
   - `--cold`（冷）只用于**交互**：hover / 链接 / 焦点 / 星轨节点 / 光标 caret / 标签。
   - `--hot`（热）只用于**深度 / 强调**：进度 / 主动作按钮 / 日期 / 当前项 / 朱砂点睛 / 正文 h2 左缘。
   - `--white` 只用于**星核高光 / ≤2px 高光**（光子环、按钮扫光），不铺大面积。
2. **主题是叙事，不是皮肤。** 切换主题 = 一次"夜拍"（深空）或一次"显影"（纸面），由 `theme.js` 驱动 `data-theme`。任何新增样式必须在两套主题各看一遍（深空/纸面）。
3. **深度 = 时间。** 滚动把 `--shift`（0..1）写入 `<html>`，驱动晕影加深、首页标题字距被潮汐拉长、星轨提速。凡涉及"随滚动变化"的视觉，都应挂在 `--shift` 上，而不是各自写死。
4. **文案唯一来源是 `narrative.js`。** 视图里不要出现硬编码的界面文案（尤其对偶联、按钮、眉标、空态、幽灵字）。
5. **可降级。** 一切动效都必须有 `prefers-reduced-motion` 降级（见 §5.5）；API 不可达时站点仍是完整离线底片。

---

## 3. 两个核心装置

### 3.1 长曝光星轨（`components/neo/StarTrails.vue`）

- **概念**：首屏 = 架在三脚架上的相机长曝光。恒星周日视运动是刚体旋转（全场一致 ω≈0.05 rad/s），星轨绕偏心天极（首页 62%x / 38%y；次级页 50%x / 40%y）累积成同心弧。
- **渲染管线（Canvas 2D · 累积缓冲）**：ACC 离屏底片与主画布同尺寸，每帧不清空——① 衰减 pass：`destination-out` 填 `alpha=fade`（尾迹长度 ∝ 1/fade）；② 增量 pass：每星画本帧短弧（含 0.12rad 快门拖尾)沉积。主画布每帧 = 底 → `drawImage(ACC)` → 当帧层（变星/流星，不累积，保持锐利）。像素预算 4.6MP 封顶自动降 DPR。
- **Props / Emits（开发用）**：

  | 名称 | 类型 | 默认 | 说明 |
  | --- | --- | --- | --- |
  | `interactive` | Boolean | `false` | `true` 才启用变星/流星/指针层及 `--lx/--ly` 时间膨胀；`false` 星数减半、无交互层，只作静默活背景 |
  | `posts` | Array | `[]` | 变星数据源；`interactive` 时取前 ≤8 枚做变星 |
  | `@hover` | Event | — | 悬停变星下标（`interactive` 下） |
  | `@select` | Event | — | 点击变星，回传对应 post 对象 |

- **交互语义**：滚动 = 时间流速（`flow = 1 + k·2.2`，`fade` 由 0.0125→0.005，越深尾迹越长天越快）；文章 = 变星（随天刚体旋转、脉动亮度，hover 缓绽锥形衍射十字芒·沿芒长渐隐、点击坠入）；指针 = 引力时间膨胀（180px 半径内转速×2.8、提亮，轨迹局部卷曲，移开恢复）。
- **主题**：深空 = 冷白/暖白/琥珀三档色温（`lighter` 发光）；纸面 = 天文干版底片（墨/sepia 轨迹 + 朱砂点睛，`source-over`，fade×1.4 尾迹更干净）。主题/尺寸切换清空 ACC（"换一张底片"）。
- **部署**：首页由 `HorizonHero` 以 `interactive` 挂载；次级页由 `App.vue` 以非交互模式挂载为活背景。`reduced-motion` = 一次性快进 380 步生成静态底片，不启动 rAF。
- 已退役：黑洞/吸积盘/仪表环管线（原 `BlackHole.vue`）与红移坠入深度轨（原 `DepthRail.vue`，现由 `App.vue` 写 `--shift`）。
- **v3 定稿微调（1.0.0）**：变星移除外围圆环、呼吸幅度收窄并缓慢自转（`rot = t·0.22 + ph`）；光标三星为短弧带拖尾彗星、无衍射芒；流星与变星共用 `drawStar` 渲染器。
- **防饱和尾部渐隐（1.1.0）**：星轨即将转满前 20% 平滑暗化（`SETTLE_START=0.8`、`SETTLE_DEPTH=0.55`），另随机 1-2 根做柔和独立渐隐；每颗星带随机尾迹起点偏移（`shear`），使弧段截端错落、圆环连续无对齐断口；`FADE_0=0.008 / FADE_1=0.0032` 拉长尾迹，让相邻弧段衔接成连续同心圆环。

### 3.2 曝光深度与时间流速

- 滚动 = 曝光加深，进度 `p∈[0,1]` 由 `App.vue` 写入 CSS 变量 `--shift`，驱动：暗角晕影加深、首页宣言字距随潮汐力拉长。
- **fall 转场**：路由跳转 = 一次下坠重开（scale .8→1、blur 12→0）→ 展开成新页。全站唯一转场。
- 文章页时间膨胀读数：`τ/t = √(1−1/r)`——"你在此处停留的光阴，比人间慢一拍"。

---

## 4. 视觉语言：令牌与冷暖双信号

### 4.1 双色语义（严格分工）

| 令牌 | 深空 | 纸面（干版） | 分工（严格不混用） |
| --- | --- | --- | --- |
| `--cold` | `#8ec9ff` | `#2563eb` | **交互**：hover / 链接 / 焦点 / 星轨节点 / 光标 caret / 标签 |
| `--hot` | `#ff5c39` | `#c2410c` | **深度**：进度 / 主动作按钮 / 日期 / 当前项 / 朱砂点睛 |
| `--white` | `#fff7ed` | `#7c2d12` | 仅星核高光 / ≤2px 高光 |

### 4.2 主题令牌对照表（改色只改这里）

来源：`src/styles/tokens.css`（基线）+ `src/styles/neo.css`（皮肤覆盖，经 `data-skin` 网关提升特异性）。

| 令牌 | 语义 | 深空（默认） | 纸面（`theme=out`） |
| --- | --- | --- | --- |
| `--ink-0` | 页面底色 | `#020204` | `#f5f2ea` |
| `--ink-1` | 卡片/代码/表头底 | `#0a0a10` | `#efeadd` |
| `--ink-2` | 再亮一层内嵌底 | `#15151d` | `#e4dcc9` |
| `--text-0` | 主文字 | `#f4f1ea` | `#17150f` |
| `--text-1` | 次文字/眉标/读数 | `#8f8c96` | `#6b675e` |
| `--line` | 发丝线/边框 | `rgba(244,241,234,.13)` | `rgba(23,21,15,.16)` |
| `--cold` | 交互（蓝移） | `#8ec9ff` | `#2563eb` |
| `--hot` | 深度（红移） | `#ff5c39` | `#c2410c` |
| `--white` | 星核高光 | `#fff7ed` | `#7c2d12` |
| `--signal` | 旧组件强调（neo 下=冷） | `#8ec9ff` | `#2563eb` |
| `--signal-dim` | 上述的弱化 | `rgba(142,201,255,.36)` | `rgba(37,99,235,.3)` |
| `--signal-canvas` | 画布小点/拖尾信号色 | `#bcd9ff` | `#1d4ed8` |
| `--glass-bg` | 玻璃底 | `rgba(255,255,255,.05)` | `rgba(255,255,255,.6)` |
| `--glass-brd` | 玻璃描边 | `rgba(255,255,255,.12)` | `rgba(255,255,255,.9)` |
| `--glass-blur` | 玻璃模糊半径 | `16px` | `16px` |
| `--hole` | 镂空=页面底色 | `#020204` | `#f5f2ea` |
| `--void-a` | 运动模糊覆盖 | `rgba(2,2,4,.34)` | `rgba(245,242,234,.34)` |
| `--scrim` | 文字径向底衬 | `rgba(2,2,4,.78)` | （仅深空定义） |
| `--panel-bg` | 文章页阅读玻璃底板（半透明页面色 + 背景模糊） | `rgba(2,2,4,.55)` | `rgba(245,242,234,.6)` |
| `--panel-frost-bg` | 底板在无 `backdrop-filter` 时的兜底 | `rgba(2,2,4,.78)` | `rgba(245,242,234,.78)` |

> **注意**：`--scrim` 仅在深空块定义。纸面主题下如需文字底衬，应另选与纸面同族的变量（如 `--ink-1`），不要直接复用深空的 `rgba(2,2,4,…)` 叠加在浅色上。`@supports not (backdrop-filter)` 时 `--glass-bg` 有实色降级（深空 `.94` / 纸面 `.95`）。

### 4.3 字体三层（零 webfont）

| 层 | 变量 | 栈 | 用途 |
| --- | --- | --- | --- |
| 标题碑刻 | `--font-display`（= `--font-serif`） | `Songti SC / Noto Serif SC / Source Han Serif SC / SimSun` | `.neo-title` `.neo-h2` `.neo-prose h2…h4` |
| 正文宋体 | `--font-serif` | 同上 | `.neo-prose` 正文、`.neo-note` 观测手记 |
| 等宽读数 | `--font-mono` | `JetBrains Mono / Cascadia Code / Consolas / Courier New` | `.neo-eyebrow` `.neo-mono` `.neo-chip` `.neo-tag`、所有"仪器文字" |

普通 UI 文字用 `--font-sans`（`PingFang SC / Microsoft YaHei / system-ui`），为 body 默认字体。

### 4.4 幽灵汉字签名

叙事弧线 `渊→藏→坠→息→弦→掷→响→我→无`：渊（首页）、藏（文章）、坠（文章页）、息（动态）、弦（歌单）、掷（项目）、响（留言）、我（关于）、无（404）。
样式由 `.neo-glyph` 提供（stroke 空心、`opacity .07`、绝对定位）。**每页一枚**，位置可视图微调（见各视图 `.glyph` 覆盖）。

### 4.5 光标系统（`neo.css`）

- 正文/标题：`cursor: default` + `caret-color: transparent`（点击不出现 I 形竖线）。
- 可交互：`a[href] / button / label / summary` → `pointer`。
- 仅输入框：`input / textarea / [contenteditable]` → `text` + 冷色 caret。
- 沉浸光标：`NeoCursor` 挂载后写 `html[data-cursor='on']`，此时隐藏原生指针（输入区保留文本光标）。

### 4.6 其它

- 标签页图标：透明底镂空彩色圆环（四段蓝→红→白渐变，`/favicon.svg`）。
- 滚动条：`::-webkit-scrollbar` 8px，thumb 用 `color-mix(in srgb, var(--hot) 40%, transparent)`，`--r-pill` 圆角。

---

## 5. 样式网关与类库（开发的控制面）

### 5.1 样式网关（唯一入口）

任何 neo 规则都必须写在 `html[data-skin='neo']` 下（`index.html` 的 `<html>` 硬编码 `data-skin="neo"`，本站唯一样式网关）。这样做的目的：以特异性压过 `tokens.css` 的旧令牌，并让仍沿用旧样式类（`/login /register /admin` 等）的功能页自动协调。

- **导入顺序**：`main.js` 先 `tokens.css` 后 `neo.css`（皮肤依赖顺序覆盖旧变量）。
- **属性开关**：
  - `data-skin="neo"`：固定，启用皮肤。
  - `data-theme="well" | "out"`：主题，由 `src/lib/theme.js` 驱动；默认 `out`（纸面）。`index.html` 首帧内联脚本按 `localStorage['en-theme']` 预置，防闪烁。
  - `data-cursor="on"`：沉浸光标启用（`NeoCursor` 挂载时写入/卸载时删除）。
- **特异性**：`html[data-skin='neo']` (0,1,1) > `:root` (0,1,0)；主题块 `html[data-skin='neo'][data-theme='out']` (0,2,1)。新增覆盖时按需递增，勿用 `!important`。

### 5.2 非颜色令牌

| 令牌 | 值 | 说明 |
| --- | --- | --- |
| `--measure` | `68ch` | 阅读栏/导语限宽 |
| `--space-1` | `8px` | 基本间距（间距刻度 8/16/32/64/96） |
| `--space-2` | `16px` | |
| `--space-3` | `32px` | |
| `--space-4` | `64px` | |
| `--space-5` | `96px` | 次级页 `neo-shell` 顶部余量（neo 下新增） |
| `--r-sm` | `8px` | 圆角刻度 |
| `--r-md` | `14px` | 卡片/代码块 |
| `--r-lg` | `20px` | 大框体 |
| `--r-pill` | `999px` | 按钮/胶囊/滚动条 |
| `--shift` | `0..1`（运行时） | 滚动深度，`App.vue` 每帧写入 `<html>`；驱动晕影、字距、星轨流速 |

### 5.3 类库清单（`neo-*` 基元，全局可用）

| 类 | 用途 / 关键样式 |
| --- | --- |
| `.neo-shell` | 次级页内容容器：`max-width 1120px` 居中，`padding var(--space-5) var(--space-3)`（≤720px 收窄） |
| `main.neo-sub` | `App.vue` 依 `route.path !== '/'` 挂载：`min-height 100vh+140px`、`padding-bottom 140px`（把页脚压出首屏） |
| `.neo-glyph` | 幽灵汉字：绝对定位、stroke 空心、`opacity .07`、`pointer-events none` |
| `.neo-eyebrow` | 双语眉标：mono 12px、uppercase、前缀 20px `--hot` 短横（`::before`） |
| `.neo-title` | 巨型标题：display `clamp(40px,11vw,132px)` |
| `.neo-h2` | 区块标题：display `clamp(28px,4.6vw,44px)` |
| `.neo-lede` | 导语：`max-width --measure`、`--text-1`、16px/1.85 |
| `.neo-mono` | 等宽读数：mono 12px、uppercase、`--text-1` |
| `.neo-note` | 观测手记：serif italic 13px、`rotate(-1.2deg)` |
| `.neo-hair` | 1px 发丝分隔线（`--line`） |
| `.neo-btn` | 胶囊按钮基类：pill、hover `translateY(-2px)` + 扫光 |
| `.neo-btn-primary` | **热色实心**：仅用于"深度方向"的主动作（如文章页出口） |
| `.neo-btn-ghost` | 冷色描边：次级动作 |
| `.neo-chip` | 筛选胶囊：mono 12px；hover/`.on` 冷色填充扫入 |
| `.neo-tag` | 文章标签：冷色 14% 底、mono 11px |
| `.neo-field` | 下划线式输入：`border-bottom`、focus 冷色；`textarea` 可纵向拉伸 |
| `.neo-lens` | 引力透镜光斑：依赖 `lens.js` 写入 `--lx/--ly`；需配 `.bar` 子元素作左缘标记 |
| `.neo-vignette` | 全屏晕影：fixed `z-30`、`opacity calc(var(--shift,0)*.55)`、`pointer-events none` |
| `.neo-prose` | 正文容器（命中 `v-html`，**放全局**）：serif 17px/1.95、限宽居中；h2 带 `--hot` 左缘、代码/表格/引用等样式齐全 |
| `.neo-glass` | **文章页磨砂玻璃阅读底板**：半透明页面色（`--panel-bg`）+ `backdrop-filter: blur(22px)` + 四边 `mask` 羽化（水平/垂直 intersect），隔离星轨、提升前景对比（WCAG AA）；本页局部放宽 `--measure` 提高文字占比 |

### 5.4 引力微交互基元

- **透镜光斑** `.neo-lens::after`：以 `--lx/--ly` 为中心画 260px 径向 `--cold` 13% 光斑，hover 淡入。
- **左缘引力标记** `.neo-lens .bar`：2px 冷色竖条，hover `scaleY(0)→1`。
- **按钮扫光** `.neo-btn::before`：`--white` 45% 斜面高光，`neo-sheen` 0.65s 划过。
- **胶囊填充扫入** `.neo-chip::before`：冷色 16% 底 `scaleX(0)→1`。
- 所有位移弹簧都用 `cubic-bezier(0.2, 0.8, 0.2, 1)`。

### 5.5 晕影、转场与降级

- **晕影**：`.neo-vignette` 用 `radial-gradient(ellipse 120% 92% …)`，越深越暗。
- **fall 转场**：`fall-enter/fall-leave` + `fall-in / fall-out` 关键帧（scale+blur+sepia 相位）。
- **减弱动效**：`prefers-reduced-motion` 下关闭 fall 动画、按钮位移、扫光，并让 `.neo-vignette` 恒为 0；`StarTrails` 走静态快进底片；全局 `tokens.css` 已把动画/过渡压到 0.01ms。

---

## 6. 壳层与组件契约

### 6.1 壳层挂载顺序（`src/App.vue`）

```
StarTrails (仅次级页 v-if="isSub")
.neo-vignette
NeoSiteHeader        → 导航 / 主题切换 / 音乐按钮
main#main(.neo-sub)  → RouterView <Transition name="fall">
NeoSiteFooter
MusicPlayer
NeoCursor            → 写/删 <html data-cursor>
```

### 6.2 组件清单

| 组件 | 挂载 | Props / Emits | 职责 |
| --- | --- | --- | --- |
| `StarTrails` | 首页由 `HorizonHero`（`interactive`）；次级页由 `App.vue`（非交互） | `interactive`(Bool)、`posts`(Array)；`@hover`、`@select` | 星轨 Canvas 装置，见 §3.1 |
| `HorizonHero` | `NeoHomeView` | `posts`(Array)、`now`(Object)；`@select` | 首页首屏叙事排版 + 读数，不画星星 |
| `NeoCursor` | `App.vue` | — | 沉浸光标；挂载写 `data-cursor='on'`，卸载删除 |
| `NeoSiteHeader` | `App.vue` | — | 顶部：`N.nav` 导航高亮、主题切换（`toggleTheme`→`data-theme`+`localStorage['en-theme']`）、音乐按钮 |
| `NeoSiteFooter` | `App.vue` | — | 页脚：`N.footer` |
| `MusicPlayer` | `App.vue` | — | 音乐播放器（壳层常驻，非 neo 专属） |

### 6.3 页面路由表

| 路由 | 视图 | 幽灵字 | 标题（meta.t / `document.title`） |
| --- | --- | --- | --- |
| `/` | `NeoHomeView` | 渊 | `Escaping Notes · 逃逸笔记` |
| `/blog` | `NeoBlogView` | 藏 | `文章 · ${T}` |
| `/blog/:slug` | `NeoPostView` | 坠 | 由文章标题临时设置 |
| `/updates` | `NeoUpdatesView` | 息 | `动态 · ${T}` |
| `/records` | `NeoRecordsView` | 弦 | `歌单 · ${T}` |
| `/projects` | `NeoProjectsView` | 掷 | `载荷舱 · ${T}` |
| `/wall` | `NeoWallView` | 响 | `留言墙 · ${T}` |
| `/about` | `NeoAboutView` | 我 | `关于 · ${T}` |
| 任意 | `NeoNotFoundView` | 无 | `信号丢失 · ${T}` |
| `/login /register /admin` | 共用功能页 | — | 沿用旧类、经网关协调 |

> 路由 URL 在 `.env.pages`（Pages 镜像）下用 hash，其余 history（见 `router/index.js`）。

---

## 7. 文案层（`src/config/narrative.js`，字段说明）

全站界面文案唯一来源；站点信息在 `site.js`。文风：两字词为骨、对偶联为魂。改文案只改这里。

| 字段 | 类型 | 用途 |
| --- | --- | --- |
| `glyph` | Object | 每页幽灵汉字：`home/blog/post/updates/records/projects/wall/about/nf` |
| `nav` | Array | 顶部/首页目录：`{to,label,code,depth}`（`code` 为目录序号，`depth` 为深度读数） |
| `manifesto` / `manifestoSub` / `heroEyebrow` | String | 首屏对偶联、副句、眉标 |
| `orbitIdle` / `orbitReadout` | Function | 首页"在轨"读数 |
| `now` | Object | 「现在」三栏：`WRITING/LISTENING/BUILDING` |
| `descentHead` | String | 首页目录眉标：`下潜目录 · 由浅及深` |
| `notes` | Object | 各页导语（`home/archive/post/wall`） |
| `sections` | Object | 各页双语 eyebrow（如 `// 文章 · JOURNAL`） |
| `hints` | Object | 各页提示语 |
| `aboutBio` | String | 关于页自述 |
| `dilation` | String | 文章页时间膨胀读数 |
| `postEnd` | Object | 文章页出口：`escape`（按钮）/ `deeper` |
| `postPrev` / `postNext` | String | 文章页上一/下一篇锚点（`← 更浅处` / `更深处 →`） |
| `nf` | Object | 404：`title`/`text`/`home`（回到首页）/`blog`（查看文章） |
| `footer` | Object | 页脚：`line/thanks/top` |
| `theme` | Object | 主题标签：`dark`（深空）/`light`（纸面） |
| `empty` | Object | 各列表空态：`posts/updates/wall/projects` |

---

## 8. 页面要点

- **首页**：`HorizonHero.vue` 排版层（eyebrow + 对偶联宣言 + 副句 + 「现在」三栏 `WRITING / LISTENING / BUILDING`，窄屏仅留标签且三等分）浮于星轨之上，左下 `--scrim` 径向底衬保证可读；首屏视差随滚动下沉淡出。
- **文章列表 `/blog`**：大框体卡片列表——窗口足够（>880px）时一行两篇，不够时一行一篇；卡片含日期（暖色）/ 标题 / 摘要三行截断 / 字数时长与标签脚线；hover 边框冷移 + 聚光（`neo-lens`）。
- **文章页 `/blog/:slug`**：衬线长文（`--measure` 限宽）+ 时间膨胀读数 + 由浅及深的一夜翻页。
- **动态/歌单/项目/留言/关于**：统一「中文 · 英文」双语 eyebrow（如 `// 文章 · JOURNAL`）+ 幽灵字 + 极简列表/时间线；空态文案见 `N.empty`。
- **管理界面 `/admin`**：沿用 neo 同语言——胶囊页签/操作按钮、表格行悬停、透明按钮；动态/项目设置块支持「＋ 新增」与保存。
- **404**：「此星不在星图」。
- 浅色主题为「纸面」：同套冷暖逻辑，色相换为纸感暖白 + 深蓝/朱砂。

---

## 9. 开发指南（如何扩展而不破坏体系）

### 9.1 新增一个页面
1. 在 `src/config/narrative.js`：加 `glyph.X`、`sections.X`、`hints.X`、`empty.X`（如需要）。
2. 在 `src/router/index.js`：注册懒加载路由与 `meta.t`。
3. 新建 `src/views/neo/NeoXView.vue`，外壳用：
   ```html
   <section class="neo-shell">
     <span class="neo-glyph glyph">{{ N.glyph.X }}</span>
     <p class="neo-eyebrow">{{ N.sections.X }}</p>
     <h2 class="neo-h2">…</h2>
     <p class="neo-lede">{{ N.notes.X }}</p>
   </section>
   ```
   页面顶部留 `padding-top: 120px`（或复用 `.neo-shell` 的 `--space-5`）。
4. 若页面是"次级页"，无需额外处理（`App.vue` 已按 `route.path !== '/'` 给 `main.neo-sub` 与活背景）。

### 9.2 改主题色 / 字体 / 栏宽 / 圆角
- 颜色：改 §4.2 表中对应变量（`tokens.css` 基线 + `neo.css` 深空/纸面两块）。两套主题都改，保持冷/热/白语义不变。
- 字体：改 `--font-*`（`tokens.css`）。
- 栏宽：改 `--measure`；圆角：改 `--r-sm/--r-md/--r-lg/--r-pill`。
- **关键**：两套主题各验收一次；不要把颜色值硬编码在组件里，一律引用变量，才能被网关切换。

### 9.3 复用 / 新增组件
- 布局文字类直接用类库基元（`neo-shell/h2/eyebrow/lede/mono/note…`），勿重造。
- 交互类：按钮用 `neo-btn`（主/幽灵），筛选用 `neo-chip`，标签用 `neo-tag`，输入用 `neo-field`。
- 悬停引力语言统一用 `neo-lens` + `.bar` 子元素，并 `@pointermove="onLens"`（`src/lib/lens.js`）。
- 新组件样式写在 `.vue` `<style scoped>`；若需全站生效（如 `.neo-prose`），放 `neo.css` 并加 `html[data-skin='neo']` 前缀。

### 9.4 制造"随深度变化"的视觉
- 读 `var(--shift, 0)`（0..1），写到 `opacity` / `letter-spacing` / 过滤等。例：`opacity: calc(var(--shift,0)*0.55)`。
- 不要每处写死滚动监听；深度统一由 `App.vue` 的 `--shift` 驱动。

### 9.5 无障碍与性能红线
- 一切动效必须有 `prefers-reduced-motion` 降级（见 §5.5）。
- 触控/拖动类交互需有鼠标等价（如 `pointermove` 事件封装在 `lens.js`）。
- Canvas 尊重 `devicePixelRatio` 上限与像素预算（`StarTrails` 已内置 4.6MP 封顶 + 页面隐藏暂停）。
- 文案尽量放 `narrative.js`；`aria-label`/`alt` 用中文；输入框移动端 ≥16px（避免 iOS 放大）。

---

## 10. 与初版方案的差异备忘

- Aurora Glass（星云玻璃/Bento/视差装置）整体废弃；双皮肤机制亦已退役，neo 为唯一界面世代。
- 长按投喂、首屏轨道读数条、深度轨玻璃读数面板：实施后按反馈移除。
- 环倾角只随滚动开合，不随鼠标（初版曾做指针倾角）。
- 语义收敛：导航/页面统一"文章"表述（不再用"归档"）；滚动进度与深浅隐喻收敛为 `--shift` 与"由浅及深"；404 用"星图"而非"天区"，按钮保持功能直白（`回到首页` / `查看文章`）。
