// 沉浸光标开关总线：顶栏按钮与 NeoCursor 组件共享
// 默认关闭（系统光标优先）；用户开启后由 localStorage 记忆。
// capable 由 NeoCursor 挂载时写入（需精细指针且未开启「减弱动效」），顶栏据此禁用按钮。
import { reactive } from 'vue'

const KEY = 'en-cursor'

export const cursor = reactive({
  on: localStorage.getItem(KEY) === 'on',
  capable: false,
})

export function applyCursor(on) {
  cursor.on = on
  localStorage.setItem(KEY, on ? 'on' : 'off')
}

export function toggleCursor() {
  applyCursor(!cursor.on)
}
