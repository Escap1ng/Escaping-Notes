// 文档滚动深度（0..1）的单一来源：由 App.vue 的 applyShift 每帧写入。
// canvas 装置在 rAF 里直接读它，避免自建 scroll 监听或每帧读 DOM（见 design-neo §9.4）。
// 故意不用 reactive：每帧变更会触发 Vue 重渲染，这里只需要一个可变的普通数值。
export const shift = { v: 0 }
