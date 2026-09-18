<script setup>
// StarTrails · 长曝光星轨装置（首页主视觉 / 次级页活背景）
// 概念：首屏是一台架在三脚架上的相机正在长曝光——
//   数千条同心星轨弧绕一枚偏心天极刚体旋转累积（恒星周日视运动 = 全场一致 ω）；
//   滚动 = 时间流速（下潜越深，曝光窗口越长、天空转得越快）；
//   文章 = 变星（定点脉动亮星，hover 缓绽锥形衍射十字芒·沿芒长渐隐，点击坠入）；
//   流星 = 环境叙事（偶掠夜空的瞬时光迹；播放器在响时更密）；
//   指针 = 引力时间膨胀（半径内轨迹局部加速卷曲，光绘 torch 感）。
// 管线：ACC 累积离屏缓冲（destination-out 衰减 pass + 每星短弧增量 pass，尾迹自然累积）
//       → 主画布每帧：底 → drawImage(ACC) → 变星/流星（当帧层，不累积，保持锐利）。
// 天与相机：底片与星群在 src/lib/sky.js 里是全站一份，本组件只是取景器——
//       换页 = 挪动相机，同一张底片继续感光，"一夜连续曝光"因此才成立。
// 主题：深空=冷白/暖白/琥珀星轨（lighter 发光）；纸面=天文干版底片（墨/sepia 轨迹 + 朱砂点睛）。
// 工程约定：像素预算封顶、rAF 单循环、三重停帧闸门（标签页隐藏 / 划出视口 / 取景权被接走）、
//       reduced-motion 静态快进底片、颜色读 CSS 变量。
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { debounce } from '../../lib/debounce.js'
import { music } from '../../lib/music.js'
import { shift } from '../../lib/shift.js'
import { claimPlate, ensurePlate, ownsPlate, plateSpace, releasePlate, resetPlate, sky } from '../../lib/sky.js'

// 取景权凭据：每个组件实例一份，fall 转场期间两机并存时只有最后挂载的那个往底片上画。
const self = {}

const props = defineProps({
  interactive: { type: Boolean, default: false },
  posts: { type: Array, default: () => [] },
})
const emit = defineEmits(['hover', 'select'])

const cvs = ref(null)
const TAU = Math.PI * 2

/* ---------------- 常量（手感/性能参数集中，便于调优） ---------------- */
// 稳态亮度 ≈ 每帧沉积 DEP ÷ 每帧衰减 fade。这组值被调过两轮：1.1.0 的 0.0085/0.008 = 1.06
// 被投诉"久了过饱和"，2026-09-17 收到 0.0072/0.0104 = 0.69 又被告知"不明显、不好看"。
// 现在落在 0.98 —— **略低于**当初投诉过饱和的那一档，因为这一轮真正补回来的是**对比**
// （星等分层 + 头部亮段，见 mkStar/accPass），不是单纯把整片提亮。两头一起动才同时满足
// "更长更亮"和"留得住黑"。
const OMEGA = 0.042 // 基础角速度 rad/s（刚体旋转，全场一致；越小天空转得越从容）
const SMEAR = 0.12 // 每帧沉积的快门拖尾角长 rad（只用于变星）
const DEP = 0.0084 // 沉积基准 alpha（深空）
const FADE_0 = 0.0086 // 页顶衰减/帧：衰减窗口 ≈ 1/FADE 帧，越小尾迹越长
const FADE_1 = 0.0038 // 最深衰减/帧
const FLOW_MAX = 2.2 // 下潜最深处的时间流速加成
const SETTLE_START = 0.8 // 转满前 20% 开始尾部渐隐（cycle∈[0.8,1] 平滑过渡）
const SETTLE_DEPTH = 0.6 // 临近转满暗化多深；越大越不容易收成实心亮环，也越灰
const HEAD_GAIN = 2.6 // 头部亮段的 alpha 倍率：让拖痕前沿比尾巴亮
const FEAT_MIN = 5200 // 独立尾部消失的最小间隔 ms（2026-09-17 加密：换着消失才显得随机）
const FEAT_MAX = 11000
const FEAT_DUR = 4.2 // 独立尾部消失时长 s（量级与整体旋转周期协调，避免突兀）
const LENS_R = 180 // 指针时间膨胀半径 px
const N_BIG = 220 // 星数（宽屏）
const N_SMALL = 110 // 星数（窄屏）
const METEOR_MIN = 6000 // 流星最短间隔 ms
const METEOR_MAX = 9000
const PLATE_STEPS = 380 // reduced-motion 静态底片快进步数
const PLATE_OM = 0.17 // 快进角速度 rad/s
// 静态底片是减弱动效用户**唯一**能看到的东西，所以它的浓淡必须跟着 live 的 fade 走：
// PLATE_FADE : FADE_0 这个比例（≈0.58）自 2026-09-17 起就没变，这一轮 FADE_0 降了就跟着降，
// 否则同一张底片会在"实时变亮"的同时被静态版相对压暗。
// 尾迹依然够长——快进角速度是实时 ω 的 4 倍，1/0.005 的衰减窗口仍有约 33° 的弧。
const PLATE_FADE = 0.005
// 次级页限帧到 30fps。长曝光靠短弧增量累积，帧率减半不影响观感，
// 但全屏 destination-out + drawImage 的绘制量直接减半（首页交互层仍走满帧）。
const SUB_FPS = 30
// 次级页曝光响应：页顶维持安静的短尾迹基线，随文档深度逐渐延长并加速，
// 让「越往下读，曝光越久」在文章页真的成立。深度取 App.vue 写入的 shift.v（文档级），
// 不用首页那套 scrollY/(H*1.1)——长文章滚过一屏它就饱和了，读不出整篇的进度。
const SUB_FADE_TOP = FADE_0 * 1.3 // 页顶衰减/帧（沿用原静默基线：更短尾迹）
const SUB_FLOW = 1.1 // 最深处的流速加成（首页 FLOW_MAX 的一半，次级页保持克制）
// 环带取样：只当"哪半径偏密"的倾向，不当栅栏。原先是 4 段互不重叠、中间留 3 条空隙，
// 那几道空环把天空切成了人为的同心结构 —— 用户说的"不好看/太规整"主要就出在这里。
const BANDS = [
  [0.04, 0.42],
  [0.3, 0.7],
  [0.55, 1],
]
const BAND_TOT = BANDS.reduce((s, b) => s + (b[1] - b[0]), 0)
const RND_R = 0.3 // 三成星的半径完全随机：打散环带残留的等距感

let ctx = null
let W = 0 // 本相机的盒子尺寸（CSS px）；底片尺寸在 sky.w/h
let H = 0
let dpr = 1
let reduced = false
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

let vars = [] // 变星=文章节点（只有首页相机会装填）
let meteors = []
let nextMeteor = 0
let hoverIdx = -1
let lastHover = -2
let px = 0
let py = 0
let pxT = 0
let pyT = 0
let hasPointer = false

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
// smoothstep：0→1 双向平滑（用于尾部渐隐的 20% 窗口，避免突变）
const smooth01 = (v) => {
  const x = clamp01(v)
  return x * x * (3 - 2 * x)
}

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
  // 星轨色板：深空=冷白/暖白/琥珀；纸面=墨/sepia/朱砂（干版底片）
  C.trail = C.boost
    ? [mix(C.ink, C.hot, 0.05), mix(C.ink, C.hot, 0.34), C.hot]
    : [mix(C.white, C.cold, 0.45), C.white, mix(C.white, C.hot, 0.62)]
  // 只有真的换了主题才重铺底片（防串色）。同主题下挂载、换页都继续用这张——
  if (theme !== sky.theme) {
    sky.theme = theme
    resetPlate() // 两台相机各挂一个 MutationObserver，先跑的那个改 sky.theme、后跑的走早返回
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
  seedVars()
  if (reduced) {
    ensureStaticPlate()
    draw(performance.now())
  }
}

function pickRn() {
  if (Math.random() < RND_R) return 0.02 + Math.random() * 0.97
  let u = Math.random() * BAND_TOT
  for (const b of BANDS) {
    const w = b[1] - b[0]
    if (u <= w) return b[0] + Math.random() * w
    u -= w
  }
  return 1
}

function mkStar() {
  // 星等：多数暗、极少数亮。原来是 0.22 + r^1.7·0.78，中位数就有 0.6，全场一样亮 →
  // 累积成一片没有层次的雾。真实长曝光照片读得出来的正是那几颗亮星的拖痕，所以这里
  // 用更强的幂把分布压向低端，再单独放一撮亮星出来。
  let z = 0.16 + Math.pow(Math.random(), 2.4) * 0.62
  if (Math.random() < 0.07) z *= 2.1
  const rr = Math.random()
  return {
    rn: pickRn(),
    r: 0,
    th: Math.random() * TAU,
    z,
    tier: rr < 0.56 ? 0 : rr < 0.89 ? 1 : 2, // 冷白居多，琥珀最稀
    lw: 0.6 + z * 1.2, // 亮星更粗：亮度之外再给一层尺寸差
    head: z > 0.62, // 亮星才拖"头部亮段"：实测占 14.2%，额外描边数因此受控
    ta: 0.08 + 0.13 * Math.min(1, z), // 闪烁幅度随星等增大（亮星才看得见眨眼）
    tw: 0.3 + Math.random() * 1.3,
    ph: Math.random() * TAU,
    // 尾迹起点偏移（rad）：每颗星从不同角度开始沉积，使弧段截端错落，避免对齐成断口。
    // 分布放宽到 3.4°~23°——弧长差异够大，一眼读得出"每根不一样长"，这是随机感的主力。
    shear: 0.06 + Math.pow(Math.random(), 1.25) * 0.34,
  }
}

function seedStars() {
  if (!sky.maxR) return
  // 星群是天空的属性，不是相机的：底片全站共享后，若次级页只沉积一半星，
  // 那另一半圆弧会在阅读过程中因全局衰减慢慢消失。所以只按视口宽度定一次数。
  const n = innerWidth <= 720 ? N_SMALL : N_BIG
  if (sky.stars && sky.stars.length === n) {
    for (const s of sky.stars) s.r = s.rn * sky.maxR // 数量未变 → 保留状态，仅重算半径
    return
  }
  sky.stars = Array.from({ length: n }, mkStar)
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

/* ---------------- 变星（文章节点） ---------------- */
function seedVars() {
  if (!props.interactive) {
    vars = []
    return
  }
  const n = Math.min(props.posts.length, 8)
  if (vars.length === n) {
    for (const v of vars) v.r = v.rn * sky.maxR
    return
  }
  vars = Array.from({ length: n }, (_, i) => {
    const f = n === 1 ? 0.5 : i / (n - 1)
    return {
      // 上半区扫过（-158°→+8°），避开左下宣言文字
      th: -Math.PI * 0.88 + f * Math.PI * 1.06,
      rn: 0.4 + ((i * 37) % 11) / 10 * 0.3,
      r: 0,
      ph: Math.random() * TAU,
      pulse: 0.9 + Math.random() * 0.5,
      bl: 0, // hover 绽放系数（缓动 0→1）
    }
  })
  for (const v of vars) v.r = v.rn * sky.maxR
}

// 变星与星群同处"天区坐标"（底片空间）；只有 draw() 需要换算回相机盒子
function varXY(v) {
  return [sky.pole.x + Math.cos(v.th) * v.r, sky.pole.y + Math.sin(v.th) * v.r]
}

function varAt(x, y) {
  for (let i = 0; i < vars.length; i++) {
    const [vx, vy] = varXY(vars[i])
    if (Math.hypot(x - vx, y - vy) < 16) return i
  }
  return -1
}

function syncHover() {
  const h = props.interactive ? varAt(px, py) : -1
  hoverIdx = h
  if (h !== lastHover) {
    lastHover = h
    emit('hover', h)
  }
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
function accPass(om, fd, dtS, tAbs, dep) {
  // 逐帧热路径：把 sky 上的对象先绑成局部引用，省掉满屏循环里的重复属性查找
  const a = sky.accCtx
  const acc = sky.acc
  const stars = sky.stars
  const feat = sky.feat
  const { x: polx, y: poly } = sky.pole
  // 衰减 pass：destination-out 均匀削掉底片透明度 → 尾迹长度 = 1/fd
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
      // 尾部消失：① 转满前 20% 平滑收尾（cycle∈[0.8,1]）；② 随机 1-2 根的独立尾部渐隐。
      // 通过削减本帧沉积 alpha → 该星轨迹因全局衰减自然从尾部融化，接近"转满"时不形成致密闭合环。
      const cyc = (((s.th % TAU) + TAU) % TAU) / TAU
      let vk = smooth01((cyc - SETTLE_START) / (1 - SETTLE_START))
      for (let f = 0; f < feat.length; f++) {
        if (feat[f].i !== i) continue
        const p = clamp01((tAbs - feat[f].t0) / FEAT_DUR)
        vk = Math.max(vk, (0.5 - 0.5 * Math.cos(TAU * p)) * 0.6) // 0→0.6→0 的柔和独立渐隐（不整星熄灭，避免环口）
      }
      s.th += dth
      const dthLen = s.shear * boost + dth // 本帧沉积的弧长
      const tw = 1 - s.ta + s.ta * Math.sin(tAbs * s.tw + s.ph)
      const al = Math.min(1, dep * s.z * ab * tw * (1 - vk * SETTLE_DEPTH))
      a.globalAlpha = al
      a.lineWidth = s.lw
      a.beginPath()
      a.arc(polx, poly, s.r, s.th - dthLen, s.th)
      a.stroke()
      // 头部亮段：等亮的长弧只是一根光棒，前沿再叠一笔短而亮的弧才有"自尾向头递增"，
      // 读起来才是一颗正在划过的星。累积稳态的 头/尾 实测 1.3~1.6 倍（HEAD_GAIN 2.6 看着大，
      // 但每帧增量要走完 al/(al+fade) 才显现）——要更突出就同时动 HEAD_GAIN 和这里的 0.22。
      // 只有 14.2% 的星走到这一支，220 星满打满算多约 31 次描边/帧，不是多 220 次。
      if (s.head) {
        a.globalAlpha = Math.min(1, al * HEAD_GAIN)
        a.lineWidth = s.lw * 0.72
        a.beginPath()
        a.arc(polx, poly, s.r, s.th - dthLen * 0.22, s.th)
        a.stroke()
      }
    }
  }

  // 变星：随天刚体旋转，并在底片上留下更亮的朱砂/暖白轨迹
  if (vars.length) {
    a.strokeStyle = rgba(C.boost ? C.hot : mix(C.white, C.cold, 0.3), 1)
    a.lineWidth = 1.7
    for (const v of vars) {
      const dth = om * dtS
      v.th += dth
      a.globalAlpha = Math.min(1, dep * 2.4)
      a.beginPath()
      a.arc(polx, poly, v.r, v.th - (SMEAR + dth), v.th)
      a.stroke()
    }
  }
  a.globalAlpha = 1
}

// reduced-motion：一次性快进生成静态长曝光底片，不启动 rAF
function buildPlate() {
  if (!sky.accCtx) return
  resetPlate()
  const dtS = 1 / 60
  for (let i = 0; i < PLATE_STEPS; i++) accPass(PLATE_OM, PLATE_FADE, dtS, i * dtS, DEP * (C.boost ? 1.5 : 1))
}

/* ---------------- 流星 ---------------- */
function spawnMeteor(delay) {
  if (meteors.length > 8) return
  const dir = Math.random() < 0.5 ? 1 : -1 // 右下 / 左下入射
  const sx = dir > 0 ? Math.random() * W * 0.7 : W - Math.random() * W * 0.7
  const sy = Math.random() * H * 0.34
  const a = (dir > 0 ? 0.42 : Math.PI - 0.42) + (Math.random() - 0.5) * 0.24
  const sp = 820 + Math.random() * 520
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
  // 代价：非主人自己那份变星角度这 260ms 不推进，而它正在淡出，看不出来。
  if (ownsPlate(self)) {
    // 独立尾部消失：定时随机挑 1-3 根，周期独立、与整体旋转周期量级协调
    if (now > sky.featNext && sky.stars.length) {
      pickFeat(tSec)
      sky.featNext = now + FEAT_MIN + Math.random() * (FEAT_MAX - FEAT_MIN)
    }
    if (sky.feat.length) sky.feat = sky.feat.filter((f) => tSec - f.t0 < FEAT_DUR + 0.6)
    const dep = DEP * (C.boost ? 1.5 : 1) * (props.interactive ? 1 : 0.75)
    accPass(OMEGA * flow, fade * (C.boost ? 1.4 : 1) * step, dt / 1000, tSec, dep)
  }
  if (props.interactive) {
    const bk = 1 - Math.pow(0.93, step) // 绽放缓动（约 0.2s 半程）
    for (let i = 0; i < vars.length; i++) {
      const v = vars[i]
      v.bl += ((i === hoverIdx ? 1 : 0) - v.bl) * bk
    }
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

// 衍射星芒绘制（变星 / 流星共用）：柔晕 + 锥形芒，随脉动/绽放呼吸；rot 可让芒随方向旋转
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
  // 光晕：深空主题两层辉光（近芯亮、外缘渐隐）；纸面干版忌糊不带光晕
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
  // 星核 + 内芯高光（深空主题加点白芯提亮）
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
  const t = (now - sky.t0) / 1000
  if (props.interactive) syncHover()

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
    const tx = x - m.vx * 0.14
    const ty = y - m.vy * 0.14
    const env = Math.sin(Math.PI * age)
    const head = C.boost ? C.hot : C.white
    const tail = C.boost ? mix(C.ink, C.hot, 0.4) : C.cold
    const g = ctx.createLinearGradient(tx, ty, x, y)
    g.addColorStop(0, rgba(tail, 0))
    g.addColorStop(0.72, rgba(tail, 0.3 * env))
    g.addColorStop(1, rgba(head, 0.85 * env))
    ctx.strokeStyle = g
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(tx, ty)
    ctx.lineTo(x, y)
    ctx.stroke()
    // 亮头：与变星同款的衍射星芒，随飞行方向旋转
    const rot = Math.atan2(m.vy, m.vx)
    drawStar(x, y, { halo: C.boost ? C.hot : C.cold, core: head, pu: 0.9, bl: 0.4, alpha: env, rot })
  }

  /* --- 变星（文章节点） --- */
  const halo = C.boost ? C.hot : C.cold
  const core = C.boost ? C.ink : C.white
  const kx = W / sky.w // 天区→相机的缩放（盒子等于视口时为 1）
  const ky = H / sky.h
  for (let i = 0; i < vars.length; i++) {
    const v = vars[i]
    const [vx, vy] = varXY(v)
    const x = vx * kx
    const y = vy * ky
    const pu = 0.62 + 0.38 * Math.sin(t * v.pulse + v.ph) // 温和呼吸
    const bl = reduced ? (i === hoverIdx ? 1 : 0) : v.bl // 绽放系数（reduced 下二值直开）
    const rot = t * 0.22 + v.ph // 衍射芒缓慢自转
    drawStar(x, y, { halo, core, pu, bl, rot, alpha: 1 })
  }
  if (cvs.value) cvs.value.style.cursor = hoverIdx >= 0 ? 'pointer' : ''

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
// 指针要落回"天区坐标"：膨胀半径、变星命中判定的那一侧都是底片空间
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

function onUp(e) {
  if (!props.interactive) return
  const p = toSky(e.clientX, e.clientY)
  if (!p) return
  const hit = varAt(p[0], p[1])
  if (hit >= 0) emit('select', props.posts[hit])
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

watch(
  () => props.posts.length,
  () => {
    seedVars()
    if (reduced) draw(performance.now())
  },
)

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
  } else kick()
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
    @pointerup="onUp"
    @pointercancel="onUp"
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
