// 详情页（/blog/:slug 与 /projects/:slug）共用的「退回列表」：Esc 与点空白两处，一处实现。
// 为什么收在这里而不是各页写一份：这两个页面本来就是同一个动作（列表点进一页正文），
// 返回机制分叉成两套就是站内"点开看看"有七种样子的来路之一。
//
// 判据挂在 document 上而不是页面根元素上：阅读底板最宽 1280px，页根的盒子到板子底部就结束了，
// 板子下面那片空白属于 main——只挂页根就会漏掉最容易点中的那块区域。
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

export function useDetailExit(listPath, canExit = () => true) {
  const router = useRouter()

  function goBack() {
    if (!canExit()) return
    // 一律替换到列表，不用 router.back()：实测从深链接（分享进来的、刷新过的）按 back，
    // history.state.back 并不一定是 null——它可能指着首页，Esc 就成了"往回走两页"。
    // replace 之后浏览器后退仍然回到进列表之前的那一页，行为可预测，也不需要兜底分支。
    router.replace(listPath)
  }

  // 空白 = 阅读底板之外、也不在任何模态框里（灯箱那类自己吃点击与 Esc），且不是链接/按钮/顶栏/页脚
  const isBlank = (t) =>
    t instanceof Element &&
    !t.closest('.en-glass') &&
    !t.closest('[role="dialog"]') &&
    !t.closest('a, button, header, footer')

  let downOnBlank = false
  function onMousedown(e) {
    downOnBlank = isBlank(e.target)
  }
  function onClick(e) {
    // 按下与抬起都落在空白处才算一次「点空」：从正文里拖选文字、松手在板外时，
    // 浏览器会把 click 发到两者的共同祖先，少了这条判据就会误退
    if (downOnBlank && isBlank(e.target)) goBack()
    downOnBlank = false
  }
  function onKey(e) {
    if (e.key === 'Escape') goBack()
  }

  onMounted(() => {
    document.addEventListener('mousedown', onMousedown)
    document.addEventListener('click', onClick)
    document.addEventListener('keydown', onKey)
  })
  onUnmounted(() => {
    document.removeEventListener('mousedown', onMousedown)
    document.removeEventListener('click', onClick)
    document.removeEventListener('keydown', onKey)
  })

  return { goBack }
}
