<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { site } from '../config/site.js'

// 逃逸坐标：at = 爬升进度点亮阈值；位置为视口百分比
const NAV = [
  { to: '/blog', label: '文章', code: '01', x: 14, y: 38, at: 0.12 },
  { to: '/updates', label: '动态', code: '02', x: 32, y: 24, at: 0.28 },
  { to: '/links', label: '收藏', code: '03', x: 50, y: 34, at: 0.44 },
  { to: '/wall', label: '留言墙', code: '04', x: 68, y: 22, at: 0.6 },
  { to: '/about', label: '关于', code: '05', x: 86, y: 36, at: 0.76 },
]

const trackRef = ref(null)
const canvasRef = ref(null)
const progress = ref(0)
const now = ref('--:--:--')

// 仪表读数：海拔与速度随爬升推进，逼近逃逸速度
const alt = computed(() => String(Math.round(progress.value * 11200)).padStart(5, '0'))
const vel = computed(() => (2 + progress.value * 9.2).toFixed(1))
const escaped = computed(() => progress.value > 0.97)

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

// 颜色统一读 CSS 变量：井底/井外双主题零额外成本
function readColors() {
  const cs = getComputedStyle(document.documentElement)
  colors = {
    line: cs.getPropertyValue('--line').trim() || colors.line,
    dim: cs.getPropertyValue('--text-1').trim() || colors.dim,
    signal: cs.getPropertyValue('--signal').trim() || colors.signal,
  }
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
  const count = Math.max(60, Math.min(180, Math.round((W * H) / 9000)))
  particles = Array.from({ length: count }, () => spawn(true))
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

function draw(t) {
  if (!ctx) return
  ctx.clearRect(0, 0, W, H)
  const p = progress.value

  // 井口：三道同心弧，随爬升下沉
  const sink = p * H * 0.45
  ctx.strokeStyle = colors.line
  for (let i = 1; i <= 3; i++) {
    ctx.globalAlpha = 0.55 - i * 0.14
    ctx.beginPath()
    ctx.arc(W / 2, H + 70 + sink, 70 * i, Math.PI, Math.PI * 2)
    ctx.stroke()
  }

  // 光标=干扰引力：弹簧阻尼跟随
  cx += (mx - cx) * 0.12
  cy += (my - cy) * 0.12
  const R = 150

  for (const pt of particles) {
    if (!reduced) {
      // 挣扎感上升：慢-快-慢 + 个体相位
      const struggle = 0.55 + 0.9 * Math.abs(Math.sin(t * 0.0006 * (0.5 + pt.z) + pt.seed))
      pt.y -= pt.v * struggle * 16 * (0.5 + pt.z)
      if (pt.y < -20) Object.assign(pt, spawn(false))
    }
    const jx = Math.sin(t * 0.001 + pt.seed) * 5 * pt.z
    const py0 = pt.y

    // 轨迹=意图路径：中点受光标引力弯曲
    const cX = pt.x + pt.curve
    const cY = H * 0.5
    let bend = 0
    const dcx = cX - cx
    const dcy = cY - cy
    const dc = Math.hypot(dcx, dcy)
    if (dc < R * 1.4 && dc > 0.001) bend = -(dcx / dc) * (1 - dc / (R * 1.4)) * 70
    ctx.strokeStyle = colors.line
    ctx.globalAlpha = 0.05 + 0.07 * pt.z
    ctx.beginPath()
    ctx.moveTo(pt.x, H + 10)
    ctx.quadraticCurveTo(cX + bend, cY, pt.x + pt.curve * 1.6, -10)
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
    ctx.globalAlpha = Math.min(1, 0.25 + 0.5 * pt.z + f * 0.5)
    ctx.fillStyle = f > 0.22 ? colors.signal : colors.dim
    ctx.beginPath()
    ctx.arc(px, py, 0.8 + 1.5 * pt.z + f * 1.3, 0, Math.PI * 2)
    ctx.fill()
  }

  // 逃逸坐标连线：随爬升进度分段生长
  for (const n of NAV) {
    const lp = Math.min(1, Math.max(0, (p - (n.at - 0.14)) / 0.14))
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

function frame(t) {
  raf = requestAnimationFrame(frame)
  if (!visible) return
  const r = trackRef.value.getBoundingClientRect()
  if (r.bottom < 0) return // 滚过装置后停绘，省 CPU
  draw(t)
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
    now.value = `${q(d.getHours())}:${q(d.getMinutes())}:${q(d.getSeconds())}`
  }
  tick()
  clockTimer = setInterval(tick, 1000)

  if (!reduced) raf = requestAnimationFrame(frame)
})

onUnmounted(() => {
  cancelAnimationFrame(raf)
  clearInterval(clockTimer)
  if (observer) observer.disconnect()
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', resize)
  window.removeEventListener('mousemove', onMove)
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
    <div class="well-sticky">
      <canvas ref="canvasRef" class="well-canvas" aria-hidden="true"></canvas>

      <div class="readout well-readout">
        <span>LOC {{ site.coords }}</span>
        <span>T {{ now }}</span>
        <span>ALT {{ alt }} M</span>
        <span>VEL {{ vel }}</span>
        <span class="esc" :class="{ lit: escaped }">ESC 11.2</span>
      </div>

      <nav class="well-nav" aria-label="逃逸坐标">
        <RouterLink
          v-for="n in NAV"
          :key="n.code"
          :to="n.to"
          class="readout well-coord"
          :class="{ lit: progress >= n.at }"
          :style="{ left: n.x + '%', top: n.y + '%' }"
        >
          <i class="dot" aria-hidden="true"></i>{{ n.code }} {{ n.label }}
        </RouterLink>
      </nav>

      <div class="well-title">
        <h1>{{ site.name }}</h1>
        <p>{{ site.subtitle }}</p>
      </div>

      <span class="readout well-hint" aria-hidden="true">SCROLL = 爬升</span>
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

.esc.lit {
  color: var(--signal);
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
  gap: 6px;
  padding: 4px 6px;
  color: var(--text-1);
  transition: color 0.3s;
}

.well-coord .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.well-coord:hover,
.well-coord.lit {
  color: var(--signal);
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

.well-hint {
  position: absolute;
  right: var(--space-3);
  bottom: var(--space-2);
}

@media (max-width: 720px) {
  .well-track {
    height: 220vh;
  }
  .well-coord {
    font-size: 11px;
  }
}
</style>
