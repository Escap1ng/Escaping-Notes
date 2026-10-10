// 映像柜（/gallery）的钉子：底片清单与真正在用的底片必须互相咬合。
// 为什么要钉：换一张底片只改 neo.css 的 --plate-img 时，config/gallery.js 会留下那张
//   已经没人在用的旧图——三个 check 脚本都核不出「页面在展示一张全站已经不用的图」，
//   而它恰恰是这一页存在的理由（"图片来自所有用过的图片"）。
// 只碰 config/gallery.js：src/lib/gallery.js 经 posts.js 用到 import.meta.glob（Vite 专有），
//   在纯 Node 里连不上，所以歪斜角那条数学不在这里验。
// 跑法：npm test（Node 内置 test runner，零依赖）
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { sitePlates } from '../src/config/gallery.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = (p) => readFileSync(join(ROOT, p), 'utf8')

const cssUrls = [...src('src/styles/neo.css').matchAll(/url\('(\/plates\/[^']+)'\)/g)].map(
  (m) => m[1]
)
const cssSet = new Set(cssUrls)
const listedPlates = sitePlates.map((s) => s.src).filter((s) => s.startsWith('/plates/'))
const listedSet = new Set(listedPlates)

test('neo.css 用到的底片与映像柜登记的底片是同一批', () => {
  assert.deepEqual([...cssSet].sort(), [...listedSet].sort())
})

// 反向对照：上面那条走的是集合相等，两边同时为空就会假绿。
// 这里钉住"尺子确实量到了东西"——正则一旦因为 url() 换了写法而空手而归，先红在这里。
test('反向：对拍两侧都非空、且抓到的条数对得上', () => {
  assert.ok(cssSet.size >= 4, `neo.css 里只抓到 ${cssSet.size} 张 /plates/，正则八成失效了`)
  assert.ok(listedSet.size >= 4, `清单里只登记了 ${listedSet.size} 张`)
  assert.equal(listedPlates.length, listedSet.size, '清单里有重复登记的同一张底片')
})

test('映像柜登记的每张图都真在 public/ 下', () => {
  for (const s of sitePlates) {
    assert.ok(existsSync(join(ROOT, 'public', s.src.slice(1))), `缺文件：${s.src}`)
    assert.ok(s.title && s.title === s.title.trim(), `标题为空或带首尾空格：${s.src}`)
  }
})
