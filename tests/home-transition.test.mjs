// 首页转场例外的钉子（2026-11-08 作者判「坍缩感太重，自然平和一点」）：
// 全站 fall 带 scale + 模糊 + 色偏，首页只留 opacity 的一进一出交叉淡化。
// 为什么要钉：例外靠 .home.fall-* 两条复合选择器承载，命中全靠 HomeView 的根类是 .home——
// 根类改名、或关键帧被改回 fall-in/fall-out，首页就静默回到"坍缩"，不报错也不进日志。
// 减弱动效也要显式列出这两条：media query 不加特异性，漏列了动画照跑。
// 跑法：npm test（Node 内置 test runner，零依赖）
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = (p) => readFileSync(join(ROOT, p), 'utf8').replace(/\r\n/g, '\n')

// 关键帧体：内层块缩进两格，收口 } 在行首，非贪婪量到第一个行首 } 即整块
const kf = (css, name) => {
  const m = css.match(new RegExp(`@keyframes ${name}\\s*\\{([\\s\\S]*?)\\n\\}`))
  return m ? m[1] : ''
}

const opacityOnly = (body) =>
  /opacity:\s*0/.test(body) && /opacity:\s*1/.test(body) && !/transform|filter/.test(body)

const homeVariant = (css, home) =>
  /\.home\.fall-enter-active\s*\{[^}]*animation:\s*home-in\b/.test(css) &&
  /\.home\.fall-leave-active\s*\{[^}]*animation:\s*home-out\b/.test(css) &&
  /<template>\s*<div class="home">/.test(home) &&
  opacityOnly(kf(css, 'home-in')) &&
  opacityOnly(kf(css, 'home-out'))

test('首页出入场只留 opacity：复合选择器命中、关键帧无 scale / 模糊 / 色偏', () => {
  const css = src('src/styles/site.css')
  const home = src('src/views/HomeView.vue')
  assert.equal(homeVariant(css, home), true, '首页转场回到全站 fall 了（或根类名改了，选择器落空）')

  // 负向对照：把 fall-in 的体塞回 home-in，判据必须红
  const old = css.replace(kf(css, 'home-in'), kf(css, 'fall-in'))
  assert.notEqual(old, css, '这记假根本没改动文件体')
  assert.equal(homeVariant(old, home), false)

  // 负向对照：根类改名，复合选择器静默落空，判据也要红
  const renamed = home.replace('<div class="home">', '<div class="page-home">')
  assert.notEqual(renamed, home)
  assert.equal(homeVariant(css, renamed), false)
})

test('减弱动效显式覆盖首页例外：media query 不加特异性，漏列动画照跑', () => {
  const css = src('src/styles/site.css')
  // 全站有两处 reduced-motion 块（首帧总开关 + §11 逐条名单），覆盖在哪一处都算数
  const blocks = [...css.matchAll(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/g)].map(
    (m) => m[1]
  )
  assert.ok(blocks.length >= 1, '减弱动效块没了')
  const covers = (block) =>
    /\.home\.fall-enter-active/.test(block) &&
    /\.home\.fall-leave-active/.test(block) &&
    /animation:\s*none/.test(block)
  assert.ok(blocks.some(covers), '首页例外没进减弱动效名单')

  // 负向对照：摘掉两条 home 选择器，判据必须红
  const old = blocks.map((b) =>
    b.replace('.home.fall-enter-active,\n', '').replace('.home.fall-leave-active', '.fall-leave-active')
  )
  assert.notDeepEqual(old, blocks, '这记假根本没改动文件体')
  assert.equal(old.some(covers), false)
})