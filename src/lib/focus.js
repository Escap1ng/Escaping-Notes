// 焦点陷阱：把 Tab 循环限制在模态容器内（抽屉 / 灯箱）。
// 返回释放函数：解绑监听并把焦点还给打开前的元素。
// 只处理 Tab，不碰 Escape —— 各调用方已有自己的关闭逻辑。
const SEL =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function trapFocus(el) {
  if (!el) return () => {}
  const prev = document.activeElement

  function items() {
    return [...el.querySelectorAll(SEL)].filter((n) => n.offsetWidth || n.offsetHeight)
  }

  function onKey(e) {
    if (e.key !== 'Tab') return
    const list = items()
    // 容器内没有可聚焦元素：把 Tab 留在容器内，别让焦点跑到被遮挡的页面上
    if (!list.length) {
      e.preventDefault()
      el.focus()
      return
    }
    const first = list[0]
    const last = list[list.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  el.addEventListener('keydown', onKey)
  const first = items()[0]
  if (first) first.focus()
  else if (el.tabIndex >= 0 || el.hasAttribute('tabindex')) el.focus()

  return () => {
    el.removeEventListener('keydown', onKey)
    if (prev && typeof prev.focus === 'function') prev.focus()
  }
}
