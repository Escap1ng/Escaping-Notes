// 山体轮廓与首页山脊遮罩（StarTrails 的取景裁切）。
// 底片（sky.acc）全站共享，但山只存在于首页地景横带（.hero-plate 的那张照片）里，
// 所以遮挡只能做在**绘制时**、按相机裁：若在沉积时按山切弧，次级页（背景无山）
// 会在同一张底片上读出一圈缺角。遮罩是一张 alpha 画布，draw() 末尾 destination-in 上去。
//
// alpha 剖面（逐列）：脊线以下 = 0；脊线以上 FEATHER px 由 0 羽化到 ALT_FLOOR；
// 再往上 ALT_K 个视口高度由 ALT_FLOOR 回升到 1。后半段是大气透视——贴近地平线的
// 星轨本来就该比天顶淡，顺带把"山体上不要星轨"的边界做成梯度而不是剪纸边。
//
// 轮廓是在 bake 产物的网格叠图上手工描的（u/v 归一、每列单值），两套：
//   out  = plate-hero.jpg  6000x1860（源 hero.jpg 的 700..2560 行）
//   deep = plate-bg-deep.jpg 1600x1067（**另一张照片** plate1.jpg 全幅虚化）
// 换 bake 源（scripts/build_plate_bg.ps1 的 SRC_HERO / SRC_PLATE）就必须重描这两条折线。
export const RIDGE_BIAS = 10 // px：遮罩边界整体上移，给描线误差与脊尖留余量
export const RIDGE_FEATHER = 26 // px：0 → ALT_FLOOR 的羽化带
export const RIDGE_ALT_K = 0.22 // 高度衰减带占视口高的比例
export const RIDGE_ALT_FLOOR = 0.62 // 羽化带顶的遮罩值（脊线附近星轨亮度保留到六成）

// 扁平 [u0,v0,u1,v1,...]，u 单调递增
const OUT = [
  0.0, 0.7, 0.01, 0.708, 0.02, 0.735, 0.03, 0.755, 0.04, 0.76, 0.05, 0.775,
  0.06, 0.78, 0.07, 0.775, 0.08, 0.782, 0.09, 0.772, 0.1, 0.78, 0.11, 0.778,
  0.12, 0.782, 0.13, 0.778, 0.14, 0.77, 0.15, 0.778, 0.16, 0.768, 0.17, 0.778,
  0.18, 0.77, 0.19, 0.768, 0.2, 0.76, 0.21, 0.752, 0.22, 0.745, 0.23, 0.735,
  0.24, 0.73, 0.25, 0.72, 0.26, 0.7, 0.275, 0.69, 0.3, 0.62, 0.325, 0.565,
  0.35, 0.51, 0.375, 0.452, 0.4, 0.395, 0.425, 0.34, 0.45, 0.285, 0.46, 0.252,
  0.475, 0.262, 0.49, 0.238, 0.515, 0.208, 0.525, 0.24, 0.55, 0.315, 0.575, 0.385,
  0.6, 0.45, 0.625, 0.485, 0.632, 0.475, 0.65, 0.52, 0.675, 0.56, 0.7, 0.605,
  0.725, 0.632, 0.75, 0.62, 0.76, 0.61, 0.775, 0.635, 0.8, 0.66, 0.825, 0.67,
  0.85, 0.645, 0.875, 0.672, 0.9, 0.685, 0.925, 0.69, 0.95, 0.7, 0.975, 0.705,
  1.0, 0.71,
]
const DEEP = [
  0.0, 0.492, 0.1, 0.492, 0.18, 0.47, 0.2, 0.44, 0.25, 0.4, 0.3, 0.36,
  0.33, 0.32, 0.36, 0.34, 0.41, 0.29, 0.45, 0.36, 0.5, 0.38, 0.55, 0.4,
  0.6, 0.38, 0.66, 0.35, 0.7, 0.39, 0.75, 0.45, 0.8, 0.492, 0.9, 0.5,
  1.0, 0.5,
]
export const RIDGES = {
  out: { ar: 6000 / 1860, pts: OUT },
  deep: { ar: 1600 / 1067, pts: DEEP },
}

function ridgeV(pts, u) {
  const n = pts.length / 2
  if (u <= pts[0]) return pts[1]
  for (let i = 1; i < n; i++) {
    if (u <= pts[i * 2]) {
      const u0 = pts[(i - 1) * 2]
      const v0 = pts[(i - 1) * 2 + 1]
      const u1 = pts[i * 2]
      const v1 = pts[i * 2 + 1]
      return v0 + (v1 - v0) * ((u - u0) / (u1 - u0 || 1))
    }
  }
  return pts[pts.length - 1]
}

// key: 'out' | 'deep'；band: 地景横带在画布 CSS 坐标里的盒子 {x,y,w,h}。
// 背景是 cover + background-position 50% 0（顶边钉死、水平居中），cover 变换在这里复算一遍，
// 于是任何视口比例下遮罩都压在照片同一座山上。返回半分辨率 alpha 画布（承载的是平滑梯度，
// 上采样不回引入台阶），或 null（无地景盒子 = 次级页，不遮）。
export function buildRidgeMask(key, W, H, band) {
  const rg = RIDGES[key]
  if (!rg || !band || band.w < 2 || band.h < 2 || W < 2 || H < 2) return null
  const S = 0.5
  const cw = Math.max(2, Math.round(W * S))
  const ch = Math.max(2, Math.round(H * S))
  const cv = document.createElement('canvas')
  cv.width = cw
  cv.height = ch
  const g = cv.getContext('2d')
  g.fillStyle = '#fff'
  g.fillRect(0, 0, cw, ch)
  const iwS = Math.max(band.w, band.h * rg.ar) // iw·scale
  const ihS = iwS / rg.ar
  const ox = band.x + (band.w - iwS) / 2
  const oy = band.y
  g.globalCompositeOperation = 'destination-out'
  const bias = RIDGE_BIAS * S
  const fea = RIDGE_FEATHER * S
  const alt = RIDGE_ALT_K * H * S
  const dip = 1 - RIDGE_ALT_FLOOR
  const step = 2
  for (let x = 0; x < cw; x += step) {
    const u = (x / S - ox) / iwS
    const r = (oy + ridgeV(rg.pts, u) * ihS) * S
    const y1 = r - bias
    const y0 = y1 - fea
    const yA = y0 - alt
    if (y0 > 0) {
      const top = Math.max(0, yA)
      const ga = g.createLinearGradient(0, yA, 0, y0)
      ga.addColorStop(0, 'rgba(0,0,0,0)')
      ga.addColorStop(1, `rgba(0,0,0,${dip})`)
      g.fillStyle = ga
      g.fillRect(x, top, step, y0 - top)
    }
    if (y1 > y0) {
      const gb = g.createLinearGradient(0, y0, 0, y1)
      gb.addColorStop(0, `rgba(0,0,0,${dip})`)
      gb.addColorStop(1, 'rgba(0,0,0,1)')
      g.fillStyle = gb
      g.fillRect(x, y0, step, y1 - y0)
    }
    g.fillStyle = '#000'
    g.fillRect(x, Math.max(0, y1), step, ch - Math.max(0, y1))
  }
  g.globalCompositeOperation = 'source-over'
  return cv
}
