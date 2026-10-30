// 手机端的回归钉子（2026-10-19 实测 390/360/320，2026-10-30 补触控兜底）：
//   ⑴ 刊头整行约 9.38em，必须有视口上限（现值 9.5vw）；
//   ⑵ 三列表格在 320px 上必须能自己横向滚动；
//   ⑶ 触屏拖动也会发 pointermove，透镜不该跟着滚动改光斑坐标；
//   ⑷ 点按不闪灰底、iOS 不放大正文、32px 图标钮热区外撑 4px 到 40px；
//   ⑸ 五层浮层（三张卡 + 两处灯箱）开着时都锁 body 滚动。
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
  return !!m && /min\(/.test(m[1]) && /9\.5vw/.test(m[1])
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
  // 2026-10-30：上限从 10.5vw 收到 9.5vw——390 上左右留白从 7.4px 提到 21.3px，旧值不许复活
  assert.doesNotMatch(hero.match(/--fs-hero-title:\s*([^;]+);/)[1], /10\.5vw/)
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

test('触控兜底：点按不闪灰底，iOS 不放大正文，小图标钮热区外撑 4px', () => {
  const css = src('src/styles/site.css')
  const header = src('src/components/SiteHeader.vue')
  assert.match(css, /-webkit-tap-highlight-color:\s*transparent/, '点按灰底又回来了')
  assert.match(css, /text-size-adjust:\s*100%/, 'iOS 又开始自作主张放大正文')
  assert.match(header, /\.ico-btn::after\s*\{[\s\S]{0,120}inset:\s*-4px/, '32px 图标钮没有外撑热区')
  // 负向对照：热区写回 6px 就会吃进相邻热区（四枚只隔 8px），同一条判据必须变红
  const greedy = header.replace(/\.ico-btn::after\s*\{[^}]*inset:\s*-4px/, '.ico-btn::after { inset: -6px')
  assert.equal(/inset:\s*-4px/.test(greedy) === false, true, '这条负向对照没量到东西')
})

test('五层浮层开着时都锁掉 body 滚动', () => {
  const locks = [
    'src/components/MusicCard.vue',
    'src/components/SettingsCard.vue',
    'src/components/SearchCard.vue',
    'src/views/GalleryView.vue',
    'src/views/PostView.vue',
  ]
  for (const f of locks) {
    const text = src(f)
    assert.match(text, /document\.body\.style\.overflow = [^;\n]*hidden/, `${f} 开着不锁滚动`)
    assert.match(text, /document\.body\.style\.overflow = ''/, `${f} 关了不还滚动权`)
  }
  // 抽屉的锁写在 SiteHeader 的 watch 里，三元式与上面五处不同形，单独钉一条
  const header = src('src/components/SiteHeader.vue')
  assert.match(header, /document\.body\.style\.overflow = open \? 'hidden' : ''/)
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
