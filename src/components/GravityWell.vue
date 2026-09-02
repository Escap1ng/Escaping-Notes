<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { content } from '../lib/content.js'

const router = useRouter()

// 逃逸坐标：at = 爬升进度点亮阈值；位置为视口百分比
const NAV = [
  { to: '/blog', label: '文章', code: '01', x: 12, y: 38, at: 0.1 },
  { to: '/updates', label: '动态', code: '02', x: 27, y: 24, at: 0.24 },
  { to: '/records', label: '歌单', code: '03', x: 42, y: 36, at: 0.38 },
  { to: '/projects', label: '项目', code: '04', x: 57, y: 22, at: 0.52 },
  // anchor:'r' = 右锚定位，避免移动端左定位剩余宽度不足导致换行/圆点压缩
  { to: '/wall', label: '留言', code: '05', x: 72, y: 34, at: 0.66, anchor: 'r' },
  { to: '/about', label: '关于', code: '06', x: 87, y: 24, at: 0.8, anchor: 'r' },
]

const trackRef = ref(null)
const canvasRef = ref(null)
const clockRef = ref(null)
const progress = ref(0)

// 仪表读数：海拔随爬升推进
const alt = computed(() => String(Math.round(progress.value * 11200)).padStart(5, '0'))
// 逃逸提示透明度：松手后约 3s 隐去（charge 8s 回落映射），平方根缓动
const escOpacity = computed(() => Math.sqrt(Math.max(0, (charge.value - 0.625) / 0.375)))

// 蓄能：长按 ≥800ms 起充，VEL 逼近 11.2；松开缓慢回落
const charge = ref(0)
const charged = ref(false)
let pressing = false
let chargeStart = 0

const vel = computed(() => {
  const base = 2 + progress.value * 9.2
  return (base + charge.value * (11.2 - base)).toFixed(1)
})

let downAt = 0
let downX = 0
let downY = 0

// 满蓄能奖励：逃逸粒子/涟漪/逃逸痕；低语改为环境随机浮现
const whispersActive = ref([])
let wid = 0
let pressX = 0
let pressY = 0
const whisperTimers = []
let whisperLoop = 0
const fired = ref(false)
let tapOk = false
let rippleStart = 0
const escapers = []
const traces = []

// 低语实例：定点缓慢浮现/消逝
function pushWhisper(text, life, x, y) {
  const inst = { id: ++wid, x, y, text, life }
  whispersActive.value.push(inst)
  whisperTimers.push(
    setTimeout(() => {
      whispersActive.value = whispersActive.value.filter((w) => w.id !== inst.id)
    }, life)
  )
}

// 环境低语：随机落点、与现存句保持间距、文字不重复、屏上最多 4 句
function spawnWhisper() {
  if (reduced || !W) return
  if (whispersActive.value.length >= 4) return
  const list = content.whispers || []
  const busy = new Set(whispersActive.value.map((w) => w.text))
  const pool = list.filter((t) => !busy.has(t))
  if (!pool.length) return
  const text = pool[Math.floor(Math.random() * pool.length)]
  const gap = Math.min(240, Math.max(140, Math.min(W, H) * 0.3))
  // 低语按文字宽度估算渲染矩形（居中、位于 y 上方），与按键矩形做碰撞检测
  const halfW = (text.length * 15) / 2
  const M = 24 // 安全边距
  const navRects = NAV.map((n) => {
    const px = ((n.anchor === 'r' ? 100 - n.x : n.x) * W) / 100
    const py = (n.y * H) / 100
    const bw = 96 // 按键宽估算：圆点+编号+文字
    return n.anchor === 'r'
      ? { l: px - bw, r: px, t: py - 12, b: py + 16 }
      : { l: px, r: px + bw, t: py - 12, b: py + 16 }
  })
  let x = W / 2
  let y = H / 2
  for (let i = 0; i < 16; i++) {
    x = W * (0.2 + Math.random() * 0.6)
    y = H * (0.18 + Math.random() * 0.62)
    const wr = { l: x - halfW, r: x + halfW, t: y - 44, b: y - 4 }
    const farWhisper = whispersActive.value.every((w) => Math.hypot(w.x - x, w.y - y) > gap)
    const clearNav = navRects.every(
      (r) => wr.l > r.r + M || wr.r < r.l - M || wr.t > r.b + M || wr.b < r.t - M
    )
    if (farWhisper && clearNav) break
  }
  pushWhisper(text, 4600, x, y)
}

function startWhisperLoop() {
  whisperLoop = setTimeout(() => {
    spawnWhisper()
    startWhisperLoop()
  }, 2000 + Math.random() * 2000)
}

// 轻点 = 自按压点下方发射一颗流星
function fireTapMeteor() {
  if (reduced) return
  const dir = Math.random() < 0.5 ? -1 : 1
  escapers.push({
    x: Math.max(20, Math.min(W - 20, pressX + (Math.random() - 0.5) * 60)),
    y: H - 10 - Math.random() * 20,
    v: 1.2 + Math.random() * 0.6,
    acc: 1.01 + Math.random() * 0.008,
    vx: dir * (0.3 + Math.random() * 0.4),
    r: 1.6 + Math.random() * 1.2,
    trail: [],
  })
}

function fireEscape() {
  if (!reduced) {
    // 逃逸达成：自按压点附近涌起一轮快速流星雨（比共振流星更快，逃逸感更强）
    const dir = Math.random() < 0.5 ? -1 : 1
    const xs = []
    let spawned = 0
    const tick = () => {
      if (++spawned > 7) {
        // 主粒发射完毕后，叠加一轮共振式慢速流星雨，层次更丰富
        burstTimers.push(setTimeout(resonanceShower, 0))
        return
      }
      let x = pressX
      for (let tries = 0; tries < 8; tries++) {
        x = Math.max(20, Math.min(W - 20, pressX + (Math.random() - 0.5) * W * 0.5))
        if (xs.every((o) => Math.abs(o - x) > 50)) break
      }
      xs.push(x)
      escapers.push({
        x,
        y: H - 10 - Math.random() * 20,
        v: 2 + Math.random() * 1.2,
        acc: 1.02 + Math.random() * 0.01,
        vx: dir * (0.4 + Math.random() * 0.6),
        r: 2 + Math.random() * 1.5,
        trail: [],
      })
      burstTimers.push(setTimeout(tick, 90 + Math.random() * 90))
    }
    tick()
    rippleStart = performance.now()
  }
  navigator.vibrate?.(30)
}

function onDown(e) {
  downAt = performance.now()
  downX = e.clientX
  downY = e.clientY
  // 记录按压位置（相对装置容器），供本次蓄能的低语定点
  const r = e.currentTarget.getBoundingClientRect()
  pressX = e.clientX - r.left
  pressY = e.clientY - r.top
  fired.value = false
  // 轻点候选：点导航坐标不触发低语
  tapOk = !e.target.closest('a')
  // 再次长按：打断回落，从当前值续充（无突变）；充/放逐帧平滑计算，见 frame()
  chargeStart = charge.value
  pressing = true
}

// 位移>10px 视为滚动意图，取消蓄能与轻点（触摸滚动不误触发）
function onPtrMove(e) {
  if (Math.hypot(e.clientX - downX, e.clientY - downY) > 10) {
    tapOk = false
    onUp()
  }
}

// 离开/取消视为放弃，不触发轻点低语
function onLeaveCancel() {
  tapOk = false
  onUp()
}

function onUp() {
  const held = performance.now() - downAt
  // 轻点（<800ms 且未位移、未点链接）= 一句低语，与长按发射分层
  if (tapOk && !fired.value && held < 800) {
    navigator.vibrate?.(10)
    fireTapMeteor()
  }
  tapOk = false
  pressing = false // 松手后由 frame() 逐帧 10s 平滑回落
}

// 坐标点击：先碎裂后入轨——文字像素采样成琥珀碎片炸开，0.3s 后跳转
const shards = []
let offCtx = null

// 将链接文字按原字体原位置离屏渲染，逐点采样生成碎片（文字破碎本体）
function textShards(a, x0, y0) {
  const w = Math.ceil(a.offsetWidth)
  const h = Math.ceil(a.offsetHeight)
  if (w < 4 || h < 4) return
  if (!offCtx) offCtx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  const c = offCtx.canvas
  c.width = w
  c.height = h
  offCtx.clearRect(0, 0, w, h)
  offCtx.fillStyle = '#fff'
  offCtx.textBaseline = 'top'
  const ar = a.getBoundingClientRect()
  for (const el of [a.querySelector('.code'), a.querySelector('.label')]) {
    if (!el) continue
    const r = el.getBoundingClientRect()
    offCtx.font = getComputedStyle(el).font
    offCtx.fillText(el.textContent, r.left - ar.left, r.top - ar.top)
  }
  const data = offCtx.getImageData(0, 0, w, h).data
  for (let py = 0; py < h; py += 2) {
    for (let px = 0; px < w; px += 2) {
      if (data[(py * w + px) * 4 + 3] > 100) {
        const dx = px - w / 2
        const dy = py - h / 2
        shards.push({
          x: x0 + px,
          y: y0 + py,
          vx: dx * 0.14 + (Math.random() - 0.5) * 3,
          vy: dy * 0.14 + (Math.random() - 0.5) * 3,
          life: 1,
          r: 1.1,
        })
      }
    }
  }
}

function onNavClick(e) {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return // 保留新标签等原生行为
  const a = e.target.closest('a')
  const n = a && NAV.find((x) => a.getAttribute('href') === x.to)
  if (!n) return
  if (reduced || !canvasRef.value) return
  e.preventDefault() // 拦住 RouterLink，碎裂播完再走
  const crect = canvasRef.value.getBoundingClientRect()
  const ar = a.getBoundingClientRect()
  textShards(a, ar.left - crect.left, ar.top - crect.top)
  a.classList.add('coord-hide')
  setTimeout(() => a.classList.remove('coord-hide'), 900)
  // 火花点缀点击中心，大范围炸开
  const x = e.clientX - crect.left
  const y = e.clientY - crect.top
  for (let i = 0; i < 12; i++) {
    const ang = Math.random() * Math.PI * 2
    const sp = 2 + Math.random() * 3.5
    shards.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 1, r: 1.5 + Math.random() * 1.5 })
  }
  setTimeout(() => router.push(n.to), 300)
}

// 共振：三连点 logo → 2s 内持续发射流星（不快于主粒、彼此不靠近）
const burstTimers = []
function onResonance() {
  resonanceShower()
}

// 慢速平行阵雨：共振三连点与逃逸达成后的叠加层共用
function resonanceShower() {
  if (reduced) return
  rippleStart = performance.now()
  const xs = []
  let spawned = 0
  const dir = Math.random() < 0.5 ? -1 : 1 // 本轮统一倾斜方向，成平行阵雨
  const tick = () => {
    if (++spawned > 10) return
    // 随机落点，但与本轮已发粒子保持 ≥60px 间距
    let x = W / 2
    for (let tries = 0; tries < 8; tries++) {
      x = 20 + Math.random() * (W - 40)
      if (xs.every((o) => Math.abs(o - x) > 60)) break
    }
    xs.push(x)
    escapers.push({
      x,
      y: H - 10 - Math.random() * 20,
      v: 0.9 + Math.random() * 0.6, // 慢速流星，个体随机
      acc: 1.008 + Math.random() * 0.008,
      vx: dir * (0.25 + Math.random() * 0.5),
      r: 1.6 + Math.random() * 1.2,
      trail: [],
    })
    burstTimers.push(setTimeout(tick, 160 + Math.random() * 120))
  }
  tick()
}

let ctx = null
let W = 0
let H = 0
let raf = 0
let particles = []
let colors = { line: 'rgba(216,226,240,.14)', dim: '#98a3b7', signal: '#ffb454' }
let mx = -1e4
let my = -1e4
let cx = -1e4
let cy = -1e4
let reduced = false
let visible = true
let clockTimer = 0
let observer = null

function rgbOf(c) {
  if (c[0] === '#') {
    const n = parseInt(c.slice(1), 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  const m = c.match(/\d+/g)
  return m ? [m[0] | 0, m[1] | 0, m[2] | 0] : [152, 163, 183]
}

// 颜色统一读 CSS 变量：井底/井外双主题零额外成本
function readColors() {
  const cs = getComputedStyle(document.documentElement)
  colors = {
    line: cs.getPropertyValue('--line').trim() || colors.line,
    dim: cs.getPropertyValue('--text-1').trim() || colors.dim,
    signal: cs.getPropertyValue('--signal-canvas').trim() || colors.signal,
  }
  colors.dimRGB = rgbOf(colors.dim)
  colors.sigRGB = rgbOf(colors.signal)
  // 井外纸面：点亮粒子更实更大，补偿浅色背景对比
  colors.boost = document.documentElement.getAttribute('data-theme') === 'out' ? 1 : 0
  if (reduced) draw(0)
}

function spawn(anywhere) {
  return {
    x: Math.random() * W,
    y: anywhere ? Math.random() * H : H + 20,
    z: 0.3 + Math.random() * 0.7, // 深度层：视差与亮度
    seed: Math.random() * 1000,
    curve: (Math.random() - 0.5) * 90,
    v: 0.018 + Math.random() * 0.028,
    born: performance.now(), // 丝线淡入起点
  }
}

function resize() {
  const canvas = canvasRef.value
  if (!canvas) return
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  W = canvas.clientWidth
  H = canvas.clientHeight
  canvas.width = Math.round(W * dpr)
  canvas.height = Math.round(H * dpr)
  ctx = canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  // 粒子数随面积缩放：桌面≈180 / 移动≈90
  // resize（如移动端地址栏收放）保留既有粒子，只增减数量，避免整片星场瞬移闪烁
  const count = Math.max(60, Math.min(180, Math.round((W * H) / 9000)))
  if (!particles.length) {
    particles = Array.from({ length: count }, () => spawn(true))
  } else {
    while (particles.length < count) particles.push(spawn(true))
    if (particles.length > count) particles.length = count
  }
  if (reduced) draw(0)
}

function onScroll() {
  const r = trackRef.value.getBoundingClientRect()
  const total = r.height - window.innerHeight
  progress.value = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0
  if (reduced) draw(0) // 静态轨迹图随滚动换帧
}

// de Casteljau：只画二次贝塞尔的 lp 进度段（坐标连线逐步生长）
function partialQuad(x0, y0, x1, y1, x2, y2, lp) {
  const p1x = x0 + (x1 - x0) * lp
  const p1y = y0 + (y1 - y0) * lp
  const bx = (1 - lp) * (1 - lp) * x0 + 2 * (1 - lp) * lp * x1 + lp * lp * x2
  const by = (1 - lp) * (1 - lp) * y0 + 2 * (1 - lp) * lp * y1 + lp * lp * y2
  ctx.moveTo(x0, y0)
  ctx.quadraticCurveTo(p1x, p1y, bx, by)
}

// step=帧时长系数（dt/16.7）：高刷屏 rAF 更快时按时间归一，粒子速度恒定
function draw(t, step = 1) {
  if (!ctx) return
  ctx.clearRect(0, 0, W, H)
  const p = progress.value

  // 井口：三道同心弧，随爬升下沉；初始（未爬升）完全隐藏，起步后淡入
  const sink = p * H * 0.45
  const wellIn = Math.min(1, p / 0.06)
  ctx.strokeStyle = colors.line
  for (let i = 1; i <= 3; i++) {
    ctx.globalAlpha = (0.55 - i * 0.14) * wellIn
    ctx.beginPath()
    ctx.arc(W / 2, H + 70 + sink, 70 * i, Math.PI, Math.PI * 2)
    ctx.stroke()
  }

  // 光标=干扰引力：弹簧阻尼跟随（帧率归一）
  const spring = 1 - Math.pow(0.88, step)
  cx += (mx - cx) * spring
  cy += (my - cy) * spring
  const R = 150

  // 涟漪：逃逸发生后 900ms 内轨迹轻微扰动
  let ripple = 0
  if (rippleStart) {
    const rdt = t - rippleStart
    if (rdt < 900) ripple = 1 - rdt / 900
  }

  for (const pt of particles) {
    if (!reduced) {
      // 挣扎感上升：慢-快-慢 + 个体相位；蓄能加速
      const phase = pt.seed
      const struggle = 0.55 + 0.9 * Math.abs(Math.sin(t * 0.0006 * (0.5 + pt.z) + phase))
      pt.y -= pt.v * struggle * 16 * step * (0.5 + pt.z) * (1 + charge.value * 7.4)
      if (pt.y < -20) Object.assign(pt, spawn(false))
    }
    const jx = Math.sin(t * 0.001 + pt.seed) * 5 * pt.z
    const py0 = pt.y

    // 轨迹=意图路径：三次贝塞尔，双控制点各自低频摆动（seed 定相位，随机且连续）
    const cX = pt.x + pt.curve
    const cY = H * 0.5
    let bend = 0
    const dcx = cX - cx
    const dcy = cY - cy
    const dc = Math.hypot(dcx, dcy)
    if (dc < R * 1.4 && dc > 0.001) bend = -(dcx / dc) * (1 - dc / (R * 1.4)) * 70
    const wob1 = Math.sin(t * 0.00035 + pt.seed) * 12 * pt.z
    const wob2 = Math.sin(t * 0.00028 + pt.seed * 1.7 + 2) * 16 * pt.z
    // 丝线随生命周期淡入（重生后 1.2s）淡出（临近顶部），避免突然闪现
    const fadeIn = reduced ? 1 : Math.min(1, (t - pt.born) / 1200)
    const fadeOut = Math.min(1, Math.max(0, pt.y / (H * 0.2)))
    ctx.strokeStyle = colors.line
    // 轨迹线透明度与 --line 相乘：移动端可见、井底不过亮
    ctx.globalAlpha = (0.12 + 0.14 * pt.z) * fadeIn * fadeOut
    ctx.beginPath()
    ctx.moveTo(pt.x, H + 10)
    ctx.bezierCurveTo(
      pt.x + pt.curve * 0.6 + wob1 + bend, H * 0.66,
      pt.x + pt.curve * 1.2 + wob2 + bend, H * 0.33,
      pt.x + pt.curve * 1.8, -10
    )
    ctx.stroke()

    // 粒子：被光标吸引、点亮
    let f = 0
    let px = pt.x + jx
    let py = py0
    const dx = px - cx
    const dy = py - cy
    const d = Math.hypot(dx, dy)
    if (d < R && d > 0.001 && !reduced) {
      f = 1 - d / R
      px -= (dx / d) * f * 26
      py -= (dy / d) * f * 26
    }
    if (ripple) px += Math.sin(t * 0.02 + pt.seed) * 3 * ripple
    ctx.globalAlpha = Math.min(1, 0.25 + 0.5 * pt.z + f * (0.5 + 0.5 * colors.boost) + charge.value * 0.3)
    // 颜色随引力强度 steep-smoothstep 过渡（灰→琥珀）：连续不闪烁，但快速点满琥珀
    const kr = Math.min(1, Math.max(0, (f - 0.1) / 0.22))
    const k = kr * kr * (3 - 2 * kr)
    const dC = colors.dimRGB
    const sC = colors.sigRGB
    ctx.fillStyle = `rgb(${Math.round(dC[0] + (sC[0] - dC[0]) * k)},${Math.round(
      dC[1] + (sC[1] - dC[1]) * k
    )},${Math.round(dC[2] + (sC[2] - dC[2]) * k)})`
    ctx.beginPath()
    ctx.arc(px, py, 0.8 + 1.5 * pt.z + f * (1.3 + 0.9 * colors.boost), 0, Math.PI * 2)
    ctx.fill()
  }

  // 逃逸痕：本次会话内保留的极淡竖线
  ctx.strokeStyle = colors.line
  ctx.globalAlpha = 0.1
  for (const tr of traces) {
    ctx.beginPath()
    ctx.moveTo(tr.x, 0)
    ctx.lineTo(tr.x, H)
    ctx.stroke()
  }

  // 逃逸粒子：加速上升 + 拖尾（加长加亮，带微光晕）
  for (let i = escapers.length - 1; i >= 0; i--) {
    const es = escapers[i]
    es.v *= Math.pow(es.acc || 1.03, step) // 起步慢、逐渐加速冲出井口（流星用更低系数）
    es.y -= es.v * step
    es.x += (es.vx || 0) * step // 流星横向漂移，拖尾成斜线
    es.trail.push({ x: es.x, y: es.y })
    if (es.trail.length > 60) es.trail.shift()
    ctx.strokeStyle = colors.signal
    ctx.lineWidth = 1.6
    for (let j = 1; j < es.trail.length; j++) {
      ctx.globalAlpha = (j / es.trail.length) * 0.9
      ctx.beginPath()
      ctx.moveTo(es.trail[j - 1].x, es.trail[j - 1].y)
      ctx.lineTo(es.trail[j].x, es.trail[j].y)
      ctx.stroke()
    }
    ctx.lineWidth = 1
    ctx.globalAlpha = 0.45
    ctx.fillStyle = colors.signal
    ctx.beginPath()
    ctx.arc(es.x, es.y, es.r * 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.beginPath()
    ctx.arc(es.x, es.y, es.r, 0, Math.PI * 2)
    ctx.fill()
    if (es.y < -60) {
      traces.push({ x: es.x })
      if (traces.length > 5) traces.shift()
      escapers.splice(i, 1)
    }
  }

  // 碎裂粒子：四散 + 阻尼 + 淡出
  ctx.fillStyle = colors.signal
  for (let i = shards.length - 1; i >= 0; i--) {
    const s = shards[i]
    s.x += s.vx * step * 2
    s.y += s.vy * step * 2
    const drag = Math.pow(0.92, step)
    s.vx *= drag
    s.vy *= drag
    s.life -= 0.018 * step
    if (s.life <= 0) {
      shards.splice(i, 1)
      continue
    }
    ctx.globalAlpha = s.life
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.r * s.life, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  // 逃逸坐标连线：随爬升进度分段生长；起点不早于 0.02，初始不露线
  for (const n of NAV) {
    const lp = Math.min(1, Math.max(0, (p - Math.max(0.02, n.at - 0.14)) / 0.14))
    if (lp <= 0) continue
    const lx = (n.x / 100) * W
    const ly = (n.y / 100) * H
    ctx.strokeStyle = colors.signal
    ctx.globalAlpha = p >= n.at ? 0.5 : 0.15 + 0.3 * lp
    ctx.beginPath()
    partialQuad(W / 2, H + 40, (W / 2 + lx) / 2 + 50, (H + ly) / 2, lx, ly, lp)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

let lastT = 0
function frame(t) {
  raf = requestAnimationFrame(frame)
  if (!visible) return
  const r = trackRef.value.getBoundingClientRect()
  if (r.bottom < 0) return // 滚过装置后停绘，省 CPU
  const dt = lastT ? Math.min(50, Math.max(0, t - lastT)) : 16.7
  lastT = t
  // 充/放逐帧连续计算（dt 归一），消除离散定时步进的顿挫感
  if (pressing) {
    const held = performance.now() - downAt
    const ramp = Math.min(1, Math.max(0, (held - 800) / 1075))
    charge.value = chargeStart + (1 - chargeStart) * ramp
    if (!fired.value && charge.value > 0.97) {
      fired.value = true
      fireEscape()
    }
  } else if (charge.value > 0) {
    charge.value = Math.max(0, charge.value - dt / 8000) // 松手 8s 滑回 0
  }
  charged.value = charge.value > 0.97
  draw(t, dt / 16.7)
}

function onMove(e) {
  mx = e.clientX
  my = e.clientY
}
function onTouch(e) {
  const t0 = e.touches[0]
  if (t0) {
    mx = t0.clientX
    my = t0.clientY
  }
}
function onLeave() {
  mx = my = -1e4
}
function onVis() {
  visible = !document.hidden
}

onMounted(() => {
  reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  readColors()
  resize()
  onScroll()

  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', resize)
  window.addEventListener('en-resonance', onResonance)
  document.addEventListener('visibilitychange', onVis)
  const canvas = canvasRef.value
  if (!reduced) {
    window.addEventListener('mousemove', onMove, { passive: true })
    canvas.addEventListener('touchmove', onTouch, { passive: true })
    canvas.addEventListener('touchend', onLeave)
    canvas.addEventListener('mouseleave', onLeave)
  }

  // 主题切换 → 重新取色
  observer = new MutationObserver(readColors)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

  const tick = () => {
    const d = new Date()
    const q = (n) => String(n).padStart(2, '0')
    // 直写 DOM，避免每秒重渲染整视图（out-in 转场对此敏感）
    if (clockRef.value)
      clockRef.value.textContent = `TIM ${q(d.getHours())}:${q(d.getMinutes())}:${q(d.getSeconds())}`
  }
  tick()
  clockTimer = setInterval(tick, 1000)

  if (!reduced) {
    raf = requestAnimationFrame(frame)
    spawnWhisper()
    // 开场第二句错时落点，形成错落感
    whisperTimers.push(setTimeout(spawnWhisper, 1400))
    startWhisperLoop()
  }
})

onUnmounted(() => {
  cancelAnimationFrame(raf)
  clearInterval(clockTimer)
  clearTimeout(whisperLoop)
  whisperTimers.forEach(clearTimeout)
  burstTimers.forEach(clearTimeout)
  if (observer) observer.disconnect()
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', resize)
  window.removeEventListener('mousemove', onMove)
  window.removeEventListener('en-resonance', onResonance)
  document.removeEventListener('visibilitychange', onVis)
  const canvas = canvasRef.value
  if (canvas) {
    canvas.removeEventListener('touchmove', onTouch)
    canvas.removeEventListener('touchend', onLeave)
    canvas.removeEventListener('mouseleave', onLeave)
  }
})
</script>

<template>
  <div ref="trackRef" class="well-track">
    <div
      class="well-sticky"
      @pointerdown="onDown"
      @pointermove="onPtrMove"
      @pointerup="onUp"
      @pointerleave="onLeaveCancel"
      @pointercancel="onLeaveCancel"
    >
      <canvas ref="canvasRef" class="well-canvas" aria-hidden="true"></canvas>

      <div class="readout well-readout">
        <span>LOC {{ content.site.coords }}</span>
        <span ref="clockRef">TIM --:--:--</span>
        <span>VEL {{ vel }}</span>
        <span>ALT {{ alt }} M</span>
        <span v-if="fired && charge > 0.625" class="esc-msg" :style="{ opacity: escOpacity }">已达到逃逸速度 VEL 11.2</span>
      </div>

      <div
        v-for="w in whispersActive"
        :key="w.id"
        class="charge-panel"
        :style="{ left: w.x + 'px', top: w.y + 'px', animationDuration: w.life + 'ms' }"
        aria-hidden="true"
      >
        <p class="readout charge-line">{{ w.text }}</p>
      </div>

      <nav class="well-nav" aria-label="逃逸坐标" @click.capture="onNavClick">
        <RouterLink
          v-for="n in NAV"
          :key="n.code"
          :to="n.to"
          class="readout well-coord"
          :class="{ lit: progress >= n.at, 'coord-r': n.anchor === 'r' }"
          :style="
            n.anchor === 'r'
              ? { right: 100 - n.x + '%', top: n.y + '%' }
              : { left: n.x + '%', top: n.y + '%' }
          "
        >
          <i class="dot" aria-hidden="true"></i><span class="code">{{ n.code }}</span
          ><span class="label">{{ n.label }}</span>
        </RouterLink>
      </nav>

      <div class="well-title">
        <h1>{{ content.site.name }}</h1>
        <p>{{ content.site.subtitle }}</p>
      </div>

      <div class="well-cue" :class="{ gone: progress > 0.02 }" aria-hidden="true">
        <span class="readout">SCROLL = 爬升</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.well-track {
  position: relative;
  height: 260vh;
}

.well-sticky {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: hidden;
  /* 点击/拖动玩引力干扰时不出现文本光标与选区 */
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

.well-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

.well-readout {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--line);
}

/* 逃逸达成提示：读数栏下方居中，琥珀色，透明度随 VEL 回落淡出 */
.esc-msg {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: var(--space-2);
  text-align: center;
  color: var(--signal);
  letter-spacing: 0.2em;
  text-shadow: 0 0 12px var(--ink-0);
  pointer-events: none;
}

/* 低语环境化：随机落点浮现，缓慢淡入淡出 */
.charge-panel {
  position: absolute;
  transform: translate(-50%, -130%);
  text-align: center;
  max-width: 76vw;
  pointer-events: none;
  animation: whisper-life 2.6s ease forwards;
}

/* 缓慢浮现 + 极慢上飘 + 缓慢消逝 */
@keyframes whisper-life {
  0% { opacity: 0; transform: translate(-50%, -122%); }
  30% { opacity: 1; }
  70% { opacity: 1; }
  100% { opacity: 0; transform: translate(-50%, -140%); }
}

@media (prefers-reduced-motion: reduce) {
  .charge-panel {
    animation: none;
    opacity: 1;
  }
}

/* 井外纸面：去掉浅色光晕，避免琥珀被亮晕冲淡发虚 */
:root[data-theme='out'] .charge-line,
:root[data-theme='out'] .esc-msg {
  text-shadow: none;
}

.charge-line {
  color: var(--signal);
  letter-spacing: 0.2em;
  text-shadow: 0 0 12px var(--ink-0);
}

.well-nav {
  position: absolute;
  inset: 0;
}

.well-coord {
  position: absolute;
  transform: translate(-50%, -50%);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  font-size: 16px;
  color: var(--text-1);
  transition: color 0.3s;
  white-space: nowrap;
}

.well-coord .dot {
  flex-shrink: 0;
}

.coord-r {
  transform: translate(50%, -50%);
}

.well-coord .dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: currentColor;
}

/* 编号等宽、标签黑体微字距，三段间距由 flex gap 统一 */
.well-coord .label {
  font-family: var(--font-sans);
  letter-spacing: 0.14em;
}

.well-coord:hover,
.well-coord.lit {
  color: var(--signal);
}

/* 碎裂期间隐藏 DOM 文字，由画布碎片接管 */
.coord-hide {
  visibility: hidden;
}

.well-title {
  position: absolute;
  left: var(--space-3);
  bottom: var(--space-4);
  pointer-events: none;
}

.well-title h1 {
  margin: 0;
  font-family: var(--font-serif);
  font-size: clamp(40px, 8vw, 88px);
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: 0.02em;
}

.well-title p {
  margin: var(--space-1) 0 0;
  color: var(--text-1);
}

/* 仪器式下坠提示：开始爬升后淡出 */
.well-cue {
  position: absolute;
  right: var(--space-3);
  bottom: var(--space-2);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  transition: opacity 0.6s;
  pointer-events: none;
}

.well-cue.gone {
  opacity: 0;
}



@media (max-width: 720px) {
  .well-track {
    height: 220vh;
  }
  .well-coord {
    font-size: 15px;
  }
}
</style>
