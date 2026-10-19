// 映像柜（/gallery）的钉子：墙上私有的底片只有抽屉轮播那三张。
// 为什么要钉：首屏地景（亮 / 暗两张）、深色压暗底与分享卡都是站点在用、
//   却不属于任何文章的图——它们一度也被登记进映像柜。这条测试把"只收三张底片"钉住，
//   防止下次换底片时又顺手加回去。
// 只碰 src/data/gallery.js：src/lib/gallery.js 经 posts.js 用到 import.meta.glob（Vite 专有），
//   在纯 Node 里连不上，所以歪斜角那条数学不在这里验。
// 跑法：npm test（Node 内置 test runner，零依赖）
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { sitePlates } from '../src/data/gallery.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = (p) => readFileSync(join(ROOT, p), 'utf8')

const cssUrls = [...src('src/styles/site.css').matchAll(/url\('(\/plates\/[^']+)'\)/g)].map(
  (m) => m[1]
)
const cssSet = new Set(cssUrls)
const listedPlates = sitePlates.map((s) => s.src)

test('映像柜登记的底片恰好是抽屉轮播的那三张', () => {
  assert.deepEqual(listedPlates, [
    '/plates/plate-bg-paper1.jpg',
    '/plates/plate-bg-paper3.jpg',
    '/plates/plate-bg-paper4.jpg',
  ])
})

test('登记的底片都仍在 site.css 里使用', () => {
  assert.ok(cssSet.size >= 3, `site.css 里只抓到 ${cssSet.size} 张 /plates/，正则八成失效了`)
  for (const s of listedPlates) {
    assert.ok(cssSet.has(s), `${s} 已不在 site.css 里使用，该从映像柜撤下`)
  }
})

test('映像柜登记的每张图都真在 public/ 下', () => {
  for (const s of sitePlates) {
    assert.ok(existsSync(join(ROOT, 'public', s.src.slice(1))), `缺文件：${s.src}`)
    assert.ok(s.title && s.title === s.title.trim(), `标题为空或带首尾空格：${s.src}`)
  }
})
