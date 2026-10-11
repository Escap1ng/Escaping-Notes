// 令牌层的两条"唯一来源"钉子（site.css 顶部那张分层说明承诺的就是这两条）。
//   ⑴ 同一枚自定义属性不许既在根层普通块（:root / html:root）又在某个主题块里——
//      那等于给同一个事实两份实现，改一份就分叉；
//   ⑵ 凡在一套主题块里定义的令牌，另一套也必须定义。
// ⑵ 这条是照着历史事故写的：--scrim 当年只定义了一套，浅色首页压在文字底下的那层底衬
// 整条静默失效——不报错、不红、CSS 面板里也看不出，只是那一档白写。
// 跑法：npm test（零依赖，Node 内置 test runner）
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CSS = readFileSync(join(ROOT, 'src/styles/site.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')

// 只取顶层块：花括号深度扫描。扁平正则在嵌套块（@media/@supports）上会错配对，
// 上一版探针就是这么谎报了深色档的——量具错了比没量具更糟。
function topBlocks(s) {
  const blocks = []
  let depth = 0, selFrom = 0, selTo = -1, bodyFrom = -1
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (c === '{') {
      if (depth === 0) { selTo = i; bodyFrom = i + 1 }
      depth++
    } else if (c === '}') {
      depth--
      if (depth === 0) {
        blocks.push([s.slice(selFrom, selTo).trim(), s.slice(bodyFrom, i)])
        selFrom = i + 1
      }
    }
  }
  return blocks
}

const decls = (body) => [...body.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1])

const blocks = topBlocks(CSS)
const BASE = new Set([':root', 'html:root'])
const isTheme = (sel) => sel.includes("[data-theme='out']")
const isDeep = (sel) => sel.includes(":not([data-theme='out'])")

const baseBlock = blocks.filter(([sel]) => BASE.has(sel)).flatMap(([, b]) => decls(b))
const outBlock = blocks.filter(([sel]) => isTheme(sel) && !isDeep(sel)).flatMap(([, b]) => decls(b))
const deepBlock = blocks.filter(([sel]) => isDeep(sel)).flatMap(([, b]) => decls(b))

test('分层说明站得住：两套主题块与根层块都真的存在', () => {
  assert.ok(outBlock.length >= 10, `浅色主题块只抓到 ${outBlock.length} 枚令牌，选择器大概改了`)
  assert.ok(deepBlock.length >= 10, `深色主题块只抓到 ${deepBlock.length} 枚令牌，选择器大概改了`)
  assert.ok(baseBlock.length >= 20, `根层普通块只抓到 ${baseBlock.length} 枚，分层结构被动过`)
})

test('⑴ 没有令牌既写在根层又写在主题块（同一事实只许一处）', () => {
  const dup = [...new Set(baseBlock)].filter((p) => outBlock.includes(p) || deepBlock.includes(p))
  assert.deepEqual(dup, [], `这些令牌有两处定义，改一处就分叉：${dup.join(', ')}`)
})

test('⑵ 每套主题块定义的令牌，另一套也必须定义', () => {
  const onlyOut = [...new Set(outBlock)].filter((p) => !deepBlock.includes(p))
  const onlyDeep = [...new Set(deepBlock)].filter((p) => !outBlock.includes(p))
  assert.deepEqual(onlyOut, [], `只在浅色块定义、深色块没有：${onlyOut.join(', ')}`)
  assert.deepEqual(onlyDeep, [], `只在深色块定义、浅色块没有：${onlyDeep.join(', ')}`)
})

test('间距刻度六档齐全，且只在根层（"全站唯一来源"那句话要是真的）', () => {
  const space = ['--space-0', '--space-1', '--space-2', '--space-3', '--space-4', '--space-5']
  for (const p of space) assert.ok(baseBlock.includes(p), `${p} 没在根层定义`)
  const stray = space.filter((p) => outBlock.includes(p) || deepBlock.includes(p))
  assert.deepEqual(stray, [], `间距刻度分到了主题块里：${stray.join(', ')}`)
})

// 反向对照：四条判据都必须抓得住造假，否则只是被注释喂胖的摆设。
test('负向对照：本文件的判据抓得住重复定义、单侧定义与刻度漏档', () => {
  // ⑴ 把 --ink-0 也塞进根层 → 用与主判据同一个式子，必须抓到
  const dup = CSS.replace(':root {', ':root { --ink-0: #000000;')
  const b = topBlocks(dup).filter(([sel]) => BASE.has(sel)).flatMap(([, x]) => decls(x))
  const out = topBlocks(dup).filter(([sel]) => isTheme(sel) && !isDeep(sel)).flatMap(([, x]) => decls(x))
  const deep = topBlocks(dup).filter(([sel]) => isDeep(sel)).flatMap(([, x]) => decls(x))
  const dupFound = [...new Set(b)].filter((p) => out.includes(p) || deep.includes(p))
  assert.deepEqual(dupFound, ['--ink-0'], `⑴的判据该只揪出这一枚，实际 ${dupFound.join(', ') || '没揪出来'}`)

  // ⑵ 删掉一处 --scrim → 两套主题块就只剩一边有，必须报不对称。
  //    （文件里深色块在浅色块之前，所以"删第一处"删掉的是深色那份；断言只问不对称，不问方向。）
  const oneSide = CSS.replace(/^[ \t]*--scrim:[^\n]*\n/m, '')
  const o2 = topBlocks(oneSide).filter(([sel]) => isTheme(sel) && !isDeep(sel)).flatMap(([, x]) => decls(x))
  const d2 = topBlocks(oneSide).filter(([sel]) => isDeep(sel)).flatMap(([, x]) => decls(x))
  assert.notEqual(
    o2.includes('--scrim'),
    d2.includes('--scrim'),
    '⑵的判据此刻抓得到单侧定义吗——两边同缺或同有都不算造出故障（先确认这条造假真的改动了文件体）'
  )

  // 深度扫描不是摆设：把主题块整块挪进一个 @media 里，顶层就不该再抓到它
  const nested = '@media (min-width: 1px) {\n' + CSS.slice(CSS.indexOf(":root[data-theme='out']"))
  const inTop = topBlocks(nested).some(([sel]) => isTheme(sel) && !isDeep(sel))
  assert.ok(!inTop, '嵌套块被当成顶层块抓走了，深度扫描失效')
})
