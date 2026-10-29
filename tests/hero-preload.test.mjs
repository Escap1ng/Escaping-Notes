// 首屏 hero 预加载的钉子：index.html 首帧脚本里那条 preload 的 URL，必须与 site.css
// 两档主题、两档屏宽各自的 --hero-img 逐字同值。
// 为什么要钉：URL 一份在 CSS、一份在 HTML 的内联脚本，两边没有 import 关系，漂开是静默的——
// 浏览器会先下另一张（桌面 1.5MB / 手机 0.38MB），等 CSS 匹配上再下真正那张，首屏从"两跳"
// 变成"两跳 + 白下一张"。换 bake 源、改手机断点、加一档屏宽时最容易只改 CSS 那一侧。
// 跑法：npm test（零依赖，Node 内置 test runner）
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = (p) => readFileSync(join(ROOT, p), 'utf8')

const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '')

// 从样式表按"选择器带不带 [data-theme='out']"分出两档主题，每档再分桌面 / 手机两个属性。
// 只认 data-theme：那个皮肤网关属性已经退役（由 html:root 接替它的特异性），
// 而主题属性是活的分支，将来也在。
function heroUrls(css) {
  const body = stripComments(css)
  const found = { out: {}, well: {} }
  const scan = (re, key) => {
    for (const m of body.matchAll(re)) {
      const open = body.lastIndexOf('{', m.index)
      const guard = Math.max(
        body.lastIndexOf('}', open),
        body.lastIndexOf(';', open),
        body.lastIndexOf('{', open - 1)
      )
      const selector = body.slice(guard + 1, open).trim()
      const isLight = /\[data-theme='out'\]/.test(selector) && !/:not\(\[data-theme='out'\]\)/.test(selector)
      found[isLight ? 'out' : 'well'][key] = { url: m[1], selector }
    }
  }
  const URL_RE = /url\(\s*['"]?([^'")]+?)\s*['"]?\s*\)/
  scan(new RegExp(`--hero-img:\\s*${URL_RE.source}`, 'g'), 'desktop')
  scan(new RegExp(`--hero-img-sm:\\s*${URL_RE.source}`, 'g'), 'mobile')
  return found
}

function bootScript(html) {
  const m = html.match(/<script>([\s\S]*?)<\/script>/)
  if (!m) throw new Error('index.html 里找不到无属性的 <script> 块——改了写法要同步改这条判据')
  return m[1]
}

// 跑 index.html 里那段真脚本，收它挂进 <head> 的元素。桩的依赖面就是脚本用到的那些：
// documentElement.dataset / style.setProperty / createElement / head.appendChild / matchMedia。
function runBoot(code, stored, path = '/', narrow = false) {
  const appended = []
  const doc = {
    documentElement: { dataset: {}, style: { setProperty() {} } },
    createElement: () => ({ setAttribute(k, v) { this[k] = v } }),
    head: { appendChild: (el) => appended.push(el) },
  }
  const ctx = {
    document: doc,
    localStorage: { getItem: (k) => (k === 'en-theme' ? stored : null), setItem: () => {} },
    location: { pathname: path },
    matchMedia: (q) => ({ matches: narrow && /max-width:\s*720px/.test(q) }),
  }
  new Function(...Object.keys(ctx), code)(...Object.values(ctx))
  return { theme: doc.documentElement.dataset.theme, appended }
}

const preloadOf = (r) => r.appended.filter((el) => el.rel === 'preload')

const hero = heroUrls(src('src/styles/site.css'))

test('两档主题各有桌面 / 手机两张 --hero-img，且四张两两不同', () => {
  for (const theme of ['out', 'well']) {
    for (const size of ['desktop', 'mobile']) {
      assert.ok(hero[theme][size], `${theme} 缺 ${size} 档的 --hero-img（主题块或 §3a 改了要同步这里）`)
    }
    assert.notEqual(hero[theme].desktop.url, hero[theme].mobile.url, `${theme} 的手机档没换图，等于没省`)
  }
  const urls = new Set(['out', 'well'].flatMap((t) => [hero[t].desktop.url, hero[t].mobile.url]))
  assert.equal(urls.size, 4, '四张 URL 有两张撞了：预加载会命中错的那张')
})

test('首帧 preload 的正是当前主题、当前屏宽那张 hero', () => {
  const code = bootScript(src('index.html'))
  for (const theme of ['out', 'well']) {
    for (const narrow of [false, true]) {
      const pre = preloadOf(runBoot(code, theme, '/', narrow))
      const want = narrow ? hero[theme].mobile.url : hero[theme].desktop.url
      assert.equal(pre.length, 1, `主题=${theme} 窄屏=${narrow} 时应该只挂一条 preload`)
      assert.equal(pre[0].href, want, `主题=${theme} 窄屏=${narrow} 预加载了 ${pre[0].href}，CSS 要的是 ${want}`)
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
  }
})

test('手机档的断点：CSS 与 preload 的 matchMedia 是同一个数', () => {
  const css = stripComments(src('src/styles/site.css'))
  const cssMq = css.match(/@media \(max-width: (\d+)px\)[\s\S]*?--hero-img:\s*var\(--hero-img-sm\)/)
  assert.ok(cssMq, '§3a 的 @media 没把 --hero-img 换成 --hero-img-sm')
  const jsMq = bootScript(src('index.html')).match(/matchMedia\('\(max-width: (\d+)px\)'\)/)
  assert.ok(jsMq, '首帧脚本里找不到选手机档的 matchMedia')
  assert.equal(jsMq[1], cssMq[1], `CSS 断点 ${cssMq[1]}px 与 preload 断点 ${jsMq[1]}px 不一致`)
})

test('没存过 / 存过垃圾值时，预加载跟着浅色那张（与首开浅色同口径）', () => {
  const code = bootScript(src('index.html'))
  for (const stored of [null, 'dark', '']) {
    const r = runBoot(code, stored)
    assert.equal(r.theme, 'out', `stored=${JSON.stringify(stored)} 该落浅色`)
    assert.equal(preloadOf(r)[0].href, hero.out.desktop.url, '预加载的那张必须跟着兜底档走')
  }
})

test('非首页不预载 hero：那块地景只在首页', () => {
  const code = bootScript(src('index.html'))
  for (const path of ['/blog', '/blog/hello-world', '/updates', '/about', '/404.html']) {
    for (const narrow of [false, true]) {
      assert.equal(
        preloadOf(runBoot(code, 'out', path, narrow)).length,
        0,
        `${path}（窄屏=${narrow}）也挂了 hero preload——次级页与首页共用首帧脚本，不判路径就是白下`
      )
    }
  }
})

// 反向对照：判据不是恒绿的。漂开、漏挂、选错档都必须被判出来。
test('负向对照：本文件的判据抓得住 URL 漂开、漏挂、选错屏宽与 as 写错', () => {
  const html = src('index.html')
  // ⑴ 桌面两档对调（最可能的漂开法：改了 CSS 忘了 HTML 这张）
  const swapped = html.replace(
    /const HERO_IMG = \{[^}]*\}/,
    `const HERO_IMG = { out: '${hero.well.desktop.url}', well: '${hero.out.desktop.url}' }`
  )
  const s = preloadOf(runBoot(bootScript(swapped), 'out'))[0]
  assert.notEqual(s.href, hero.out.desktop.url, '对调了还判不出，量具是瞎的')
  // ⑵ 压根没挂 preload（只拆挂载那几行，别把 narrow 的声明一起删掉，否则桩先崩在 ReferenceError）
  const none = html.replace(
    /const heroPre = document\.createElement\('link'\)[\s\S]*?appendChild\(heroPre\)/,
    ''
  )
  assert.equal(preloadOf(runBoot(bootScript(none), 'out')).length, 0, '删掉挂载却还判出 preload，桩在自欺')
  // ⑶ 手机档退回桌面图（选了错档）
  const noSmall = html.replace(/const HERO_IMG_SM = \{[^}]*\}/, 'const HERO_IMG_SM = HERO_IMG')
  assert.equal(
    preloadOf(runBoot(bootScript(noSmall), 'out', '/', true))[0].href,
    hero.out.desktop.url,
    '手机档退回桌面图却判不出'
  )
  // ⑷ as 写成别的
  const badAs = html.replace("heroPre.as = 'image'", "heroPre.as = 'fetch'")
  assert.notEqual(preloadOf(runBoot(bootScript(badAs), 'out'))[0].as, 'image')
  // ⑸ fetchpriority 漏了
  const badPri = html.replace("heroPre.setAttribute('fetchpriority', 'high')", '')
  assert.equal(preloadOf(runBoot(bootScript(badPri), 'out'))[0].fetchpriority, undefined)
})
