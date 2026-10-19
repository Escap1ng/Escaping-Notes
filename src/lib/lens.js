// 指针透镜：把指针坐标写入 --lx/--ly，供 .en-lens::after 画跟随光斑
// 用法：元素上 @pointermove="onLens"
export function onLens(e) {
  // 触屏拖动同样会发 pointermove：跟着滚动改 520px 光斑坐标只是白重绘，
  // 而且光斑本来就不是"手指的反馈"（触屏没有悬停态）
  if (e.pointerType === 'touch') return
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  el.style.setProperty('--lx', `${e.clientX - r.left}px`)
  el.style.setProperty('--ly', `${e.clientY - r.top}px`)
}
