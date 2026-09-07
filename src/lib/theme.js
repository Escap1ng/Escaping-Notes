// 深空/纸面双主题 store：切换是叙事行为（一次夜拍/一次显影）
import { reactive } from 'vue'

export const theme = reactive({
  mode: localStorage.getItem('en-theme') === 'well' ? 'well' : 'out',
})

export function applyTheme(t) {
  theme.mode = t
  document.documentElement.dataset.theme = t
  localStorage.setItem('en-theme', t)
}

export function toggleTheme() {
  applyTheme(theme.mode === 'well' ? 'out' : 'well')
}
