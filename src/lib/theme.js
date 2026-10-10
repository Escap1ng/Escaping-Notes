// 深色/浅色双主题 store：切换是叙事行为（一次夜拍 / 一次显影），概念见 docs/design.md §2.2
// 初始值直接采用 index.html 首帧内联脚本已写入的 data-theme——**不读 prefers-color-scheme**：
// 首屏是一张亮底照片，跟着系统翻到深色会变成"亮图压在黑底上"。默认值只在那一处决定
//（存储值优先，没存过则 'out' 浅色），这里不重复实现；data-theme 意外缺失时回落 'well'。
import { reactive } from 'vue'
import { KEYS, write } from './storage.js'

export const theme = reactive({
  mode: document.documentElement.dataset.theme === 'out' ? 'out' : 'well',
})

export function applyTheme(t) {
  theme.mode = t
  document.documentElement.dataset.theme = t
  write(KEYS.theme, t)
}

export function toggleTheme() {
  applyTheme(theme.mode === 'well' ? 'out' : 'well')
}
