// 首开浅色的钉子。这条口径散在三处：index.html 的首帧内联脚本（默认值的唯一来源）、
// src/lib/theme.js 的属性缺失兜底、src/styles/neo.css 的 `:not([data-theme='out'])` 兜底块。
// 为什么要钉：2026-10-10 之前它跟系统偏好走，改成固定浅色之后 storage.js 里还留着一个
// 与实现相反的死常量 THEME_DEFAULT='well'——不 import 就永远不报错，只在别人当它是口径时有害。
// 漂开的症状也是静默的：首开变成深色底、顶栏却画着浅色图标，不进日志、不进 CI。
// 跑法：npm test（Node 内置 test runner，零依赖）
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = (p) => readFileSync(join(ROOT, p), 'utf8')

const LIGHT = 'out' // 浅色 = 首开默认
const DARK = 'well'

const { KEYS } = await import('../src/lib/storage.js')

// ---------- 抽 index.html 里真正那段内联脚本来跑 ----------
function bootScript(html) {
  const m = html.match(/<script>([\s\S]*?)<\/script>/)
  if (!m) throw new Error('index.html 里找不到无属性的 <script> 块——改了写法要同步改这条判据')
  return m[1]
}

// 那段脚本的注释里就写着 "prefers-color-scheme"（记录的是"刻意不读它"这件事），
// 所以禁查询的判据只能看代码行，不然这条判据永远是红的。
function codeOnly(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

function runBoot(code, stored, prefersDark) {
  const store = new Map()
  if (stored !== null) store.set(KEYS.theme, stored)
  const writes = []
  const doc = { documentElement: { dataset: {}, style: { setProperty() {} } } }
  const ctx = {
    document: doc,
    localStorage: {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => {
        writes.push(k)
        store.set(k, v)
      },
    },
    // 桩语义：旧实现问的是 'light'，新实现压根不该问
    matchMedia: (q) => ({ matches: /light/.test(q) ? !prefersDark : prefersDark }),
  }
  new Function(...Object.keys(ctx), code)(...Object.values(ctx))
  return { theme: doc.documentElement.dataset.theme, writes }
}

// ---------- theme.js 的桩：与 plate-blur.test.mjs 同一套，被测代码的依赖面就这么大 ----------
const mem = new Map()
globalThis.localStorage = {
  getItem: (k) => mem.get(k) ?? null,
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
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

let cacheBust = 0
async function themeWith(attr) {
  mem.clear()
  delete globalThis.document.documentElement.dataset.theme
  if (attr !== null) globalThis.document.documentElement.dataset.theme = attr
  const url = pathToFileURL(join(ROOT, 'src/lib/theme.js'))
  url.searchParams.set('v', String(++cacheBust)) // 每档起始状态都要一次干净的模块求值
  return import(url.href)
}

test('首帧：没存过就是浅色，且完全不读系统偏好', () => {
  const code = bootScript(src('index.html'))
  assert.ok(!/matchMedia|prefers-color-scheme/.test(codeOnly(code)), '首帧脚本的代码里出现了系统偏好查询')
  for (const prefersDark of [true, false]) {
    const r = runBoot(code, null, prefersDark)
    assert.equal(r.theme, LIGHT, `系统${prefersDark ? '暗' : '亮'}都该给浅色`)
    assert.deepEqual(r.writes, [], '首帧不许把默认值写进 localStorage——那是替访客做选择')
  }
  // 源码级判据：兜底档与键名字面量都钉住（内联脚本只能写字面量，只能这样核对）
  const line = (code.match(/const stored = [\s\S]*?dataset\.theme = .*/) || [''])[0]
  assert.ok(line.length > 0, 'index.html 里那两行求值语句还在吗')
  assert.ok(line.includes(`'${KEYS.theme}'`), `index.html 必须按 ${KEYS.theme} 这个键名读`)
  assert.ok(line.includes(`: '${LIGHT}'`), `index.html 的兜底档必须是 ${LIGHT}（浅色）`)
})

test('首帧：存过的值优先，垃圾值回落浅色', () => {
  const code = bootScript(src('index.html'))
  assert.equal(runBoot(code, DARK, true).theme, DARK, '访客明确选过深色，别再替他改回浅色')
  assert.equal(runBoot(code, LIGHT, true).theme, LIGHT)
  assert.equal(runBoot(code, 'dark', true).theme, LIGHT, '手改过的非法值要落到浅色')
  assert.equal(runBoot(code, '', true).theme, LIGHT)
})

test('theme.js：data-theme 缺失时补浅色，且只补属性不写存储', async () => {
  const el = globalThis.document.documentElement
  const mod = await themeWith(null)
  assert.equal(el.dataset.theme, LIGHT)
  assert.equal(mod.theme.mode, LIGHT, 'store 与 CSS 属性不能各说各话')
  assert.equal(mem.get(KEYS.theme) ?? null, null, '兜底路径写进 localStorage 就等于固化成访客的选择')
})

test('theme.js：属性已经写上时一个都不改、不写', async () => {
  const el = globalThis.document.documentElement
  const dark = await themeWith(DARK)
  assert.equal(dark.theme.mode, DARK)
  assert.equal(el.dataset.theme, DARK)
  assert.equal(mem.get(KEYS.theme) ?? null, null)
  const light = await themeWith(LIGHT)
  assert.equal(light.theme.mode, LIGHT)
  assert.equal(mem.get(KEYS.theme) ?? null, null)
})

test('只有显式切换才落存储', async () => {
  const el = globalThis.document.documentElement
  const mod = await themeWith(LIGHT)
  mod.toggleTheme()
  assert.equal(el.dataset.theme, DARK)
  assert.equal(mem.get(KEYS.theme), DARK, '点了开关就该记住')
  mod.toggleTheme()
  assert.equal(el.dataset.theme, LIGHT)
  assert.equal(mem.get(KEYS.theme), LIGHT)
})

test('样式网关与兜底块：浅色调的是 §3，属性缺失才落到 §2', () => {
  const html = src('index.html')
  const css = src('src/styles/neo.css')
  assert.ok(/<html[^>]*data-skin='neo'|<html[^>]*data-skin="neo"/.test(html), '皮肤网关在 index.html 上硬编码')
  assert.ok(css.includes(`html[data-skin='neo'][data-theme='${LIGHT}']`), '浅色块的选择器还在吗')
  assert.ok(css.includes(`html[data-skin='neo']:not([data-theme='${LIGHT}'])`), '深色块要同时兜住属性缺失')
  assert.ok(!/深色（默认）/.test(css), 'neo.css 里别再声称深色是默认')
  assert.ok(!/THEME_DEFAULT/.test(src('src/lib/storage.js')), '默认值不许在 storage.js 留第二处')
})

// 反向对照：上面这些判据不是恒绿的——旧实现与造假都必须被判出来。
test('负向对照：本文件的判据抓得住假首开', () => {
  const old = bootScript(execFileSync('git', ['show', '011411d:index.html'], { cwd: ROOT, encoding: 'utf8' }))
  // 旧版跟系统走：同一探针下两档必须判出不同结果，否则这个量具是瞎的
  assert.equal(runBoot(old, null, true).theme, DARK)
  assert.equal(runBoot(old, null, false).theme, LIGHT)
  assert.notEqual(runBoot(old, null, true).theme, runBoot(old, null, false).theme)
  // 源码级判据对造假的兜底档必须不认
  const fake = "const stored = null\n document.documentElement.dataset.theme = stored ?? 'well'"
  assert.ok(!fake.includes(`: '${LIGHT}'`))
  assert.match(old, /matchMedia/)
  // 那条"禁查询"的判据拿去跑旧版必须抓得住（否则它只是被注释喂胖的摆设）
  assert.match(codeOnly(old), /matchMedia|prefers-color-scheme/)
})
