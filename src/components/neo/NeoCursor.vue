<script setup>
// NeoCursor · 沉浸光标 v3 · 微型长曝光（与首页星轨同一套视觉语言）
// 指针 = 一枚移动的天极：
//   光子核（精确跟手）＋三颗星 120° 等分围成一圈、绕核同动旋转（色温沿冷白→琥珀循环渐变）
//   移动时留一段短光绘拖尾（冷→暖渐隐）
//   悬停可交互：锥形衍射十字芒绽出＋三星轨道扩张增亮；按下：收束转红移
// 纸面主题 = 干版底片：墨/sepia/朱砂三星轻描
// 仅 neo 皮肤 + 精细指针 + 非 reduced-motion 启用；输入区隐去、交还原生文本光标
import { onMounted, onUnmounted, ref } from 'vue'

const cvs = ref(null)
const TAU = Math.PI * 2

const HOVER_SEL = 'a[href], button, summary, label, [role="button"]'
const TEXT_SEL = 'input, textarea, [contenteditable="true"]'

let ctx = null
let W = 0
let H = 0
let dpr = 1
let enabled = false
let raf = 0
let lastT = 0
let on = false
let x = -100
let y = -100
let rot = 0
let hoverK = 0
let hoverT = 0
let downK = 0
let downT = 0
let hist = [] // 光绘拖尾采样

const C = {
  cold: [142, 201, 255],
  hot: [255, 92, 57],
  white: [255, 247, 237],
  ink: [244, 241, 234],
}
let P = null

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
  C.ink = get('--text-0', C.ink)
  const boost = document.documentElement.getAttribute('data-theme') === 'out' ? 1 : 0
  // 与星轨同源的色温 + 各主题独立强度：深空=冷白/白/琥珀三星；纸面=墨/sepia/朱砂（干版）
  P = boost
    ? {
        core: C.ink,
        glow: C.hot,
        glowA: 0, // 纸面静止无光晕，仅悬停绽出
        glowK: 0.26,
        starA: 0, // 纸面三星永不带光晕（只留实心星点）
        starK: 0,
        orbit: [C.ink, mix(C.ink, C.hot, 0.5), C.hot],
        streak: mix(C.ink, C.hot, 0.12),
        streakB: mix(C.ink, C.hot, 0.42),
        streakA: 0.15,
        spike: C.hot,
      }
    : {
        core: C.white,
        glow: C.cold,
        glowA: 0.24, // 深空常驻光晕（减弱）
        glowK: 0.16,
        starA: 0.26,
        starK: 0.2,
        orbit: [C.cold, C.white, mix(C.white, C.hot, 0.62)],
        streak: mix(C.cold, C.white, 0.5),
        streakB: mix(C.cold, C.hot, 0.3),
        streakA: 0.4,
        spike: C.white,
      }
}

function resize() {
  W = innerWidth
  H = innerHeight
  dpr = Math.min(2, window.devicePixelRatio || 1)
  cvs.value.width = Math.round(W * dpr)
  cvs.value.height = Math.round(H * dpr)
  cvs.value.style.width = `${W}px`
  cvs.value.style.height = `${H}px`
  ctx = cvs.value.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
}

function frame(now) {
  raf = 0
  const dt = Math.min(48, now - lastT) / 16.7
  lastT = now
  const sp = 1 - Math.pow(0.86, dt)
  hoverK += (hoverT - hoverK) * sp
  downK += (downT - downK) * sp
  rot += (0.028 + hoverK * 0.03) * dt
  hist.push({ x, y })
  if (hist.length > 9) hist.shift()
  draw(now)
  raf = requestAnimationFrame(frame)
}

function draw(now) {
  if (!ctx) return
  ctx.clearRect(0, 0, W, H)
  if (!on || !P) return

  /* --- 光绘拖尾：短、越早越淡越细，色由暖尾渐变到冷头 --- */
  const n = hist.length
  for (let i = 1; i < n; i++) {
    const f = i / n
    ctx.strokeStyle = rgba(mix(P.streakB, P.streak, f), Math.pow(f, 2) * P.streakA)
    ctx.lineWidth = 0.6 + f * 1.8
    ctx.beginPath()
    ctx.moveTo(hist[i - 1].x, hist[i - 1].y)
    ctx.lineTo(hist[i].x, hist[i].y)
    ctx.stroke()
  }

  /* --- 三星绕圈：120° 等分同轨旋转，色温循环渐变（冷白→白→琥珀→…） --- */
  const R = 15 + hoverK * 9 - downK * 6
  const cp = (now / 2600) % 3
  for (let i = 0; i < 3; i++) {
    const a = rot + (i * TAU) / 3
    const sx = x + Math.cos(a) * R
    const sy = y + Math.sin(a) * R
    const u = (cp + i) % 3
    const c0 = P.orbit[Math.floor(u)]
    const c1 = P.orbit[(Math.floor(u) + 1) % 3]
    const col = mix(mix(c0, c1, u % 1), C.hot, downK * 0.8)
    const gr = 6 + hoverK * 2.5
    const sa = P.starA + hoverK * P.starK
    if (sa > 0.004) {
      const g3 = ctx.createRadialGradient(sx, sy, 0, sx, sy, gr)
      g3.addColorStop(0, rgba(col, sa))
      g3.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = g3
      ctx.fillRect(sx - gr, sy - gr, gr * 2, gr * 2)
    }
    ctx.fillStyle = rgba(mix(col, C.white, 0.5), 0.95)
    ctx.beginPath()
    ctx.arc(sx, sy, 1.5 + hoverK * 0.5, 0, TAU)
    ctx.fill()
  }

  /* --- 悬停：锥形衍射十字芒（沿芒长渐隐＋慢呼吸） --- */
  if (hoverK > 0.02) {
    const L = (9 + hoverK * 9) * (1 + 0.06 * Math.sin(now / 340))
    ctx.lineWidth = 1
    for (const [dx, dy, k] of [
      [1, 0, 1],
      [0, 1, 1],
      [0.7071, 0.7071, 0.45],
      [-0.7071, 0.7071, 0.45],
    ]) {
      const ln = L * k
      for (const s of [1, -1]) {
        const g2 = ctx.createLinearGradient(x, y, x + dx * ln * s, y + dy * ln * s)
        g2.addColorStop(0, rgba(P.spike, 0.6 * hoverK))
        g2.addColorStop(1, rgba(P.spike, 0))
        ctx.strokeStyle = g2
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + dx * ln * s, y + dy * ln * s)
        ctx.stroke()
      }
    }
  }

  /* --- 光子核 --- */
  const ga = P.glowA + hoverK * P.glowK
  if (ga > 0.004) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, 10)
    g.addColorStop(0, rgba(P.glow, ga))
    g.addColorStop(1, rgba(P.glow, 0))
    ctx.fillStyle = g
    ctx.fillRect(x - 10, y - 10, 20, 20)
  }
  ctx.fillStyle = rgba(mix(mix(P.core, P.glow, hoverK * 0.7), C.hot, downK * 0.8), 1)
  ctx.beginPath()
  ctx.arc(x, y, 2.1 + hoverK * 0.7 - downK * 0.5, 0, TAU)
  ctx.fill()
}

/* ---------------- 交互 ---------------- */
function onMove(e) {
  x = e.clientX
  y = e.clientY
  if (!on) {
    on = true
    hist.length = 0
    cvs.value.classList.add('is-on')
  }
  const t = e.target.closest ? e.target.closest(HOVER_SEL) : null
  const f = e.target.closest ? e.target.closest(TEXT_SEL) : null
  hoverT = t ? 1 : 0
  cvs.value.classList.toggle('is-text', !!f)
}

function onDown() {
  downT = 1
}
function onUp() {
  downT = 0
}
function onLeave(e) {
  if (e.relatedTarget) return
  on = false
  hist.length = 0
  cvs.value.classList.remove('is-on')
}
function onVisibility() {
  if (document.hidden) {
    if (raf) cancelAnimationFrame(raf)
    raf = 0
  } else if (enabled && !raf) {
    lastT = performance.now()
    raf = requestAnimationFrame(frame)
  }
}
function onResize() {
  resize()
}

let observer = null

onMounted(() => {
  const fine = matchMedia('(pointer: fine)').matches
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  enabled = fine && !reduced
  if (!enabled) return
  document.documentElement.dataset.cursor = 'on'
  readColors()
  resize()
  observer = new MutationObserver(readColors)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  addEventListener('pointermove', onMove, { passive: true })
  addEventListener('pointerdown', onDown, { passive: true })
  addEventListener('pointerup', onUp, { passive: true })
  addEventListener('resize', onResize)
  document.addEventListener('pointerout', onLeave, { passive: true })
  document.addEventListener('visibilitychange', onVisibility)
  lastT = performance.now()
  raf = requestAnimationFrame(frame)
})

onUnmounted(() => {
  if (!enabled) return
  removeEventListener('pointermove', onMove)
  removeEventListener('pointerdown', onDown)
  removeEventListener('pointerup', onUp)
  removeEventListener('resize', onResize)
  document.removeEventListener('pointerout', onLeave)
  document.removeEventListener('visibilitychange', onVisibility)
  observer?.disconnect()
  if (raf) cancelAnimationFrame(raf)
  delete document.documentElement.dataset.cursor
})
</script>

<template>
  <canvas ref="cvs" class="nc" aria-hidden="true"></canvas>
</template>

<style scoped>
.nc {
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.25s ease;
}

.nc.is-on {
  opacity: 1;
}

/* 输入区：隐去自定义光标，交还原生文本光标 */
.nc.is-text {
  opacity: 0;
}
</style>
