// 首屏与章节区之间的接缝波脊：一条连续的山脊线（前层亮、后层暗），
// 包络是与整排同宽的 `sin(πu)`（正中最高、两端归零），包络里叠三列行波。
//
// 为什么不再是竖条（2026-10-30 第三次改版）：5px 竖条 + 2px 缝在 1440px 上是 204 根等宽柱子，
// 顶端还各自按整数 px 取整——读出来是频谱条/围栏，不是水也不是山脊；参考的波浪分隔线
// （shapedivider / getwaves 这类）一律是连续曲线。整排仍然压在折线上、只向上长，
// 因为它是"山的余脉"，不是独立装饰。
//
// 运动：三列不同波长、不同相速的行波同向推进（水的色散：长波快、短波慢），
// 叠在静止的钟形包络上——脊线在动、轮廓不动，于是它像水，不像整块带子在呼吸。
// 时间由调用方传进来（秒），本模块不持有状态，测试可以直接喂任意 t。
const TAU = Math.PI * 2

/** 脊线最高点（CSS px，等于画布高度） */
export const WAVE_PEAK = 86
/** 采样步长：6px 一段折线，在 86px 高的柔脊上看不出棱 */
export const WAVE_STEP = 6

// 三列行波：波长 px / 权重 / 角速度 rad·s⁻¹（相速 = ω·λ/2π ≈ 25 / 17 / 11 px·s⁻¹）
const TRAIN = [
  { len: 560, amp: 0.5, omega: 0.28 },
  { len: 190, amp: 0.33, omega: 0.55 },
  { len: 74, amp: 0.17, omega: 0.9 },
]

// 质感在包络上的摆幅：0.72 底 + 0.28 摆动，任何一列行波的叠加都不会把包络撕成几个小丘
const T_FLOOR = 0.72
const T_SWING = 0.28
const T_GAIN = 1.35 // 三列正弦叠加后的实际标准差偏小，先放大再夹

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

/** 行波之和（约 [-1, 1]，典型 ±0.5），t 秒 */
export function waveSum(x, t, phase = 0, timeScale = 1) {
  let s = 0
  for (const w of TRAIN) s += w.amp * Math.sin((TAU * x) / w.len - w.omega * t * timeScale + phase)
  return s
}

/**
 * 脊线在 x 处的归一高度（0..1，乘 WAVE_PEAK 得 px）。
 * layer: 0 = 前层（满高），1 = 后层（矮、慢、相位错开）
 */
export function ridgeHeight(x, width, t, layer = 0) {
  if (!(width > 0)) return 0
  const u = clamp01(x / width)
  const bell = Math.sin(Math.PI * u)
  const tex = clamp01(T_FLOOR + T_SWING * clamp01(0.5 + (waveSum(x, t, layer ? 2.3 : 0, layer ? 0.62 : 1) * T_GAIN * 0.5)))
  const scale = layer ? 0.62 : 1
  return bell * tex * scale
}

/** 一条脊线的 SVG `d`（viewBox 高度 = WAVE_PEAK，底边贴折线） */
export function ridgePath(width, t, layer = 0, step = WAVE_STEP) {
  const w = Math.max(2, Math.round(width))
  let d = `M0,${WAVE_PEAK}`
  for (let x = 0; x <= w; x += step) {
    const y = WAVE_PEAK - ridgeHeight(x, w, t, layer) * WAVE_PEAK
    d += `L${x},${y.toFixed(1)}`
  }
  d += `L${w},${WAVE_PEAK}Z`
  return d
}
