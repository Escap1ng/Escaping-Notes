// 指针透镜：把指针坐标写入 --lx/--ly，供 .neo-lens::after 画跟随光斑
// 用法：元素上 @pointermove="onLens"
export function onLens(e) {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  el.style.setProperty('--lx', `${e.clientX - r.left}px`)
  el.style.setProperty('--ly', `${e.clientY - r.top}px`)
}
