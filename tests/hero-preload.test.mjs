// 首屏 hero 预加载的钉子：index.html 首帧脚本里那条 preload 的 URL，必须与 site.css
// 两个主题块各自的 --hero-img 逐字同值。
// 为什么要钉：URL 一份在 CSS、一份在 HTML 的内联脚本，两边没有 import 关系，漂开是静默的——
// 浏览器会先下另一张（1.5MB），等 CSS 匹配上再下真正那张，首屏从"两跳"变成"两跳 + 白下一张"。
// 换 bake 源（build_plate_bg.ps1 的产物名）时最容易只改 CSS 那一侧。
// 跑法：npm test（零依赖，Node 内置 test runner）
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = (p) => readFileSync(join(ROOT, p), 'utf8')

const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '')

// 从样式表按"选择器带不带 [data-theme='out']"分出两档 hero URL。
// 只认 data-theme：那个皮肤网关属性已经退役（由 html:root 接替它的特异性），
// 而主题属性是活的分支，将来也在。
function heroUrls(css) {
  const body = stripComments(css)
  const found = {}
  for (const m of body.matchAll(/--hero-img:\s*url\(\s*['"]?([^'")]+?)\s*['"]?\s*\)/g)) {
    const open = body.lastIndexOf('{', m.index)
    const guard = Math.max(
      body.lastIndexOf('}', open),
      body.lastIndexOf(';', open),
      body.lastIndexOf('{', open - 1)
    )
    const selector = body.slice(guard + 1, open).trim()
    const isLight = /\[data-theme='out'\]/.test(selector) && !/:not\(\[data-theme='out'\]\)/.test(selector)
    found[isLight ? 'out' : 'well'] = { url: m[1], selector }
  }
  return found
}

function bootScript(html) {
  const m = html.match(/<script>([\s\S]*?)<\/script>/)
  if (!m) throw new Error('index.html 里找不到无属性的 <script> 块——改了写法要同步改这条判据')
  return m[1]
}

// 跑 index.html 里那段真脚本，收它挂进 <head> 的元素。桩的依赖面就是脚本用到的那些：
// documentElement.dataset / style.setProperty / createElement / head.appendChild。
function runBoot(code, stored) {
  const appended = []
  const doc = {
    documentElement: { dataset: {}, style: { setProperty() {} } },
    createElement: () => ({ setAttribute(k, v) { this[k] = v } }),
    head: { appendChild: (el) => appended.push(el) },
  }
  const ctx = {
    document: doc,
    localStorage: { getItem: (k) => (k === 'en-theme' ? stored : null), setItem: () => {} },
  }
  new Function(...Object.keys(ctx), code)(...Object.values(ctx))
  return { theme: doc.documentElement.dataset.theme, appended }
}

const preloadOf = (r) => r.appended.filter((el) => el.rel === 'preload')

const hero = heroUrls(src('src/styles/site.css'))

test('site.css 里两档主题各有一条 --hero-img，且不是同一张', () => {
  assert.ok(hero.out, '找不到亮色档的 --hero-img（主题块的选择器改了要同步这里）')
  assert.ok(hero.well, '找不到深色档的 --hero-img')
  assert.notEqual(hero.out.url, hero.well.url, '两档同图则预加载失去主题意义')
})

test('首帧 preload 的正是当前主题那张 hero', () => {
  const code = bootScript(src('index.html'))
  for (const theme of ['out', 'well']) {
    const pre = preloadOf(runBoot(code, theme))
    assert.equal(pre.length, 1, `主题=${theme} 时应该只挂一条 preload`)
    assert.equal(pre[0].href, hero[theme].url, `${theme} 预加载的是 ${pre[0].href}，CSS 要的是 ${hero[theme].url}`)
    assert.equal(
      pre[0].as,
      'image',
      'as 不是 image 浏览器按别的资源类型取，缓存对不上等于白下一份'
    )
    assert.equal(
      pre[0].fetchpriority,
      'high',
      'hero 是 LCP 元素，不加 fetchpriority 就排在别的图后面'
    )
  }
})

test('没存过 / 存过垃圾值时，预加载跟着浅色那张（与首开浅色同口径）', () => {
  const code = bootScript(src('index.html'))
  for (const stored of [null, 'dark', '']) {
    const r = runBoot(code, stored)
    assert.equal(r.theme, 'out', `stored=${JSON.stringify(stored)} 该落浅色`)
    assert.equal(preloadOf(r)[0].href, hero.out.url, '预加载的那张必须跟着兜底档走')
  }
})

// 反向对照：判据不是恒绿的。三种漂开都必须被判出来。
test('负向对照：本文件的判据抓得住 URL 漂开、漏挂与 as 写错', () => {
  const html = src('index.html')
  // ⑴ 两边对调（最可能的漂开法：改了 CSS 忘了 HTML 这张）
  const swapped = html.replace(
    /const HERO_IMG = \{[^}]*\}/,
    `const HERO_IMG = { out: '${hero.well.url}', well: '${hero.out.url}' }`
  )
  const s = preloadOf(runBoot(bootScript(swapped), 'out'))[0]
  assert.notEqual(s.href, hero.out.url, '对调了还判不出，量具是瞎的')
  // ⑵ 压根没挂 preload
  const none = html.replace(/const HERO_IMG[\s\S]*?appendChild\(heroPre\)/, '')
  assert.equal(preloadOf(runBoot(bootScript(none), 'out')).length, 0, '删掉整段却还判出 preload，桩在自欺')
  // ⑶ as 写成别的
  const badAs = html.replace("heroPre.as = 'image'", "heroPre.as = 'fetch'")
  assert.notEqual(preloadOf(runBoot(bootScript(badAs), 'out'))[0].as, 'image')
  // ⑷ fetchpriority 漏了
  const badPri = html.replace("heroPre.setAttribute('fetchpriority', 'high')", '')
  assert.equal(preloadOf(runBoot(bootScript(badPri), 'out'))[0].fetchpriority, undefined)
})
