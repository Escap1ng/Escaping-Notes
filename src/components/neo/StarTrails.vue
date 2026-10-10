<script setup>
// StarTrails · 长曝光星轨装置（首页主视觉 / 次级页活背景）
// 概念：首屏是一台架在三脚架上的相机正在长曝光——
//   数千条同心星轨弧绕一枚偏心天极刚体旋转累积（恒星周日视运动 = 全场一致 ω）；
//   滚动 = 时间流速（下潜越深，曝光窗口越长、天空转得越快）；
//   流星 = 环境叙事（偶掠夜空的瞬时光迹；播放器在响时更密）；
//   指针 = 引力时间膨胀（半径内轨迹局部加速卷曲，光绘 torch 感）。
//   （2026-10-09：「文章 = 变星」的入轨装置整体撤除——骑在轨迹上的星读成贴在光弧上的
//    脏点；文章入口归折线以下的精选卡，`drawStar` 只剩流星一个用户。）
// 管线：ACC 累积离屏缓冲（destination-out 衰减 pass + 每星短弧增量 pass，尾迹自然累积）
//       → 主画布每帧：底 → drawImage(ACC) → 流星（当帧层，不累积，保持锐利）
//       → 首页相机末尾 destination-in 一张山脊遮罩（src/lib/ridge.js）：山体不吃星轨，
//         脊线以上再按高度渐淡（大气透视）。遮罩在绘制时裁、不在沉积时裁——底片全站共享，
//         次级页背景没有山，沉积时切弧会在那边读出一圈缺角。
// 天与相机：底片与星群在 src/lib/sky.js 里是全站一份，本组件只是取景器——
//       换页 = 挪动相机，同一张底片继续感光，"一夜连续曝光"因此才成立。
// 主题：深色=冷白/暖白/琥珀（lighter 发光）；浅色=板岩/石墨/朱砂（source-over）。
//       色温跟星等走（暗星冷、亮星少数抽暖），色相承载层次，不是第三路独立随机。
// 工程约定：像素预算封顶、rAF 单循环、三重停帧闸门（标签页隐藏 / 划出视口 / 取景权被接走）、
//       reduced-motion 静态快进底片、颜色读 CSS 变量。
import { onMounted, onUnmounted, ref } from 'vue'
import { debounce } from '../../lib/debounce.js'
import { music } from '../../lib/music.js'
import { shift } from '../../lib/shift.js'
import { claimPlate, ensurePlate, ownsPlate, plateSpace, releasePlate, resetPlate, sky } from '../../lib/sky.js'
import { buildRidgeMask } from '../../lib/ridge.js'

// 取景权凭据：每个组件实例一份，fall 转场期间两机并存时只有最后挂载的那个往底片上画。
const self = {}

const props = defineProps({
  interactive: { type: Boolean, default: false },
})

const cvs = ref(null)
const TAU = Math.PI * 2

/* ---------------- 常量（手感/性能参数集中，便于调优） ---------------- */
// 稳态亮度 ≈ 每帧沉积 DEP ÷ 每帧衰减 fade；因为沉积也乘了 step（见 accPass 的 sc），这条现在
// 在任何刷新率上都成立（改之前只在 60fps 成立，见 §3.1 / §10 ⑫）。
//
// 这一对数值在 2026-10-07 被整体抬高 20 倍，为的是绕开 **8 位底片的量化地板**（§10 ⑭）：
// destination-out 每帧把像素 α 乘 (1−fd)，而画布是 RGBA8 —— 一旦 α·round(fd·255) < 0.5 LSB，
// 取整就把这一帧的衰减整个吞掉，那个像素**再也掉不下去**。地板高度 = 0.5/(255·fd)：旧的
// fd=0.012 冻在 α≈0.17，于是每颗星 150s 扫过的一整圈永久留在底片上（按点积分复刻 accPass
// 跑 9000 帧实测：残留覆盖 6.3% 像素、10 条半径行覆盖率 >55%、最强一圈 99%，Δ灰 31）。
// 这就是"浓度怎么收都不轻"的真因——前几轮为了拉长尾迹把衰减一路调到 FADE_1=0.0038，
// 那一档 round(fd·255)=1，地板直接抬到 α≈0.5：收参数等于把底片焊死，越调越浓。
// 沉积与衰减同时 ×20 → 稳态亮度 al/(al+fd) 逐位不变，地板压到 Δ灰 2 以下。
//
// 代价：尾迹长度不能再挂在衰减窗口上（1/fd 只剩 0.2°），改由弧长承载，见 accPass 的 len。
const OMEGA = 0.042 // 基础角速度 rad/s（刚体旋转，全场一致；越小天空转得越从容）
// 沉积基准 alpha（深色，60fps 那一档）。2026-10-07 第六轮随线宽**等墨**缩放：线宽中位 ×1.55，
// 单位弧长的墨 = α·lw 要保持不变（⑮ 刚把深色的脏灰压下去，加粗若不同时减 α 就是把那份墨还回去），
// 所以 0.168 → 0.108。`FADE_*` 不动：地板 = 0.5/(255·fd) 只跟 fd 有关，与这一对的比例无关。
const DEP = 0.108
const FADE_0 = 0.172 // 页顶衰减/帧
const FADE_1 = 0.104 // 最深衰减/帧（与 FADE_0 的比值沿用旧版 0.604：下潜越深窗口越长）
const FLOW_MAX = 2.2 // 下潜最深处的时间流速加成
const HEAD_GAIN = 2.6 // 头部亮段的 alpha 倍率：让拖痕前沿比尾巴亮
const FEAT_MIN = 5200 // 独立尾部消失的最小间隔 ms（2026-09-17 加密：换着消失才显得随机）
const FEAT_MAX = 11000
const FEAT_DUR = 4.2 // 独立尾部消失时长 s（量级与整体旋转周期协调，避免突兀）
const LENS_R = 180 // 指针时间膨胀半径 px
// 星数。220→180 是 ⑫ 那轮按"太密"收的，但那时底片上还叠着一层永久残留（⑭）——
// 地板没了才看得见真实浓度，所以往回补。窄屏单独一档，见 §3.1 的手机读数。
const N_BIG = 280
const N_SMALL = 140
// 星数必须**分主题**：同一套 α 在两个主题上的可见面积差着一个数量级。浅色是墨压浅底
// （底亮度 245），α<0.05 的抗锯齿羽化按 Weber 律根本看不见；深色是冷白加在近黑底上
// （实测底亮度 2.2 级），一条 α=0.037 的羽化边就是 7 级 = 320% 对比 → 280 根的羽化叠起来
// 读成"一片脏灰的轨迹"。量法见 §10 ⑮。
const N_DEEP_K = 0.65 // 深色主题的星数倍率（浅色=1）
// 线宽。旧值 `0.6 + z·1.2` 的中位数只有 0.94 CSS px，而他那块屏是 1× 缩放——**上屏的采样网格
// 就是 1 CSS px = 1 设备像素**，一根不到一格的线必然沿程明暗跳：按面积积分量过，脊的谷/峰只有
// 0.33（同一条线自己亮 30 级、暗 10 级交替）。底片内部超采样治不了它（p=1.645 时 0.34、p=2 时
// 0.24，等于没修，见 §10 ⑯），只有把线本身加粗才行。中位 0.94→1.45 px 后谷/峰回到 0.52。
const LW_BASE = 1.05
const LW_SPAN = 1.15 // 中位 1.45 / p90 1.81 / 最粗 2.20 CSS px
// 每根弧的角长 = (SHEAR_MIN + r^SHEAR_POW·SHEAR_SPAN) × 星等倍率（亮 1.5 / 中 1.15 / 暗 1，见 mkStar）。
// 衰减窗口被 ⑭ 压到 4 帧之后，尾迹长度就**等于**这个弧长，所以这三个数是"长不长"的
// 主旋钮（星等倍率是第二个），README 配图也从源码读它们。
// 分布这一轮加宽：旧 0.09+r^1.25·0.85 中位 25.6° / 最长 53.8°，长短太接近，读起来是
// "一把差不多长的弧"；现在中位 ≈23.6°、最长 ≈61°、亮星到 92°——最短与最长差 8 倍以上，
// 随机感首先靠"每根都不一样长"承载。
const SHEAR_MIN = 0.07 // 最短弧 rad（4.0°）：再短就在内圈读不出"是一根线"
const SHEAR_SPAN = 1.0 // 分布右端的追加量
const SHEAR_POW = 1.55 // 越大越压向短端：多数短、极少数长，才不像一把等长的刷子
// 全局角速度呼吸：两个不可通约的慢波相乘，±22% 非周期起伏。刚体 ω 保证几何正确，
// 但恒定 ω 读起来像节拍器；加呼吸之后天空是"被风推着"的，时紧时松，而全场一致 ω 的
// 周日视运动叙事不变（所有星共享同一个 gust，不做差速旋转）。
const GUST_A = 0.22
const GUST_W = TAU / 47 // 主周期 ≈47s
// 下潜越深，弧拖得越长：len = (flow·FADE_0/fade)^LEN_POW。括号里就是"曝光窗口 × 转速"，
// 物理上尾迹 ∝ 它，但直接线性会在最深档给出 5.3 倍（25.6°→136°），一眼看出是同一根被拽长，
// 所以按 LEN_POW 压一档。0.28 给页顶→最深 1.0→1.58 倍。
const LEN_POW = 0.28
const METEOR_MIN = 6000 // 流星最短间隔 ms
const METEOR_MAX = 9000
const PLATE_STEPS = 380 // reduced-motion 静态底片快进步数
const PLATE_OM = 0.17 // 快进角速度 rad/s
// 静态底片是减弱动效用户**唯一**能看到的东西，所以它的浓淡必须跟着 live 的 fade 走：
// PLATE_FADE : FADE_0 这个比例（≈0.58）自 2026-09-17 起就没变，上面那轮 FADE_0 降了就跟着降。
// 尾迹长度靠 PLATE_LEN 撑：衰减窗口只有 1/0.1 ≈ 10 帧（≈1.6°），旧的"快进 4 倍角速度换 33°
// 长尾"这一条在 ×20 之后不成立了，所以静态版直接把弧放长 1.6 倍（5.2°~53.8° → 8°~86°），
// 比 live 页顶那一档长一些——它是一张"冲好的长曝光"，该比实时那一眼更满。
const PLATE_FADE = 0.1
const PLATE_LEN = 1.6 // 静态底片的弧长倍率（live 的对应量由 flow 算出来，见 update）
// 次级页限帧到 30fps。长曝光靠短弧增量累积，帧率减半不影响观感，
// 但全屏 destination-out + drawImage 的绘制量直接减半（首页交互层仍走满帧）。
const SUB_FPS = 30
// 次级页曝光响应：页顶维持安静的短尾迹基线，随文档深度逐渐延长并加速，
// 让「越往下读，曝光越久」在文章页真的成立。深度取 App.vue 写入的 shift.v（文档级），
// 不用首页那套 scrollY/(H*1.1)——长文章滚过一屏它就饱和了，读不出整篇的进度。
const SUB_FADE_TOP = FADE_0 * 1.3 // 页顶衰减/帧（沿用原静默基线：更短尾迹）
const SUB_FLOW = 1.1 // 最深处的流速加成（首页 FLOW_MAX 的一半，次级页保持克制）
/* 半径取样：等距槽 + 槽内抖动 + 单调弯折。
 * 为什么不再用独立随机：n 条环自由落体必然结块——实测（n=180，12 次取均值）"最挤 10 条的跨度 ÷
 * 最松 10 条的跨度"是 5.81，且最小间距 0.0px（两条环几乎重合，读起来就是一根粗线旁边一大片空）。
 * 分层抖动保住槽内的随机（相邻间距仍有 ±76% 的摆动），把结块比压到 1.65、50 个半径桶里的空桶
 * 从 3.3 个降到 1 个（那一个是天极附近，本来就该空）。
 * 上一版的"3 段重叠环带 + 三成完全随机"是为了消灭更早那版"4 段互不重叠、中间留 3 道空隙 = 太规整"，
 * 结果矫枉过正成了不均匀。中段略密的倾向由 MID_BIAS 继承（旧环带中段约比两端密 1.4 倍）。 */
const R_MIN = 0.03 // 最内圈占 maxR 的比例
const SLOT_JIT = 0.76 // 抖动占槽宽的比例：留 0.24 的缝，保证相邻环不重合
const MID_BIAS = 0.2 // 中段偏密强度；g(u)=u+a·sin(2πu)/2π，|a|<1 才单调

let ctx = null
let W = 0 // 本相机的盒子尺寸（CSS px）；底片尺寸在 sky.w/h
let H = 0
let dpr = 1
let reduced = false
// 预曝光只做一次：底片跨路由常驻，回到首页不该把已经感光的这一夜倒掉重冲。
// 本组件现在只被首页（interactive）挂载，所以模块级就够，不需要挂到 sky 上。
let warmed = false
let raf = 0
let last = 0
let lastDraw = 0 // 上一次真正绘制的时刻（次级页限帧用）
let visible = true // 标签页是否可见（visibilitychange）
let onScreen = true // 本机盒子是否在视口内（仅首页相机有意义）

// 时间流速 / 衰减（滚动驱动，带惯性）
let flow = 1
let flowT = 1
let fade = FADE_0
let fadeT = FADE_0

let meteors = []
let nextMeteor = 0
let px = 0
let py = 0
let pxT = 0
let pyT = 0
let hasPointer = false
let ridgeMask = null // 首页相机的山脊遮罩（alpha 画布），见 src/lib/ridge.js

// 颜色
const C = {
  cold: [142, 201, 255],
  hot: [255, 92, 57],
  white: [255, 247, 237],
  ink: [244, 241, 234],
  trail: [],
  boost: 0,
}
let voidA = 'rgba(2,2,4,.34)'

function hex2rgb(h) {
  const s = String(h).replace('#', '').trim()
  const n = s.length === 3 ? s.split('').map((c) => c + c).join('') : s
  if (n.length < 6) return null
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)]
}
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`
const mix = (a, b, t) => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
]
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

function readColors() {
  const cs = getComputedStyle(document.documentElement)
  const get = (n, fb) => hex2rgb(cs.getPropertyValue(n).trim()) || fb
  const theme = document.documentElement.getAttribute('data-theme') || ''
  C.cold = get('--cold', C.cold)
  C.hot = get('--hot', C.hot)
  C.white = get('--white', C.white)
  C.ink = get('--text-0', C.ink)
  C.boost = theme === 'out' ? 1 : 0
  voidA = cs.getPropertyValue('--void-a').trim() || voidA
  // 星轨色板：色相承载星等。暗档冷（板岩/冷白）、中档中性（石墨/暖白）、只有亮星里
  // 三成抽到暖档（朱砂/琥珀）做点睛。旧版色温是第三路独立随机（56/33/11），橙弧会以
  // 同样的概率出现在暗线里——亮色照片上读成锈划痕；现在暖色只跟在亮星后面，出现即重点。
  C.trail = C.boost
    ? [mix(C.ink, C.cold, 0.42), mix(C.ink, C.cold, 0.12), C.hot]
    : [mix(C.white, C.cold, 0.55), C.white, mix(C.white, C.hot, 0.6)]
  // 只有真的换了主题才重铺底片（防串色）。同主题下挂载、换页都继续用这张——
  if (theme !== sky.theme) {
    sky.theme = theme
    resetPlate() // 两台相机各挂一个 MutationObserver，先跑的那个改 sky.theme、后跑的走早返回
    seedStars() // 底片反正要重铺，星数按新主题重定（深色/浅色差 N_DEEP_K 倍）
    rebuildRidge() // 首屏地景随主题换底（同一取景的压暗版），折线复算一遍
  }
  // 但 reduced-motion 没有 rAF 循环，重绘只能挂在这一串事件上：若把它留在上面的分支里，
  // 观察器竞争失败的那台会永远显示旧配色那一帧。重绘是幂等的，每台都刷自己这一份。
  if (reduced) {
    ensureStaticPlate()
    draw(performance.now())
  }
}

// reduced-motion 的静态底片：全站只冲一次，换页/第二台相机都不重冲
function ensureStaticPlate() {
  if (!reduced || sky.plateBuilt || !sky.acc) return
  buildPlate()
  sky.plateBuilt = true
}

/* ---------------- 山脊遮罩（只首页相机） ---------------- */
function rebuildRidge() {
  const key = C.boost ? 'out' : 'deep'
  if (!props.interactive || !W || !H || !cvs.value) {
    ridgeMask = null
    return
  }
  // 地景横带的几何取 .hero-plate 自己的盒子：cover + 顶边钉死由 buildRidgeMask 复算，
  // 这里只交盒子。量盒子而不是按 H 的 46%/54% 算，因为 .hero 是 100svh，手机上与
  // innerHeight 不一致（canvas 尺寸已经踩过这个差）。
  const el = cvs.value.parentElement?.querySelector('.hero-plate')
  if (!el) {
    ridgeMask = null
    return
  }
  const a = el.getBoundingClientRect()
  const b = cvs.value.getBoundingClientRect()
  ridgeMask = buildRidgeMask(key, W, H, { x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height })
}

/* ---------------- 尺寸 ---------------- */
function resize() {
  // 两台相机一律取**视口**尺寸：底片就是视口大小，于是 kx/ky 恒为 1。
  // 首页相机不再量 hero 的盒子——它是 100svh，手机上比 innerHeight 小最多 ~17%，
  // 拿它当相机等于把底片非等比压扁：同心弧在首页变椭圆、进文章页又跳回正圆，
  // 正是统一天极要消灭的那种穿帮。多出来的一截由 .hero{overflow:hidden} 裁掉，
  // 代价只是取景范围少几十像素，几何不再错。
  W = innerWidth
  H = innerHeight
  if (!W || !H || !cvs.value) return
  ensurePlate() // 天区尺寸没变就沿用同一张底片（换页正属于这种情况）
  dpr = sky.dpr // 底片已按像素预算定过 DPR，相机跟随它即可，画上去 1:1 最锐
  const pw = Math.max(2, Math.round(W * dpr))
  const ph = Math.max(2, Math.round(H * dpr))
  cvs.value.width = pw
  cvs.value.height = ph
  cvs.value.style.width = `${W}px`
  cvs.value.style.height = `${H}px`
  ctx = cvs.value.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  onFlowScroll()
  seedStars()
  rebuildRidge()
  if (reduced) {
    ensureStaticPlate()
    draw(performance.now())
  }
}

function pickRn(i, n) {
  const u = (i + 0.12 + Math.random() * SLOT_JIT) / n
  const g = u + (MID_BIAS / TAU) * Math.sin(TAU * u)
  return R_MIN + (1 - R_MIN) * Math.min(1, Math.max(0, g))
}

function mkStar(i, n) {
  // 星等三档：暗多数（72%）铺底密度，中档（22%）撑层次，亮少数（6%）承担冲击力——
  // 真实长曝光照片读得出结构的正是那几根亮拖痕。旧版用单一幂分布抽 z 再 7% 概率 ×2.1，
  // "亮星"与大众的边界是糊的，整屏读成"同一种细线"；现在三档的 z / 线宽 / 弧长 / 沉积
  // 各走各的区间，档间差大于档内抖动，层次一眼可分。
  const cr = Math.random()
  const cls = cr < 0.72 ? 0 : cr < 0.94 ? 1 : 2
  const z =
    cls === 0
      ? 0.1 + Math.pow(Math.random(), 1.8) * 0.22
      : cls === 1
        ? 0.34 + Math.random() * 0.3
        : 0.75 + Math.random() * 0.25
  const rr = Math.random()
  return {
    rn: pickRn(i, n),
    r: 0,
    th: Math.random() * TAU,
    z,
    // 色温跟星等走：暗=冷档、中=中性档，亮星里三成抽暖档点睛（配色见 readColors）
    tier: cls === 0 ? 0 : cls === 1 ? 1 : rr < 0.3 ? 2 : 1,
    lw: (LW_BASE + z * LW_SPAN) * (cls === 2 ? 1.35 : 1), // 亮星更粗：亮度之外再给一层尺寸差
    head: cls === 2 || (cls === 1 && z > 0.55), // 头部亮段：亮星全给，中档只给偏亮的那半
    bleed: cls === 2, // 亮星外圈再叠一笔宽而淡的弧：墨晕/辉光，冲击力的主要来源
    dk: cls === 2 ? 1.5 : cls === 1 ? 1 : 0.8, // 沉积按星等分档：暗档再收两成，把墨让给亮星
    ta: 0.08 + 0.13 * Math.min(1, z), // 闪烁幅度随星等增大（亮星才看得见眨眼）
    tw: 0.3 + Math.random() * 1.3,
    ph: Math.random() * TAU,
    // 云幕慢包络：周期 40~110s、幅度 10~22% 的缓变暗化。与快闪烁（tw）、独立尾部消失
    // （feat）叠成三个时间尺度，天空才不像齐步走；单看任何一个周期都太长，读不出循环。
    ca: 0.1 + Math.random() * 0.12,
    cw: 0.05 + Math.random() * 0.11,
    cp: Math.random() * TAU,
    // 尾迹起点偏移（rad）×星等倍率：每颗星从不同角度开始沉积、弧长又各档不同，
    // 使弧段截端错落，避免对齐成断口。
    shear: (SHEAR_MIN + Math.pow(Math.random(), SHEAR_POW) * SHEAR_SPAN) * (cls === 2 ? 1.5 : cls === 1 ? 1.15 : 1),
  }
}

function seedStars() {
  if (!sky.maxR) return
  // 星群是天空的属性，不是相机的：底片全站共享后，若次级页只沉积一半星，
  // 那另一半圆弧会在阅读过程中因全局衰减慢慢消失。所以只按视口宽度定一次数。
  // 主题倍率在这里生效：深色近黑底会把每条线的羽化边都放大成可见的灰轨，星数要收一档
  const n = Math.round((innerWidth <= 720 ? N_SMALL : N_BIG) * (C.boost ? 1 : N_DEEP_K))
  if (sky.stars && sky.stars.length === n) {
    for (const s of sky.stars) s.r = s.rn * sky.maxR // 数量未变 → 保留状态，仅重算半径
    return
  }
  sky.stars = Array.from({ length: n }, (_, i) => mkStar(i, n))
  for (const s of sky.stars) s.r = s.rn * sky.maxR
  sky.feat = [] // 星群重建：清空独立消失标记，索引已失效
  sky.featNext = 0
}

/* ---------------- 独立尾部消失（随机 1-3 根星轨，周期性换角） ---------------- */
function pickFeat(tSec) {
  sky.feat = []
  const r = Math.random()
  // 1/2/3 根按 45%/37%/18% 抽。固定"1 或 2 根"抽久了会听出节拍，偶发三根一起换角才像云过。
  const count = r < 0.45 ? 1 : r < 0.82 ? 2 : 3
  const set = new Set()
  let guard = 0
  while (set.size < count && guard++ < 60 && set.size < sky.stars.length) {
    set.add((Math.random() * sky.stars.length) | 0)
  }
  for (const i of set) sky.feat.push({ i, t0: tSec + 0.4 + Math.random() * 1.8 })
}

/* ---------------- 滚动 = 时间流速 ---------------- */
function onFlowScroll() {
  if (!props.interactive || !H) {
    // 次级页只在此设基线：它不注册 scroll 监听，深度响应由 update() 按 shift.v 逐帧推进
    flowT = 1
    fadeT = SUB_FADE_TOP
    return
  }
  const k = clamp01(scrollY / (H * 1.1))
  flowT = 1 + k * FLOW_MAX
  fadeT = FADE_0 - k * (FADE_0 - FADE_1)
}

/* ---------------- 累积缓冲：衰减 + 沉积 ---------------- */

// om: 角速度 rad/s；fd: 每帧衰减；dtS: 帧时长 s；tAbs: 绝对时间 s；dep: 沉积基准 alpha
// sc: 帧时长比例（update 里的 step = dt/16.7），**承重**。衰减乘了 step、星角走 dtS，沉积若也不乘
// step，浓淡就随刷新率漂移：120Hz 上同一点每秒被叠两倍次数，未饱和处稳态亮度翻倍——最深档实测
// 中位亮度 0.216→0.283、顶到 α=1 的实心像素 0.72%→1.95%、环间黑隙 27px→20px（读成一片密纹），
// 那几轮"收参数没见轻"就是这个原因。乘上 step 后浓淡只由时间决定；60Hz 下 step=1，观感逐位不变。
// len: 弧长倍率。尾迹长度 = 弧长(≈shear·len) + 衰减尾(≈dth/fd)，而衰减尾在 8 位底片上被量化
// 地板限死在 1~2°（见 §10 ⑭），所以"下潜越深、曝光越久"这条现在由 len 承载。
function accPass(om, fd, dtS, tAbs, dep, sc = 1, len = 1) {
  // 逐帧热路径：把 sky 上的对象先绑成局部引用，省掉满屏循环里的重复属性查找
  const a = sky.accCtx
  const acc = sky.acc
  const stars = sky.stars
  const feat = sky.feat
  const { x: polx, y: poly } = sky.pole
  // 衰减 pass：destination-out 均匀削掉底片透明度 → 决定"擦得多快"，并在弧的尾端留一段
  // 指数尾（长度 = dth/fd，量级只有 1° 上下）。尾迹本身的长度是弧长，见下面 dthLen。
  a.setTransform(1, 0, 0, 1, 0, 0)
  a.globalCompositeOperation = 'destination-out'
  a.globalAlpha = 1
  a.fillStyle = `rgba(0,0,0,${fd})`
  a.fillRect(0, 0, acc.width, acc.height)
  plateSpace()

  // 增量 pass：每颗星画本帧的短弧 → 长曝光自然累积
  for (let tier = 0; tier < 3; tier++) {
    a.strokeStyle = rgba(C.trail[tier], 1)
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i]
      if (s.tier !== tier) continue
      const x = polx + Math.cos(s.th) * s.r
      const y = poly + Math.sin(s.th) * s.r
      let boost = 1
      let ab = 1
      // 指针时间膨胀：局部转速加快 + 提亮 → 轨迹卷曲（光绘 torch）
      if (hasPointer) {
        const d = Math.hypot(x - px, y - py)
        if (d < LENS_R) {
          const f = 1 - d / LENS_R
          boost = 1 + 1.8 * f * f
          ab = 1 + 0.9 * f
        }
      }
      const dth = om * boost * dtS
      // 独立尾部渐隐：随机 1-3 根在 4.2s 里暗下去再回来，像云过。
      // 2026-10-07 去掉了另一条"转满前 20% 整体收尾"（SETTLE_*）：它按笔尖所在角统一削沉积，
      // 等于在天球上留出一道 72° 的系统性暗楔——所有半径在同一角度同时缺角，读起来就是"密度
      // 很奇怪 + 弧被切断"。衰减窗口缩短之后闭合环本来就不可能形成，那道楔子只剩副作用。
      let vk = 0
      for (let f = 0; f < feat.length; f++) {
        if (feat[f].i !== i) continue
        const p = clamp01((tAbs - feat[f].t0) / FEAT_DUR)
        vk = Math.max(vk, (0.5 - 0.5 * Math.cos(TAU * p)) * 0.6) // 0→0.6→0 的柔和独立渐隐（不整星熄灭，避免环口）
      }
      s.th += dth
      const dthLen = (s.shear * len + dth) * boost // 本帧沉积的弧长
      const tw =
        (1 - s.ta + s.ta * Math.sin(tAbs * s.tw + s.ph)) *
        (1 - s.ca + s.ca * Math.sin(tAbs * s.cw + s.cp))
      const al = Math.min(1, dep * s.z * s.dk * ab * tw * (1 - vk) * sc)
      // 墨晕/辉光：亮星在主弧之外先垫一笔宽而淡的同弧。浅色读成干版墨晕、深色在
      // lighter 下读成辉光，同一笔两种主题各取所需；只有 6% 的星走到这里。
      if (s.bleed) {
        a.globalAlpha = Math.min(1, al * 0.16)
        a.lineWidth = s.lw * 2.6
        a.beginPath()
        a.arc(polx, poly, s.r, s.th - dthLen, s.th)
        a.stroke()
      }
      a.globalAlpha = al
      a.lineWidth = s.lw
      a.beginPath()
      a.arc(polx, poly, s.r, s.th - dthLen, s.th)
      a.stroke()
      // 头部亮段：等亮的长弧只是一根光棒，前沿再叠一笔短而亮的弧才有"自尾向头递增"，
      // 读起来才是一颗正在划过的星。累积稳态的 头/尾 实测 1.3~1.6 倍（HEAD_GAIN 2.6 看着大，
      // 但每帧增量要走完 al/(al+fade) 才显现）——要更突出就同时动 HEAD_GAIN 和这里的比例。
      // 亮星的头段比中档长一截（0.30 vs 0.22），"彗头"感更重。
      if (s.head) {
        a.globalAlpha = Math.min(1, al * HEAD_GAIN)
        a.lineWidth = s.lw * 0.72
        a.beginPath()
        a.arc(polx, poly, s.r, s.th - dthLen * (s.bleed ? 0.3 : 0.22), s.th)
        a.stroke()
      }
    }
  }

  a.globalAlpha = 1
}

// reduced-motion：一次性快进生成静态长曝光底片，不启动 rAF
function buildPlate() {
  if (!sky.accCtx) return
  resetPlate()
  const dtS = 1 / 60
  for (let i = 0; i < PLATE_STEPS; i++) accPass(PLATE_OM, PLATE_FADE, dtS, i * dtS, DEP * (C.boost ? 1.5 : 1), 1, PLATE_LEN)
}

/* ---------------- 流星 ---------------- */
function spawnMeteor(delay) {
  if (meteors.length > 8) return
  const dir = Math.random() < 0.5 ? 1 : -1 // 右下 / 左下入射
  const sx = dir > 0 ? Math.random() * W * 0.7 : W - Math.random() * W * 0.7
  const sy = Math.random() * H * 0.4
  const a = (dir > 0 ? 0.42 : Math.PI - 0.42) + (Math.random() - 0.5) * 0.24
  const sp = 900 + Math.random() * 600
  meteors.push({ x: sx, y: sy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t0: performance.now() + (delay || 0) })
}

/* ---------------- 帧 ---------------- */
function update(dt, now) {
  const step = Math.min(3, dt / 16.7)
  // 流速/衰减/指针光锥的惯性推进。0.9 时约 1/3 秒就贴到目标，改滚动速度的瞬间会"弹"一下；
  // 放到 0.94（约 1 秒收敛）让天空是被慢慢推动的，而不是被拽过去的。
  const sp = 1 - Math.pow(0.94, step)
  if (!props.interactive) {
    // 阅读即曝光：下潜越深，沉积越快、衰减越慢 → 星轨更长更亮。
    // 目标值交给下面既有的惯性推进平滑，无需额外补间。
    const d = shift.v
    flowT = 1 + d * SUB_FLOW
    fadeT = SUB_FADE_TOP - d * (SUB_FADE_TOP - FADE_1)
  }
  flow += (flowT - flow) * sp
  fade += (fadeT - fade) * sp
  if (hasPointer) {
    px += (pxT - px) * sp
    py += (pyT - py) * sp
  }
  const tSec = (now - sky.t0) / 1000
  // 只有底片的主人能改天空：抽独立尾部、以及 accPass 里推进的星角。
  // 非主人照常往下走并 draw()——转场重叠的那 260ms 里两台相机显示的是同一张
  // "还在长"的底片，交出取景权的那台不再冻在半帧上（那是切换顿挫感的真正来源）。
  if (ownsPlate(self)) {
    // 独立尾部消失：定时随机挑 1-3 根，周期独立、与整体旋转周期量级协调
    if (now > sky.featNext && sky.stars.length) {
      pickFeat(tSec)
      sky.featNext = now + FEAT_MIN + Math.random() * (FEAT_MAX - FEAT_MIN)
    }
    if (sky.feat.length) sky.feat = sky.feat.filter((f) => tSec - f.t0 < FEAT_DUR + 0.6)
    const dep = DEP * (C.boost ? 1.5 : 1) * (props.interactive ? 1 : 0.75)
    // 角速度呼吸：见 GUST_*。两个慢波不可通约，gust 在几分钟内不重复，
    // 恒定 ω 的节拍器感就是这么破掉的；全场星共享同一个 gust，刚体叙事不变。
    const gust = 1 + GUST_A * Math.sin(tSec * GUST_W) * Math.sin(tSec * GUST_W * 0.37 + 1.3)
    // len：曝光窗口越长（下潜越深）弧拖得越长，压缩幂见 LEN_POW。
    accPass(OMEGA * flow * gust, fade * (C.boost ? 1.4 : 1) * step, dt / 1000, tSec, dep, step, Math.pow((flow * FADE_0) / fade, LEN_POW))
  }
  if (props.interactive) {
    if (now > nextMeteor) {
      spawnMeteor()
      // 播放中把随机间隔压向最短值 → 流星更密；停下后下一次生成即自然回弹。
      // 这里只是读一个普通属性（在 rAF 内），不会给 Vue 建立依赖。
      const span = (METEOR_MAX - METEOR_MIN) * (music.playing ? 0.4 : 1)
      nextMeteor = now + METEOR_MIN + Math.random() * span
    }
    for (let i = meteors.length - 1; i >= 0; i--) if ((now - meteors[i].t0) / 900 > 1) meteors.splice(i, 1)
  }
}

// 衍射星芒绘制（流星亮头）：柔晕 + 锥形芒，随脉动呼吸；rot 让芒随飞行方向旋转
function drawStar(x, y, o) {
  const halo = o.halo
  const core = o.core
  const pu = o.pu
  const bl = o.bl
  const alpha = o.alpha ?? 1
  const rot = o.rot || 0
  const boost = C.boost
  const co = Math.cos(rot)
  const si = Math.sin(rot)
  // 锥形衍射芒：宽柔晕 + 亮锐芯；主/副 = 1:0.45，呼吸由 pu 驱动
  const ray = (0.26 + 0.32 * pu) * (1 + 0.55 * bl)
  const L = (boost ? 22 : 27) * (0.5 + 0.4 * pu + 0.5 * bl)
  const a0 = (boost ? 0.5 : 0.62) * ray * alpha
  for (const [dx, dy, k] of [
    [1, 0, 1],
    [0, 1, 1],
    [-1, 0, 1],
    [0, -1, 1],
    [0.7071, 0.7071, 0.45],
    [-0.7071, 0.7071, 0.45],
    [0.7071, -0.7071, 0.45],
    [-0.7071, -0.7071, 0.45],
  ]) {
    const rx = (dx * co - dy * si) * k
    const ry = (dx * si + dy * co) * k
    const g2 = ctx.createLinearGradient(x, y, x + rx * L, y + ry * L)
    g2.addColorStop(0, rgba(core, a0 * 0.42))
    g2.addColorStop(0.6, rgba(core, a0 * 0.12))
    g2.addColorStop(1, rgba(core, 0))
    ctx.strokeStyle = g2
    ctx.globalAlpha = 1
    ctx.lineWidth = 2.6
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + rx * L, y + ry * L)
    ctx.stroke()
    // 亮锐芯：略短，增强中心通透感
    const g3 = ctx.createLinearGradient(x, y, x + rx * L * 0.7, y + ry * L * 0.7)
    g3.addColorStop(0, rgba(core, a0))
    g3.addColorStop(1, rgba(core, 0))
    ctx.strokeStyle = g3
    ctx.lineWidth = 0.85
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + rx * L * 0.7, y + ry * L * 0.7)
    ctx.stroke()
  }
  // 光晕：深色主题两层辉光（近芯亮、外缘渐隐）；浅色干版忌糊不带光晕
  if (!boost) {
    const R = (2.6 + 1.6 * bl) * (0.82 + 0.36 * pu)
    const g = ctx.createRadialGradient(x, y, 0, x, y, R * 5)
    g.addColorStop(0, rgba(halo, (0.36 + 0.24 * pu + 0.4 * bl) * alpha))
    g.addColorStop(0.35, rgba(halo, (0.16 + 0.12 * pu + 0.18 * bl) * alpha))
    g.addColorStop(1, rgba(halo, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, R * 5, 0, TAU)
    ctx.fill()
  }
  // 星核 + 内芯高光（深色主题加点白芯提亮）
  ctx.fillStyle = rgba(core, alpha * (0.9 + 0.1 * bl))
  ctx.beginPath()
  ctx.arc(x, y, 1.7 + 0.7 * bl, 0, TAU)
  ctx.fill()
  if (!boost) {
    ctx.fillStyle = rgba([255, 255, 255], alpha * 0.92)
    ctx.beginPath()
    ctx.arc(x, y, 0.85 + 0.3 * bl, 0, TAU)
    ctx.fill()
  }
}

function draw(now) {
  if (!ctx || !W || !sky.acc) return

  // 底
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
  if (props.interactive) ctx.clearRect(0, 0, W, H)
  else {
    ctx.fillStyle = voidA
    ctx.fillRect(0, 0, W, H)
  }

  // 底片（长曝光星轨）：drawImage 顺带把天区坐标缩放进本相机的盒子（首页 hero ≈ 视口，比例≈1）
  ctx.globalCompositeOperation = C.boost ? 'source-over' : 'lighter'
  ctx.drawImage(sky.acc, 0, 0, W, H)

  if (!props.interactive) {
    ctx.globalCompositeOperation = 'source-over'
    return
  }

  /* --- 流星 --- */
  for (const m of meteors) {
    const age = (now - m.t0) / 900
    if (age < 0 || age > 1) continue
    const tt = (age * 900) / 1000
    const x = m.x + m.vx * tt
    const y = m.y + m.vy * tt
    const tx = x - m.vx * 0.24
    const ty = y - m.vy * 0.24
    const env = Math.sin(Math.PI * age)
    const head = C.boost ? C.hot : C.white
    const tail = C.boost ? mix(C.ink, C.hot, 0.4) : C.cold
    const g = ctx.createLinearGradient(tx, ty, x, y)
    g.addColorStop(0, rgba(tail, 0))
    g.addColorStop(0.72, rgba(tail, 0.3 * env))
    g.addColorStop(1, rgba(head, 0.95 * env))
    ctx.strokeStyle = g
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(tx, ty)
    ctx.lineTo(x, y)
    ctx.stroke()
    // 亮头：锥形衍射星芒，随飞行方向旋转
    const rot = Math.atan2(m.vy, m.vx)
    drawStar(x, y, { halo: C.boost ? C.hot : C.cold, core: head, pu: 0.9, bl: 0.4, alpha: env, rot })
  }

  /* --- 山脊遮罩 --- */
  // 山体不吃星轨（流星同裁——它也是天空的现象，本该躲在山后）。
  // destination-in 只保留遮罩 alpha 非零处；遮罩是半分辨率平滑梯度，上采样不回引入台阶。
  if (ridgeMask) {
    ctx.globalCompositeOperation = 'destination-in'
    ctx.globalAlpha = 1
    ctx.drawImage(ridgeMask, 0, 0, W, H)
  }
  ctx.globalCompositeOperation = 'source-over'
}

function tick(now) {
  raf = 0
  // 停帧只看在不在看：标签页隐藏、或首页 hero 整块滚出视口。
  // 取景权不在这里判——那只管沉积，见 update()；否则交出底片的相机会冻在半帧上。
  if (reduced || !visible || !onScreen) return
  raf = requestAnimationFrame(tick)
  // 次级页限帧：不足一帧间隔就空转（一次 rAF 回调的开销可忽略，不画任何东西）。
  if (!props.interactive && now - lastDraw < 1000 / SUB_FPS - 1) return
  lastDraw = now
  // last 只在真正绘制时推进：dt 会是 ~33ms，update() 按真实时长累积，
  // 因此星轨的转速与满帧完全一致，只是每秒少画一半帧。
  // 下界也要夹：kick() 里 last 取 performance.now()，而下一帧的 rAF 时间戳是帧起始时刻，
  // 可能比它更早 → 首帧 dt<0 → step<0 → 衰减 fillStyle 成 rgba(0,0,0,-x) 被静默丢弃，
  // 那一帧会沿用上一帧的衰减量、且短弧反向扫。
  const dt = Math.max(0, Math.min(48, now - last))
  last = now
  update(dt, now)
  draw(now)
}

function kick() {
  if (!raf && !reduced && visible && onScreen) {
    last = performance.now()
    raf = requestAnimationFrame(tick)
  }
}

function stopLoop() {
  if (raf) cancelAnimationFrame(raf)
  raf = 0
}

/* ---------------- 交互 ---------------- */
// 指针要落回"天区坐标"：时间膨胀半径的那一侧是底片空间
function toSky(clientX, clientY) {
  const r = cvs.value?.getBoundingClientRect()
  if (!r || !W || !H) return null
  return [(clientX - r.left) * (sky.w / W), (clientY - r.top) * (sky.h / H)]
}

function onMove(e) {
  const p = toSky(e.clientX, e.clientY)
  if (!p) return
  hasPointer = true
  pxT = p[0]
  pyT = p[1]
  if (reduced) {
    px = pxT
    py = pyT
    draw(performance.now())
  }
}

function onLeave() {
  hasPointer = false
  if (reduced) draw(performance.now())
}

function onDown(e) {
  if (!props.interactive) return
  const p = toSky(e.clientX, e.clientY)
  if (!p) return
  hasPointer = true
  pxT = px = p[0]
  pyT = py = p[1]
}

function onVisibility() {
  visible = !document.hidden
  if (visible) kick()
}

// resize 要重建画布 + 重播星群，拖拽窗口时逐像素触发代价过高 → 去抖
const onResize = debounce(() => {
  resize()
  if (!reduced) kick()
}, 150)

let observer = null
let io = null // 视口可见性观察（仅首页相机）

onMounted(() => {
  reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  claimPlate(self) // 后挂载者接管底片（转场重叠期靠它防止双份沉积）
  if (!sky.t0) sky.t0 = performance.now() // 时钟全站一次：换页不清零，星角接着长
  const now = performance.now()
  nextMeteor = now + 2600
  if (!sky.featNext) sky.featNext = now + 3200 // 首根独立尾部消失约在 3.2s 后出现
  readColors()
  resize()
  observer = new MutationObserver(readColors)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  document.addEventListener('visibilitychange', onVisibility)
  if (props.interactive) {
    addEventListener('scroll', onFlowScroll, { passive: true })
  }
  addEventListener('resize', onResize)
  // 首页相机在流内（hero 100svh）：整块滚出视口后就没人看了，停帧。
  // 次级页相机是 position:fixed 满屏，恒在视口内，不需要观察。
  // rootMargin 外扩 200px：留一点余量，回滚时不会先看到一帧停滞的画面。
  if (props.interactive) {
    io = new IntersectionObserver(
      ([e]) => {
        onScreen = e.isIntersecting
        if (onScreen) kick()
        else stopLoop()
      },
      { rootMargin: '200px' },
    )
    io.observe(cvs.value)
  }
  if (reduced) {
    ensureStaticPlate()
    draw(performance.now())
  } else {
    // 预曝光：首帧就交出一张"已经拍了一阵"的底片，而不是从空盘开始慢慢长。
    // 复用减弱动效那条快进路径（buildPlate 跑 PLATE_STEPS 步 accPass，星角与弧长都由它推进），
    // 它本来就是"冲好的长曝光"。放在 kick() 之前、readColors()/resize() 之后：
    // 色板与底片像素都已就位，才可能用同一套合成数学沉积。
    if (props.interactive && !warmed) {
      buildPlate()
      warmed = true
    }
    kick()
  }
})

onUnmounted(() => {
  if (raf) cancelAnimationFrame(raf)
  observer?.disconnect()
  io?.disconnect()
  document.removeEventListener('visibilitychange', onVisibility)
  removeEventListener('scroll', onFlowScroll)
  removeEventListener('resize', onResize)
  onResize.cancel()
  // 只交还取景权，不动底片：acc 是全站共享的，置 null 等于每次导航重铺一张
  releasePlate(self)
})
</script>

<template>
  <canvas
    ref="cvs"
    :class="interactive ? 'st st-abs' : 'st st-fixed'"
    aria-hidden="true"
    @pointermove="onMove"
    @pointerleave="onLeave"
    @pointerdown="onDown"
  ></canvas>
</template>

<style scoped>
.st {
  display: block;
}

.st-fixed {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  /* 暗带契约（令牌在 neo.css §1 的 --sky-band / --sky-feather 与 §2/§3 各自的 --sky-k；
     设计说明见 docs/design.md §3.3）：视口正中 --sky-band 宽的一条天空被压到 --sky-k
     强度，两侧各 --sky-feather 羽化回全亮。整站一处生效——9 个次级页共用这块 fixed 画布
     （App.vue 的 isSub 是 path !== '/'，路由 10 条里除首页外全部命中，含 login/admin 与 404），
     而画布在 main **之外**，所以它不随页根 transform 变包含块（那是进度线的老毛病）。
     mask 走 alpha 模式，故 rgba() 的 alpha 就是"天空保留多少"。
     首页那台 .st-abs 不进这里：它是主视觉，压暗带会把盘子本身压掉一半；
     它的文字对比改由 .title/.manifesto 自己的 --ink-0 text-shadow 柔光承担（见 HorizonHero）。
     不支持 mask 的浏览器等于回到改动前的样子（可读性不达标但不会画错），可优雅降级。 */
  --_band-in: calc(50% - var(--sky-band) / 2);
  --_band-out: calc(50% + var(--sky-band) / 2);
  --_sky-mask: linear-gradient(
    90deg,
    #000 0,
    #000 calc(var(--_band-in) - var(--sky-feather)),
    rgba(0, 0, 0, var(--sky-k)) var(--_band-in),
    rgba(0, 0, 0, var(--sky-k)) var(--_band-out),
    #000 calc(var(--_band-out) + var(--sky-feather)),
    #000 100%
  );
  -webkit-mask-image: var(--_sky-mask);
  mask-image: var(--_sky-mask);
  mask-repeat: no-repeat;
  mask-size: 100% 100%;
}

.st-abs {
  position: absolute;
  inset: 0;
  z-index: 1;
  touch-action: pan-y;
}

@media (prefers-reduced-motion: reduce) {
  .st {
    opacity: 0.9;
  }
}
</style>
