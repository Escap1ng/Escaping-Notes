// 井底/井外双主题 store：切换是叙事行为（一次逃逸/一次下井）
import { reactive } from 'vue'

export const theme = reactive({
  mode: localStorage.getItem('en-theme') === 'out' ? 'out' : 'well',
})

export function applyTheme(t) {
  theme.mode = t
  document.documentElement.dataset.theme = t
  localStorage.setItem('en-theme', t)
}

export function toggleTheme() {
  applyTheme(theme.mode === 'well' ? 'out' : 'well')
}
