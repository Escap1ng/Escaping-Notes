// 深色/浅色双主题 store：切换是叙事行为（一次夜拍 / 一次显影），概念见 docs/design.md §2.2
// 首开浅色的默认值只在 index.html 的首帧内联脚本里决定一次：存储值优先，没存过则 'out'，
// 且刻意**不读 prefers-color-scheme**——首屏是一张亮底照片，跟着系统翻到深色会变成
// "亮图压在黑底上"。这里只读它写好的 data-theme，不重复实现默认逻辑。
import { reactive } from 'vue'
import { KEYS, write } from './storage.js'

// 唯一允许的重复：那段内联脚本没跑成（属性缺失、或值不是两档之一）时补同一记浅色兜底。
// 只补 data-theme、不调 applyTheme——写进 localStorage 等于把兜底值当成访客的选择永久固化；
// 也只在这条异常路径上写，正常首帧属性已经对了，一次都不写。判据见 tests/theme-default.test.mjs。
if (!['well', 'out'].includes(document.documentElement.dataset.theme)) {
  document.documentElement.dataset.theme = 'out'
}

export const theme = reactive({
  mode: document.documentElement.dataset.theme,
})

export function applyTheme(t) {
  theme.mode = t
  document.documentElement.dataset.theme = t
  write(KEYS.theme, t)
}

export function toggleTheme() {
  applyTheme(theme.mode === 'well' ? 'out' : 'well')
}
