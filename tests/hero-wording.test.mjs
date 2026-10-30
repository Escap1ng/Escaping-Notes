// 首屏文案契约的钉子：N 里必须真有首屏要的那几样，且视图不引用不存在的字段。
// 为什么要钉：docs/design.md §2 原则 4 规定界面文案唯一来源是 narrative.js，而删字段是**静默失败**——
// Vite 不会为 `N.heroEyebrow` 取不到而报错，它渲染成空文本，首屏少一行没人发现。
// 跑法：npm test（Node 内置 test runner，零依赖）
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { N } from '../src/data/narrative.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = (p) => readFileSync(join(ROOT, p), 'utf8')

test('首屏站名存在、已 trim、全大写', () => {
  assert.equal(typeof N.heroTitle, 'string')
  assert.ok(N.heroTitle.length > 0)
  assert.equal(N.heroTitle, N.heroTitle.trim())
  assert.equal(N.heroTitle, N.heroTitle.toUpperCase())
})

test('视图里每一处 N.字段 引用都真实存在', () => {
  const files = ['src/components/HorizonHero.vue', 'src/App.vue', 'src/views/HomeView.vue']
  let hits = 0
  for (const f of files) {
    for (const m of src(f).matchAll(/\bN\.([A-Za-z_$][\w$]*)/g)) {
      hits++
      assert.ok(m[1] in N, `${f} 引用了不存在的 N.${m[1]}（会静默渲染成空）`)
    }
  }
  assert.ok(hits >= 4, `一个 N. 引用都没扫到，说明这条判据是空的（实扫 ${hits} 处）`)
})
