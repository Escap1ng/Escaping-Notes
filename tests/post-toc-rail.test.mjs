// 文章页右侧目录栏的几何钉子（2026-11-16 作者「目录不能放右侧吗，顶部看不清」）。
// 这一栏有三处只要改错一个数就静默坏掉、而测试与肉眼都容易放过的地方：
//   ⑴ 外层 .toc 必须 top + bottom 都写：sticky 的子元素只能在父盒多出来的那段高度里移动，
//      只写 top 的话外层高度 = 内容高度，内层没有余量，右栏跟着正文滚走（第一版就是这个毛病）；
//   ⑵ 有右栏那一档的底板宽 + 两条边槽必须 ≤ 断点视口宽，否则右栏被 html 的 overflow-x: clip
//      直接裁掉——连滚都滚不到，看上去像"目录没了"；
//   ⑶ 底板收窄后仍要容得下最宽的正文栏（--prose-size 上限 × 44 + 左右内边距），
//      否则正文被压窄，那是 §9 早否掉的"右浮栏破版"。
// 另钉住那版被作者否掉的粘顶横带不许复活（--toc-h 与 §9 的额外 scroll-margin 让位）。
// 跑法：npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = (p) => readFileSync(join(ROOT, p), 'utf8')

const VUE = src('src/views/PostView.vue')
const CSS = src('src/styles/site.css')

// 取一个选择器块的正文（scoped 样式里选择器不带前缀，锚到行首的它）
function block(css, selector) {
  const re = new RegExp(`(^|\\})\\s*${selector.replace('.', '\\.')}\\s*\\{([^}]*)\\}`, 'm')
  const m = css.match(re)
  return m ? m[2] : null
}

// 取某个媒体查询块的正文：从 @media 起头到它闭合的那一层
function mediaBlock(css, query) {
  const at = css.indexOf(query)
  if (at < 0) return null
  let i = css.indexOf('{', at)
  let depth = 0
  const start = i
  for (; i < css.length; i++) {
    if (css[i] === '{') depth++
    else if (css[i] === '}') {
      depth--
      if (depth === 0) return css.slice(start + 1, i)
    }
  }
  return null
}

const num = (s) => (s == null ? null : Number(s))

// 从 .toc 块里解出栏宽与它推到板外的距离：right: calc(-1 * (160px + var(--space-2)))
function railGeometry(vue) {
  const b = block(vue, '.toc')
  if (!b) return null
  const w = b.match(/width:\s*(\d+)px/)
  const r = b.match(/right:\s*calc\(-1\s*\*\s*\((\d+)px\s*\+\s*var\(--space-2\)\)\)/)
  return {
    width: w ? num(w[1]) : null,
    offset: r ? num(r[1]) : null,
    hasTop: /top:\s*0\s*;/.test(b),
    hasBottom: /bottom:\s*0\s*;/.test(b),
    absolute: /position:\s*absolute/.test(b),
  }
}

// 有右栏那一档：断点、底板宽。
// 底板宽必须从 .en-glass 那一块里取——同一个媒体查询里 .post 也有一条 max-width，
// 直接在整个块上 match 会先抓到 .post 的那个数（第一版就错在这儿，尺子自己假红）。
function railTier(vue) {
  const q = vue.match(/@media \(min-width:\s*(\d+)px\)\s*\{[\s\S]{0,400}?\.en-glass/)
  if (!q) return null
  const mb = mediaBlock(vue, `@media (min-width: ${q[1]}px)`)
  if (!mb) return null
  // 选择器在 scoped 里写成 `.post :deep(.en-glass)`，不是裸 `.en-glass`
  const glass = mb.match(/:deep\(\.en-glass\)\s*\{([\s\S]*?)\n\s*\}/)
  const plate = glass?.[1].match(/max-width:\s*(\d+)px/)
  return { breakpoint: num(q[1]), plate: plate ? num(plate[1]) : null }
}

// 剥注释：判据量的是实现，不是说明文字。
// 文档里写一句"那版 --toc-h 已撤"不该让"不许复活"这条假红（detail-exit 同款做法）。
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')

test('右栏外层 top 与 bottom 都在：sticky 内层才有余量可走', () => {
  const g = railGeometry(VUE)
  assert.ok(g, '找不到 .toc 块')
  assert.equal(g.absolute, true, '外层必须是 absolute（坐在板外）')
  assert.equal(g.hasTop, true, '外层缺 top: 0')
  assert.equal(g.hasBottom, true, '外层缺 bottom: 0——内层 sticky 会没有余量，右栏跟着正文滚走')
  assert.ok(g.width > 0 && g.offset === g.width, '栏宽与推出距离必须是同一个数')

  const inner = block(VUE, '.toc-inner')
  assert.ok(inner, '找不到 .toc-inner 块')
  assert.match(inner, /position:\s*sticky/, '粘顶的是内层，不是外层')
})

test('右栏不会被 overflow-x: clip 裁掉：底板 + 两条边槽 ≤ 断点视口宽', () => {
  const g = railGeometry(VUE)
  const t = railTier(VUE)
  assert.ok(t, '找不到有右栏那一档的媒体查询')
  const gap = 16 // --space-2，§1 刻度
  const need = g.width + gap
  // 断点那一档的视口宽下限 = 断点 + 1
  const vw = t.breakpoint + 1
  assert.ok(
    t.plate + 2 * need <= vw,
    `底板 ${t.plate} + 两条边槽 ${2 * need} = ${t.plate + 2 * need} > 视口 ${vw}，右栏会被裁切`,
  )
  // .post 也要装得下：底板 + 一条边槽 + .en-shell 左右内边距
  const post = block(mediaBlock(VUE, `@media (min-width: ${t.breakpoint}px)`) ?? '', '.post')
  const postMax = post?.match(/max-width:\s*(\d+)px/)
  assert.ok(postMax, '有右栏那一档必须同时给 .post 放宽')
  assert.ok(
    t.plate + need + 2 * 32 <= num(postMax[1]),
    `.post ${postMax[1]} 装不下底板 ${t.plate} + 边槽 ${need} + 左右内边距 64`,
  )
})

test('底板收窄后仍容得下最宽正文栏：44 字 × 字号上限 + 左右内边距', () => {
  const t = railTier(VUE)
  const fsXl = num(CSS.match(/--fs-xl:\s*([\d.]+)px/)?.[1])
  assert.ok(fsXl, '读不到 --fs-xl')
  const measure = fsXl * 44 // §6c：--measure = --prose-size × 44
  const pad = 32 // .en-glass 左右内边距各一档 --space-3
  assert.ok(
    t.plate >= measure + 2 * pad,
    `底板 ${t.plate} 压窄了正文（需要 ≥ ${measure + 2 * pad}）`,
  )
})

test('窄屏档把外层定位复位，横带不被撑高', () => {
  const mb = mediaBlock(VUE, '@media (max-width: 1400px)')
  assert.ok(mb, '找不到窄屏回退档')
  const b = block(mb, '.toc')
  assert.ok(b, '窄屏档里没有 .toc')
  assert.match(b, /position:\s*static/, '窄屏必须退回静态横带')
  assert.match(b, /top:\s*auto/, '窄屏要复位 top')
  assert.match(b, /bottom:\s*auto/, '窄屏要复位 bottom，否则横带被撑到整块底板高')
})

test('被否掉的粘顶横带不许复活：--toc-h 与 §9 的额外让位都已撤除', () => {
  // 剥注释后再量：说明文字里记着"那版已撤"是应该的，不算复活
  assert.ok(
    !/--toc-h/.test(stripComments(VUE)),
    '--toc-h 让位变量回来了（那版粘顶横带作者判「顶部看不清」）',
  )
  assert.ok(!/--toc-h/.test(stripComments(CSS)), 'site.css 里又出现 --toc-h')
  const sm = CSS.match(/scroll-margin-top:\s*([^;]+);/)
  assert.ok(sm, '读不到标题的 scroll-margin-top')
  assert.equal(sm[1].trim(), 'calc(var(--page-top) - 24px)', '锚点落点被加了额外让位')
})

test('负向对照：本文件的尺子抓得住我造的假', () => {
  // ⑴ 外层只写 top（第一版的真实毛病）
  const noBottom = VUE.replace(/(\.toc\s*\{[\s\S]*?)bottom:\s*0\s*;/, '$1')
  assert.equal(railGeometry(noBottom).hasBottom, false, '尺子没抓到缺失的 bottom')

  // 改底板宽的假样本：锚到 .en-glass 那一块（不能锚到媒体查询里的第一条 max-width，
  // 那是 .post 的，改了它尺子量的是另一个数）
  const fakePlate = (v) =>
    VUE.replace(/(:deep\(\.en-glass\)\s*\{\s*max-width:\s*)1040px/, `$1${v}px`)

  // ⑵ 底板放宽到裁切：1280 + 2×176 = 1632 > 1401
  const tooWide = fakePlate(1280)
  const g2 = railGeometry(tooWide)
  const t2 = railTier(tooWide)
  assert.equal(t2.plate, 1280, '假样本没造出被放宽的底板')
  assert.ok(t2.plate + 2 * (g2.width + 16) > t2.breakpoint + 1, '尺子没抓到会被裁切的底板宽')

  // ⑶ 底板收到压窄正文：800 < 880 + 64
  const tooNarrow = fakePlate(800)
  const t3 = railTier(tooNarrow)
  assert.equal(t3.plate, 800, '假样本没造出被收窄的底板')
  const fsXl = num(CSS.match(/--fs-xl:\s*([\d.]+)px/)?.[1])
  assert.ok(t3.plate < fsXl * 44 + 64, '尺子没抓到压窄正文的底板宽')

  // ⑷ 粘顶横带复活（真的写进样式，不是写进注释）
  const revived = `${VUE}\n.post { --toc-h: 56px; }`
  assert.match(stripComments(revived), /--toc-h/, '尺子没抓到复活的 --toc-h')
  // 反向：只在注释里提一句，不该被判成复活
  const onlyComment = `${VUE}\n/* 那版 --toc-h 已撤 */`
  assert.ok(!/--toc-h/.test(stripComments(onlyComment)), '剥注释没生效，说明文字被当成实现')
})
