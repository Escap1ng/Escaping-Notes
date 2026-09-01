<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { content } from '../lib/content.js'

// 逃逸坐标：at = 爬升进度点亮阈值；位置为视口百分比
const NAV = [
  { to: '/blog', label: '文章', code: '01', x: 12, y: 38, at: 0.1 },
  { to: '/updates', label: '动态', code: '02', x: 27, y: 24, at: 0.24 },
  { to: '/links', label: '收藏', code: '03', x: 42, y: 36, at: 0.38 },
  { to: '/projects', label: '项目', code: '04', x: 57, y: 22, at: 0.52 },
  // anchor:'r' = 右锚定位，避免移动端左定位剩余宽度不足导致换行/圆点压缩
  { to: '/wall', label: '留言墙', code: '05', x: 72, y: 34, at: 0.66, anchor: 'r' },
  { to: '/about', label: '关于', code: '06', x: 87, y: 24, at: 0.8, anchor: 'r' },
]

const trackRef = ref(null)
const canvasRef = ref(null)
const progress = ref(0)
const now = ref('--:--:--')

// 仪表读数：海拔随爬升推进
const alt = computed(() => String(Math.round(progress.value * 11200)).padStart(5, '0'))
const escaped = computed(() => progress.value > 0.97)

// 蓄能：长按 ≥800ms 起充，VEL 逼近 11.2；松开缓慢回落
const charge = ref(0)
const charged = ref(false)
const sync = ref(false)
let chargeTimer = 0
let resonanceUntil = 0

const vel = computed(() => {
  const base = 2 + progress.value * 9.2
  return (base + charge.value * (11.2 - base)).toFixed(1)
})

let downAt = 0
let downX = 0
let downY = 0

// 满蓄能奖励：逃逸粒子/涟漪/逃逸痕/低语轮播
// 低语实例化：固定于按压点缓慢淡出；另一点长按另起一条，互不跳转
const whispersActive = ref([])
let wid = 0
let pressX = 0
let pressY = 0
const whisperTimers = []
let fired = false
let rippleStart = 0
const escapers = []
const traces = []

function fireEscape() {
  if (!reduced) {
    escapers.push({
      x: cx > -1e3 ? cx : W / 2,
      y: cy > -1e3 ? cy : H * 0.6,
      v: 5,
      trail: [],
    })
    rippleStart = performance.now()
  }
  navigator.vibrate?.(30)
  const list = content.whispers || []
  let text = '已达到逃逸速度，井外见。'
  if (list.length) {
    const i = Number(localStorage.getItem('en-whisper-idx') || 0) % list.length
    text = list[i]
    localStorage.setItem('en-whisper-idx', String(i + 1))
  }
  const inst = { id: ++wid, x: pressX, y: pressY, text }
  whispersActive.value.push(inst)
  whisperTimers.push(
    setTimeout(() => {
      whispersActive.value = whispersActive.value.filter((w) => w.id !== inst.id)
    }, 2600)
  )
}

function onDown(e) {
  downAt = performance.now()
  downX = e.clientX
  downY = e.clientY
  // 记录按压位置（相对装置容器），供本次蓄能的低语定点
  const r = e.currentTarget.getBoundingClientRect()
  pressX = e.clientX - r.left
  pressY = e.clientY - r.top
  fired = false
  clearInterval(chargeTimer)
  chargeTimer = setInterval(() => {
    const held = performance.now() - downAt
    charge.value = held < 800 ? 0 : Math.min(1, (held - 800) / 1700)
    charged.value = charge.value > 0.97
    if (charged.value && !fired) {
      fired = true
      fireEscape()
    }
  }, 80)
}

// 位移>10px 视为滚动意图，取消蓄能（触摸滚动不误触发）
function onPtrMove(e) {
  if (Math.hypot(e.clientX - downX, e.clientY - downY) > 10) onUp()
}

function onUp() {
  clearInterval(chargeTimer)
  const decay = setInterval(() => {
    charge.value = Math.max(0, charge.value - 0.06)
    charged.value = charge.value > 0.97
    if (charge.value === 0) clearInterval(decay)
  }, 50)
}

// 共振：三连点 logo → 全部轨迹同相位 2s
function onResonance() {
  resonanceUntil = performance.now() + 2000
  sync.value = true
  setTimeout(() => (sync.value = false), 2000)
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

  // 涟漪：逃逸发生后 900ms 内轨迹轻微扰动
  let ripple = 0
  if (rippleStart) {
    const rdt = t - rippleStart
    if (rdt < 900) ripple = 1 - rdt / 900
  }

  for (const pt of particles) {
    if (!reduced) {
      // 挣扎感上升：慢-快-慢 + 个体相位；共振期间同相位；蓄能加速
      const phase = t < resonanceUntil ? 0 : pt.seed
      const struggle = 0.55 + 0.9 * Math.abs(Math.sin(t * 0.0006 * (0.5 + pt.z) + phase))
      pt.y -= pt.v * struggle * 16 * (0.5 + pt.z) * (1 + charge.value * 2.2)
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
    if (ripple) px += Math.sin(t * 0.02 + pt.seed) * 3 * ripple
    ctx.globalAlpha = Math.min(1, 0.25 + 0.5 * pt.z + f * 0.5 + charge.value * 0.3)
    ctx.fillStyle = f > 0.22 ? colors.signal : colors.dim
    ctx.beginPath()
    ctx.arc(px, py, 0.8 + 1.5 * pt.z + f * 1.3, 0, Math.PI * 2)
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

  // 逃逸粒子：加速上升 + 拖尾
  for (let i = escapers.length - 1; i >= 0; i--) {
    const es = escapers[i]
    es.v *= 1.04
    es.y -= es.v
    es.trail.push({ x: es.x, y: es.y })
    if (es.trail.length > 36) es.trail.shift()
    ctx.strokeStyle = colors.signal
    for (let j = 1; j < es.trail.length; j++) {
      ctx.globalAlpha = (j / es.trail.length) * 0.5
      ctx.beginPath()
      ctx.moveTo(es.trail[j - 1].x, es.trail[j - 1].y)
      ctx.lineTo(es.trail[j].x, es.trail[j].y)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    ctx.fillStyle = colors.signal
    ctx.beginPath()
    ctx.arc(es.x, es.y, 2.5, 0, Math.PI * 2)
    ctx.fill()
    if (es.y < -60) {
      traces.push({ x: es.x })
      if (traces.length > 5) traces.shift()
      escapers.splice(i, 1)
    }
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
    now.value = `${q(d.getHours())}:${q(d.getMinutes())}:${q(d.getSeconds())}`
  }
  tick()
  clockTimer = setInterval(tick, 1000)

  if (!reduced) raf = requestAnimationFrame(frame)
})

onUnmounted(() => {
  cancelAnimationFrame(raf)
  clearInterval(clockTimer)
  clearInterval(chargeTimer)
  whisperTimers.forEach(clearTimeout)
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
      @pointerleave="onUp"
      @pointercancel="onUp"
    >
      <canvas ref="canvasRef" class="well-canvas" aria-hidden="true"></canvas>

      <div class="readout well-readout">
        <span>LOC {{ content.site.coords }}</span>
        <span>T {{ now }}</span>
        <span>ALT {{ alt }} M</span>
        <span>VEL {{ vel }}</span>
        <span class="esc" :class="{ lit: escaped }">ESC 11.2</span>
        <span v-if="sync" class="sync">SYNC OK</span>
      </div>

      <div
        v-for="w in whispersActive"
        :key="w.id"
        class="charge-panel"
        :style="{ left: w.x + 'px', top: w.y + 'px' }"
        aria-hidden="true"
      >
        <p class="readout charge-line">{{ w.text }}</p>
      </div>

      <nav class="well-nav" aria-label="逃逸坐标">
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
          <i class="dot" aria-hidden="true"></i>{{ n.code }} {{ n.label }}
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

.esc.lit {
  color: var(--signal);
}

.sync {
  color: var(--signal);
}

/* 低语浮现在按压位置，略高于指尖避免被遮挡；定点缓慢淡出 */
.charge-panel {
  position: absolute;
  transform: translate(-50%, -130%);
  text-align: center;
  max-width: 76vw;
  pointer-events: none;
  animation: whisper-life 2.6s ease forwards;
}

@keyframes whisper-life {
  0% { opacity: 0; }
  12% { opacity: 1; }
  70% { opacity: 1; }
  100% { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .charge-panel {
    animation: none;
    opacity: 1;
  }
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
  gap: 6px;
  padding: 4px 6px;
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
    font-size: 11px;
  }
}
</style>
