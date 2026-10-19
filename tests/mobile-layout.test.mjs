// 手机端的三条回归钉子（2026-10-19 实测 390/360/320）：
//   ⑴ 40px 刊头整行约 9.38em，窄于 375px 会出画，必须有视口上限；
//   ⑵ 三列表格在 320px 上宽 331px，必须能自己横向滚动，否则最后一列被裁且滚不到；
//   ⑶ 触屏拖动也会发 pointermove，透镜不该跟着滚动改光斑坐标。
// 跑法：npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { onLens } from '../src/lib/lens.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = (p) => readFileSync(join(ROOT, p), 'utf8')

// 判据做成纯函数：负向对照喂改坏的样本文本，而不是对着字面量自说自话
const capped = (css) => {
  const m = css.match(/--fs-hero-title:\s*([^;]+);/)
  return !!m && /min\(/.test(m[1]) && /10\.5vw/.test(m[1])
}

function tableScrolls(css) {
  // 直接锚到"包着表格规则的那一个窄屏块"，别再懒匹配跨过前面 700 行
  const block = css.match(/@media \(max-width: 720px\) \{\s*html:root \.en-prose table \{([\s\S]*?)\n  \}/)
  if (!block) return null
  return { displayBlock: /display:\s*block/.test(block[1]), scrollX: /overflow-x:\s*auto/.test(block[1]) }
}

test('刊头在 375px 以下跟视口收口，宽屏仍是原 clamp', () => {
  const hero = src('src/components/HorizonHero.vue')
  assert.equal(capped(hero), true, '刊头没有视口上限：窄屏整行会出画')
  // 负向对照：把 token 换回 2026-10-13 那版裸 clamp，同一条判据必须变红
  assert.equal(capped(hero.replace(/--fs-hero-title:\s*[^;]+;/, '--fs-hero-title: clamp(40px, 7vw, 96px);')), false)
})

test('窄屏表格自己横向滚动，不再把最后一列顶出视口', () => {
  const css = src('src/styles/site.css')
  assert.deepEqual(tableScrolls(css), { displayBlock: true, scrollX: true })
  // 负向对照：抽掉滚动能力，判据必须变红
  const broken = css.replace(
    /(@media \(max-width: 720px\) \{\s*html:root \.en-prose table \{[\s\S]*?)overflow-x: auto;/,
    '$1'
  )
  assert.equal(tableScrolls(broken).scrollX, false, '删掉 overflow-x 却还判成可滚动，量具是瞎的')
})

test('触屏 pointermove 不写透镜坐标，鼠标照旧', () => {
  const calls = []
  const el = {
    style: { setProperty: (k, v) => calls.push([k, v]) },
    getBoundingClientRect: () => ({ left: 0, top: 0 }),
  }
  onLens({ pointerType: 'touch', currentTarget: el, clientX: 10, clientY: 20 })
  assert.deepEqual(calls, [], '触屏也写了 --lx/--ly，滚动时会白重绘')
  onLens({ pointerType: 'mouse', currentTarget: el, clientX: 10, clientY: 20 })
  assert.deepEqual(calls, [['--lx', '10px'], ['--ly', '20px']])
})
