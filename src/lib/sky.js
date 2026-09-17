// 星空与长曝光底片是全站唯一的：StarTrails 只是架在这片天上的取景器，
// 路由切换 = 挪动相机，不是重铺一张底片。
// 这里只放"属于天空"的状态（底片像素、星群、天极、时钟、取景权）；
// 流速/衰减/指针/变星/流星属于相机，留在组件里。
// 故意不用 reactive：这些是每帧读写的画布状态，交给 Vue 等于每帧一次重渲染。

// 天极全站统一（视口分数）。首页原先偏右上是为了给左下宣言让位，
// 但两个相机若极点不同，导航后同心弧的圆心会跳 → "同一片天"当场穿帮。
export const POLE_FX = 0.62
export const POLE_FY = 0.38
export const MAXPX = 4.6e6 // 底片像素预算（超出则自动降 DPR）

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

// fall 转场期间离开方与进入方并存约 220ms（leave 0.22s / enter 0.42s）。
// 两台相机同时往同一张底片沉积会画双份、且 resize 互相清屏，所以底片同一时刻只认一个主人。
// 后挂载者接管：先挂载那台停帧，它屏幕上留着的是同一张底片的最后一帧，重叠期又在模糊转场里，看不出来。
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
  const dpr = Math.min(2, window.devicePixelRatio || 1, Math.sqrt(MAXPX / (w * h)))
  if (sky.acc && sky.w === w && sky.h === h && sky.dpr === dpr) return false
  const prev = sky.acc // 旧底片：已感的光要带走，不能因为视口高了十几px 就整张倒掉
  const prevW = sky.w
  const prevH = sky.h
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
  // 这里把旧底片等比铺进新底片：极点是按新尺寸重算的，所以弧会有一两度漂移——
  // 漂移可接受，黑屏不可接受。
  if (prev && prevW && prevH) {
    plateSpace()
    sky.accCtx.globalAlpha = 1
    sky.accCtx.drawImage(prev, 0, 0, prev.width, prev.height, 0, 0, w, h)
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
