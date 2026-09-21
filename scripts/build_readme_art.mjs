// README 配图：把站点的长曝光底片离线复算成 PNG（`npm run art:build`，产物提交进仓库）。
//
// 这不是"画一张像星空的图"：所有常数从源码里读，读不到就抛错，图与代码不可能悄悄分叉。
//   · 星群与尾迹模型 = src/components/neo/StarTrails.vue 的 mkStar / accPass
//   · 快进步数与衰减 = 同文件 buildPlate() 用的 PLATE_STEPS / PLATE_OM / PLATE_FADE
//     （即 prefers-reduced-motion 用户实际看到的那一张）
//   · 天极位置 = src/lib/sky.js 的 POLE_FX / POLE_FY
//   · 两套主题的色 = src/styles/neo.css §2 / §3 的 --white / --cold / --hot / --text-0 / --ink-0
// 合成模式也照抄：深空 = 'lighter'（加色），纸面 = 'source-over'（墨压在干版上）。
//
// 为什么不用逐帧模拟：canvas 每帧先把底片乘 (1−fd)，再沉积一段长 shear 的弧。
// 距头部 i 帧的一像素会被 j ∈ [i−L, i] 这些帧各画到一次（L = shear/dθ），
// 每笔到今天已衰减成 α_j·(1−fd)^j → 亮度 = Σ α_j·decay^j，一个前缀和即可 O(1) 取值。
// 头部亮段（HEAD_GAIN）是同一式的第二条短窗：长 0.22·L、线宽 ×0.72。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { encodePng } from './lib/png.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'docs', 'assets', 'readme')

const ST = readFileSync(join(ROOT, 'src', 'components', 'neo', 'StarTrails.vue'), 'utf8')
const SKY = readFileSync(join(ROOT, 'src', 'lib', 'sky.js'), 'utf8')
const CSS = readFileSync(join(ROOT, 'src', 'styles', 'neo.css'), 'utf8')

function num(src, name) {
  const m = src.match(new RegExp(`^(?:export )?const ${name} = (-?[\\d.]+)`, 'm'))
  if (!m) throw new Error(`源码里找不到常量 ${name} —— 图与代码要分叉了，改完记得重跑 npm run art:build`)
  return parseFloat(m[1])
}

const OMEGA = num(ST, 'OMEGA')
const DEP = num(ST, 'DEP')
const HEAD_GAIN = num(ST, 'HEAD_GAIN')
const PLATE_FADE = num(ST, 'PLATE_FADE')
const PLATE_OM = num(ST, 'PLATE_OM')
const PLATE_STEPS = num(ST, 'PLATE_STEPS')
const N_BIG = num(ST, 'N_BIG')
const RND_R = num(ST, 'RND_R')
const POLE_FX = num(SKY, 'POLE_FX')
const POLE_FY = num(SKY, 'POLE_FY')

const bands = [...ST.matchAll(/^\s*\[\s*([\d.]+)\s*,\s*([\d.]+)\s*\],$/gm)]
  .map((m) => [+m[1], +m[2]])
  .filter(([a, b]) => b > a && a >= 0 && b <= 1)
if (bands.length !== 3) throw new Error(`读不到 BANDS 环带（拿到 ${bands.length} 段）`)

/* ---------------- 两套主题的色，照抄 readColors() ---------------- */
function h2rgb(h) {
  const s = String(h).replace('#', '')
  const n = s.length === 3 ? s.split('').map((c) => c + c).join('') : s.slice(0, 6)
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)]
}
const mix = (a, b, t) => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
]
function themeBlock(selector) {
  // 选择器在 neo.css 的页眉注释里也出现过，所以必须连着 `{` 一起找才是真的规则块
  const re = new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{')
  const m = re.exec(CSS)
  if (!m) throw new Error(`neo.css 里找不到主题块：${selector}`)
  const body = CSS.slice(m.index, CSS.indexOf('\n}', m.index))
  const vars = {}
  for (const x of body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{3,8})/g)) {
    if (!vars[x[1]]) vars[x[1]] = h2rgb(x[2]) // 同名令牌取第一次出现
  }
  return vars
}
const DEEP = themeBlock(`html[data-skin='neo']:not([data-theme='out'])`)
const PAPER = themeBlock(`html[data-skin='neo'][data-theme='out']`)
for (const [n, v] of [['深空', DEEP], ['纸面', PAPER]]) {
  for (const k of ['ink-0', 'text-0', 'cold', 'hot', 'white']) {
    if (!v[k]) throw new Error(`${n}主题缺令牌 --${k} —— 配色脚本要跟着改`)
  }
}

/* ---------------- 取景：视口 CSS 像素，天极按 sky.js 的分数 ---------------- */
const W = Number(process.env.ART_W || 1280)
const H = Number(process.env.ART_H || 760)
// 底片在浏览器里是按 DPR 开的（sky.ensurePlate：dpr ≤ 2 且受像素预算封顶），
// 线宽 0.6~1.8 **CSS px** 在 2× 屏上占 1.2~3.6 个真实像素。用 1× 复算会把尾迹
// 少算一半厚度——观感差主要就出在这里。所以按 DPR 超采样，再盒式降采样回视口尺寸。
const DPR = Number(process.env.ART_DPR || 2)
// 冲印增益（仅显示端，见 render() 里的说明）；图注要如实标出这两个倍数
const DEV_DEEP = Number(process.env.ART_DEV_DEEP || 2.8)
const DEV_PAPER = Number(process.env.ART_DEV_PAPER || 1.6)
const RW = W * DPR
const RH = H * DPR
const pole = { x: W * POLE_FX * DPR, y: H * POLE_FY * DPR }
const maxR = Math.hypot(Math.max(pole.x, RW - pole.x), Math.max(pole.y, RH - pole.y))
const TAU = Math.PI * 2

// 种子固定：同样的种子出同样的图，重跑一次只该改常数，不该改构图
let seed = 20260920
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)

const BAND_TOT = bands.reduce((s, b) => s + (b[1] - b[0]), 0)
function pickRn() {
  if (rnd() < RND_R) return 0.02 + rnd() * 0.97
  let u = rnd() * BAND_TOT
  for (const b of bands) {
    const w = b[1] - b[0]
    if (u <= w) return b[0] + rnd() * w
    u -= w
  }
  return 1
}
function mkStar() {
  let z = 0.16 + Math.pow(rnd(), 2.4) * 0.62
  if (rnd() < 0.07) z *= 2.1
  z = Math.min(1, z)
  const rr = rnd()
  return {
    rn: pickRn(),
    th: rnd() * TAU,
    z,
    tier: rr < 0.56 ? 0 : rr < 0.89 ? 1 : 2,
    lw: 0.6 + z * 1.2,
    head: z > 0.62,
    ta: 0.08 + 0.13 * z,
    tw: 0.3 + rnd() * 1.3,
    ph: rnd() * TAU,
    shear: 0.06 + Math.pow(rnd(), 1.25) * 0.34,
  }
}
const stars = Array.from({ length: N_BIG }, mkStar)
for (const s of stars) s.r = s.rn * maxR

/* ---------------- 稳态底片 ---------------- */
const dtS = 1 / 60
const dth = PLATE_OM * dtS // 这张底片每帧转过的角
const decay = 1 - PLATE_FADE
const CUTOFF = 0.006 // 尾迹暗到就停：0.006 的不透明度约等于 1.5/255，看不出来

function render(theme) {
  const boost = theme === 'paper'
  const V = boost ? PAPER : DEEP
  const trail = boost
    ? [mix(V['text-0'], V.hot, 0.05), mix(V['text-0'], V.hot, 0.34), V.hot]
    : [mix(V.white, V.cold, 0.45), V.white, mix(V.white, V.hot, 0.62)]
  const dep = DEP * (boost ? 1.5 : 1) // 纸面主题在 accPass 里多沉积五成

  const A = new Float32Array(RW * RH) // 底片累积不透明度
  const P = new Float32Array(RW * RH * 3) // 同一张底片的预乘色

  const stroke = (x, y, col, a, rad, norm) => {
    if (a <= CUTOFF) return
    const r2 = rad * rad
    const x0 = Math.max(0, Math.floor(x - rad))
    const x1 = Math.min(RW - 1, Math.ceil(x + rad))
    const y0 = Math.max(0, Math.floor(y - rad))
    const y1 = Math.min(RH - 1, Math.ceil(y + rad))
    for (let py = y0; py <= y1; py++) {
      for (let px = x0; px <= x1; px++) {
        const dd = (px - x) ** 2 + (py - y) ** 2
        if (dd > r2) continue
        const as = Math.min(1, (a * (1 - dd / r2) ** 2) / norm)
        const k = py * RW + px
        const i = k * 3
        const inv = 1 - as
        A[k] += as * (1 - A[k])
        P[i] = col[0] * as + P[i] * inv
        P[i + 1] = col[1] * as + P[i + 1] * inv
        P[i + 2] = col[2] * as + P[i + 2] * inv
      }
    }
  }

  for (const s of stars) {
    const L = s.shear / dth // 尾迹框宽（帧）
    const Lh = 0.22 * L // 头部亮段的短窗（accPass 里是 dthLen*0.22）
    const iMax = PLATE_STEPS + L // 第 0 帧那笔的尾端也在这条线上
    // α_j：j 帧前那次沉积的 alpha（含闪烁）；它如今的浓度是 α_j·decay^j。
    // 距头部 i 帧的一像素被 j ∈ [i−L, i] 这些帧画到 → 亮度 = Σ α_j·decay^j，前缀和一次成型。
    const T = new Float64Array(Math.ceil(iMax) + 1)
    let d = 1
    for (let i = 0; i < T.length; i++) {
      T[i] = (i ? T[i - 1] : 0) + dep * s.z * (1 - s.ta + s.ta * Math.sin(s.ph - i * dtS * s.tw)) * d
      d *= decay
    }
    const interp = (x) => {
      const f = Math.floor(x)
      return f >= T.length - 1 ? T[T.length - 1] : T[f] + (T[f + 1] - T[f]) * (x - f)
    }
    const Wm = (i, len) => interp(i) - (i - len - 1 < 0 ? 0 : interp(i - len - 1))

    const rad = DPR * Math.max(0.9, s.lw / 2 + 0.5)
    const radH = DPR * Math.max(0.8, (s.lw * 0.72) / 2 + 0.45)
    // 归一化：沿弧每 1 设备像素落一枚笔刷，轴线上 Σ(1−u²)² ≈ 0.533·2R，除掉它才不至于把线叠粗叠亮
    const norm = 2 * rad * 0.533
    const normH = 2 * radH * 0.533
    const n = Math.max(6, Math.min(8000, Math.ceil(iMax * dth * s.r)))
    for (let k = 0; k <= n; k++) {
      const i = (k / n) * iMax
      const ang = s.th - i * dth
      const x = pole.x + Math.cos(ang) * s.r
      const y = pole.y + Math.sin(ang) * s.r
      const a1 = Wm(i, L)
      if (a1 > CUTOFF) stroke(x, y, trail[s.tier], Math.min(0.95, a1), rad, norm)
      if (s.head) {
        const a2 = Wm(i, Lh) * HEAD_GAIN
        if (a2 > CUTOFF) stroke(x, y, trail[s.tier], Math.min(0.95, a2), radH, normH)
      }
    }
  }

  // 合成到底页色：深空 'lighter'（加色），纸面 'source-over'（墨压干版）；顺带盒式降采样回视口尺寸。
  // DEV = 冲印增益：底片本身按站点常数算出来就是"多数暗、极少数亮"（z 的幂分布），
  // 在 README 的缩略尺寸下几乎看不见，所以出图时统一提亮一档——**这是显示端的处理，
  // 不是站点的观感**，README 的图注里必须写明倍数。
  const base = V['ink-0']
  const dev = boost ? DEV_PAPER : DEV_DEEP
  const rgb = Buffer.alloc(W * H * 3)
  const cell = DPR * DPR
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let a = 0
      const c = [0, 0, 0]
      for (let j = 0; j < DPR; j++) {
        for (let i = 0; i < DPR; i++) {
          const k = (y * DPR + j) * RW + x * DPR + i
          a += A[k]
          c[0] += P[k * 3]
          c[1] += P[k * 3 + 1]
          c[2] += P[k * 3 + 2]
        }
      }
      a = Math.min(1, (a / cell) * dev)
      c[0] = (c[0] / cell) * dev
      c[1] = (c[1] / cell) * dev
      c[2] = (c[2] / cell) * dev
      const o = (y * W + x) * 3
      for (let ch = 0; ch < 3; ch++) {
        const v = boost ? base[ch] * (1 - a) + c[ch] : base[ch] + c[ch]
        rgb[o + ch] = v < 0 ? 0 : v > 255 ? 255 : Math.round(v)
      }
    }
  }
  return encodePng(W, H, rgb)
}

mkdirSync(OUT, { recursive: true })
for (const [name, theme] of [
  ['plate-deep-space.png', 'deep'],
  ['plate-paper.png', 'paper'],
]) {
  const png = render(theme)
  writeFileSync(join(OUT, name), png)
  console.log(`art: docs/assets/readme/${name} (${W}×${H}, ${(png.length / 1024).toFixed(1)} KB)`)
}
console.log(
  `art: 复算常数 OMEGA=${OMEGA} DEP=${DEP} HEAD_GAIN=${HEAD_GAIN} 底片=${PLATE_OM}/${PLATE_FADE}/${PLATE_STEPS} 星=${stars.length} RND_R=${RND_R} 天极=(${POLE_FX},${POLE_FY}) 环带=${JSON.stringify(bands)} | 显示端 超采样=${DPR}x 冲印增益=深空${DEV_DEEP}/纸面${DEV_PAPER}`
)
