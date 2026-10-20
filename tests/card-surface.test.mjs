// 卡面档位（不透底 = 默认 / 半透明）的钉子。它是用户手调的量，而它的口径散在四个文件里各写了一份：
//   src/lib/storage.js  键名（PREFIX 拼）
//   index.html          首帧内联只能写字面量，且只写"偏离默认"那一档
//   src/lib/surface.js  两档的值与默认档
//   src/styles/site.css `html:root` 基础块的 --card-bg（= 默认档长什么样）、门控选择器
//                       [data-card-surface='glass']、两套主题各自的 --card-solid
// 消费方也不止卡片一处：§6c 的阅读底板 .en-glass（文章页 / 项目详情页）取同一枚 --card-bg，
// 所以这一档开关同时决定卡面与底板——本文件最后两条判据钉的就是这件事。
// 为什么要钉：这几处漂开后的症状全是静默的——键名漂开是"设置根本不生效"，门控选择器漂开是
// "选过半透的人每进页先纯白一闪"，默认档漂开是"首帧内联与 CSS 各说一套"，浅色档被删成只在深色
// 定义是"浅色下这一档白写"（不报错、不进日志，正是 site.css 顶上 --scrim 那次事故的同款）。
// 跑法：npm test（Node 内置 test runner，零依赖）
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = (p) => readFileSync(join(ROOT, p), 'utf8')

// 与 tests/plate-blur.test.mjs 同一套最小垫：surface.js 在模块求值时就要 read() 一次
// localStorage，applyCardSurface 要碰 document.documentElement。
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

const { CARD_DEFAULT, CARD_GLASS, CARD_SOLID, CARD_MODES, clampCardMode, applyCardSurface } =
  await import('../src/lib/surface.js')
const { KEYS } = await import('../src/lib/storage.js')

/* ---------- CSS 取块：从选择器文本往后数花括号深度 ----------
   两处坑都踩过：① 选择器文本在文件头的分层说明里各出现过一次，取"第一次出现"会量到注释，
   于是量具谎报（check_contrast.mjs 里那句"必须带 `{` 锚定"说的就是它）；② 扁平正则在嵌套块
   （@media/@supports）上错配对。所以这里逐个候选位点试，只认"选择器与 { 之间除了空白没别的东西"
   的那一个——注释里那种后面还跟着中文与反引号的位点自动落选。 */
function blockBody(css, selText) {
  for (let i = css.indexOf(selText); i !== -1; i = css.indexOf(selText, i + 1)) {
    const rest = css.slice(i + selText.length)
    const m = rest.match(/^\s*\{/)
    if (!m) continue
    const open = i + selText.length + m[0].length - 1
    let depth = 0
    for (let j = open; j < css.length; j++) {
      if (css[j] === '{') depth++
      else if (css[j] === '}') {
        depth--
        if (!depth) return css.slice(open + 1, j)
      }
    }
    throw new Error(`${selText} 的块没闭合`)
  }
  throw new Error(`site.css 里找不到作为规则起点的选择器 ${selText}`)
}
const declOf = (body, token) => {
  // 这里的 `-+` 不是防御性冗余：写成 /^-/ 只吃掉一枚横杠，拼出来的正则变成 ---card-solid，
  // 于是"取不到"和"没定义"两种情况长得一模一样——量具自己造的假阳性，第一次跑就红在这里了。
  const m = body.match(new RegExp(`--${token.replace(/^-+/, '')}\\s*:\\s*([^;]+);`))
  return m ? m[1].trim() : null
}

const BASE_SEL = 'html:root'
const DEEP_SEL = "html:root:not([data-theme='out'])"
const OUT_SEL = "html:root[data-theme='out']"
const GATE_SEL = "html:root[data-card-surface='glass']"
// 阅读底板：默认档那条 (0,2,1) 与半透明档的门控那条 (0,3,1)。
// 取 'html:root .en-glass' 拿到的是 §6c 那条——prefers-reduced-motion 里还有一条同文本的选择器，
// 但它排在后面，blockBody 只认第一个候选位点。
const PLATE_SEL = 'html:root .en-glass'
const PLATE_GLASS_SEL = "html:root[data-card-surface='glass'] .en-glass"

// 普通属性（不是自定义令牌）的取值器：declOf 会自己补 `--` 前缀，量 background 得走这条。
// 前面要求行首或分号/空白，免得把 `-webkit-backdrop-filter` 当成 `backdrop-filter` 抓走。
const propOf = (body, name) => {
  const m = body.match(new RegExp(`(?:^|[;\\s])${name}\\s*:\\s*([^;]+);`, 'm'))
  return m ? m[1].trim() : null
}

test('clampCardMode：只认两档，认不出的回默认档', () => {
  assert.deepEqual(CARD_MODES, ['solid', 'glass'])
  assert.equal(CARD_DEFAULT, 'solid') // 默认档 = CSS 基础块自己的样子，改进站首屏要连三处一起
  assert.equal(clampCardMode('solid'), 'solid')
  assert.equal(clampCardMode('glass'), 'glass')
  assert.equal(clampCardMode('white'), CARD_DEFAULT) // 手改过的别名不许直通 CSS
  assert.equal(clampCardMode('GLASS'), CARD_DEFAULT) // 属性值大小写敏感，收进档来只会更坑
  assert.equal(clampCardMode(null), CARD_DEFAULT)
  assert.equal(clampCardMode(''), CARD_DEFAULT)
  assert.equal(clampCardMode('glass', 'solid'), 'glass')
  assert.equal(clampCardMode('nope', 'glass'), 'glass') // 显式给兜底时不许偷偷换成默认档
})

test('applyCardSurface：只有偏离默认的 glass 留 data 属性，写存储前先归一', () => {
  const el = globalThis.document.documentElement
  applyCardSurface('glass')
  assert.equal(el.dataset.cardSurface, 'glass') // 半透那一档必须显式写上，CSS 才绕回 52%
  assert.equal(store.get(KEYS.cardSurface), 'glass')
  applyCardSurface('solid')
  assert.equal('cardSurface' in el.dataset, false) // 留着属性等于 CSS 白匹配一次覆盖块
  assert.equal(store.get(KEYS.cardSurface), 'solid')
  applyCardSurface('bogus')
  assert.equal(store.get(KEYS.cardSurface), 'solid')
  assert.equal('cardSurface' in el.dataset, false)
})

test('四处口径同一条：storage.js / index.html / surface.js / site.css', () => {
  const html = src('index.html')
  const css = src('src/styles/site.css')
  assert.ok(html.includes(`'${KEYS.cardSurface}'`), 'index.html 必须按 storage.js 那个键名读')
  assert.ok(html.includes('dataset.cardSurface'), '首帧要写同一个 data 属性，否则选过半透的人进页先白一闪')
  assert.ok(
    html.includes(`=== '${CARD_GLASS}'`),
    '首帧只该为"偏离默认"那一档写属性——默认档是 CSS 自己的样子'
  )
  assert.ok(
    css.includes(`[data-card-surface='${CARD_GLASS}']`),
    'CSS 门控选择器的值要和档位值同字面量'
  )
})

test('site.css：默认档就是不透底，门控只把 glass 绕回半透', () => {
  const css = src('src/styles/site.css')
  // 没有属性 = 基础块说了算，所以"默认纯白"这件事必须核在基础块里，而不是核在某条门控里
  const base = blockBody(css, BASE_SEL)
  assert.equal(declOf(base, '--card-bg'), 'var(--card-solid)', '默认档不是不透底了')
  assert.ok(declOf(base, '--card-bg-hover'), '基础块没定义 hover 填充')

  const gate = blockBody(css, GATE_SEL)
  const glassBg = declOf(gate, '--card-bg')
  assert.match(glassBg, /var\(--ink-1\)\s+52%/, `半透档该是 52%，实际取到 ${glassBg}`)
  assert.equal(/--card-brd[^:]*:/.test(gate), false, '门控块动了边线：这一档只改填充')
  assert.equal(/--card-solid[^:]*:/.test(gate), false, '门控块重复定义了 --card-solid')
})

test('site.css：--card-solid 两套主题各一份，浅色是纯白', () => {
  const css = src('src/styles/site.css')
  const deep = declOf(blockBody(css, DEEP_SEL), '--card-solid')
  const out = declOf(blockBody(css, OUT_SEL), '--card-solid')
  assert.ok(deep, '深色主题块没有 --card-solid：那一侧的默认档会整条静默失效')
  assert.ok(out, '浅色主题块没有 --card-solid：那一侧的默认档会整条静默失效')
  assert.equal(out.toLowerCase(), '#ffffff', '浅色默认档的卖点是"纯白"，不是"接近白"')
  assert.notEqual(deep.toLowerCase(), '#ffffff', '深色给纯白就是一块白板压在近黑页底上')
})

// 反向对照：判据必须咬得住。四记假——删掉浅色那份令牌、键名漂一个字母、纯白写成米白、
// 有人把默认档又翻回半透（基础块与门控块互换）——每记都要被对应的断言抓出来，
// 否则上面几条只是被注释喂胖的摆设。
test('负向对照：单侧定义、键名漂移、非纯白、默认档翻转都能被抓', () => {
  const css = src('src/styles/site.css')
  const html = src('index.html')

  // ⑴ 浅色那份整条删掉 → 两边必须不同时有
  const oneSide = css.replace(/^[ \t]*--card-solid:[ \t]*#ffffff;[ \t]*\r?$/m, '')
  assert.notEqual(oneSide, css, '这记假根本没改动文件体，后面断言无意义')
  assert.notEqual(
    !!declOf(blockBody(oneSide, DEEP_SEL), '--card-solid'),
    !!declOf(blockBody(oneSide, OUT_SEL), '--card-solid'),
    '⑴单侧定义没被抓到'
  )

  // ⑵ index.html 的键名漂一个字母 → 键名对拍必须红
  const drift = html.replace(`'${KEYS.cardSurface}'`, `'${KEYS.cardSurface}-x'`)
  assert.ok(drift.includes(`'${KEYS.cardSurface}-x'`), '这记假根本没改动文件体')
  assert.equal(drift.includes(`'${KEYS.cardSurface}'`), false, '⑵键名漂移没被抓到')

  // ⑶ 浅色档改成米白 → 纯白判据必须红
  const notWhite = css.replace('--card-solid: #ffffff;', '--card-solid: #f7f4ee;')
  assert.notEqual(notWhite, css, '这记假根本没改动文件体')
  const w = declOf(blockBody(notWhite, OUT_SEL), '--card-solid').toLowerCase()
  assert.equal(w, '#f7f4ee', '⑶取到的不是浅色块里那一枚，块提取错位')
  assert.notEqual(w, '#ffffff', '⑶米白被当成纯白放过了')

  // ⑷ 默认档翻回半透：基础块写成 52% 的那记假 → "默认是不透底"判据必须红
  const flipped = css.replace('--card-bg: var(--card-solid);', '--card-bg: color-mix(in srgb, var(--ink-1) 52%, transparent);')
  assert.notEqual(flipped, css, '这记假根本没改动文件体')
  assert.notEqual(
    declOf(blockBody(flipped, BASE_SEL), '--card-bg'),
    'var(--card-solid)',
    '⑷默认档被翻回半透却没被抓到'
  )
})

/* ---------- 阅读底板与卡面同一枚令牌（2026-10-13 并档） ----------
   .en-glass（文章页 / 项目详情页那块底板）原先自用一支 --panel-bg（ink-0 的 55%/60%），
   与卡面各自一套 → 设置卡那档开关只改卡片、不改底板，同一件表面分叉两处。
   并档后要钉的三件事：⑴ 底板填充就是 --card-bg（一个开关驱动两处）；
   ⑵ 糊面（backdrop-filter）只在半透明那一档建——不透底时板后已被卡面挡死，留着它不等于
   "更玻璃"，而是星轨每动一帧重算一次背后模糊（manual.md §3.4）；
   ⑶ 退役的 --panel-bg 不许在任一主题块里留半份，否则"底板色"又有第二份实现。 */
test('阅读底板 .en-glass：填充取 --card-bg，糊面只在半透明档建', () => {
  const css = src('src/styles/site.css')

  const plate = blockBody(css, PLATE_SEL)
  assert.equal(
    propOf(plate, 'background'),
    'var(--card-bg)',
    '底板填充不再取卡面令牌：设置卡那一档只改卡片、不改底板，表面又分叉成两处'
  )
  assert.equal(
    /backdrop-filter/.test(plate),
    false,
    '默认档（不透底）也建了糊面：背后被卡面挡死，只剩每帧重算模糊的开销'
  )

  const gated = blockBody(css, PLATE_GLASS_SEL)
  assert.match(
    propOf(gated, 'backdrop-filter'),
    /blur\(22px\)\s+saturate\(1\.35\)/,
    '半透明档没把阅读底板的模糊/saturate 建回来（22px + 1.35）'
  )

  for (const [name, sel] of [
    ['深色', DEEP_SEL],
    ['浅色', OUT_SEL]
  ]) {
    const b = blockBody(css, sel)
    assert.equal(declOf(b, '--panel-bg'), null, `${name}块还留着 --panel-bg：底板色面回到两处`)
    assert.ok(declOf(b, '--panel-frost-bg'), `${name}块没有 --panel-frost-bg：无模糊兜底整条静默失效`)
  }
})

// 反向对照：上面四条判据每记都要咬得住。底板拆回自己那支令牌、模糊挪回默认档、
// 半透明档的模糊被删掉、浅色那份兜底令牌被删——四记都得红。
test('负向对照：底板并档的判据抓得住分叉、白建糊面与单侧兜底', () => {
  const css = src('src/styles/site.css')

  /* 造假要造在§6c 那一条里：`background: var(--card-bg);` 在 .en-chip 与 .en-field 也各出现一次，
     直接 css.replace 会把假造到胶囊上、板子那条原样没动 → 判据照样绿，那就是量具自己造的假阴性。
     所以先按选择器把块体切出来，只在块体内替换，再拼回去。 */
  const fakeInPlate = (from, to) => {
    const body = blockBody(css, PLATE_SEL)
    const at = css.indexOf(body)
    assert.notEqual(at, -1, '块体定位失败：blockBody 与字符串索引对不上')
    const faked = body.replace(from, to)
    assert.notEqual(faked, body, `这记假根本没改动块体（锚点 "${from}" 没匹配上）`)
    return css.slice(0, at) + faked + css.slice(at + body.length)
  }

  // ⑴ 底板填充分叉回第二支令牌
  const forked = fakeInPlate('background: var(--card-bg);', 'background: var(--panel-bg);')
  assert.notEqual(
    propOf(blockBody(forked, PLATE_SEL), 'background'),
    'var(--card-bg)',
    '⑴底板又自建一套色面却没被抓到'
  )
  //    这记假必须只打在板子上：--card-bg 的其余消费方（卡片，以及站内其他取这枚令牌的表面）
  //    原样不动——计数掉了不止一格就说明替换漂出了 §6c 那块体。
  const count = (s) => s.split('background: var(--card-bg);').length - 1
  assert.ok(count(css) >= 2, `--card-bg 的填充消费方只剩 ${count(css)} 处，卡片与底板至少各一处`)
  assert.equal(count(forked), count(css) - 1, '⑴这记假不止打在 §6c 一块板上')

  // ⑵ 默认档也建糊面（把模糊挪回 §6c 基础规则）
  const alwaysFrost = fakeInPlate(
    'background: var(--card-bg);',
    'background: var(--card-bg);\n  backdrop-filter: blur(22px) saturate(1.35);'
  )
  assert.equal(
    /backdrop-filter/.test(blockBody(alwaysFrost, PLATE_SEL)),
    true,
    '⑵模糊挪进了默认档却没被抓到'
  )

  // ⑶ 半透明档的糊面被删：删掉 §6c 那条独立门控规则后，同名选择器只剩 @supports 里那条兜底
  //    （它只有 background、没有模糊），主判据读到的就是它 → 必须不再匹配 blur(22px)。
  const noFrost = css.replace(
    "html:root[data-card-surface='glass'] .en-glass {\n  -webkit-backdrop-filter: blur(22px) saturate(1.35);\n  backdrop-filter: blur(22px) saturate(1.35);\n}",
    ''
  )
  assert.notEqual(noFrost, css, '这记假根本没改动文件体（换行符与源码不一致？）')
  assert.doesNotMatch(
    blockBody(noFrost, PLATE_GLASS_SEL),
    /blur\(22px\)/,
    '⑶门控规则的糊面被删却没被抓到'
  )

  // ⑷ 浅色那份兜底令牌删掉 → 两边不许只剩一边
  const oneSide = css.replace(/^[ \t]*--panel-frost-bg:[^\n]*\n/m, '')
  assert.notEqual(oneSide, css, '这记假根本没改动文件体')
  assert.notEqual(
    !!declOf(blockBody(oneSide, DEEP_SEL), '--panel-frost-bg'),
    !!declOf(blockBody(oneSide, OUT_SEL), '--panel-frost-bg'),
    '⑷单侧兜底定义没被抓到'
  )
})
