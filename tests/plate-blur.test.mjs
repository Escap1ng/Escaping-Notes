// 底片模糊参数的钉子：它是**用户手调**的量，且它的键名与上限在两个文件里各写了一份
// （src/lib/storage.js 用 PREFIX 拼，index.html 的首帧内联只能写字面量）。
// 为什么要钉：这两处一旦漂开，症状是"每次进页先清晰一闪"或"设置根本不生效"，
// 都不报错、都不进日志——正是 storage.js 顶上那段注释点名要避免的那类静默丢失。
// 跑法：npm test（Node 内置 test runner，零依赖）
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = (p) => readFileSync(join(ROOT, p), 'utf8')

// plate.js 在模块求值时就要 read() 一次 localStorage，且 applyBlur 会碰 document；
// 而它 import 的 vue/runtime-dom 在导入阶段就要 doc.createElement。
// 这里只垫这三样真正被用到的东西——不是"造一个 DOM"，是被测代码的依赖面就这么大。
const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
}
const fakeEl = () => ({
  style: { setProperty() {} },
  dataset: {},
  setAttribute() {},
  removeAttribute() {},
  appendChild() {},
  childNodes: [],
  content: { childNodes: [] },
})
globalThis.document = {
  createElement: fakeEl,
  createElementNS: fakeEl,
  createTextNode: fakeEl,
  createComment: fakeEl,
  querySelector: () => null,
  addEventListener() {},
  removeEventListener() {},
  documentElement: { dataset: {}, style: { setProperty() {} } },
}

const { clampBlur, BLUR_MIN, BLUR_MAX, BLUR_DEFAULT, applyBlur } = await import('../src/lib/plate.js')
const { KEYS } = await import('../src/lib/storage.js')

test('clampBlur：越界夹住、非数值走默认档', () => {
  assert.equal(BLUR_MIN, 0)
  assert.equal(BLUR_MAX, 12)
  assert.equal(BLUR_DEFAULT, 12) // 默认拉满是作者定的口味，改它要连 neo.css 与 index.html 一起
  assert.equal(clampBlur('8'), 8)
  assert.equal(clampBlur('8.6'), 9) // 滑杆 step=1，半档要落到整数而不是留小数
  assert.equal(clampBlur('0'), 0) // 0 是"用户明确要清晰"，不能被当成没存过
  assert.equal(clampBlur('-5'), 0)
  assert.equal(clampBlur('999'), 12)
  assert.equal(clampBlur('abc'), BLUR_DEFAULT)
  assert.equal(clampBlur(''), BLUR_DEFAULT)
  assert.equal(clampBlur(null), BLUR_DEFAULT)
  assert.equal(clampBlur(undefined), BLUR_DEFAULT)
  assert.equal(clampBlur('abc', 0), 0) // 显式给兜底时不许偷偷换成默认档
})

test('applyBlur 写存储、且 0 不留下 data 属性', () => {
  const el = globalThis.document.documentElement
  applyBlur(7)
  assert.equal(el.dataset.plateBlur, '7')
  assert.equal(store.get(KEYS.blur), '7')
  applyBlur(0)
  assert.equal('plateBlur' in el.dataset, false) // 留着 data-plate-blur="0" 等于白建渲染面
  assert.equal(store.get(KEYS.blur), '0')
  applyBlur(999) // 越界输入要在写存储之前就被夹住
  assert.equal(el.dataset.plateBlur, '12')
  assert.equal(store.get(KEYS.blur), '12')
})

test('默认档 12 在三处同口径：lib / neo.css / index.html', () => {
  const html = src('index.html')
  const css = src('src/styles/neo.css')
  assert.ok(html.includes("'" + KEYS.blur + "'"), 'index.html 必须按这个键名读')
  assert.ok(html.includes('dataset.plateBlur'), '首帧要写同一个 data 属性，否则 App.vue 的门控不生效')
  assert.ok(html.includes('--plate-blur'), '首帧要写同一个 CSS 变量')
  const line = (html.match(/const blur = .*/) || [''])[0]
  assert.ok(line.length > 0, 'index.html 里那行求值语句还在吗')
  // 没存过的兜底 = BLUR_DEFAULT；存过的夹进 [MIN, MAX]。两处数字漂开就是"进页先跳一下糊度"
  assert.ok(line.includes(`: ${BLUR_DEFAULT}`), `index.html 的兜底档必须是 ${BLUR_DEFAULT}`)
  assert.ok(
    line.includes(`Math.min(${BLUR_MAX}, Math.max(${BLUR_MIN},`),
    `index.html 必须自己夹一遍 ${BLUR_MIN}–${BLUR_MAX}（手改过的 999 不能直接进 filter）`
  )
  assert.ok(css.includes(`--plate-blur: ${BLUR_DEFAULT}px`), `neo.css 的初值必须是 ${BLUR_DEFAULT}px`)
})

// 反向对照：桩没垫好、或内联脚本被改成不夹上限，上面几条必须真的红。
test('负向对照：本文件的判据抓得住我造的假', () => {
  assert.notEqual(clampBlur('999'), 999)
  assert.notEqual(clampBlur('abc'), NaN)
  const html = src('index.html')
  assert.ok(!/Math\.min\(\s*99/.test(html))
  assert.equal(KEYS.blur.startsWith('en-'), true) // 命名规约：前缀必须是 en-
})
