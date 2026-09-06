<script setup>
// StarTrails · 长曝光星轨装置（首页主视觉 / 次级页活背景）
// 概念：首屏是一台架在三脚架上的相机正在长曝光——
//   数千条同心星轨弧绕一枚偏心天极刚体旋转累积（恒星周日视运动 = 全场一致 ω）；
//   滚动 = 时间流速（下潜越深，曝光窗口越长、天空转得越快）；
//   文章 = 变星（定点脉动亮星，hover 缓绽锥形衍射十字芒·沿芒长渐隐，点击坠入）；
//   流星 = 环境叙事（偶掠夜空的瞬时光迹）；
//   指针 = 引力时间膨胀（半径内轨迹局部加速卷曲，光绘 torch 感）。
// 管线：ACC 累积离屏缓冲（destination-out 衰减 pass + 每星短弧增量 pass，尾迹自然累积）
//       → 主画布每帧：底 → drawImage(ACC) → 变星/流星（当帧层，不累积，保持锐利）。
// 主题：深空=冷白/暖白/琥珀星轨（lighter 发光）；纸面=天文干版底片（墨/sepia 轨迹 + 朱砂点睛）。
// 工程约定：像素预算封顶、rAF 单循环、visibilitychange 暂停、reduced-motion 静态快进底片、颜色读 CSS 变量。
import { onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  interactive: { type: Boolean, default: false },
  posts: { type: Array, default: () => [] },
})
const emit = defineEmits(['hover', 'select'])

const cvs = ref(null)
const TAU = Math.PI * 2

/* ---------------- 常量（手感/性能参数集中，便于调优） ---------------- */
const OMEGA = 0.05 // 基础角速度 rad/s（刚体旋转，全场一致）
const SMEAR = 0.12 // 每帧沉积的快门拖尾角长 rad
const DEP = 0.0085 // 沉积基准 alpha（深空）
const FADE_0 = 0.0125 // 页顶衰减/帧（尾迹短）
const FADE_1 = 0.005 // 最深衰减/帧（尾迹长）
const FLOW_MAX = 2.2 // 下潜最深处的时间流速加成
const LENS_R = 180 // 指针时间膨胀半径 px
const N_BIG = 220 // 星数（宽屏 · 首页）
const N_SMALL = 110 // 星数（窄屏 · 首页）
const METEOR_MIN = 6000 // 流星最短间隔 ms
const METEOR_MAX = 9000
const PLATE_STEPS = 380 // reduced-motion 静态底片快进步数
const PLATE_OM = 0.17 // 快进角速度 rad/s
const PLATE_FADE = 0.0045
const MAXPX = 4.6e6 // 画布像素预算（超出则自动降 DPR）
// 环带取样区间：3 条暗带间隙 → 同心结构感
const BANDS = [
  [0.03, 0.32],
  [0.36, 0.55],
  [0.59, 0.8],
  [0.84, 1],
]
const BAND_TOT = BANDS.reduce((s, b) => s + (b[1] - b[0]), 0)

let ctx = null
let acc = null // 累积离屏缓冲（长曝光底片）
let accCtx = null
let W = 0
let H = 0
let dpr = 1
let reduced = false
let raf = 0
let last = 0
let visible = true
let t0 = 0

// 天极（偏心）与最大轨半径
const pole = { x: 0, y: 0 }
let maxR = 1

// 时间流速 / 衰减（滚动驱动，带惯性）
let flow = 1
let flowT = 1
let fade = FADE_0
let fadeT = FADE_0

let stars = []
let vars = [] // 变星=文章节点
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

function readColors() {
  const cs = getComputedStyle(document.documentElement)
  const get = (n, fb) => hex2rgb(cs.getPropertyValue(n).trim()) || fb
  C.cold = get('--cold', C.cold)
  C.hot = get('--hot', C.hot)
  C.white = get('--white', C.white)
  C.ink = get('--text-0', C.ink)
  C.boost = document.documentElement.getAttribute('data-theme') === 'out' ? 1 : 0
  voidA = cs.getPropertyValue('--void-a').trim() || voidA
  // 星轨色板：深空=冷白/暖白/琥珀；纸面=墨/sepia/朱砂（干版底片）
  C.trail = C.boost
    ? [mix(C.ink, C.hot, 0.05), mix(C.ink, C.hot, 0.34), C.hot]
    : [mix(C.white, C.cold, 0.45), C.white, mix(C.white, C.hot, 0.62)]
  resetPlate() // 换一张底片：清空累积缓冲防串色
  if (reduced) {
    buildPlate()
    draw(performance.now())
  }
}

/* ---------------- 尺寸 ---------------- */
function resize() {
  const host = props.interactive ? cvs.value?.parentElement : null
  W = props.interactive ? host?.clientWidth || 0 : innerWidth
  H = props.interactive ? host?.clientHeight || 0 : innerHeight
  if (!W || !H || !cvs.value) return
  dpr = Math.min(2, window.devicePixelRatio || 1, Math.sqrt(MAXPX / (W * H)))
  const pw = Math.max(2, Math.round(W * dpr))
  const ph = Math.max(2, Math.round(H * dpr))
  cvs.value.width = pw
  cvs.value.height = ph
  cvs.value.style.width = `${W}px`
  cvs.value.style.height = `${H}px`
  ctx = cvs.value.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  if (!acc) {
    acc = document.createElement('canvas')
    accCtx = acc.getContext('2d')
  }
  acc.width = pw
  acc.height = ph
  accCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
  accCtx.lineCap = 'round'
  accCtx.lineJoin = 'round'
  // 天极：首页偏右上（给左下宣言让位）；次级页居中偏上
  pole.x = W * (props.interactive ? 0.62 : 0.5)
  pole.y = H * (props.interactive ? 0.38 : 0.4)
  maxR = Math.hypot(Math.max(pole.x, W - pole.x), Math.max(pole.y, H - pole.y))
  onFlowScroll()
  seedStars()
  seedVars()
  if (reduced) {
    buildPlate()
    draw(performance.now())
  }
}

function pickRn() {
  let u = Math.random() * BAND_TOT
  for (const b of BANDS) {
    const w = b[1] - b[0]
    if (u <= w) return b[0] + Math.random() * w
    u -= w
  }
  return 1
}

function mkStar() {
  const z = 0.22 + Math.pow(Math.random(), 1.7) * 0.78
  const rr = Math.random()
  return {
    rn: pickRn(),
    r: 0,
    th: Math.random() * TAU,
    z,
    tier: rr < 0.56 ? 0 : rr < 0.89 ? 1 : 2, // 冷白居多，琥珀最稀
    lw: 0.7 + z * 0.9,
    tw: 0.3 + Math.random() * 1.1,
    ph: Math.random() * TAU,
  }
}

function seedStars() {
  const base = innerWidth <= 720 ? N_SMALL : N_BIG
  const n = Math.round(base * (props.interactive ? 1 : 0.5))
  if (stars.length === n) {
    for (const s of stars) s.r = s.rn * maxR // 数量未变 → 保留状态，仅重算半径
    return
  }
  stars = Array.from({ length: n }, mkStar)
  for (const s of stars) s.r = s.rn * maxR
}

/* ---------------- 变星（文章节点） ---------------- */
function seedVars() {
  if (!props.interactive) {
    vars = []
    return
  }
  const n = Math.min(props.posts.length, 8)
  if (vars.length === n) {
    for (const v of vars) v.r = v.rn * maxR
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
  for (const v of vars) v.r = v.rn * maxR
}

function varXY(v) {
  return [pole.x + Math.cos(v.th) * v.r, pole.y + Math.sin(v.th) * v.r]
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
    flowT = 1
    fadeT = FADE_0 * 1.3 // 次级页：更短尾迹、更安静的活背景
    return
  }
  const k = clamp01(scrollY / (H * 1.1))
  flowT = 1 + k * FLOW_MAX
  fadeT = FADE_0 - k * (FADE_0 - FADE_1)
}

/* ---------------- 累积缓冲：衰减 + 沉积 ---------------- */
function resetPlate() {
  if (!accCtx || !acc) return
  accCtx.setTransform(1, 0, 0, 1, 0, 0)
  accCtx.globalCompositeOperation = 'source-over'
  accCtx.globalAlpha = 1
  accCtx.clearRect(0, 0, acc.width, acc.height)
  accCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

// om: 角速度 rad/s；fd: 每帧衰减；dtS: 帧时长 s；tAbs: 绝对时间 s；dep: 沉积基准 alpha
function accPass(om, fd, dtS, tAbs, dep) {
  // 衰减 pass：destination-out 均匀削掉底片透明度 → 尾迹长度 = 1/fd
  accCtx.setTransform(1, 0, 0, 1, 0, 0)
  accCtx.globalCompositeOperation = 'destination-out'
  accCtx.globalAlpha = 1
  accCtx.fillStyle = `rgba(0,0,0,${fd})`
  accCtx.fillRect(0, 0, acc.width, acc.height)
  accCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
  accCtx.globalCompositeOperation = 'source-over'

  // 增量 pass：每颗星画本帧的短弧 → 长曝光自然累积
  for (let tier = 0; tier < 3; tier++) {
    accCtx.strokeStyle = rgba(C.trail[tier], 1)
    for (const s of stars) {
      if (s.tier !== tier) continue
      const x = pole.x + Math.cos(s.th) * s.r
      const y = pole.y + Math.sin(s.th) * s.r
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
      s.th += dth
      const tw = 0.86 + 0.14 * Math.sin(tAbs * s.tw + s.ph)
      accCtx.globalAlpha = Math.min(1, dep * s.z * ab * tw)
      accCtx.lineWidth = s.lw
      accCtx.beginPath()
      accCtx.arc(pole.x, pole.y, s.r, s.th - (SMEAR * boost + dth), s.th)
      accCtx.stroke()
    }
  }

  // 变星：随天刚体旋转，并在底片上留下更亮的朱砂/暖白轨迹
  if (vars.length) {
    accCtx.strokeStyle = rgba(C.boost ? C.hot : mix(C.white, C.cold, 0.3), 1)
    accCtx.lineWidth = 1.7
    for (const v of vars) {
      const dth = om * dtS
      v.th += dth
      accCtx.globalAlpha = Math.min(1, dep * 2.4)
      accCtx.beginPath()
      accCtx.arc(pole.x, pole.y, v.r, v.th - (SMEAR + dth), v.th)
      accCtx.stroke()
    }
  }
  accCtx.globalAlpha = 1
}

// reduced-motion：一次性快进生成静态长曝光底片，不启动 rAF
function buildPlate() {
  if (!accCtx) return
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
  const sp = 1 - Math.pow(0.9, step)
  flow += (flowT - flow) * sp
  fade += (fadeT - fade) * sp
  if (hasPointer) {
    px += (pxT - px) * sp
    py += (pyT - py) * sp
  }
  const dep = DEP * (C.boost ? 1.5 : 1) * (props.interactive ? 1 : 0.75)
  accPass(OMEGA * flow, fade * (C.boost ? 1.4 : 1) * step, dt / 1000, (now - t0) / 1000, dep)
  if (props.interactive) {
    const bk = 1 - Math.pow(0.93, step) // 绽放缓动（约 0.2s 半程）
    for (let i = 0; i < vars.length; i++) {
      const v = vars[i]
      v.bl += ((i === hoverIdx ? 1 : 0) - v.bl) * bk
    }
    if (now > nextMeteor) {
      spawnMeteor()
      nextMeteor = now + METEOR_MIN + Math.random() * (METEOR_MAX - METEOR_MIN)
    }
    for (let i = meteors.length - 1; i >= 0; i--) if ((now - meteors[i].t0) / 900 > 1) meteors.splice(i, 1)
  }
}

function draw(now) {
  if (!ctx || !W || !acc) return
  const t = (now - t0) / 1000
  if (props.interactive) syncHover()

  // 底
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
  if (props.interactive) ctx.clearRect(0, 0, W, H)
  else {
    ctx.fillStyle = voidA
    ctx.fillRect(0, 0, W, H)
  }

  // 底片（长曝光星轨）
  ctx.globalCompositeOperation = C.boost ? 'source-over' : 'lighter'
  ctx.drawImage(acc, 0, 0, W, H)

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
    // 亮头
    const hg = ctx.createRadialGradient(x, y, 0, x, y, 7)
    hg.addColorStop(0, rgba(head, 0.9 * env))
    hg.addColorStop(1, rgba(head, 0))
    ctx.fillStyle = hg
    ctx.fillRect(x - 7, y - 7, 14, 14)
  }

  /* --- 变星（文章节点） --- */
  const halo = C.boost ? C.hot : C.cold
  const core = C.boost ? C.ink : C.white
  for (let i = 0; i < vars.length; i++) {
    const v = vars[i]
    const [x, y] = varXY(v)
    const pu = 0.6 + 0.4 * Math.sin(t * v.pulse + v.ph)
    const bl = reduced ? (i === hoverIdx ? 1 : 0) : v.bl // 绽放系数（reduced 下二值直开）
    if (!C.boost) {
      // 光晕仅深空主题：纸面干版忌糊，静置与 hover 绽出都不带光晕，只留锐利星核与衍射芒
      const R = (2.7 + 1.7 * bl) * (0.82 + 0.36 * pu)
      const g = ctx.createRadialGradient(x, y, 0, x, y, R * 5)
      g.addColorStop(0, rgba(halo, 0.4 + 0.25 * pu + 0.45 * bl))
      g.addColorStop(1, rgba(halo, 0))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, R * 5, 0, TAU)
      ctx.fill()
    }
    if (bl > 0.02) {
      // 锥形衍射芒：每支沿芒长线性渐隐（根亮尖透），主/副 = 1:0.45，±6% 慢呼吸
      const L = 30 * (0.6 + 0.4 * bl) * (1 + 0.06 * Math.sin(t * 2.9 + v.ph))
      const a0 = (C.boost ? 0.5 : 0.6) * bl
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
        const ex = x + dx * L * k
        const ey = y + dy * L * k
        const g2 = ctx.createLinearGradient(x, y, ex, ey)
        g2.addColorStop(0, rgba(core, a0))
        g2.addColorStop(1, rgba(core, 0))
        ctx.strokeStyle = g2
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(ex, ey)
        ctx.lineWidth = 2.8 // 宽柔锥（辉光）
        ctx.globalAlpha = 0.3
        ctx.stroke()
        ctx.globalAlpha = 1
        ctx.lineWidth = 1 // 亮窄锥（轴芯）
        ctx.stroke()
      }
      ctx.beginPath()
      ctx.arc(x, y, 10 + Math.sin(t * 6) * 2, 0, TAU)
      ctx.strokeStyle = rgba(halo, 0.5 * bl)
      ctx.lineWidth = 1
      ctx.stroke()
    }
    ctx.fillStyle = rgba(core, 0.88 + 0.12 * bl)
    ctx.beginPath()
    ctx.arc(x, y, 1.7 + 0.7 * bl, 0, TAU)
    ctx.fill()
  }
  if (cvs.value) cvs.value.style.cursor = hoverIdx >= 0 ? 'pointer' : ''

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
  hasPointer = true
  pxT = e.clientX - r.left
  pyT = e.clientY - r.top
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
  const r = cvs.value.getBoundingClientRect()
  hasPointer = true
  pxT = px = e.clientX - r.left
  pyT = py = e.clientY - r.top
}

function onUp(e) {
  if (!props.interactive) return
  const r = cvs.value.getBoundingClientRect()
  const x = e.clientX - r.left
  const y = e.clientY - r.top
  const hit = varAt(x, y)
  if (hit >= 0) emit('select', props.posts[hit])
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

watch(
  () => props.posts.length,
  () => {
    seedVars()
    if (reduced) draw(performance.now())
  },
)

onMounted(() => {
  reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  t0 = performance.now()
  nextMeteor = t0 + 2600
  readColors()
  resize()
  observer = new MutationObserver(readColors)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  document.addEventListener('visibilitychange', onVisibility)
  if (props.interactive) {
    addEventListener('scroll', onFlowScroll, { passive: true })
  }
  addEventListener('resize', onResize)
  if (reduced) {
    buildPlate()
    draw(performance.now())
  } else kick()
})

onUnmounted(() => {
  if (raf) cancelAnimationFrame(raf)
  observer?.disconnect()
  document.removeEventListener('visibilitychange', onVisibility)
  removeEventListener('scroll', onFlowScroll)
  removeEventListener('resize', onResize)
  acc = null
  accCtx = null
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
