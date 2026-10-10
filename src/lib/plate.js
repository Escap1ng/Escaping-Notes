// 底片外观 store。模糊不是烘死在素材里的属性，而是用户可调参数：
// 素材一律出清晰版（bg:build 里 BLUR_DRAWER=1），糊不糊、糊几档由这里在运行时决定，
// 所以滑杆从 0（真清晰）到 12（最糊）两端都有实义——糊的那一端不是把细节抹掉，是拿细节去换柔。
//
// 默认值 BLUR_DEFAULT = 12（作者 2026-10-10 定的口味：进站即柔）。
// 这个数在三处出现：这里的 BLUR_DEFAULT、neo.css 的 --plate-blur 初值、index.html 首帧内联的
// 兜底。由 tests/plate-blur.test.mjs 钉住不许漂开——漂开的症状是"进页先糊一下再变清晰"或反之。
//
// 与 theme.js 同一模子：初始值从 localStorage 读，写回时同时改 <html> 的自定义属性与 data 属性。
import { reactive } from 'vue'
import { KEYS, read, write } from './storage.js'

export const BLUR_MIN = 0
export const BLUR_MAX = 12
export const BLUR_DEFAULT = 12

// 存储里可能是 null / 'abc' / '12.7' / '999'，一律收成 0–12 的整数：
// 滑杆的 step 是 1px，而 CSS 那边不接受 NaN（整条 filter 会失效，底片反而变成不糊也不透明）。
// 第二参数是"没存过时用什么"，默认走 BLUR_DEFAULT。
export function clampBlur(v, fallback = BLUR_DEFAULT) {
  const n = Number(v)
  if (v === null || v === undefined || v === '' || !Number.isFinite(n)) return fallback
  return Math.min(BLUR_MAX, Math.max(BLUR_MIN, Math.round(n)))
}

export const plate = reactive({
  blur: clampBlur(read(KEYS.blur, null)),
})

export function applyBlur(px) {
  const v = clampBlur(px)
  plate.blur = v
  const el = document.documentElement
  el.style.setProperty('--plate-blur', `${v}px`)
  if (v > 0) el.dataset.plateBlur = String(v)
  else delete el.dataset.plateBlur
  write(KEYS.blur, v)
  return v
}
