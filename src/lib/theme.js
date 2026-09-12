// 深空/纸面双主题 store：切换是叙事行为（一次夜拍/一次显影）
// 初始值直接采用 index.html 首帧内联脚本已写入的 data-theme（存储值优先 → 系统偏好 → 深空），
// 默认值逻辑只保留在那一处，避免首帧与运行时不一致。未写入时回落到深空。
import { reactive } from 'vue'

export const theme = reactive({
  mode: document.documentElement.dataset.theme === 'out' ? 'out' : 'well',
})

export function applyTheme(t) {
  theme.mode = t
  document.documentElement.dataset.theme = t
  localStorage.setItem('en-theme', t)
}

export function toggleTheme() {
  applyTheme(theme.mode === 'well' ? 'out' : 'well')
}
