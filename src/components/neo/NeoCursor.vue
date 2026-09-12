<script setup>
// NeoCursor · 沉浸光标 v3 · 微型长曝光（与首页星轨同一套视觉语言）
// 指针 = 一枚移动的天极：
//   光子核（精确跟手）＋三颗星 120° 等分围成一圈、绕核同动旋转（色温沿冷白→琥珀循环渐变）
//   移动时留一段短光绘拖尾（冷→暖渐隐）
//   悬停可交互：锥形衍射十字芒绽出＋三星轨道扩张增亮；按下：收束转红移
// 纸面主题 = 干版底片：墨/sepia/朱砂三星轻描
// 仅 neo 皮肤 + 精细指针 + 非 reduced-motion + **用户在顶栏开启**（默认关闭）时启用，
// 并且只接管首页：文章/列表页保留系统光标，图片的 zoom-in 等原生语义不被吞掉。
// 输入区隐去、交还原生文本光标。
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { cursor } from '../../lib/cursor.js'
import { debounce } from '../../lib/debounce.js'

const route = useRoute()

const cvs = ref(null)
const TAU = Math.PI * 2

const HOVER_SEL = 'a[href], button, summary, label, [role="button"]'
const TEXT_SEL = 'input, textarea, [contenteditable="true"]'

let ctx = null
let W = 0
let H = 0
let dpr = 1
let capable = false // 精细指针 + 非 reduced-motion（挂载时探测一次）
let running = false // 当前是否由本组件接管：capable 且开关开启 且 位于首页
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
let lastMove = 0 // 最近一次指针活动时间
let idleK = 1 // 空闲收力系数：静止后平滑降到 0，用于安全停帧

const IDLE_MS = 1400 // 指针静止多久后开始收力

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
  if (!cvs.value) return
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

// 三星：拖尾沿轨道圆弧（与半径 R 一致）渐隐 + 实心星核
function drawComet(sx, sy, col, ang, k, cx, cy, R) {
  // 拖尾：跟随轨道圆弧，头亮尾淡（在星体经过的角度后方）
  const tailAng = ((13 + hoverK * 3) * k) / R
  const segs = 10
  for (let s = 0; s < segs; s++) {
    const a0 = ang - (tailAng * (s + 1)) / segs
    const a1 = ang - (tailAng * s) / segs
    const fade = Math.pow(1 - s / segs, 2)
    ctx.strokeStyle = rgba(col, 0.55 * fade)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(cx, cy, R, a0, a1)
    ctx.stroke()
  }
  // 星核
  ctx.fillStyle = rgba(mix(col, C.white, 0.5), 0.95)
  ctx.beginPath()
  ctx.arc(sx, sy, (1.5 + hoverK * 0.5) * k, 0, TAU)
  ctx.fill()
}

function frame(now) {
  raf = 0
  const dt = Math.min(48, now - lastT) / 16.7
  lastT = now
  const sp = 1 - Math.pow(0.86, dt)
  hoverK += (hoverT - hoverK) * sp
  downK += (downT - downK) * sp
  // 空闲收力：静止后轨道转速平滑归零（避免"星突然停住"），据此才能安全停帧
  const idle = now - lastMove > IDLE_MS
  idleK += ((idle ? 0 : 1) - idleK) * (1 - Math.pow(0.9, dt))
  rot += (0.028 + hoverK * 0.03) * idleK * dt
  hist.push({ x, y })
  if (hist.length > 9) hist.shift()
  draw(now)
  // 停帧条件：空闲 + 收力完成 + 悬停/按下缓动均已收敛。
  // 只停循环，画面与 data-cursor 保持（自定义光标停在最后位置），指针一动即被唤醒。
  if (idle && idleK < 0.002 && Math.abs(hoverT - hoverK) < 0.002 && Math.abs(downT - downK) < 0.002) return
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
    drawComet(sx, sy, col, a, 1 + hoverK * 0.5, x, y, R)
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
  ctx.arc(x, y, 2.6 + hoverK * 0.8 - downK * 0.5, 0, TAU)
  ctx.fill()

  hideNative() // 确认画出了一帧，才隐藏系统光标
}

/* ---------------- 原生光标的接管与归还 ---------------- */
// 只有真正画出一帧后才隐藏系统光标：绘制链路异常时原生指针不会"消失"
let nativeHidden = false
function hideNative() {
  if (nativeHidden) return
  nativeHidden = true
  document.documentElement.dataset.cursor = 'on'
}
function restoreNative() {
  if (!nativeHidden) return
  nativeHidden = false
  delete document.documentElement.dataset.cursor
}

// 停循环但保留画面与已隐藏的系统光标（自定义光标停在最后位置，指针一动即唤醒）
function pause() {
  if (raf) cancelAnimationFrame(raf)
  raf = 0
}

// 彻底交还系统光标：停循环 + 清画面 + 恢复原生指针
function release() {
  pause()
  on = false
  hist.length = 0
  hoverT = 0
  downT = 0
  hoverK = 0
  downK = 0
  idleK = 1
  if (ctx) ctx.clearRect(0, 0, W, H)
  cvs.value?.classList.remove('is-on', 'is-text')
  restoreNative()
}

function kick() {
  if (raf || !running || !on) return
  lastT = performance.now()
  raf = requestAnimationFrame(frame)
}

// 开关 / 路由变化时重新裁决是否接管
function sync() {
  running = capable && cursor.on && route.path === '/'
  if (running) {
    lastMove = performance.now()
    resize()
    readColors()
  } else {
    release()
  }
}

/* ---------------- 交互 ---------------- */
function onMove(e) {
  if (!running) return
  x = e.clientX
  y = e.clientY
  lastMove = performance.now()
  if (!on) {
    on = true
    hist.length = 0
    cvs.value.classList.add('is-on')
  }
  const t = e.target.closest ? e.target.closest(HOVER_SEL) : null
  const f = e.target.closest ? e.target.closest(TEXT_SEL) : null
  hoverT = t ? 1 : 0
  cvs.value.classList.toggle('is-text', !!f)
  kick()
}

function onDown() {
  if (!running) return
  lastMove = performance.now()
  downT = 1
  kick()
}
function onUp() {
  if (!running) return
  downT = 0
  kick()
}
// 指针离开窗口（relatedTarget 为空）：归还系统光标
function onLeave(e) {
  if (e.relatedTarget) return
  release()
}
// 窗口失焦：归还系统光标，避免自定义光标停在过时位置又被当真
function onBlur() {
  release()
}
function onVisibility() {
  if (document.hidden) pause()
  else kick()
}
// 重设画布尺寸在拖拽窗口时会被逐像素触发 → 去抖
const onResize = debounce(() => {
  resize()
  if (on) kick() // 重设画布尺寸会清空画面，需按新尺寸重绘
}, 150)

let observer = null

onMounted(() => {
  const fine = matchMedia('(pointer: fine)').matches
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  capable = fine && !reduced
  cursor.capable = capable // 告知顶栏按钮能否生效
  if (!capable) return

  observer = new MutationObserver(() => {
    readColors()
    if (on) kick() // 换主题=换色板，需按新色重绘
  })
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  addEventListener('pointermove', onMove, { passive: true })
  addEventListener('pointerdown', onDown, { passive: true })
  addEventListener('pointerup', onUp, { passive: true })
  addEventListener('resize', onResize)
  addEventListener('blur', onBlur)
  document.addEventListener('pointerout', onLeave, { passive: true })
  document.addEventListener('visibilitychange', onVisibility)
  sync()
})

// 顶栏开关或路由变化 → 重新裁决（离开首页即归还系统光标）
watch([() => cursor.on, () => route.path], sync)

onUnmounted(() => {
  if (!capable) return
  removeEventListener('pointermove', onMove)
  removeEventListener('pointerdown', onDown)
  removeEventListener('pointerup', onUp)
  removeEventListener('resize', onResize)
  removeEventListener('blur', onBlur)
  document.removeEventListener('pointerout', onLeave)
  document.removeEventListener('visibilitychange', onVisibility)
  onResize.cancel()
  observer?.disconnect()
  release()
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
