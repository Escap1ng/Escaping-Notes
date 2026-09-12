// 统一的事件去抖：resize 拖拽窗口时每秒可触发上百次，而各处的处理逻辑大多要
// 重建画布 / 重新测量布局，代价不低。约定：静默 150ms 后只执行一次。
// 返回值带 cancel()，供组件卸载时清掉挂起的定时器。
export function debounce(fn, ms = 150) {
  let timer = 0
  function wrapped(...args) {
    clearTimeout(timer)
    timer = setTimeout(() => {
      timer = 0
      fn(...args)
    }, ms)
  }
  wrapped.cancel = () => {
    clearTimeout(timer)
    timer = 0
  }
  return wrapped
}
