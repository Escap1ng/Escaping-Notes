// 卡面档位 store：'solid' = 不透底（**默认**），'glass' = 那层 52% 的半透底。
// 值不住在设置卡里，与 plate.js / theme.js 同一模子：初始值从 localStorage 读，写回时同时改
// <html> 的 data 属性与存储。CSS 那边只有一条 [data-card-surface='glass'] 的覆盖块（site.css §3 之后），
// 默认档 solid 就是 CSS 自己算出来的样子——**没有属性、没有 JS、首帧内联没跑成，都还是不透底**；
// 反过来 'glass' 那一档要显式写上属性才生效。
//
// 为什么深色不给白而给不透明的 --ink-1：#fff 压在 --ink-0 的近黑页底上是一块块刺眼的白板，
// 卡内文字还得跟着翻色。同一档语义（卡片不透背景），两个色面各按主题给。
//
// 默认 'solid' 是作者 2026-10-11 定的口味。改它要连三处一起：这里的 CARD_DEFAULT、site.css 基础块的
// --card-bg、index.html 首帧内联认的那个值——由 tests/card-surface.test.mjs 钉住。
import { reactive } from 'vue'
import { KEYS, read, write } from './storage.js'

export const CARD_SOLID = 'solid'
export const CARD_GLASS = 'glass'
export const CARD_MODES = [CARD_SOLID, CARD_GLASS]
export const CARD_DEFAULT = CARD_SOLID

// 存储里可能是 null / 'white' / 'SOLID' / 手改过的任意串，一律收成两档之一，认不出的回默认档。
// 不能直接把读出来的值写进 CSS：那是"外观由地址栏决定"的老路——宁可退回原样也不渲染一个未知档。
export function clampCardMode(v, fallback = CARD_DEFAULT) {
  return CARD_MODES.includes(v) ? v : fallback
}

export const cardSurface = reactive({
  mode: clampCardMode(read(KEYS.cardSurface, null)),
})

export function applyCardSurface(mode) {
  const v = clampCardMode(mode)
  cardSurface.mode = v
  const el = document.documentElement
  if (v === CARD_GLASS) el.dataset.cardSurface = v
  else delete el.dataset.cardSurface
  write(KEYS.cardSurface, v)
  return v
}
