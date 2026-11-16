// 手机端的回归钉子（2026-10-19 实测 390/360/320，2026-10-30 补触控兜底）：
//   ⑴ 刊头桌面整行加宽后约 10.482em（0.05em 字距 + scaleX 1.12），字号 7.8vw 铺满约 81% 视口；
//      手机（≤720 宽、≥600 高）断成 ESCAPING / NOTES 两行、字号 13.2vw，长行占约 80% 视口；
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
// 2026-11-16 第二轮：撤掉 scaleX 假加宽（作者判「还是不好看」），改自然宽字距 0.10em，
// 字号 8vw 保持约 80% 占比。判据同时钉住字距与「不许有横向拉伸」——
// 只改字号不改字距，占比就漂了；拉伸复活则字形重新变形
// 剥注释：判据量的是实现，不是说明文字。注释里记着「scaleX 假加宽已撤」是应该的，
// 不该让「拉伸不许复活」这条假红（同 post-toc-rail 的做法）
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')

const fitted = (css) => {
  const impl = code(css)
  const m = impl.match(/--fs-hero-title:\s*([^;]+);/)
  const ls = impl.match(/\.title\s*\{[^}]*letter-spacing:\s*([^;]+);/)
  return (
    !!m &&
    /^\s*8vw\s*$/.test(m[1]) &&
    !!ls &&
    /^\s*0\.1em\s*$/.test(ls[1]) &&
    !/scaleX/.test(impl) &&
    !/--hero-widen/.test(impl)
  )
}

// 手机两行块：媒体查询起头后取 600 字符，够覆盖 .hero 与 .title 两条规则
function phoneLockup(vue) {
  const at = vue.indexOf('@media (max-width: 720px) and (min-height: 600px)')
  if (at < 0) return null
  const block = vue.slice(at, at + 600)
  const fs = block.match(/--fs-hero-title:\s*([\d.]+)vw/)
  const lines = block.match(/--hero-lines:\s*(\d+)/)
  return {
    fs: fs ? Number(fs[1]) : null,
    lines: lines ? Number(lines[1]) : null,
    wraps: /\.title\s*\{[^}]*white-space:\s*normal/.test(block),
  }
}

function tableScrolls(css) {
  // 直接锚到"包着表格规则的那一个窄屏块"，别再懒匹配跨过前面 700 行
  const block = css.match(/@media \(max-width: 720px\) \{\s*html:root \.en-prose table \{([\s\S]*?)\n  \}/)
  if (!block) return null
  return { displayBlock: /display:\s*block/.test(block[1]), scrollX: /overflow-x:\s*auto/.test(block[1]) }
}

test('刊头按 8vw + 0.10em 宽字距铺满约 80% 视口；旧 clamp / 拉伸假加宽都不许复活', () => {
  const hero = src('src/components/HorizonHero.vue')
  assert.equal(fitted(hero), true, '刊头不再是 8vw + 0.10em：整行会偏离 80% 视口，或拉伸假加宽复活')
  // 负向对照：换成 2026-10-13 那版裸 clamp 或旧 10.5vw，同一条判据必须变红
  assert.equal(fitted(hero.replace(/--fs-hero-title:\s*[^;]+;/, '--fs-hero-title: clamp(40px, 7vw, 96px);')), false)
  assert.equal(fitted(hero.replace(/--fs-hero-title:\s*[^;]+;/, '--fs-hero-title: 10.5vw;')), false)
  // 负向对照：拉伸复活（作者判过「还是不好看」），或字距退回窄版，必须变红
  assert.equal(fitted(`${hero}\n.title-w { transform: scaleX(1.12); }`), false)
  assert.equal(fitted(hero.replace(/letter-spacing:\s*0\.1em;/, 'letter-spacing: 0.04em;')), false)
  // 两行时标题高必须按行数走，否则块底目标还按一行算，刊头会被顶进山尖
  assert.match(
    hero,
    /--title-h:\s*calc\(var\(--hero-lines\)\s*\*\s*var\(--lh-hero-title\)\s*\*\s*var\(--fs-hero-title\)\)/,
    '--title-h 不再乘 --hero-lines：手机两行的高度没进几何链'
  )
  // 整组高 = 标题高 + 铭牌高（铭牌不进居中约束，但占内容盒的高度）
  assert.match(
    hero,
    /--lockup-h:\s*calc\(var\(--title-h\)\s*\+\s*var\(--motto-h\)\)/,
    '--lockup-h 不再是标题高 + 铭牌高：垫量会与实际内容高失配'
  )
})

test('重心：居中约束只锚刊头，铭牌不许把刊头往上拽（2026-11-16 作者判「重心有问题」）', () => {
  const hero = src('src/components/HorizonHero.vue')
  // 星环那条约束必须用 --title-h/2（刊头自己的半高），不能用 --lockup-h/2（整组半高）——
  // 后者会把整组中心抬到星环上方，等于把刊头往上拽半个铭牌高、铭牌正压星环中心
  const arc = hero.match(/--hero-title-b:\s*min\(([\s\S]*?)\);/)
  assert.ok(arc, '找不到 --hero-title-b：居中约束没了锚点')
  assert.match(arc[1], /var\(--arc-y\)\s*-\s*var\(--arc-gap\)\s*\+\s*var\(--title-h\)\s*\/\s*2/, '星环约束不再锚刊头半高')
  assert.ok(!/var\(--lockup-h\)\s*\/\s*2/.test(arc[1]), '星环约束又用了整组半高：铭牌会把刊头往上拽')
  // 防压山那条要减掉铭牌高（铭牌底才是整组底）
  assert.match(arc[1], /var\(--peak-y\)\s*-\s*var\(--crest-gap\)\s*-\s*var\(--motto-h\)/, '防压山约束没给铭牌留位')

  // 负向对照：把星环约束改回整组半高，同一条判据必须变红
  const bad = hero.replace(
    /var\(--arc-y\)\s*-\s*var\(--arc-gap\)\s*\+\s*var\(--title-h\)\s*\/\s*2/,
    'var(--arc-y) - var(--arc-gap) + var(--lockup-h) / 2'
  )
  const badArc = bad.match(/--hero-title-b:\s*min\(([\s\S]*?)\);/)
  assert.ok(/var\(--lockup-h\)\s*\/\s*2/.test(badArc[1]), '这条负向对照没造出重心偏移')
})

test('手机刊头断两行：长行不出画，整行必然断在词间空格', () => {
  const hero = src('src/components/HorizonHero.vue')
  const lock = phoneLockup(hero)
  assert.ok(lock, '没找到手机两行的媒体查询（≤720 宽、≥600 高）')
  assert.equal(lock.wraps, true, '.title 还是 nowrap，两行永远断不出来')
  assert.equal(lock.lines, 2, '--hero-lines 不是 2，--lockup-h 会按一行算')
  // 字宽实测（Didone 子集，100px，0.04em 字距下整行 9.219 / 长行 5.352）。
  // 扣掉那份字距得纯字形宽，再按当前 0.10em 重算——CSS 字距每个字符后都加一份（含末字符），
  // 整行 "ESCAPING NOTES" 14 字符、长行 "ESCAPING" 8 字符
  const ls = Number(code(hero).match(/\.title\s*\{[^}]*letter-spacing:\s*([\d.]+)em/)[1])
  const ESCAPING = 5.352 - 8 * 0.04 + 8 * ls
  const WHOLE = 9.219 - 14 * 0.04 + 14 * ls
  for (const w of [320, 360, 390]) {
    const content = w - 2 * 16 // 窄屏左右各一枚 --space-2
    const px = (lock.fs / 100) * w
    assert.ok(ESCAPING * px < content, `${w}px：ESCAPING 这行长出画了`)
    assert.ok(WHOLE * px > content, `${w}px：整行还塞得下一行，手机没断行`)
  }
  // 负向对照：字号退到 7vw，整行在 320 上也塞得下（10.059×22.4≈225 < 288），
  // 同一条判据必须变红（旧宽度时代的 9vw 在宽字距下仍会断行，量不到东西）
  const loose = phoneLockup(hero.replace(/--fs-hero-title:\s*13\.6vw/, '--fs-hero-title: 7vw'))
  assert.equal(WHOLE * ((loose.fs / 100) * 320) > 320 - 32, false, '这条负向对照没量到东西')
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
