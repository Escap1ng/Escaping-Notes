// 星空与长曝光底片是全站唯一的：StarTrails 只是架在这片天上的取景器，
// 路由切换 = 挪动相机，不是重铺一张底片。
// 这里只放"属于天空"的状态（底片像素、星群、天极、时钟、取景权）；
// 流速/衰减/指针/流星属于相机，留在组件里。
// 故意不用 reactive：这些是每帧读写的画布状态，交给 Vue 等于每帧一次重渲染。

// 天极全站统一（视口分数）。原先是 0.62/0.38——偏右上是给当年贴左下的宣言让位；
// 首屏改成居中排版后，环心就该跟着回到水平正中，否则"偏心"没有对象了，只剩一侧空一侧挤。
// 但两个相机若极点不同，导航后同心弧的圆心会跳 → "同一片天"当场穿帮，所以仍必须全站一处。
export const POLE_FX = 0.5
export const POLE_FY = 0.38
export const MAXPX = 9e6 // 底片像素预算（超出则自动降 DPR）
// 底片内部分辨率的下限。**2026-10-07 第六轮之后，它治病的理由已经不成立了**：
// 当时量的是"底片网格上的覆盖度谷/峰"（0.94 设备 px 是 0.25，1.87 是 0.79），可 1× 屏上眼睛
// 采样的网格是 1 CSS px = 1 设备像素，把底片栅格加密并不动它——重算下来 p=1 是 0.33、
// p=1.645 是 0.34、p=2 是 0.24，等于没修；真正压住起伏的是把线本身加粗（见 StarTrails 的
// LW_BASE/LW_SPAN 与 design.md §10 ⑯）。而且在他的 2546×1307 上 `min(2, 1.8, √(9e6/(w·h)))`
// 出 1.645，**这个下限连自己都被像素预算夹掉了**。
// 现在保留它的唯一理由是弧线几何的平滑度（超采样让同心弧的台阶更细），**这一条没量过**。
// 代价是 1× 大屏每帧全屏 destination-out + drawImage 多 2.7× 像素（1920×1080：2.07MP→6.2MP）。
// 等他的 fps 读数决定要不要退回 `dpr = devicePixelRatio` + 4.6MP —— 别把 1.8 当成已生效的下限。
export const MIN_DPR = 1.8

export const sky = {
  acc: null, // 长曝光底片（离屏累积缓冲）
  accCtx: null,
  w: 0, // 天区 CSS 尺寸 = 视口；各相机按自己的盒子缩放绘制
  h: 0,
  dpr: 1,
  theme: '', // 底片是在哪个主题下沉积的：换主题 = 换一张底片（防串色）
  plateBuilt: false, // reduced-motion 的静态底片只冲一次
  stars: null, // 星群属于天空，不属于相机
  feat: [], // 独立尾部消失的星轨：[{ i, t0 }]，t0 对齐 sky.t0 时钟
  featNext: 0,
  pole: { x: 0, y: 0 },
  maxR: 1,
  t0: 0, // 全站共用时钟：跨路由连续，星角不会因为换页而归零
  owner: null, // 当前往底片上沉积的相机
}

// fall 转场期间离开方与进入方并存约 260ms（leave 0.26s / enter 0.44s）。
// 两台相机同时往同一张底片沉积会画双份、且 resize 互相清屏，所以底片同一时刻只认一个主人。
// 后挂载者接管。**只锁沉积，不锁重绘**：交出底片那台照样每帧 draw() 同一张底片，
// 否则它在淡出的 260ms 里冻在半帧上——那正是"切换顿挫"的来源（design.md §10 ⑥）。
export function claimPlate(who) {
  sky.owner = who
}

export function ownsPlate(who) {
  return sky.owner === who
}

export function releasePlate(who) {
  if (sky.owner === who) sky.owner = null
}

// 分配/复用底片。尺寸或 DPR 变了就必须重开一张（像素无法无损搬），此时 plateBuilt 作废。
// 返回 true = 这是一张新底片。注意：换页**不**新建，尺寸不变就直接沿用旧的。
export function ensurePlate() {
  const w = innerWidth
  const h = innerHeight
  if (!w || !h) return false
  // 想要的分辨率：设备 DPR 与"不串珠"的 1.8 里取大的；再被上限 2 与像素预算夹住
  const want = Math.max(MIN_DPR, window.devicePixelRatio || 1)
  const dpr = Math.min(2, want, Math.sqrt(MAXPX / (w * h)))
  if (sky.acc && sky.w === w && sky.h === h && sky.dpr === dpr) return false
  const prev = sky.acc // 旧底片：已感的光要带走，不能因为视口高了十几px 就整张倒掉
  const prevW = sky.w
  const prevH = sky.h
  const prevPoleX = prevW * POLE_FX
  const prevPoleY = prevH * POLE_FY
  const prevMaxR =
    prevW && prevH
      ? Math.hypot(Math.max(prevPoleX, prevW - prevPoleX), Math.max(prevPoleY, prevH - prevPoleY))
      : 0
  sky.acc = document.createElement('canvas')
  sky.accCtx = sky.acc.getContext('2d')
  sky.w = w
  sky.h = h
  sky.dpr = dpr
  sky.acc.width = Math.max(2, Math.round(w * dpr))
  sky.acc.height = Math.max(2, Math.round(h * dpr))
  sky.pole.x = w * POLE_FX
  sky.pole.y = h * POLE_FY
  sky.maxR = Math.hypot(Math.max(sky.pole.x, w - sky.pole.x), Math.max(sky.pole.y, h - sky.pole.y))
  sky.plateBuilt = false
  // 移动端地址栏收放会改 innerHeight → 触发 resize → 走到这里。旧写法直接留一张空白底片，
  // 等于用户第一次滚动就把整夜的曝光倒掉，而且只发生在手机上（桌面测不出来）。
  // 但搬运必须是**相似变换**（等比缩放 + 把旧天极对到新天极），不能按 x / y 两个轴各拉伸一次：
  // 首屏滚动条一出现 innerWidth 就少 ~17px，两轴拉伸会把已经感光的弧压成椭圆——轴比差 0.7%，
  // 在 r≈1800 的长弧上等于两轴半径差 ~12px，肉眼直接读出"不是正圆"，而星轨恰恰要活几分钟。
  // 缩放比取 maxR 之比（也就是天空的取景缩放），新框仍被底片盖满；极点按新尺寸重算带来的
  // 那一两度漂移仍在——漂移可接受，黑屏和椭圆不可接受。
  if (prev && prevMaxR) {
    const s = sky.maxR / prevMaxR
    plateSpace()
    sky.accCtx.globalAlpha = 1
    sky.accCtx.drawImage(
      prev,
      0,
      0,
      prev.width,
      prev.height,
      sky.pole.x - prevPoleX * s,
      sky.pole.y - prevPoleY * s,
      prevW * s,
      prevH * s
    )
  }
  return true
}

export function resetPlate() {
  const c = sky.accCtx
  if (!c || !sky.acc) return
  c.setTransform(1, 0, 0, 1, 0, 0)
  c.globalCompositeOperation = 'source-over'
  c.globalAlpha = 1
  c.clearRect(0, 0, sky.acc.width, sky.acc.height)
  c.setTransform(sky.dpr, 0, 0, sky.dpr, 0, 0)
  sky.plateBuilt = false
}

// 底片笔触的统一入口：accPass 每帧会切好几次变换，收尾必须还原成"天区 CSS 坐标"。
// ⚠ globalCompositeOperation 这一行是承重的，不是冗余：衰减 pass 把合成模式留在
// 'destination-out'，短弧若不切回 'source-over' 就是在**擦除**底片而非曝光，
// 累积缓冲会永远保持全透明（星轨根本不出现）。
export function plateSpace() {
  const c = sky.accCtx
  if (!c) return
  c.setTransform(sky.dpr, 0, 0, sky.dpr, 0, 0)
  c.globalCompositeOperation = 'source-over'
  c.lineCap = 'round'
  c.lineJoin = 'round'
}
