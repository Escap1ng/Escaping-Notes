// 详情页返回机制的钉子：/blog/:slug 与 /projects/:slug 必须共用 lib/exit.js 那一处实现。
// 为什么要钉：这一轮之前，"点开看看"在站内有七种容器与三套返回办法（按钮 / 灯箱 Esc / 我这层模态），
// 而新增一个详情页最容易犯的错就是再抄一份 Esc 监听 + 再写一次 router.back()。
// 判据本身要能红：负向对照在下面——同一把尺子量 lib/exit.js 必须抓到 router.replace()。
// 跑法：npm test（Node 内置 test runner，零依赖）
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = (p) => readFileSync(join(ROOT, p), 'utf8')
// 判据量的是代码，不是注释：先剥掉块注释与行注释（URL 里的 // 前面带冒号，放过）
const code = (p) =>
  src(p)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')

const VIEWS = ['src/views/PostView.vue', 'src/views/ProjectView.vue']

test('两张详情页都从 lib/exit.js 拿返回机制，自己不再写一份', () => {
  for (const f of VIEWS) {
    const text = code(f)
    assert.ok(
      /import\s*\{\s*useDetailExit\s*\}\s*from\s*'\.\.\/lib\/exit\.js'/.test(text),
      `${f} 没有用 useDetailExit——它多半自己抄了一套 Esc / 点空白返回`
    )
    assert.ok(/useDetailExit\(\s*'\/(blog|projects)'/.test(text), `${f} 引了但没调用`)
    // 程序化跳转只许发生在 lib/exit.js 里：页面自己写 back()/push() 就会绕开"一律回列表"这条口径
    assert.equal(
      (text.match(/\brouter\.(back|go|forward|push|replace)\s*\(/g) || []).length,
      0,
      `${f} 里出现了裸的跳转调用，应交给 useDetailExit()`
    )
  }
})

// 反向对照：上面那把尺子真的量得动——同一套正则去量实现方，必须抓到跳转。
// 少了这一条，"零命中"可能只是因为正则写错了（比如 \b 把 router.replace 挡在门外）。
test('反向：尺子量得到实现方，也量得到那几条判据', () => {
  const impl = code('src/lib/exit.js')
  assert.ok(/\brouter\.replace\(/.test(impl), '尺子失效：连实现方的 router.replace() 都抓不到')
  assert.ok(!/\brouter\.(back|go)\s*\(/.test(impl), '实现方又用上了 back()——深链接进来时它会往回走两页')
  assert.ok(impl.includes("e.key === 'Escape'"), 'lib/exit.js 里不再有 Escape 判断，那 Esc 返回是谁在做？')
  assert.ok(impl.includes('mousedown'), '点空即退不再比较按下与抬起，拖选文字会误退')
  assert.ok(impl.includes('[role="dialog"]'), '空白判据不再排除模态框，点灯箱会把整页退掉')
})
