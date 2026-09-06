<script setup>
// BlackHole · 引力透镜黑洞装置（渲染管线 v2）
// 视觉目标：连续发光的吸积盘（而非点状草图）+ 贴合阴影的透镜环带 + 正确遮挡。
// 管线：
//   L  离屏：光晕 + 透镜环带（随倾角分桶重建）
//   D1..D3 离屏：差旋三层盘纹理（resize/主题时重建，帧内只做旋转投影）
//   F  离屏：当帧盘合成 + 屏幕空间多普勒染色（每帧重建，成本低）
//   主画布：星场 → L → 盘后半(clip 上半) → 阴影+光子环 → 盘前半(clip 下半) → 轨道节点
// 环的方向/角度不随鼠标；倾角只由滚轮（滚动深度）开合。
// 工程约定：DPR≤2、rAF 单循环、visibilitychange 暂停、reduced-motion 静态单帧、颜色读 CSS 变量。
import { onMounted, onUnmounted, ref } from 'vue'

const props = defineProps({
  interactive: { type: Boolean, default: false },
  posts: { type: Array, default: () => [] },
})
const emit = defineEmits(['hover', 'select'])

const cvs = ref(null)
const TAU = Math.PI * 2

let ctx = null
let W = 0
let H = 0
let reduced = false
let raf = 0
let last = 0
let visible = true
let t0 = 0

// 盘心：首页偏右上给宣言让位；其余页居中偏上
let ccx = 0
let ccy = 0

// 姿态：固定偏航投影；倾角仅由滚动开合
let tilt = 0.62
let tiltTarget = 0.62
let tiltBucket = -1

// 差旋三层自转角
let spin = [0, 0, 0]
const SPIN_V = [0.34, 0.19, 0.1]

let stars = []
let hoverIdx = -1
let lastHover = -2
let ripple = null
let px = 0
let py = 0
let pxT = 0
let pyT = 0

// 离屏层
let L = null // { cv, s }
let D = [] // [{ cv, s, r0, r1 }]
let F = null // { cv, w, h }
let starSprite = null // 星光辉光精灵（保留旧版柔光手感）

// 颜色
const C = { cold: [142, 201, 255], hot: [255, 92, 57], white: [255, 247, 237], hole: [2, 2, 4], boost: 0 }
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

function readColors() {
  const cs = getComputedStyle(document.documentElement)
  const get = (n, fb) => hex2rgb(cs.getPropertyValue(n).trim()) || fb
  C.cold = get('--cold', C.cold)
  C.hot = get('--hot', C.hot)
  C.white = get('--white', C.white)
  C.hole = get('--hole', C.hole)
  C.boost = document.documentElement.getAttribute('data-theme') === 'out' ? 1 : 0
  voidA = cs.getPropertyValue('--void-a').trim() || voidA
  buildAll()
  if (reduced) draw(performance.now())
}

/* ---------------- 尺寸 ---------------- */
function R0() {
  return Math.min(W, H) * (props.interactive ? 0.115 : 0.085)
}

function resize() {
  const host = props.interactive ? cvs.value?.parentElement : null
  W = props.interactive ? host?.clientWidth || 0 : innerWidth
  H = props.interactive ? host?.clientHeight || 0 : innerHeight
  if (!W || !H || !cvs.value) return
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  cvs.value.width = Math.round(W * dpr)
  cvs.value.height = Math.round(H * dpr)
  cvs.value.style.width = `${W}px`
  cvs.value.style.height = `${H}px`
  ctx = cvs.value.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  // 盘心：首页正中；其余页居中偏上
  ccx = W * 0.5
  ccy = props.interactive ? H * 0.5 : H * 0.44
  onTiltScroll()
  seedStars()
  buildAll()
  if (reduced) draw(performance.now())
}

function seedStars() {
  const n = innerWidth <= 720 ? 110 : 190
  stars = Array.from({ length: n }, () => ({
    x: Math.random(),
    y: Math.random(),
    z: 0.25 + Math.random() * 0.75,
    tw: 0.4 + Math.random() * 1.6,
    ph: Math.random() * TAU,
    vx: (0.2 + Math.random() * 0.8) * 0.00002,
  }))
}

/* ---------------- 离屏构建 ---------------- */
function mkCanvas(w, h) {
  const cv = document.createElement('canvas')
  cv.width = Math.max(2, Math.round(w))
  cv.height = Math.max(2, Math.round(h))
  return cv
}

// 盘纹理：同心环 + 线dash 丝状条纹；中性暖色，多普勒留到帧内屏幕空间染
function buildDiskTextures() {
  const R = R0()
  const bands = [
    [1.12, 1.7],
    [1.7, 2.45],
    [2.45, 3.2],
  ]
  D = bands.map(([r0, r1], bi) => {
    const s = Math.ceil(r1 * R * 2) + 8
    const cv = mkCanvas(s, s)
    const x = cv.getContext('2d')
    const c = s / 2
    let seed = 7 + bi * 31
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    x.filter = 'blur(1px)' // 柔化丝状条纹，去砖块感
    const steps = Math.max(6, Math.round((r1 - r0) * 26))
    for (let i = 0; i <= steps; i++) {
      const rr = (r0 + ((r1 - r0) * i) / steps) * R
      const t = i / steps
      // 内白热 → 中橙 → 外暗
      const col = t < 0.45 ? mix(C.white, C.hot, t / 0.45) : mix(C.hot, C.hole, ((t - 0.45) / 0.55) * 0.75)
      const a = (1 - t) * 0.4 + 0.08
      x.beginPath()
      x.arc(c, c, rr, 0, TAU)
      x.strokeStyle = rgba(col, a * (C.boost ? 0.8 : 1))
      x.lineWidth = Math.max(1, R * 0.042)
      // 丝状：dash 长度随半径，相位随机 → 剪切条纹
      const dash = rr * (0.1 + rnd() * 0.34)
      x.setLineDash([dash, dash * (0.7 + rnd() * 1.4)])
      x.lineDashOffset = rnd() * rr
      x.stroke()
    }
    x.setLineDash([])
    // 几条亮螺线
    for (let k = 0; k < 3; k++) {
      x.beginPath()
      const a0 = rnd() * TAU
      for (let q = 0; q <= 40; q++) {
        const tt = q / 40
        const rr = (r0 + (r1 - r0) * tt) * R
        const aa = a0 + tt * 1.6
        const px2 = c + Math.cos(aa) * rr
        const py2 = c + Math.sin(aa) * rr
        q ? x.lineTo(px2, py2) : x.moveTo(px2, py2)
      }
      x.strokeStyle = rgba(C.white, 0.16)
      x.lineWidth = Math.max(1, R * 0.03)
      x.stroke()
    }
    return { cv, s, r0, r1 }
  })
}

// L：光晕 + 透镜环带（贴合阴影的发光环，上下更亮）
function buildLens() {
  const R = R0()
  const s = Math.ceil(R * 3.4) + 8
  const cv = mkCanvas(s, s)
  const x = cv.getContext('2d')
  const c = s / 2
  // 外光晕
  const g = x.createRadialGradient(c, c, R * 0.6, c, c, R * 1.65)
  g.addColorStop(0, rgba(C.hot, C.boost ? 0.1 : 0.16))
  g.addColorStop(1, rgba(C.hot, 0))
  x.fillStyle = g
  x.fillRect(0, 0, s, s)
  // 透镜环带：被弯折到阴影周围的远侧盘面
  const steps = 16
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const rr = R * (1.02 + t * 0.5)
    const bell = Math.exp(-Math.pow((t - 0.18) / 0.34, 2))
    const col = mix(C.white, C.hot, 0.25 + t * 0.6)
    x.beginPath()
    x.arc(c, c, rr, 0, TAU)
    x.strokeStyle = rgba(col, bell * (C.boost ? 0.5 : 0.62))
    x.lineWidth = Math.max(1.2, R * 0.045)
    x.stroke()
  }
  // 上下最亮帽弧（透镜聚焦处）
  for (const seg of [
    [-Math.PI / 2 - 0.7, -Math.PI / 2 + 0.7],
    [Math.PI / 2 - 0.7, Math.PI / 2 + 0.7],
  ]) {
    x.beginPath()
    x.arc(c, c, R * 1.12, seg[0], seg[1])
    x.strokeStyle = rgba(C.white, C.boost ? 0.75 : 0.85)
    x.lineWidth = Math.max(1.6, R * 0.05)
    x.stroke()
  }
  L = { cv, s }
}

function buildFrame() {
  const R = R0()
  const w = Math.ceil(R * 6.6) + 8
  const h = Math.ceil(R * 6.6 * Math.max(0.16, Math.cos(tilt))) + 8
  if (!F || F.cv.width !== w || F.cv.height !== h) {
    F = { cv: mkCanvas(w, h), w, h }
  }
}

function buildAll() {
  if (!W || !H) return
  buildStarSprite()
  buildDiskTextures()
  buildLens()
  tiltBucket = -1 // 强制重建 F 尺寸
  buildFrame()
}

// 星光：白热核心 + 柔光晕，预渲染精灵（旧版星光手感）
function buildStarSprite() {
  const S = 48
  const cv = mkCanvas(S, S)
  const x = cv.getContext('2d')
  const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  g.addColorStop(0, rgba(C.white, 1))
  g.addColorStop(0.18, rgba(C.white, 0.85))
  g.addColorStop(0.42, rgba(C.white, 0.22))
  g.addColorStop(1, rgba(C.white, 0))
  x.fillStyle = g
  x.fillRect(0, 0, S, S)
  starSprite = cv
}

/* ---------------- 滚轮开合倾角 ---------------- */
function onTiltScroll() {
  if (!props.interactive || !H) return
  const k = Math.min(1, Math.max(0, scrollY / (H * 1.1)))
  tiltTarget = 0.5 + k * 0.85
}

/* ---------------- 轨道节点 ---------------- */
function nodeCount() {
  return Math.min(props.posts.length, 8)
}
function nodeR() {
  const margin = Math.min(ccx, W - ccx) - 70
  return Math.max(2.6, Math.min(4.6, margin / R0()))
}
function nodeXY(i, now) {
  const n = Math.max(1, nodeCount())
  const th = ((now - t0) / 1000) * 0.06 + (i * TAU) / n
  const R = R0()
  const r = nodeR() * R
  return [ccx + Math.cos(th) * r, ccy + Math.sin(th) * r * Math.max(0.2, Math.cos(tilt))]
}
function nodeAt(x, y, now) {
  const n = nodeCount()
  for (let i = 0; i < n; i++) {
    const [nx, ny] = nodeXY(i, now)
    if (Math.hypot(x - nx, y - ny) < 16) return i
  }
  return -1
}
function syncHover(now) {
  const h = props.interactive ? nodeAt(px, py, now) : -1
  hoverIdx = h
  if (h !== lastHover) {
    lastHover = h
    emit('hover', h)
  }
}

/* ---------------- 帧 ---------------- */
function update(dt, now) {
  const step = Math.min(3, dt / 16.7)
  const sp = 1 - Math.pow(0.9, step)
  tilt += (tiltTarget - tilt) * sp
  px += (pxT - px) * sp
  py += (pyT - py) * sp
  spin[0] += 0.0042 * step
  spin[1] += 0.0024 * step
  spin[2] += 0.0013 * step
  const bucket = Math.round(tilt * 40)
  if (bucket !== tiltBucket) {
    tiltBucket = bucket
    buildFrame()
  }
}

function drawDiskIntoF(now) {
  const R = R0()
  const x = F.cv.getContext('2d')
  x.clearRect(0, 0, F.w, F.h)
  const cxF = F.w / 2
  const cyF = F.h / 2
  const cosT = Math.max(0.16, Math.cos(tilt))
  for (let k = 0; k < D.length; k++) {
    const d = D[k]
    x.save()
    x.translate(cxF, cyF)
    x.scale(1, cosT)
    x.rotate(spin[k])
    x.drawImage(d.cv, -d.s / 2, -d.s / 2)
    x.restore()
  }
  // 屏幕空间多普勒染色：source-atop 只染盘像素，透明区保持透明
  const g1 = x.createLinearGradient(0, 0, F.w, 0)
  if (C.boost) {
    g1.addColorStop(0, 'rgba(37,99,235,0.38)')
    g1.addColorStop(0.5, 'rgba(255,255,255,0)')
    g1.addColorStop(1, 'rgba(154,52,18,0.8)')
  } else {
    g1.addColorStop(0, 'rgba(142,201,255,0.55)')
    g1.addColorStop(0.48, 'rgba(255,255,255,0)')
    g1.addColorStop(1, 'rgba(96,28,10,0.88)')
  }
  x.globalCompositeOperation = 'source-atop'
  x.fillStyle = g1
  x.fillRect(0, 0, F.w, F.h)
  x.globalCompositeOperation = 'source-over'
}

function draw(now) {
  if (!ctx || !W) return
  const t = (now - t0) / 1000
  if (props.interactive) syncHover(now)

  if (props.interactive) ctx.clearRect(0, 0, W, H)
  else {
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = voidA
    ctx.fillRect(0, 0, W, H)
  }
  ctx.globalCompositeOperation = C.boost ? 'source-over' : 'lighter'

  const R = R0()

  /* --- 星场：深度漂移 + 闪烁 + 透镜偏折 --- */
  const rippleAge = ripple ? (now - ripple.t0) / 620 : 2
  for (const s of stars) {
    s.x += s.vx * s.z * 16
    if (s.x > 1) s.x -= 1
    let x = s.x * W
    let y = s.y * H
    const dx = x - ccx
    const dy = y - ccy
    const d = Math.hypot(dx, dy) || 1
    const f = 1 + ((R * 1.4) / Math.max(d, R * 0.7)) * 0.28
    x = ccx + dx * f
    y = ccy + dy * f
    if (rippleAge < 1 && ripple) {
      const rx = x - ripple.x
      const ry = y - ripple.y
      const rd = Math.hypot(rx, ry) || 1
      const ring = rippleAge * Math.max(W, H) * 0.75
      const g = Math.exp(-Math.pow((rd - ring) / 70, 2)) * (1 - rippleAge) * 22
      x += (rx / rd) * g
      y += (ry / rd) * g
    }
    const a = (0.14 + 0.62 * Math.abs(Math.sin(t * s.tw + s.ph))) * s.z
    const sz = 2.2 + s.z * 5.2
    ctx.globalAlpha = C.boost ? a * 0.85 : a
    ctx.drawImage(starSprite, x - sz / 2, y - sz / 2, sz, sz)
  }
  ctx.globalAlpha = 1
  if (rippleAge >= 1) ripple = null

  if (props.interactive && L && F) {
    /* --- 光晕 + 透镜环带 --- */
    ctx.globalCompositeOperation = 'source-over'
    ctx.drawImage(L.cv, ccx - L.s / 2, ccy - L.s / 2)

    /* --- 盘合成 + 多普勒 --- */
    drawDiskIntoF(now)

    /* --- 盘后半（上半，先画，将被阴影遮挡内侧） --- */
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, W, ccy)
    ctx.clip()
    ctx.drawImage(F.cv, ccx - F.w / 2, ccy - F.h / 2)
    ctx.restore()

    /* --- 阴影 + 光子环 --- */
    ctx.beginPath()
    ctx.arc(ccx, ccy, R, 0, TAU)
    ctx.fillStyle = rgba(C.hole, 1)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(ccx, ccy, R * 1.005, 0, TAU)
    ctx.strokeStyle = rgba(C.hot, C.boost ? 0.5 : 0.42)
    ctx.lineWidth = 4.5
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(ccx, ccy, R * 1.005, 0, TAU)
    ctx.strokeStyle = rgba(C.white, C.boost ? 0.92 : 0.9)
    ctx.lineWidth = 1.6
    ctx.stroke()

    /* --- 盘前半（下半，压在阴影之前） --- */
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, ccy, W, H - ccy)
    ctx.clip()
    ctx.drawImage(F.cv, ccx - F.w / 2, ccy - F.h / 2)
    ctx.restore()

    ctx.globalCompositeOperation = C.boost ? 'source-over' : 'lighter'

    /* --- 轨道文章节点 --- */
    const n = nodeCount()
    for (let i = 0; i < n; i++) {
      const [x, y] = nodeXY(i, now)
      const hov = i === hoverIdx
      const rad = hov ? 5 : 2.6
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad * 4.5)
      g.addColorStop(0, rgba(C.cold, hov ? 0.95 : 0.75))
      g.addColorStop(1, rgba(C.cold, 0))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, rad * 4.5, 0, TAU)
      ctx.fill()
      ctx.fillStyle = rgba(C.white, hov ? 1 : 0.9)
      ctx.beginPath()
      ctx.arc(x, y, hov ? 2.4 : 1.6, 0, TAU)
      ctx.fill()
      if (hov) {
        ctx.beginPath()
        ctx.arc(x, y, 9 + Math.sin(t * 6) * 2, 0, TAU)
        ctx.strokeStyle = rgba(C.cold, 0.55)
        ctx.lineWidth = 1
        ctx.stroke()
      }
    }
    if (cvs.value) cvs.value.style.cursor = hoverIdx >= 0 ? 'pointer' : ''
  }

  ctx.globalCompositeOperation = 'source-over'
}

function tick(now) {
  raf = 0
  if (reduced || !visible) return
  const dt = Math.min(48, now - last)
  last = now
  update(dt, now)
  draw(now)
  raf = requestAnimationFrame(tick)
}

function kick() {
  if (!raf && !reduced && visible) {
    last = performance.now()
    raf = requestAnimationFrame(tick)
  }
}

/* ---------------- 交互 ---------------- */
function onMove(e) {
  const r = cvs.value?.getBoundingClientRect()
  if (!r) return
  pxT = e.clientX - r.left
  pyT = e.clientY - r.top
  if (reduced) {
    px = pxT
    py = pyT
    syncHover(performance.now())
  }
}

function onDown(e) {
  if (!props.interactive) return
  const r = cvs.value.getBoundingClientRect()
  pxT = px = e.clientX - r.left
  pyT = py = e.clientY - r.top
}

function onUp(e) {
  if (!props.interactive) return
  const now = performance.now()
  const hit = nodeAt(px, py, now)
  if (hit >= 0) {
    emit('select', props.posts[hit])
    return
  }
  const r = cvs.value.getBoundingClientRect()
  ripple = { x: e.clientX - r.left, y: e.clientY - r.top, t0: now }
  if (reduced) draw(now)
}

function onResonance() {
  ripple = { x: ccx, y: ccy, t0: performance.now() }
  if (reduced) draw(performance.now())
}

function onVisibility() {
  visible = !document.hidden
  if (visible) kick()
}

function onResize() {
  resize()
  if (!reduced) kick()
}

let observer = null

onMounted(() => {
  reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  t0 = performance.now()
  readColors()
  resize()
  observer = new MutationObserver(readColors)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('en-resonance', onResonance)
  addEventListener('resize', onResize)
  if (props.interactive) addEventListener('scroll', onTiltScroll, { passive: true })
  if (reduced) draw(performance.now())
  else kick()
})

onUnmounted(() => {
  if (raf) cancelAnimationFrame(raf)
  observer?.disconnect()
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener('en-resonance', onResonance)
  removeEventListener('resize', onResize)
  removeEventListener('scroll', onTiltScroll)
})
</script>

<template>
  <canvas
    ref="cvs"
    :class="interactive ? 'bh bh-abs' : 'bh bh-fixed'"
    aria-hidden="true"
    @pointermove="onMove"
    @pointerdown="onDown"
    @pointerup="onUp"
    @pointercancel="onUp"
  ></canvas>
</template>

<style scoped>
.bh {
  display: block;
}

.bh-fixed {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.bh-abs {
  position: absolute;
  inset: 0;
  z-index: 1;
  touch-action: pan-y;
}

@media (prefers-reduced-motion: reduce) {
  .bh {
    opacity: 0.9;
  }
}
</style>
