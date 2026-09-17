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

- **概念**：首屏 = 架在三脚架上的相机长曝光。恒星周日视运动是刚体旋转（全场一致 ω≈0.042 rad/s），星轨绕偏心天极（全站同一处：视口 62%x / 38%y）累积成同心弧。
- **渲染管线（Canvas 2D · 累积缓冲）**：ACC 离屏底片按**视口**尺寸分配、全站共享（见下「天与相机」），每帧不清空——① 衰减 pass：`destination-out` 填 `alpha=fade`（尾迹长度 ∝ 1/fade）；② 增量 pass：每星画本帧短弧（含 0.12rad 快门拖尾)沉积。主画布每帧 = 底 → `drawImage(ACC, 0, 0, W, H)`（顺带把天区坐标缩放进本机盒子）→ 当帧层（变星/流星，不累积，保持锐利）。像素预算 4.6MP 封顶自动降 DPR，相机跟随底片 DPR。
- **天与相机（`src/lib/sky.js`）**：底片像素、星群、天极、时钟、取景权放在模块级单例 `sky` 里——**星空是一份，相机是两台**。要点：
  - `ensurePlate()` 只在**视口尺寸或 DPR 变化时**才新建底片；桌面换页时两者都不变，于是同一张底片继续感光。这是"一夜连续曝光"从口号变成实现的唯一一处改动。**但移动端会变**：地址栏收放改 `innerHeight` → `resize` → 走到重开分支，早期版本等于用户第一次滚动就把整夜曝光倒掉（且只在手机上发生，桌面测不出）。现在重开前把旧底片等比 `drawImage` 进新底片——极点按新尺寸重算，弧会漂一两度，**漂移可接受，黑屏不可接受**。
  - `sky.t0` 全站起一次，星角 `s.th` 因此跨路由连续；组件卸载只 `releasePlate(self)` 交还取景权，**不再把 `acc` 置 null**（那正是过去每次导航重铺底片的根因）。
  - **取景权**：`fall` 是并行转场，离开方与进入方并存约 220ms（leave 0.22s / enter 0.42s），两台相机同时往一张底片沉积会画双份、`resize()` 还会互相清屏。故底片同一时刻只认一个主人，后挂载者接管。**但取景权只管沉积，不管重绘**：`ownsPlate()` 只包住 `update()` 里的 `accPass()` 与抽独立尾部那一段，非主人照样每帧 `draw()`。早期版本把它写进了 `tick()` 的停帧条件，结果交出底片那台在淡出的 220ms 里**冻在半帧上**——那就是切换顿挫感的来源。
  - **坐标**：星群/变星/指针都在天区坐标，`draw()` 用 `kx = W/sky.w`、`ky = H/sky.h` 换算变星位置，指针经 `toSky()` 换算回天区。**两台相机的盒子一律取视口**（`resize()` 里不再量 hero 的盒子），所以 `kx = ky = 1` 是恒等式，不是巧合：首页 `.hero` 是 `100svh`，手机上比 `innerHeight` 小最多 ~17%，拿它当相机会把底片**非等比压扁**——同心弧在首页变椭圆、进文章页又跳回正圆，正是统一天极要消灭的那种穿帮。多出来的一截由 `.hero{overflow:hidden}` 裁掉，牺牲几十像素取景，换几何不出错。
  - 天极**全站统一**为视口 `0.62 / 0.38`（原先次级页是 0.5/0.4）。两台相机极点不同，导航后同心弧的圆心会跳，"同一片天"当场穿帮。
- **Props / Emits（开发用）**：

  | 名称 | 类型 | 默认 | 说明 |
  | --- | --- | --- | --- |
  | `interactive` | Boolean | `false` | `true` 才启用变星/流星/指针层及 `--lx/--ly` 时间膨胀；`false` 无交互层、限帧 30fps，只作活背景。**星数与之无关**——星群属于全站共享的天空（按视口宽度定数），次级页若少沉积一半星，那些圆弧会在阅读中因全局衰减慢慢消失 |
  | `posts` | Array | `[]` | 变星数据源；`interactive` 时取前 ≤8 枚做变星 |
  | `@hover` | Event | — | 悬停变星下标（`interactive` 下）。**当前无消费方**——首屏的悬停读数条已按反馈移除（§10），`HorizonHero` 不再挂空监听；保留作装置对外接口（内部 `syncHover()` 仍驱动芒的绽放缓动） |
  | `@select` | Event | — | 点击变星，回传对应 post 对象 |

- **交互语义**：滚动 = 时间流速（`flow = 1 + k·2.2`，`fade` 由 0.0104→0.0044，越深尾迹越长天越快）；文章 = 变星（随天刚体旋转、脉动亮度，hover 缓绽锥形衍射十字芒·沿芒长渐隐、点击坠入）；指针 = 引力时间膨胀（180px 半径内转速×2.8、提亮，轨迹局部卷曲，移开恢复）。
- **主题**：深空 = 冷白/暖白/琥珀三档色温（`lighter` 发光）；纸面 = 天文干版底片（墨/sepia 轨迹 + 朱砂点睛，`source-over`，fade×1.4 尾迹更干净）。**换主题才"换一张底片"**（防串色）：`readColors()` 拿 `data-theme` 与 `sky.theme` 比对，相同就直接返回——两台相机各挂一个 MutationObserver，一次切换会进来两趟，靠这个比较幂等。**挂载不重铺**。
- **部署**：首页由 `HorizonHero` 以 `interactive` 挂载；次级页由 `App.vue` 以非交互模式挂载为活背景；两者看同一张底片（§3.1「天与相机」）。`reduced-motion` = 一次性快进 380 步生成静态底片，不启动 rAF；由 `ensureStaticPlate()` 按 `sky.plateBuilt` 保证**每张底片只冲一次**，换页与第二台相机都不重冲。
- **次级页限帧（1.2.0）**：非交互模式目标帧率 30fps（`SUB_FPS`），不足一帧间隔时 rAF 回调直接返回、不绘制。`update()` 用的是真实 `dt`（≈33ms），故星轨转速与满帧完全一致，只是全屏 `destination-out` + `drawImage` 的绘制量减半。首页交互层不受影响（满帧）。
- **次级页曝光响应（「阅读即曝光」）**：非交互模式原先只有页顶一个固定基线，整篇文章的星空一样静。现在 `update()` 每帧读 `src/lib/shift.js` 的 `shift.v`（文档级滚动深度，由 `App.vue` 的 `applyShift` 写入，见 §9.4），推进 `flowT = 1 + d·SUB_FLOW`（`SUB_FLOW=1.1`，首页 `FLOW_MAX` 的一半，次级页保持克制）与 `fadeT = SUB_FADE_TOP − d·(SUB_FADE_TOP − FADE_1)`（`SUB_FADE_TOP = FADE_0·1.3`）——页顶是安静的短尾迹，越往下读曝光越久、尾迹越长、天空转得越快，目标值交由既有惯性推进平滑，不加额外补间。深度取**文档级**而非首页那套 `scrollY/(H·1.1)`：长文章滚过一屏后者就饱和了，读不出整篇的进度。`reduced-motion` 无需另设分支——`tick()` 在 `reduced` 下直接返回，`update()` 根本不执行，静态 `buildPlate()` 底片即是结果。
- **两道停帧闸门 + 一道沉积闸门**：`tick()` / `kick()` 只看两件事——① `document.hidden`（`visibilitychange`，标签页不可见即停）；② `onScreen`（**仅首页相机**：hero 在流内，整块滚出视口后没人在看，别再白画。用 `IntersectionObserver` + `rootMargin: 200px` 外留余量，回滚时不会先撞上一帧停滞的画面；次级页相机是 `position: fixed` 满屏，恒在视口内，不需要观察）。**取景权不在这两道闸门里**（见上，它只关沉积）。停帧期间星角冻结——等价于镜头被盖上时不再曝光，回到视口后按 `dt ≤ 48ms` 的上限续长，不会跳变。
- **惯性常数 `0.94`**：`flow` / `fade` / 指针光锥都按 `1 - 0.94^step` 向目标推进，约 1 秒收敛。早先是 `0.9`（≈1/3 秒），改滚动速度的瞬间天空会"弹"一下；放缓之后是被慢慢推动的。这一条与快门、`fall` 同属"整体舒缓"的方向。
- **流星 × 播放**：`update()` 在生成下一颗流星的时刻读 `music.playing`（`src/lib/music.js`）：在响则把随机间隔压向最短值（区间长度 ×0.4），停下后**下一次生成**即自然回弹。刻意不做 `watch`——在 rAF 里读一个普通属性不建立响应式依赖，代价为零；代价是间隔变更有一拍延迟，而流星间隔本来就是秒级。这也是全站唯一一处"天随人动"的耦合，最容易单独回退（删掉那三行即可）。
- 已退役：黑洞/吸积盘/仪表环管线（原 `BlackHole.vue`）与红移坠入深度轨（原 `DepthRail.vue`，现由 `App.vue` 写 `--shift`）。
- **v3 定稿微调（1.0.0）**：变星移除外围圆环、呼吸幅度收窄并缓慢自转（`rot = t·0.22 + ph`）；光标三星为短弧带拖尾彗星、无衍射芒；流星与变星共用 `drawStar` 渲染器。
- **防饱和尾部渐隐（1.1.0）**：星轨即将转满前 20% 平滑暗化（`SETTLE_START=0.8`、`SETTLE_DEPTH=0.55`），另随机 1-2 根做柔和独立渐隐；每颗星带随机尾迹起点偏移（`shear`），使弧段截端错落、圆环连续无对齐断口；`FADE_0=0.008 / FADE_1=0.0032` 拉长尾迹，让相邻弧段衔接成连续同心圆环。**2026-09-17 按"久了过饱和、要更透气"回收**：`SETTLE_DEPTH → 0.72`、`FADE_0 → 0.0104`、`FADE_1 → 0.0044`、`DEP → 0.0072`（稳态亮度 ≈ DEP ÷ fade，两头一起动才不会既变淡又变短）。上面这组是 1.1.0 的历史值，别照抄。

### 3.2 曝光深度与时间流速

- 滚动 = 曝光加深，进度 `p∈[0,1]` 由 `App.vue` 写入 CSS 变量 `--shift`，驱动：暗角晕影加深、首页宣言字距随潮汐力拉长、幽灵汉字显影下沉（§4.4）。同一个值另镜像进 `src/lib/shift.js` 的 `shift.v`，供需要**在 JS 里每帧读**的消费方使用（次级页画布的曝光深度，§3.1）——CSS 变量读回来要走一次 `getComputedStyle`，放进 rAF 等于每帧一次样式查询。`--shift` 与 `shift.v` 由 `applyShift()` 同时写，不存在第二个来源。
- **fall 转场**：路由跳转 = 一次下坠重开（`scale .8→1`、`blur 12→0`、sepia/hue-rotate 相位）→ 展开成新页。全站唯一的内容转场（快门层与它同时发生，见下）。
  关键帧里的 `filter` 作用于**整页子树**，每一帧都要重新栅格化，且离开方与进入方并行叠影时更甚——这是本站最贵的一处绘制。1.2.0 曾评估改为"只动 opacity/transform + 独立红移覆盖层"，实为可行但**叠影模糊正是"坍缩"的手感来源，最终决定保留原样**（取舍记录见 §10）。
- **快门层 `.neo-shutter`**：底片共享之后，换页不再是"重铺一张"，语义上就只剩**一次快门开合**。`App.vue` 用一个计数器 `shot` 给这一层重新 key（首次加载不触发——setup 跑起来时 `route.path` 已是解析完的目标页），上下两片焦平面帘幕扫到 55% 再退开：只动 `transform: scaleY()`（§9.5），`animationend` 后整层摘掉；减弱动效下**整层 `display: none`**——只写 `animation: none` 会让帘幕退回未变换的 `scaleY(1)`，把页面永久盖住。另外 `shot` 在 `prefers-reduced-motion` 下干脆不递增：那一层被 `display:none` 掉了，动画不跑也就永远等不到 `animationend` 来收尾摘节点。
  **两条别当它做到了的说法**（都是实测边界，不是缺陷）：⑴ 每片帘幕是 `height: 50%` 的条带 `scaleY(0.55)`，两片合起来只压住画面高度的 55%，**中间 45% 从头到尾没被盖过**——所以它盖不住 `fall` 最糊的那几帧，只是给转场加了一次眨眼；真要吃掉模糊得让 `scaleY` 到 1（全黑）才够，那已不是"舒缓"。⑵ 它在 `z-index: 40`，**顶栏 60 / 进度线 65 / 灯箱 80 都在它上面**，这是有意的（仪器面板与模态不该跟着眨眼），但也就谈不上"盖在正文之上"这么绝对。
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
样式由 `.neo-glyph` 提供（stroke 空心、绝对定位）。**每页一枚**，位置可视图微调（见各视图 `.glyph` 覆盖）。

**显影**：签名不再是一张恒定 `opacity .07` 的静物，而是随 `--shift` 从 `0.07` 显影到 `0.13`、同时下沉 `4vh`——
读者越往下潜，页面上那枚汉字越清晰、越往下坠，像长曝光里慢慢浮出的暗记。全程只挂 CSS 变量（零 JS、零滚动监听），
只动 `opacity` / `translate`，符合 §9.5 红线。

**为什么是 `translate` 而不是 `transform`**：`HorizonHero` 与 `NeoNotFoundView` 的 scoped `.glyph` 已经把
`transform` 花在 `translate(-50%, -50%)` 的居中上。同一个属性被两件事抢，两头都输——那两页拿不到下沉
（scoped 的特异性更高），而减弱动效那条 `html[data-skin='neo'] .neo-glyph`（(0,2,1)）又会连居中一起清掉，
让 620px 首页大字横跳约 270px。`translate` 与 `transform` 是**可以叠加**的两个独立属性（前先生效），
于是各管各的：定位归 `transform`，下沉归 `translate`，减弱动效只钉 `translate: none`。
`NeoPostView` 的「坠」把下沉量覆写成 `14vh`，让这枚字面意义地随阅读坠落。

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
| `.neo-glass` | **磨砂玻璃阅读底板**（`neo.css` §6c）：半透明页面色（`--panel-bg`）+ `backdrop-filter: blur(22px)` + 四边 `mask` 羽化（水平/垂直 intersect），隔离星轨、提升前景对比（WCAG AA）；局部放宽 `--measure` 提高文字占比。曾错误地实现在 `NeoPostView` 的 scoped 里（与本表"全局可用"自相矛盾），已归位 |
| `.neo-spike` | **衍射十字芒**（§5.5）：宿主 `a` / `button` hover 时缓绽的星芒记号；必须是宿主的直接子元素，`aria-hidden` + `pointer-events: none` |

### 5.5 引力微交互基元

- **透镜光斑** `.neo-lens::after`：260px 径向 `--cold` 13% 光斑，hover 淡入。**1.2.0 改为"静止渐变 + transform 位移"**：伪元素是 520×520 的固定盒子（`margin -260px` 让中心落在宿主左上角），跟随指针靠 `transform: translate(var(--lx), var(--ly))`；旧写法每帧改 gradient 中心会让元素持续重绘。仅 transform 变化不足以免除重绘，故 hover 时申请 `will-change: transform` 把它提为独立合成层（同一时刻只有一个宿主处于 hover）。
- **左缘引力标记** `.neo-lens .bar`：2px 冷色竖条，hover `scaleY(0)→1`。
- **按钮扫光** `.neo-btn::before`：`--white` 45% 斜面高光，`neo-sheen` 0.65s 划过。
- **胶囊填充扫入** `.neo-chip::before`：冷色 16% 底 `scaleX(0)→1`。
- **衍射十字芒** `.neo-spike`：把画布上"变星 hover 缓绽锥形芒"搬到 DOM 的一张记号——22px 盒内一个 `--cold` 光子核心 + 两条 1.5px 渐隐芒臂（`::before` / `::after` 各一，后者 `rotate(90deg)`），宿主 hover 时 `scale(0.35)→scale(1) rotate(45deg)` 缓绽。三点约定：
  - **它是子元素而非伪元素**，因为宿主多半已经把 `::after` 花在了 `.neo-lens` 的透镜光斑上，抢同一个伪元素会互相覆盖。
  - **只在 `a:hover >` / `button:hover >` / `.on` 下绽开**，不写裸 `:hover >`：否则任意容器（`li`、`section`）hover 都会误触发。所以它必须是宿主的**直接子元素**。`.on` 这条逃生口**目前没有生产方**，留着是为了将来能用键盘焦点强制点亮；在那之前它就是三个字符的死规则，别当成已接好的功能。
  - 颜色只走 `--cold`（§5.3①：冷=交互方向）。`--white` 按规范只留给 ≤2px 高光与光子核心，纸面主题下纯白芒臂会消失，故不用。
  - 纯装饰：`pointer-events: none` + 调用处 `aria-hidden="true"`；`prefers-reduced-motion` 下静止态与绽开放态的 `transform` 都钉成 `none`，只留淡入淡出。
  - 现有两处消费方，都服从「文章 = 变星」这一条隐喻：`NeoBlogView` 卡面右上角、`NeoPostView` 上下篇外侧留白（各一枚，移到哪篇哪颗亮）。
- 所有位移弹簧都用 `cubic-bezier(0.2, 0.8, 0.2, 1)`。

### 5.6 晕影、转场与降级

- **晕影**：`.neo-vignette` 用 `radial-gradient(ellipse 120% 92% …)`，越深越暗。
- **fall 转场**：`fall-enter/fall-leave` + `fall-in / fall-out` 关键帧（`scale` + `blur` + sepia/hue-rotate 相位）；离场页 `position: absolute` 叠在进入页之下（并行模式，见 §6.1 注释）。**这是本站唯一一处刻意的整页 `filter`**——保留下坠感优先于回收开销，改法见 §10。
- **快门层 `.neo-shutter`**：`neo.css` §8.5，两片帘幕只动 `transform: scaleY()`；随每次路由变更重放。它**盖不住画面中间**、也不盖顶栏与灯箱——实测边界见 §3.2，别按"整屏快门"理解。
- **backdrop-filter 红线（1.2.0）**：常驻悬在动画画布之上的表面一律不用 `backdrop-filter`（否则浏览器在星轨每动一帧时都要重算背后模糊）。吸顶栏与音乐播放器改为 `color-mix(in srgb, var(--ink-0) 94%, transparent)` 实底；仅抽屉（遮满全屏的模态、进出场各 0.28s）保留 `blur(24px)`；文章页阅读底板 `blur(22px)` 是有意保留的可读性取舍（见 §5.4），其代价已由次级页限帧对冲掉一半。
- **resize 去抖**：所有 resize 处理（`App.vue` 重测滚动上限、顶栏断点收抽屉、两处画布重建）统一经 `src/lib/debounce.js`，静默 150ms 后执行一次。
- **不影响布局的滚动监视**：滚动深度只由 `App.vue` 一处写入 `--shift`——它缓存了 `scrollHeight`（避免每帧强制同步布局），值不变时不写样式；文章页顶部进度线用 `transform: scaleX(var(--shift,0))`（不是 `width`，见 §9.5），同样不自建滚动监听。
- **减弱动效**：`prefers-reduced-motion` 下关闭 fall 动画、按钮位移、扫光、骨架屏动画，并让 `.neo-vignette` 恒为 0、`.neo-glyph` 钉回静态基线；快门层**整层 `display: none`**（只关动画会让帘幕停在未变换的 `scaleY(1)` 永久盖住页面）；`StarTrails` 走静态快进底片；全局 `tokens.css` 已把动画/过渡压到 0.01ms。

---

## 6. 壳层与组件契约

### 6.1 壳层挂载顺序（`src/App.vue`）

```
StarTrails (仅次级页 v-if="isSub")
.neo-vignette
NeoSiteHeader        → 导航 / 主题切换 / 音乐 / 沉浸光标开关
main#main(.neo-sub)  → tabindex="-1"（供 .skip-link 落焦）；RouterView <Transition name="fall">
.neo-shutter         → v-if="shot" + :key="shot"，每次路由变更重放两片帘幕，animationend 后摘掉
NeoSiteFooter
MusicPlayer
NeoCursor            → 默认关闭、仅首页；画出首帧后写 / 交还时删 <html data-cursor>
p.sr-only[aria-live] → 路由播报，内容取 route.meta.t
```

### 6.2 组件清单

| 组件 | 挂载 | Props / Emits | 职责 |
| --- | --- | --- | --- |
| `StarTrails` | 首页由 `HorizonHero`（`interactive`）；次级页由 `App.vue`（非交互） | `interactive`(Bool)、`posts`(Array)；`@hover`、`@select` | 星轨 Canvas 装置——**只是取景器**，底片与星群归 `src/lib/sky.js`，见 §3.1 |
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
- 读 `var(--shift, 0)`（0..1），写到 `opacity` / `letter-spacing` / `transform` / 过滤等。例：`opacity: calc(var(--shift,0)*0.55)`。
- 不要每处写死滚动监听；深度统一由 `App.vue` 的 `--shift` 驱动。
- **要在 rAF / canvas 里每帧用这个值**：`import { shift } from '../../lib/shift.js'`（按层级取相对路径，本站**没有配 `@` 别名**）读 `shift.v`（`App.vue` 与 `--shift` 同一次写入，§3.2）。
  两条都不许：① 为**深度**再建一个自己的真相源（各页自己算 `scrollY/scrollHeight` 喂样式）；② `getComputedStyle(...).getPropertyValue('--shift')` 读回来——那是每帧一次样式查询。现成范例：`StarTrails.vue` 非交互分支在 `update()` 里用 `shift.v` 推进 `flowT` / `fadeT`。
  **两个合法的 `scroll` 监听例外**（都是 1.0.0 就在的，别误删、也别再新增第三个）：`StarTrails` 交互模式下用 `scrollY/(H·1.1)` 算首屏时间流速（它要的是**滚动速度感**，不是文档深度，且已 `passive`）；`HorizonHero.onScroll` 做首屏视差。二者都不读 `scrollHeight`。

### 9.5 无障碍与性能红线

**性能**

- 一切动效必须有 `prefers-reduced-motion` 降级（见 §5.6）。
- 动画只动 `opacity` / `transform`：**不要新增大面积的 `filter`**（唯一例外是 `fall` 转场，理由与改法见 §3.2 / §10）；不要给常驻悬在动画画布之上的元素加 `backdrop-filter`（理由见 §5.6）。
- `resize` 一律经 `src/lib/debounce.js` 去抖；需要"随滚动变化"就读 `var(--shift, 0)`，**不要为深度自建第二个真相源、更不要每帧读 `scrollHeight`**（强制同步布局）。§9.4 记明了两个合法的 `scroll` 监听例外。
- 指针跟随类效果用 `transform` 位移（配 `will-change`），不要改会触发重绘的属性（见 §5.5）。**由 `--shift` 驱动"长短/多少"的元素同理**：写 `transform: scaleX(var(--shift))` + `transform-origin`，不要写 `width: calc(var(--shift)*100%)`——`--shift` 每个滚动帧都在变，改宽度等于每帧一次布局（文章页顶部进度线已按此改法收敛）。
- Canvas 尊重 `devicePixelRatio` 上限与像素预算（`StarTrails` 已内置 4.6MP 封顶 + 次级页 30fps 限帧），另有**两道停帧闸门**（标签页隐藏、首页相机划出视口 `IntersectionObserver`）与**一道只关沉积的取景权闸门**——见 §3.1，别把取景权写成停帧条件，那会造成导航瞬间的冻帧。

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
- **连续曝光改造（一 / 二 / 三阶段）的取舍备忘**：① **主动突破了"次级页画布是静默活背景"这条既有描述**——原先整篇文章的星空一个节奏，"越往下读曝光越久"只在首页成立，在文章页是空头承诺。现在非交互模式也随深度推进（§3.1）。② 为此新增 `src/lib/shift.js`，而不是给画布挂 `scroll` 监听：次级页画布本来就没注册监听，§9.5 也明令禁止自建；`shift.v` 是 `applyShift()` 写 `--shift` 时顺手镜像的一份可变数值，**故意不用 `reactive`**——每帧变更会触发 Vue 重渲染，而这里只需要一个能在 rAF 里读的普通数字。③ 两处都刻意压住了幅度：`SUB_FLOW=1.1` 只取首页 `FLOW_MAX=2.2` 的一半（次级页是阅读场景，天空转太快会抢正文）；幽灵汉字显影峰值 `0.13` 而不是更高（它必须是"幽灵"，一旦清晰到能读，就从底噪变成了内容）。④ **二阶段：底片跨路由常驻（已解决上一版留档的问题）**。原 `acc` 是组件作用域的 `let` 且 `onUnmounted` 里置 null，两个实例又按路由互斥挂载——每次导航都在重铺底片，"一夜连续曝光"当时只是说法。现在底片像素、星群、天极、时钟、取景权全部提到 `src/lib/sky.js` 的模块级单例，`StarTrails` 降格为取景器。三处连带突破：**天极由"首页 0.62/0.38、次级页 0.5/0.4"统一成视口 0.62/0.38**（极点不同则导航后弧心跳位）；**次级页"星数减半"取消**（共享底片上少沉积一半星＝那半边圆弧在阅读中慢慢衰减消失）；**引入取景权**，因为 `fall` 并行转场有约 220ms 两机并存，不锁就会双份沉积、`resize()` 互相清屏。配套新增 `.neo-shutter` 把导航读成一次快门开合，`fall` 的整页模糊按 1.2.0 的决定**不动**（当时写作"让帘幕盖住 `fall` 最糊的几帧"，⑦ 实测推翻：中间 45% 从未被盖住）。实测（dev 下直接 `import('/src/lib/sky.js')`）：`/blog/core-idea → /` 之后 `sky.acc` 与 `sky.stars` 对象身份不变、`sky.t0` 未重置、次级页极点为 0.620/0.380、星数 220。⑤ **三阶段（卫生批 + 余下两个提案）的取舍备忘**：**已做**——⑴ 文章页顶部进度线 `width: calc(var(--shift)*100%)` → `transform: scaleX(var(--shift))`，消掉 §9.5 上唯一一处"每帧改布局"；⑵ `markdown.js` 补 GFM 管道表格，把 `neo.css` 里**早就写好却无人生产**的 `.neo-prose table/th/td` 从死样式变成活样式（没有分隔行的裸竖线会退回普通段落文本，不吞内容）；⑶ 标题正则放开到五个 `#`，并补 `.neo-prose h5 / h6`——此前 `####` 已经会渲染成 h5 却没有对应样式；⑷ 渲染器与歌单封面的 `<img>` 补 `decoding="async"`；⑸ `.neo-glass` 从 `NeoPostView` 的 scoped 里搬到 `neo.css` §6c（它一直躺在 §5.4 的"全局基元"表里，属自相矛盾）；⑹ 首页相机加 `IntersectionObserver` 停帧闸门；⑺ 删掉 `HorizonHero` 里从未被读取的 `hov` ref 与 `@hover="hov = $event"` 空监听（首屏悬停读数条早已移除，见上方 1.2.0 ①②；`@hover` 作为装置接口保留）。**新基元**——`.neo-spike` 衍射十字芒（§5.5），把画布上变星的缓绽搬到 DOM，两处消费方都服从"文章=变星"：文章卡右上角、上下篇外侧留白。**新耦合**——流星间隔读 `music.playing`（§3.1），这是全站唯一一处"天随人动"，也是最容易单独回退的一处。**明确不做**——⑴ 展示层字体的 `preload`：Vite 会给 CSS 里引用的字体文件名加哈希，`index.html` 无法硬写 `href`，要做得把字体挪进 `public/` 并改 `build_font.mjs` 的产物路径，代价与收益不匹配（现况已是 `font-display: swap`，正文系统字体不受影响）；⑵ 首页宣言的 `letter-spacing: calc(... + var(--shift)*...)`——它确实是随帧重算布局的属性，但"字距被潮汐拉长"是 §3.2 记在案的叙事意图，用 `scaleX` 替代会把展示层衬线字面拉变形，故按**刻意的例外**保留（与 `fall` 的整页 `filter` 同类对待）。**实测中发现、非本轮引入的既有现象**：`fall-enter` 期间页根 `section` 带着 `transform` 与 `filter`，因而成为 `position: fixed` 后代的包含块——文章页顶部进度线只在这 0.42s 内不是相对视口定位，转场结束类名摘掉后即恢复。改前（`width` 版）与改后（`scaleX` 版）行为一致，未处理。⑥ **2026-09-17 手感回收（来自用户反馈，不是测量）**：⑴ **修掉导航冻帧**——上一轮把「不许往底片沉积」写成了 `tick()` 的停帧条件，于是交出取景权那台相机在淡出的 220ms 里整帧冻住，这就是"切换顿挫"的来源；现在 `ownsPlate()` 只包住 `update()` 里的 `accPass()` 与抽独立尾部，非主人照常 `draw()`，两台相机显示的是同一张仍在长的底片。⑵ **久了过饱和 → 更透气**：`OMEGA 0.05→0.042`、`DEP 0.0085→0.0072`、`FADE_0 0.008→0.0104`、`FADE_1 0.0032→0.0044`、`SETTLE_DEPTH 0.55→0.72`。依据是稳态亮度 ≈ DEP ÷ fade，所以两头一起收；`SETTLE_DEPTH` 单独拉高是因为最糊眼的正是"转满后闭合成实心亮环"那一段。⑶ **整体更舒缓**：惯性常数 `0.9 → 0.94`（约 1 秒收敛），天空不再随着滚动手感"弹"。这三组数字都是**口味值而非计算值**——我这边看不到渲染，全部集中在 `StarTrails.vue` 顶部常量块那几行，觉得过了/不够直接改数，改完 §3.1 的 ω 与 fade 两处引用需同步。

⑦ **同一次改动经独立代码评审查出 6 个缺陷（作者侧自查全漏）**，全部已修，记录以免有人以为一~三阶段是干净的：
- **致命：`plateSpace()` 丢了 `globalCompositeOperation` 的还原**（`src/lib/sky.js`）。我把衰减 pass 后的 `setTransform + source-over` 两行合并成一个 helper 时只搬走了变换，于是每颗星的短弧仍在 `destination-out` 下绘制——**它擦除底片而不是曝光底片**，累积缓冲永远全透明，实时与 reduced-motion 两条路径都看不到任何星轨。整个特性的核心功能死了很久。
- **为什么没被发现**：上一轮写在 §10 的"实测"只比对了 `sky.acc` 的**对象身份**、从没读过像素；而 Qoder 内置浏览器没有可见表面、rAF 冻结，压根一帧都没画，也就无从暴露。**教训：画布类改动没有量过像素输出就不算"已验证"**，对象身份、CSSOM 规则、构建通过都证明不了渲染结果。复核方式：页面里手驱动画布复刻 `accPass` 的调用序列，不还原合成模式时 `alphaSum 0 / litPx 0`，还原后 `131 / 3`。
- **移动端地址栏收放把底片清空**：`innerHeight` 变化 → `resize` → `ensurePlate()` 重开一张空白，等于用户第一次滚动就倒掉整夜曝光，且只在手机上发生。改为重开前把旧底片等比 `drawImage` 进新底片。
- **`100svh` 的 hero 当相机导致非等比压扁**：底片按视口分配、首页相机却量 hero 盒子，手机上差 ~17%，首页同心弧变椭圆、进文章页跳回正圆。改为**两台相机一律取视口**，多出部分由 `.hero{overflow:hidden}` 裁掉（`kx = ky = 1` 从此是恒等式）。
- **减弱动效的 `transform: none` 连居中一起杀**：`html[data-skin='neo'] .neo-glyph`(0,2,1) 压过 `HorizonHero` / `NeoNotFoundView` scoped `.glyph`(0,2,0) 的 `translate(-50%,-50%)`，620px 首页大字横跳约 270px；同时正常动效下这两页其实从来没拿到 4vh 下沉。改用独立的 `translate` 属性承载下沉（见 §4.4）。实测：「渊」在 `--shift=1` 时 `translate: 0px 48.36px` 与居中 `matrix(1,0,0,1,-270,-243)` 并存。
- **表格解析器会重排文档**：`>` / `-` / `1.` 三个分支没调 `flushTable()`，表格被排到后方法块之后；而"含竖线就算候选表头"又把普通正文断成多段、把行内代码 `` `a|b` `` 改写成 `a | b`。改为**只在下一行是分隔行时才开表**（索引循环 + 前瞻）。
- **首帧 `dt` 可为负**：`kick()` 里 `last = performance.now()`，而下一帧 rAF 时间戳是帧起始时刻、可能更早 → `step<0` → 衰减 `fillStyle` 成 `rgba(0,0,0,-x)` 被静默丢弃、短弧反向扫。补下界 `Math.max(0, …)`。
- **顺带修正三处文档说过头的断言**：快门"盖住 fall 最糊的几帧"（两片各压 27.5%，中间 45% 从未被盖）、"压在正文之上"（顶栏 60 / 进度线 65 / 灯箱 80 都在它上面）、§9.4"不要自建滚动监听"（`StarTrails` 交互层与 `HorizonHero` 视差一直有合法监听，已改写成"不要为深度建第二个真相源"并记明例外）。`.neo-spike` 的 `.on` 触发口无生产方，也已标注。
