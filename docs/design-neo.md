# Escaping Notes · 界面设计文档（neo · 长曝光星轨 Star-Trails Descent）

> 2026-09 起生效，取代 Aurora Glass 方案。本文是本站界面（`data-skin='neo'` 样式网关）的唯一设计依据。
> **版本：v1.3.0**（1.3.0：**统一设计系统**——建立间距刻度（`--space-0…5`）、排版刻度（`--fs-3xs…4xl` / `--lh-*` / `--fw-*`）、卡片令牌（`--card-*`）与状态提示（`.neo-note-*`）、图标规范（`.neo-ico`），按钮收敛为「两个尺寸 × 四种语义」，表单收敛为「单行下划线 / 多行盒子」，并把 `/login /register /admin` 三张功能页并入同一套 `.neo-*` 组件，见 §5.3、§10；1.2.0：运行时性能与无障碍收敛——次级页限帧、统一 resize 去抖、去常驻 `backdrop-filter`、透镜光斑改 `transform`、新增 `--shadow` 并清理死令牌、焦点陷阱/路由播报/触控目标；`fall` 转场的整页 `filter` 经评估后按设计取舍保留，见 §10；1.1.0：星轨防饱和尾部渐隐、文章页磨砂玻璃阅读底板与 WCAG AA 可读性、阅读栏加宽；v1.0.0 的概念与交互草案冻结不变）。

---

## 0. 阅读指引（这一版怎么用）

- 想**改颜色 / 字体 / 栏宽 / 圆角** → 只改 `src/styles/tokens.css` + `src/styles/neo.css` 里的变量，见 §4、§5。
- 想**加页面 / 加组件 / 复刻微交互** → 先看 §5.3 组件库标准与类库、§6 组件契约，再照 §9 开发指南。
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
5. **可降级。** 一切动效都必须有 `prefers-reduced-motion` 降级（见 §5.6）；API 不可达时站点仍是完整离线底片。

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
- **次级页限帧（1.2.0）**：非交互模式目标帧率 30fps（`SUB_FPS`），不足一帧间隔时 rAF 回调直接返回、不绘制。`update()` 用的是真实 `dt`（≈33ms），故星轨转速与满帧完全一致，只是全屏 `destination-out` + `drawImage` 的绘制量减半。首页交互层不受影响（满帧）。
- 已退役：黑洞/吸积盘/仪表环管线（原 `BlackHole.vue`）与红移坠入深度轨（原 `DepthRail.vue`，现由 `App.vue` 写 `--shift`）。
- **v3 定稿微调（1.0.0）**：变星移除外围圆环、呼吸幅度收窄并缓慢自转（`rot = t·0.22 + ph`）；光标三星为短弧带拖尾彗星、无衍射芒；流星与变星共用 `drawStar` 渲染器。
- **防饱和尾部渐隐（1.1.0）**：星轨即将转满前 20% 平滑暗化（`SETTLE_START=0.8`、`SETTLE_DEPTH=0.55`），另随机 1-2 根做柔和独立渐隐；每颗星带随机尾迹起点偏移（`shear`），使弧段截端错落、圆环连续无对齐断口；`FADE_0=0.008 / FADE_1=0.0032` 拉长尾迹，让相邻弧段衔接成连续同心圆环。

### 3.2 曝光深度与时间流速

- 滚动 = 曝光加深，进度 `p∈[0,1]` 由 `App.vue` 写入 CSS 变量 `--shift`，驱动：暗角晕影加深、首页宣言字距随潮汐力拉长。
- **fall 转场**：路由跳转 = 一次下坠重开（`scale .8→1`、`blur 12→0`、sepia/hue-rotate 相位）→ 展开成新页。全站唯一转场。
  关键帧里的 `filter` 作用于**整页子树**，每一帧都要重新栅格化，且离开方与进入方并行叠影时更甚——这是本站最贵的一处绘制。1.2.0 曾评估改为"只动 opacity/transform + 独立红移覆盖层"，实为可行但**叠影模糊正是"坍缩"的手感来源，最终决定保留原样**（取舍记录见 §10）。
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
| `--shadow` | 抬升阴影（卡片/阅读底板） | `rgba(0,0,0,.62)` | `rgba(23,21,15,.22)` |
| `--void-a` | 运动模糊覆盖 | `rgba(2,2,4,.34)` | `rgba(245,242,234,.34)` |
| `--scrim` | 文字径向底衬 | `rgba(2,2,4,.78)` | `rgba(245,242,234,.78)` |
| `--panel-bg` | 文章页阅读玻璃底板（半透明页面色 + 背景模糊） | `rgba(2,2,4,.55)` | `rgba(245,242,234,.6)` |
| `--panel-frost-bg` | 底板在无 `backdrop-filter` 时的兜底 | `rgba(2,2,4,.78)` | `rgba(245,242,234,.78)` |

> **注意**：凡是"跟随底色"的语义色都必须在两套主题里各自定义。`--scrim` 深空用深底色、纸面用纸色，**不要在浅色上复用深空的 `rgba(2,2,4,…)`**；未定义会让使用处的 `var(--scrim)` 整条声明失效（首页文字底衬即由此消失）。同理 `--shadow` 深空是近黑、纸面是暖深色——用浅色的 `--ink-2` 当阴影会在纸面上晕出一圈浅色光斑（文章页阅读底板曾如此）。
>
> **1.2.0 删除的死令牌**：`--glass-bg` / `--glass-brd` / `--glass-blur` / `--hole` / `--signal-canvas` —— 全站已无消费方。玻璃只剩抽屉一处（用字面量 `blur(24px)`），其余表面改用高不透明实底，理由见 §5.6。

### 4.3 字体三层（展示层自托管子集）

| 层 | 变量 | 栈 | 用途 |
| --- | --- | --- | --- |
| 标题碑刻 | `--font-display` | **`EN Display Serif`（自托管子集）** / `Songti SC / Noto Serif SC / Noto Serif CJK SC / Source Han Serif SC / Source Han Serif CN / STSong / SimSun` | `.neo-title` `.neo-h2` `.neo-prose h2…h4` |
| 正文宋体 | `--font-serif` | `Songti SC / Noto Serif SC / Noto Serif CJK SC / Source Han Serif SC / Source Han Serif CN / STSong / SimSun` | `.neo-prose` 正文、`.neo-note` 观测手记 |
| 等宽读数 | `--font-mono` | `JetBrains Mono / Cascadia Code / ui-monospace / SFMono-Regular / Menlo / Consolas / Courier New` | `.neo-eyebrow` `.neo-mono` `.neo-chip` `.neo-tag`、所有"仪器文字" |

普通 UI 文字用 `--font-sans`（`PingFang SC / Microsoft YaHei / system-ui`），为 body 默认字体。

**为什么只有标题层自托管**：中文衬线三平台没有共同系统字体（macOS 命中 Songti SC，**Windows 会落到 SimSun**），
而 `--font-display` 最大到 132px，品牌观感全压在这一层；正文用系统宋体栈既合格又不付下载代价。

**子集怎么来**：`@font-face` 声明在 `neo.css`，字体与许可在 `src/assets/fonts/`，由 `npm run font:build`
（`scripts/build_font.mjs`）从本机 Noto Serif SC 可变字体生成 —— GB2312 一级字表 3755 字 ∪ 仓库现有内容
用字（当前 3922 字 ≈ 703 KB），并 `wght=700` 实例化（展示层元素全部为 700，单实例体积最小）。
字表改为「仅内容用字」可压到约 174 KB，代价是新文章的标题字可能单字回退。

**两条约束**：① 产物必须提交，构建与 CI **不调用**该脚本（因此不依赖源字体）；② 该族只有 700 一个字面，
新增 `--font-display` 消费方若不显式写 `font-weight: 700`，会直接以这个 700 字面渲染。

### 4.4 幽灵汉字签名

叙事弧线 `渊→藏→坠→息→弦→掷→响→我→无`：渊（首页）、藏（文章）、坠（文章页）、息（动态）、弦（歌单）、掷（项目）、响（留言）、我（关于）、无（404）。
样式由 `.neo-glyph` 提供（stroke 空心、`opacity .07`、绝对定位）。**每页一枚**，位置可视图微调（见各视图 `.glyph` 覆盖）。

### 4.5 光标系统（`neo.css`）

- 正文/标题：`cursor: default` + `caret-color: transparent`（点击不出现 I 形竖线）。
- 可交互：`a[href] / button / label / summary` → `pointer`。
- 仅输入框：`input / textarea / [contenteditable]` → `text` + 冷色 caret。
- 沉浸光标（`NeoCursor`）：**默认关闭**，由顶栏第三枚按钮开启并记忆（`localStorage['en-cursor']`）；
  仅**首页**接管，其余页面保留系统光标（图片 zoom-in 等原生语义不被吞掉）。开启条件还要求精细指针
  且未开启「减弱动效」，不满足时顶栏按钮置灰。只有真正画出第一帧后才写 `html[data-cursor='on']`
  隐藏原生指针（绘制异常时指针不会"消失"）；指针离开窗口 / 窗口失焦 / 离开首页即归还系统光标；
  指针静止约 1.4s 后轨道转速平滑收敛并停帧，指针一动即唤醒。

### 4.6 其它

- 标签页图标：透明底镂空彩色圆环（四段蓝→红→白渐变，`/favicon.svg`）。
- 滚动条：`::-webkit-scrollbar` 8px，thumb 用 `color-mix(in srgb, var(--hot) 40%, transparent)`，`--r-pill` 圆角。
- 分享卡片 `/og.png`（1200×630）：由 `scripts/build_seo.mjs` 程序化绘制——深空底 + 偏心天极的同心星轨，沿用 §4.1 的三档色温，左下预先压暗。**不绘文字**（不引入字体栅格化依赖），标题交给平台自己渲染。重绘：`npm run og:build`（产物提交进仓库）。
- 抓取：`/robots.txt` 放开全站、屏蔽 `/admin` 与 `/api/`，并声明 sitemap；`/sitemap.xml` 由同一脚本在构建期生成（静态路由 + 全部文章）。

---

## 5. 样式网关与类库（开发的控制面）

### 5.1 样式网关（唯一入口）

任何 neo 规则都必须写在 `html[data-skin='neo']` 下（`index.html` 的 `<html>` 硬编码 `data-skin="neo"`，本站唯一样式网关）。这样做的目的：以特异性压过 `tokens.css` 的旧令牌，并让仍沿用旧样式类（`/login /register /admin` 等）的功能页自动协调。

- **导入顺序**：`main.js` 先 `tokens.css` 后 `neo.css`（皮肤依赖顺序覆盖旧变量）。
- **属性开关**：
  - `data-skin="neo"`：固定，启用皮肤。
  - `data-theme="well" | "out"`：主题，由 `src/lib/theme.js` 驱动；默认 `well`（深空）。`index.html` 首帧内联脚本按「`localStorage['en-theme']` 优先 → `prefers-color-scheme` → 深空」预置，防闪烁；`theme.js` 读取该结果，默认值逻辑只此一处。
  - `data-cursor="on"`：沉浸光标生效中（由 `NeoCursor` 在**画出第一帧后**写入，交还时删除）。默认不写入——光标默认关闭，需用户顶栏开启且仅在首页生效。
- **特异性**：`html[data-skin='neo']` (0,1,1) > `:root` (0,1,0)；主题块 `html[data-skin='neo'][data-theme='out']` (0,2,1)。新增覆盖时按需递增，勿用 `!important`。

### 5.2 非颜色令牌

**空间与形状**

| 令牌 | 值 | 说明 |
| --- | --- | --- |
| `--space-0` | `4px` | 发丝级：图标与文字之间、徽标内边距、微位移量 |
| `--space-1` | `8px` | 基本间距（1.3.0 新增 `--space-0`，刻度 = 4/8/16/32/64/96） |
| `--space-2` | `16px` | 常规内边距、栅格间距、卡片内边距（`--card-pad`） |
| `--space-3` | `32px` | 区块间距、卡片宽松内边距（`--card-pad-lg`）、幽灵汉字上边距 |
| `--space-4` | `64px` | 页面级留白 |
| `--space-5` | `96px` | 次级页 `neo-shell` 顶部余量（neo 下新增） |
| `--page-top` | `120px` | 次级页内容顶部留白，避开固定顶栏（1.3.0 新增，原先各页各写 `120px`） |
| `--r-sm` | `8px` | 圆角刻度 |
| `--r-md` | `14px` | 卡片/代码块 |
| `--r-lg` | `20px` | 大框体 |
| `--r-pill` | `999px` | 按钮/胶囊/滚动条 |

**排版刻度**（`tokens.css` 定义为全站唯一来源，组件里禁止写裸字号）

| 令牌 | 值 | 用途 |
| --- | --- | --- |
| `--fs-3xs` | `11.5px` | 仪器最小读数（标签/角标/脚注）——**硬下限** |
| `--fs-2xs` | `12px` | 眉标 / 读数 / 等宽文字 / `.neo-btn-sm` / `.neo-chip` |
| `--fs-xs` | `13px` | 注脚 / 辅助说明 / `.neo-note-*` |
| `--fs-sm` | `14px` | 次要正文 / 按钮 / 导航 |
| `--fs-md` | `15px` | 小正文 / 表单输入 / 列表行 |
| `--fs-base` | `16px` | 正文基准（`body`） |
| `--fs-lg` | `17px` | 长文正文（`.neo-prose`） |
| `--fs-xl` | `20px` | 卡片标题 / 小标题 |
| `--fs-2xl` | `26px` | 区块标题（小） |
| `--fs-3xl` | `30px` | 区块标题（抽屉导航项） |
| `--fs-4xl` | `34px` | 页面标题（小） |
| `--lh-tight` | `1.35` | 标题 |
| `--lh-snug` | `1.6` | 界面文字（默认） |
| `--lh-normal` | `1.75` | 正文 |
| `--lh-relaxed` | `1.9` | 长文 |
| `--fw-normal` | `400` | 正文 |
| `--fw-medium` | `600` | 按钮 / 强调标签 |
| `--fw-bold` | `700` | 标题碑刻（衬线标题专用） |
| `--measure` | `68ch` | 阅读栏/导语限宽 |

> **展示级字号例外**：比 `--fs-4xl` 更大的标题（`.neo-title` / `.neo-h2` / `.neo-prose h2` / 文章标题 / 首页宣言 / 幽灵汉字）仍用字面量 `clamp()` 写在 `neo.css`，因为它们的取值由视口而非刻度决定；对应的行高也刻意脱离四档（`.neo-title` 1.06、`.neo-h2` 1.2、文章标题 1.16），这是碑刻感的一部分，不是遗漏。

**卡片与品牌**（1.3.0 新增，见 §5.3）

| 令牌 | 值 | 说明 |
| --- | --- | --- |
| `--card-bg` | `color-mix(in srgb, var(--ink-1) 44%, transparent)` | 卡片底色（文章卡 / 留言卡 / 图片格共用） |
| `--card-bg-hover` | `… 72% …` | hover 抬升 |
| `--card-brd` | `var(--line)` | 卡片描边 |
| `--card-brd-hover` | `color-mix(in srgb, var(--cold) 55%, transparent)` | hover 描边转冷 |
| `--card-pad` | `var(--space-2)` | 常规卡片内边距 |
| `--card-pad-lg` | `var(--space-3)` | 内容型卡片内边距 |
| `--brand-cold` / `--brand-hot` / `--brand-white` | `#8ec9ff` / `#ff5c39` / `#fff7ed` | 顶栏吸积环签名专用，跨主题固定（不放进主题块） |
| `--shift` | `0..1`（运行时） | 滚动深度，`App.vue` 每帧写入 `<html>`；驱动晕影、字距、星轨流速 |

### 5.3 组件库标准与类库清单

> 本节是 1.3.0「统一设计系统」的规范正文。**规则：新页面 / 新组件只能由下列基元组合而成，不得再写页面私有的按钮、输入框、卡片或提示样式。** 1.3.0 之前，`/login /register /admin` 三张功能页各自实现了一套 `.submit` / `.act` / `.tab` / `.err` / `.notice` / `.warn`——这些私有类已随本次收敛全部删除，三页改用 `.neo-*`。

**① 色彩语义（只用三色 + 三个中性）**

| 角色 | 令牌 | 用在哪 |
| --- | --- | --- |
| 冷（蓝移） | `--cold` | 交互：hover、链接、焦点、选中项、`.neo-chip.on`、`.neo-note-ok` |
| 热（红移） | `--hot` | 深度：进度、当前项、破坏性动作的 hover、`.neo-note-err`、`.neo-btn-primary` |
| 白热 | `--white` | 仅光子环与 ≤2px 高光（按钮扫光、衍射芒、暗星核心） |
| 中性 | `--ink-0/1/2` | 背景 → 卡片 → 抬升面 |
| 中性 | `--text-0` / `--text-1` | 前景 / 次要前景（`.neo-note-info`） |
| 中性 | `--line` | 一切发丝描边（`--card-brd` 即它） |

- 旧组件仍读 `--signal` / `--signal-dim`，neo 下它们已别名到 `--cold`（§4.2）；**新代码不要再引用 `--signal`**。
- 唯一允许硬编码的颜色是 `--brand-*`（顶栏吸积环签名，跨主题固定），因为它需要在纸面主题下也保持同一枚环。

**② 排版层级（只用 `--fs-*` / `--lh-*` / `--fw-*`）**

- 字号一律取 §5.2 的 11 档刻度；行高取 4 档；字重取 3 档（400 正文 / 600 按钮与强调标签 / 700 碑刻标题）。
- 字体家族三选一：`--font-sans`（界面，默认）、`--font-mono`（仪器文字：`.readout` / `.neo-mono` / `.neo-chip` / 表单里的大写读数）、`--font-display`（展示层衬线：标题、卡名、抽屉项）；正文用 `--font-serif`。
- `.readout`（`tokens.css`）与 `.neo-mono`（`neo.css`）是"仪器文字"的两种落点，前者供功能页、后者供 neo 页，样式同源。
- **裸 `font-size: Npx` 视为缺陷**；展示级 `clamp()` 见 §5.2 的例外说明。

**③ 间距与布局（只用 `--space-*`）**

- 6 档刻度（4/8/16/32/64/96）+ `--page-top`（次级页顶栏避让）。半档需求写 `calc(var(--space-0) / 2)` 并加注释（当前仅抽屉导航项间距一处）。
- 次级页容器固定 `.neo-shell`（`padding: var(--space-5) var(--space-3)`，≤720px 收窄）或功能页 `.page`，页面只覆盖 `padding-top: var(--page-top)`。
- 组件内部同样不写裸 px；不可换算的**结构性尺寸**（顶栏控件 32px 高、封面 104px、图标固定盒 1.15em、sr-only 的 `-1px`、光束居中用的负 margin）不属间距，保留字面量。

**④ 图标（`.neo-ico`，只用单字符几何符号）**

| 语义 | 符号 |
| --- | --- |
| 开 / 关 | `✦` 实心 = 开 · `✧` 空心 = 关 |
| 菜单 | `≡` 打开 · `✕` 关闭 |
| 媒体 | `▶` 播放 · `❚` 暂停 · `»` 下一首 |
| 方向 | `→` 站内 · `↗` 站外 |

- 不引图标字体、不用 emoji。图标一律 `aria-hidden="true"`，语义由宿主按钮的 `aria-label` 承担。
- 图标包在 `.neo-ico` 的固定盒里（`1.15em` 宽 + 居中），避免不同字形宽窄不一导致按钮跳动。
- 颜色不单独指定，跟随宿主：默认 `--text-1`、hover `--cold`、激活/播放中 `--hot`。

**⑤ 视觉反馈（`.neo-note-ok / .neo-note-err / .neo-note-info`）**

- 全站只有三种状态提示，统一 mono `--fs-xs` + `//` 前缀：
  - `info` → `--text-1`：降级/提示类非错误信息（如"本地模式，数据仅存本浏览器"）
  - `ok` → `--cold`：操作成功（"已保存"）
  - `err` → `--hot`：失败、不可继续
- **不得再新增 `.err` / `.warn` / `.notice` 之类一次性类**。动态文案用 `:class` 在 `ok` / `err` 间切换（见 `AdminView`、`NeoRecordsView` 的 `flash` / `syncErr`）。
- 加载态分两种：内容型页面用骨架屏（`.skeleton`，见 `NeoBlogView`）；按钮内联用文案替换 + `:disabled`（"同步中…"，见 `NeoRecordsView`）。

### 5.4 类库清单（`neo-*` 基元，全局可用）

| 类 | 用途 / 关键样式 |
| --- | --- |
| `.neo-shell` | 次级页内容容器：`max-width 1120px` 居中，`padding var(--space-5) var(--space-3)`（≤720px 收窄） |
| `main.neo-sub` | `App.vue` 依 `route.path !== '/'` 挂载：`min-height 100vh+140px`、`padding-bottom 140px`（把页脚压出首屏） |
| `.neo-glyph` | 幽灵汉字：绝对定位、stroke 空心、`opacity .07`、`pointer-events none` |
| `.neo-eyebrow` | 双语眉标：mono `--fs-2xs`、uppercase、前缀 20px `--hot` 短横（`::before`） |
| `.neo-title` | 巨型标题：display `clamp(40px,11vw,132px)` |
| `.neo-h2` | 区块标题：display `clamp(28px,4.6vw,44px)` |
| `.neo-lede` | 导语：`max-width --measure`、`--text-1`、`--fs-base`/`--lh-relaxed` |
| `.neo-mono` | 等宽读数：mono `--fs-2xs`、uppercase、`--text-1` |
| `.neo-note` | 观测手记：serif italic `--fs-xs`、`rotate(-1.2deg)` |
| `.neo-note-ok` / `.neo-note-err` / `.neo-note-info` | **状态提示三态**（§5.3⑤）：mono `--fs-xs` + `//` 前缀；`--cold` / `--hot` / `--text-1` |
| `.neo-hair` | 1px 发丝分隔线（`--line`） |
| `.neo-ico` | **图标固定盒**（§5.3④）：`1.15em` 宽 + 居中 + `flex: none` |
| `.neo-btn` | 胶囊按钮基类（默认尺寸 40px / `--fs-sm` / 600）：pill、hover `translateY(-2px)` + 扫光；`:disabled` 降至 45% 且不再抬升 |
| `.neo-btn-sm` | **小尺寸修饰**（28px / `--fs-2xs`）：表格行、工具条里的密集操作。尺寸与语义修饰可自由组合 |
| `.neo-btn-primary` | **热色实心**：仅用于"深度方向"的主动作（表单提交、文章页出口） |
| `.neo-btn-ghost` | 发丝描边：次级动作（取消、返回、上传并插入） |
| `.neo-btn-danger` | 描边 + hover 转热：破坏性动作（删除/禁用/解禁） |
| `.neo-btn-quiet` | 无框纯文字（`min-height: 0`）：附注动作（复制链接、回到顶部、抽屉里的登录/登出）。**与尺寸修饰组合时尺寸修饰只贡献字号**，实际观感以"贴内容的文字按钮"为准 |
| `.neo-chip` | 筛选胶囊 / 页签：mono `--fs-2xs`；hover 与 `.on` 均为**冷色**（热色完整让给主动作） |
| `.neo-tag` | 文章标签：冷色 14% 底、mono `--fs-3xs` |
| `.neo-tag-quiet` | 中性标记（"本地读数"）：`--text-1` 14% 底，不带交互语义 |
| `.neo-field` | 下划线式输入：`border-bottom`、focus 冷色；`textarea.neo-field` 转为发丝框 + `--r-sm` |
| `.page` / `.readout` / `.field`（`tokens.css`） | **功能页（`/login` `/register` `/admin`）的通用基元**，与 `.neo-*` 同一套形态与状态规则：`.page` 限宽 1120px + `.neo-shell` 级留白；`.readout` 仪器文字（mono `--fs-2xs`）；`.field` 下划线输入、`textarea.field` 发丝框。功能页只用这三个 + `.neo-btn*` / `.neo-chip` / `.neo-note-*`，不再写私有样式 |
| `.neo-lens` | 引力透镜光斑：依赖 `lens.js` 写入 `--lx/--ly`；自带 `overflow: hidden` 裁住光斑；需配 `.bar` 子元素作左缘标记 |
| `.sr-only` | 仅供读屏：视觉隐藏但留在可访问性树（路由播报、跳转提示） |
| `.neo-vignette` | 全屏晕影：fixed `z-30`、`opacity calc(var(--shift,0)*.55)`、`pointer-events none` |
| `.neo-prose` | 正文容器（命中 `v-html`，**放全局**）：serif 17px/1.95、限宽居中；h2 带 `--hot` 左缘、代码/表格/引用等样式齐全 |
| `.neo-glass` | **文章页磨砂玻璃阅读底板**：半透明页面色（`--panel-bg`）+ `backdrop-filter: blur(22px)` + 四边 `mask` 羽化（水平/垂直 intersect），隔离星轨、提升前景对比（WCAG AA）；本页局部放宽 `--measure` 提高文字占比 |

### 5.5 引力微交互基元

- **透镜光斑** `.neo-lens::after`：260px 径向 `--cold` 13% 光斑，hover 淡入。**1.2.0 改为"静止渐变 + transform 位移"**：伪元素是 520×520 的固定盒子（`margin -260px` 让中心落在宿主左上角），跟随指针靠 `transform: translate(var(--lx), var(--ly))`；旧写法每帧改 gradient 中心会让元素持续重绘。仅 transform 变化不足以免除重绘，故 hover 时申请 `will-change: transform` 把它提为独立合成层（同一时刻只有一个宿主处于 hover）。
- **左缘引力标记** `.neo-lens .bar`：2px 冷色竖条，hover `scaleY(0)→1`。
- **按钮扫光** `.neo-btn::before`：`--white` 45% 斜面高光，`neo-sheen` 0.65s 划过。
- **胶囊填充扫入** `.neo-chip::before`：冷色 16% 底 `scaleX(0)→1`。
- 所有位移弹簧都用 `cubic-bezier(0.2, 0.8, 0.2, 1)`。

### 5.6 晕影、转场与降级

- **晕影**：`.neo-vignette` 用 `radial-gradient(ellipse 120% 92% …)`，越深越暗。
- **fall 转场**：`fall-enter/fall-leave` + `fall-in / fall-out` 关键帧（`scale` + `blur` + sepia/hue-rotate 相位）；离场页 `position: absolute` 叠在进入页之下（并行模式，见 §6.1 注释）。**这是本站唯一一处刻意的整页 `filter`**——保留下坠感优先于回收开销，改法见 §10。
- **backdrop-filter 红线（1.2.0）**：常驻悬在动画画布之上的表面一律不用 `backdrop-filter`（否则浏览器在星轨每动一帧时都要重算背后模糊）。吸顶栏与音乐播放器改为 `color-mix(in srgb, var(--ink-0) 94%, transparent)` 实底；仅抽屉（遮满全屏的模态、进出场各 0.28s）保留 `blur(24px)`；文章页阅读底板 `blur(22px)` 是有意保留的可读性取舍（见 §5.4），其代价已由次级页限帧对冲掉一半。
- **resize 去抖**：所有 resize 处理（`App.vue` 重测滚动上限、顶栏断点收抽屉、两处画布重建）统一经 `src/lib/debounce.js`，静默 150ms 后执行一次。
- **不影响布局的滚动监视**：滚动深度只由 `App.vue` 一处写入 `--shift`——它缓存了 `scrollHeight`（避免每帧强制同步布局），值不变时不写样式；文章页顶部进度线直接用 `width: calc(var(--shift,0) * 100%)`，不再自建滚动监听。
- **减弱动效**：`prefers-reduced-motion` 下关闭 fall 动画、按钮位移、扫光、骨架屏动画，并让 `.neo-vignette` 恒为 0；`StarTrails` 走静态快进底片；全局 `tokens.css` 已把动画/过渡压到 0.01ms。

---

## 6. 壳层与组件契约

### 6.1 壳层挂载顺序（`src/App.vue`）

```
StarTrails (仅次级页 v-if="isSub")
.neo-vignette
NeoSiteHeader        → 导航 / 主题切换 / 音乐 / 沉浸光标开关
main#main(.neo-sub)  → tabindex="-1"（供 .skip-link 落焦）；RouterView <Transition name="fall">
NeoSiteFooter
MusicPlayer
NeoCursor            → 默认关闭、仅首页；画出首帧后写 / 交还时删 <html data-cursor>
p.sr-only[aria-live] → 路由播报，内容取 route.meta.t
```

### 6.2 组件清单

| 组件 | 挂载 | Props / Emits | 职责 |
| --- | --- | --- | --- |
| `StarTrails` | 首页由 `HorizonHero`（`interactive`）；次级页由 `App.vue`（非交互） | `interactive`(Bool)、`posts`(Array)；`@hover`、`@select` | 星轨 Canvas 装置，见 §3.1 |
| `HorizonHero` | `NeoHomeView` | `posts`(Array)、`now`(Object)；`@select` | 首页首屏叙事排版 + 读数，不画星星 |
| `NeoCursor` | `App.vue` | — | 沉浸光标（默认关闭、仅首页生效）；画出首帧后写 `data-cursor='on'`，交还时删除 |
| `NeoSiteHeader` | `App.vue` | — | 顶部：`N.nav` 导航高亮、主题切换（`toggleTheme`→`data-theme`+`localStorage['en-theme']`）、音乐按钮、沉浸光标开关 |
| `NeoSiteFooter` | `App.vue` | — | 页脚：`N.footer` |
| `MusicPlayer` | `App.vue` | — | 音乐播放器（壳层常驻，非 neo 专属） |

### 6.3 页面路由表

| 路由 | 视图 | 幽灵字 | 标题（meta.t / `document.title`） |
| --- | --- | --- | --- |
| `/` | `NeoHomeView` | 渊 | `Escaping Notes · 逃逸笔记` |
| `/blog` | `NeoBlogView` | 藏 | `文章 · ${T}` |
| `/blog/:slug` | `NeoPostView` | 坠 | 兜底 `阅读 · ${T}`（`meta.t`），加载完成后换成文章标题 |
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
| `nav` | Array | 顶部/首页目录：`{to,label,code}`（`code` 为目录序号） |
| `manifesto` / `manifestoSub` / `heroEyebrow` | String | 首屏对偶联、副句、眉标 |
| `now` | Object | 「现在」三栏：`WRITING/LISTENING/BUILDING` |
| `descentHead` | String | 首页目录眉标：`下潜目录 · 由浅及深` |
| `notes` | Object | 各页导语（`archive/wall`） |
| `sections` | Object | 各页双语 eyebrow（如 `// 文章 · JOURNAL`） |
| `hints` | Object | 各页提示语 |
| `aboutBio` | String | 关于页自述 |
| `dilation` | String | 文章页时间膨胀读数 |
| `postEnd` | Object | 文章页出口按钮：`escape` |
| `postPrev` / `postNext` | String | 文章页上一/下一篇锚点（`← 更浅处` / `更深处 →`） |
| `nf` | Object | 404：`title`/`text`/`home`（回到首页）/`blog`（查看文章） |
| `footer` | Object | 页脚：`line/thanks/top` |
| `theme` | Object | 主题标签：`dark`（深空）/`light`（纸面） |
| `empty` | Object | 各列表空态：`posts/search/updates/wall/projects`（`search` 专用于"筛选后为空"，与"本来就没有内容"分开） |

---

## 8. 页面要点

- **首页**：`HorizonHero.vue` 排版层（eyebrow + 对偶联宣言 + 副句 + 「现在」三栏 `WRITING / LISTENING / BUILDING`）浮于星轨之上，左下 `--scrim` 径向底衬保证可读；首屏视差随滚动下沉淡出。窄屏（≤720px）三栏改竖排：每行「标签左 · 内容右」，内容照常显示（旧版三等分窄列里把内容整条隐藏，只剩三个空标签，「现在」栏等于失效）。
- **文章列表 `/blog`**：大框体卡片列表——窗口足够（>880px）时一行两篇，不够时一行一篇；卡片含日期（暖色）/ 标题 / 摘要三行截断 / 字数时长与标签脚线；hover 边框冷移 + 聚光（`neo-lens`）。数据拉取期间显示 4 张与真实卡片等高的骨架卡（避免"空等一片黑"被误读成没有文章）；「列表为空」与「筛选无结果」分用 `N.empty.posts` / `N.empty.search`；搜索词与标签写入 `?q=` / `?tag=`（`router.replace`，可分享、刷新不丢，浏览器前进后退可回放）。
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
   页面顶部留 `padding-top: var(--page-top)`（次级页；`.page` 页同理）。
4. 若页面是"次级页"，无需额外处理（`App.vue` 已按 `route.path !== '/'` 给 `main.neo-sub` 与活背景）。
5. 页面内的一切尺寸与颜色都从 §5.2 的刻度与令牌里取：字号 `--fs-*`、间距 `--space-*`、行高 `--lh-*`、字重 `--fw-*`、卡片 `--card-*`。

### 9.2 改主题色 / 字体 / 栏宽 / 圆角
- 颜色：改 §4.2 表中对应变量（`tokens.css` 基线 + `neo.css` 深空/纸面两块）。两套主题都改，保持冷/热/白语义不变。
- 字体：系统栈改 `--font-*`（`tokens.css`）；展示层子集字体见 §4.3（`neo.css` 的 `@font-face`），字表或内容变化后重跑 `npm run font:build` 并提交产物。
- 栏宽：改 `--measure`；圆角：改 `--r-sm/--r-md/--r-lg/--r-pill`。
- 字号 / 行高 / 字重 / 间距：改 `--fs-*` / `--lh-*` / `--fw-*` / `--space-*` 刻度本身，**不要在组件里逐处替换**——刻度化的意义就是"改一处、全站同步"。
- 卡片质感（底色/描边/hover/内边距）：改 `--card-*` 一组，文章卡、留言卡、图片格、后台面板会同时跟随。
- **关键**：两套主题各验收一次；不要把颜色值硬编码在组件里，一律引用变量，才能被网关切换。

### 9.3 复用 / 新增组件
- 布局文字类直接用类库基元（`neo-shell/h2/eyebrow/lede/mono/note…`），勿重造。
- 交互类：按钮用 `neo-btn`（+ `neo-btn-sm` 尺寸 / `primary`·`ghost`·`danger`·`quiet` 语义），筛选用 `neo-chip`，标签用 `neo-tag`（中性用 `neo-tag-quiet`），输入用 `neo-field`（多行加 `textarea`），提示用 `neo-note-ok/err/info`，图标用 `neo-ico` —— 全部见 §5.3。
- **禁止**为单个页面另造按钮 / 输入框 / 卡片 / 提示类。若现有基元确实不够，先扩充 `neo.css` 的基元本身，再在所有页面同时切换。
- 悬停引力语言统一用 `neo-lens` + `.bar` 子元素，并 `@pointermove="onLens"`（`src/lib/lens.js`）。
- 新组件样式写在 `.vue` `<style scoped>`；若需全站生效（如 `.neo-prose`），放 `neo.css` 并加 `html[data-skin='neo']` 前缀。scoped 里只写**版式**（栅格、定位、显隐）与内容型密度差异，不重复基元的外观。
- 直写裸 `px` 前先问一句：这是间距/字号/颜色吗？是 → 用令牌；只有**结构性尺寸**（控件高度、封面边长、图标盒、光学补偿）才留字面量。

### 9.4 制造"随深度变化"的视觉
- 读 `var(--shift, 0)`（0..1），写到 `opacity` / `letter-spacing` / 过滤等。例：`opacity: calc(var(--shift,0)*0.55)`。
- 不要每处写死滚动监听；深度统一由 `App.vue` 的 `--shift` 驱动。

### 9.5 无障碍与性能红线

**性能**

- 一切动效必须有 `prefers-reduced-motion` 降级（见 §5.6）。
- 动画只动 `opacity` / `transform`：**不要新增大面积的 `filter`**（唯一例外是 `fall` 转场，理由与改法见 §3.2 / §10）；不要给常驻悬在动画画布之上的元素加 `backdrop-filter`（理由见 §5.6）。
- `resize` 一律经 `src/lib/debounce.js` 去抖；需要"随滚动变化"就读 `var(--shift, 0)`，**不要自建滚动监听、更不要每帧读 `scrollHeight`**（强制同步布局）。
- 指针跟随类效果用 `transform` 位移（配 `will-change`），不要改会触发重绘的属性（见 §5.5）。
- Canvas 尊重 `devicePixelRatio` 上限与像素预算（`StarTrails` 已内置 4.6MP 封顶 + 页面隐藏暂停 + 次级页 30fps 限帧）。

**无障碍**

- 模态/浮层用 `src/lib/focus.js` 的 `trapFocus()`：锁住 Tab 循环，释放时归还焦点。
- 新页面必须在 `src/router/index.js` 写 `meta.t`——它同时是 `document.title` 与路由播报（§6.1）的内容。
- 触控目标 ≥44px（`@media (pointer: coarse)`）；正文/读数最小字号 11.5px。
- 触控/拖动类交互需有鼠标等价（如 `pointermove` 事件封装在 `lens.js`）。
- 文案尽量放 `narrative.js`；`aria-label`/`alt` 用中文；输入框移动端 ≥16px（避免 iOS 放大）。

---

## 10. 与初版方案的差异备忘

- Aurora Glass（星云玻璃/Bento/视差装置）整体废弃；双皮肤机制亦已退役，neo 为唯一界面世代。
- 长按投喂、首屏轨道读数条、深度轨玻璃读数面板：实施后按反馈移除。
- 环倾角只随滚动开合，不随鼠标（初版曾做指针倾角）。
- 语义收敛：导航/页面统一"文章"表述（不再用"归档"）；滚动进度与深浅隐喻收敛为 `--shift` 与"由浅及深"；404 用"星图"而非"天区"，按钮保持功能直白（`回到首页` / `查看文章`）。
- **1.2.0 的取舍备忘**：① 玻璃从"全站语言"收缩为"抽屉专属"——吸顶栏与播放器常驻在动画画布之上，`backdrop-filter` 的每帧代价换不来对应的观感收益（§5.6）；② `fall` 转场**保留整页 `filter`**：它是本站最贵的一处绘制（每帧重栅格化整棵子树，且离开/进入两页并行）。1.2.0 曾实现过"只动 opacity/transform + 单层红移覆盖 `.fall-veil`"的替代版并实测通过，最终因**叠影模糊正是"坍缩"的手感来源**而回退。若要回收这部分开销：关键帧只留 `opacity`/`transform`，再在 `App.vue` 加一层按 `route.path` 重挂载的静止径向渐变（只动 opacity）承担红移闪光；③ `--hole` / `--signal-canvas` / `--glass-*` 等无人消费的令牌一并删除，避免"看起来可调、实际改了没反应"；④ 首屏「现在」栏在窄屏不再隐藏内容——可读性优先于排版整齐；⑤ 沉浸光标默认关闭，把"接管指针"从默许改为显式授权。
- **1.3.0 的一致性备忘**：① 收敛前实测到的规模——字号 17 种、行高 9 种、按钮 6 套（`.neo-btn` / `.submit` / `.act` / `.tab` / `.neo-chip` / `.link-item`）、输入框 2 套（盒子 vs 下划线）、卡片 3 套规格、提示 5 种各自实现。收敛后：**11 档字号 / 4 档行高 / 3 档字重 / 6 档间距**，按钮只剩「2 尺寸 × 4 语义」，输入只剩「单行下划线 / 多行盒子」，卡片只剩 `--card-*` 一组，提示只剩 `.neo-note-*` 三态。② 三张功能页（`/login` `/register` `/admin`）的私有类 `.submit` / `.act` / `.tab` / `.err` / `.notice` / `.warn` 全部删除，改用 `.neo-*`；`/admin` 页签选中态由**热色改冷色**——热色是"深度方向"的专属，页签属于仪器文字，用冷色才与 `.neo-chip` 全站一致。③ 表单形态定为一条：单行下划线、多行发丝框；因此 `.field` 从盒子改下划线，并新增 `textarea.field` / `textarea.neo-field` 的盒子形态，后台的长文编辑器仍保住边界。④ 顶栏控件（`.ico-btn` / `.auth-link`）保留 32px 这一档，因为它是固定壳层里与顶栏等高的一排；这是"2 尺寸"之外的**壳层专用档**，不对外复用。⑤ `.field` 显式声明 `font-family: var(--font-sans)` 与 `text-transform: none`：它嵌在 `.readout` 标签里，若沿用 `inherit` 会把等宽字体和大写转换带进输入框。⑥ 验收方式：`npm run build` + IDE 诊断 + 无头浏览器实测（按钮计算样式落到 `--hot` 实心 40px / 错误提示落到 `--hot` / 成功提示落到 `--cold` / 卡片底色跟随主题切换），并临时起后端走通"初始化站长 → 进入后台 → 保存并看到提示"全链路。
