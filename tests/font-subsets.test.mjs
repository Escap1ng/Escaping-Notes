// 展示层字体的分片钉子：@font-face 的 unicode-range 必须「每字恰好一片、无重叠」，
// 且 GB2312 一级字表、当前文章标题与站内文案都落在覆盖范围内。
// 为什么钉：分片是生成物，重叠会让同一批字白下两份，漏字则是标题里单个字静默回落 SimSun——
// 两种都不会报错，只有和生成脚本对拍才看得见。
// 跑法：npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CSS = join(ROOT, 'src/styles/font-display.css')

function faces(css) {
  const out = []
  for (const m of css.matchAll(/@font-face\s*{([\s\S]*?)}/g)) {
    const body = m[1]
    const src = body.match(/url\('([^']+\.woff2)'\)/)
    const range = body.match(/unicode-range:\s*([^;]+);/)
    if (!src || !range) continue
    out.push({ file: src[1], range: range[1] })
  }
  return out
}

// "U+4E00-4E05, U+4E08" → [[0x4E00, 0x4E05], [0x4E08, 0x4E08]]
function ranges(spec) {
  return spec
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const m = s.match(/^U\+([0-9A-F]{4,6})(?:-([0-9A-F]{4,6}))?$/i)
      assert.ok(m, `看不懂的 unicode-range 片段：${s}`)
      const a = parseInt(m[1], 16)
      return [a, m[2] ? parseInt(m[2], 16) : a]
    })
}

// 返回重复码点（空数组 = 无重叠）。负向对照直接喂假表。
function overlaps(faceList) {
  const owner = new Map()
  const dup = []
  for (const [i, f] of faceList.entries()) {
    for (const [a, b] of ranges(f.range)) {
      for (let cp = a; cp <= b; cp++) {
        if (owner.has(cp)) dup.push(cp)
        else owner.set(cp, i)
      }
    }
  }
  return dup
}

function covered(faceList, cp) {
  return faceList.some((f) => ranges(f.range).some(([a, b]) => cp >= a && cp <= b))
}

const css = readFileSync(CSS, 'utf8')
const list = faces(css)

test('字体确实分片了，且每片文件都在', () => {
  assert.ok(list.length > 1, 'font-display.css 只有一片——分片没生效')
  for (const f of list) {
    assert.ok(existsSync(join(ROOT, 'src/styles', f.file)), `@font-face 指向的文件不存在：${f.file}`)
  }
})

test('unicode-range 互不重叠：同一批字不会下两份', () => {
  const dup = overlaps(list)
  assert.deepEqual(dup.slice(0, 10).map((cp) => `U+${cp.toString(16).toUpperCase()}`), [])
})

test('GB2312 一级字表 + ASCII 可见字符全覆盖', () => {
  const base = readFileSync(join(ROOT, 'scripts/data/chars-gb2312-l1.txt'), 'utf8').replace(/\s/g, '')
  const missing = []
  for (const ch of new Set(base)) if (!covered(list, ch.codePointAt(0))) missing.push(ch)
  for (let cp = 33; cp <= 126; cp++) if (!covered(list, cp)) missing.push(String.fromCharCode(cp))
  assert.deepEqual(missing, [], `这些字不在任何一片里（跑 npm run font:build）：${missing.join('')}`)
})

test('当前文章的标题与小标题都在覆盖范围内', () => {
  const posts = join(ROOT, 'content/posts')
  const missing = new Set()
  for (const dir of readdirSync(posts, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue
    const md = readFileSync(join(posts, dir.name, 'index.md'), 'utf8')
    const front = md.match(/^---[\s\S]*?\n---/)
    const title = front && front[0].match(/^title:\s*(.+)$/m)
    const text = (title ? title[1] : '') + md.split(/\r?\n/).filter((l) => /^#{1,6}\s+/.test(l)).join('')
    for (const ch of text) {
      if (!/[\u3400-\u9fff\uf900-\ufaff]/.test(ch)) continue
      if (!covered(list, ch.codePointAt(0))) missing.add(ch)
    }
  }
  assert.deepEqual([...missing], [], `标题用字不在任何一片里（跑 npm run font:build）：${[...missing].join('')}`)
})

// 负向对照：重叠检测器必须抓得到重叠，且 "covered" 不能把范围外的字判成覆盖。
test('负向对照：重叠与漏字都判得出来', () => {
  const bad = [
    { file: 'a.woff2', range: 'U+4E00-4E05, U+4E08' },
    { file: 'b.woff2', range: 'U+4E04-4E0A' },
  ]
  assert.deepEqual(overlaps(bad), [0x4e04, 0x4e05, 0x4e08], '重叠了却说没有，量具是瞎的')
  assert.equal(covered(bad, 0x4e06), true)
  assert.equal(covered(bad, 0x4e0b), false)
})
