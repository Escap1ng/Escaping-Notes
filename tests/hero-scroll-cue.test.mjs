// 下滑提示钮的重做钉子（2026-11-17 四版：「重做」→「太不清楚了」→「还是不好看」）。
// 四版明账（别再回头试）：① 52% ink-0 半透盘 + 淡冷细边 = 白贴纸；② 裸细弧 + 次色 75%
// = 亮照片上看不见；③ 整色 text-0 + 2px = 仍太不清楚；④ 实底卡面 + 饱和冷环 = 清楚了
// 但成平庸悬浮钮。**病根是"圆盘容器"这个形态**，加底更重、去底更虚。
// 第四版契约：① 不做容器——无 border / 无 background / 无 border-radius 圆盘；
// ② 结构是 标签 + 垂线(cue-track) + 滑行星点(cue-star)；③ 颜色走压深色底片专用的
// --plate-hdr / --plate-fg（两主题都是浅色，首屏底部是暗山脊），**不许用 --cold 当主色**
// （浅色那枚深蓝压暗山只有 1.8:1）；④ 星点有下滑动画、减弱动效下停在线中段可见；
// ⑤ 淡出挂 --shift、热区靠 ::after、矮屏让位、文案走 N.hero.scroll。各带负向对照。
// 跑法：npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const HERO = readFileSync(join(ROOT, 'src/components/HorizonHero.vue'), 'utf8')
const N = readFileSync(join(ROOT, 'src/data/narrative.js'), 'utf8')

const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')
const impl = code(HERO)

function block(css, selector) {
  const re = new RegExp(`(^|\\})\\s*${selector.replace(/[.]/g, '\\.')}\\s*\\{([^}]*)\\}`, 'm')
  const m = css.match(re)
  return m ? m[2] : null
}

test('第四版不做圆盘容器：无实边、无底、无圆角盘', () => {
  const b = block(impl, '.scroll-cue')
  assert.ok(b, '找不到 .scroll-cue 块')
  assert.match(b, /border:\s*0/, '实边回来了：圆盘容器的老路')
  assert.match(b, /background:\s*none/, '底板回来了：加底更重，作者已否')
  assert.ok(!/border-radius:\s*50%/.test(b), '又是圆盘：形态本身就是病根')
  // 旧的环/箭头结构不许复活
  assert.ok(!/class="cue-ring"/.test(impl), 'cue-ring 复活了')
  assert.ok(!/class="cue-arrow"/.test(impl), 'cue-arrow 复活了')
  // 负向对照：塞回卡面底 + 圆角，判据必须变红
  const bad = impl
    .replace(/background:\s*none/, 'background: var(--card-bg)')
    .replace(/border:\s*0/, 'border: 1px solid var(--card-brd)')
  const bb = block(bad, '.scroll-cue')
  assert.ok(!/background:\s*none/.test(bb) && !/border:\s*0/.test(bb), '负向对照没造出圆盘')
})

test('结构是 标签 + 垂线 + 滑行星点', () => {
  assert.match(impl, /class="cue-label"/, '缺小字标签')
  // 真因钉子：.en-mono 把 color:--text-1（灰）直接设在元素上，而浅色原先只写在父钮上
  // 靠继承——直接声明永远赢继承，标签因此一直是灰字压暗山（实拍两版都栽在这儿）。
  // 所以标签不挂基元，颜色与等宽字族都在 scoped 里显式写。
  assert.ok(!/class="cue-label en-mono"/.test(impl), '标签又挂了 .en-mono：灰色会压掉浅色，标签发虚')
  const lb = block(impl, '.cue-label')
  assert.ok(lb, '找不到 .cue-label 块')
  assert.match(lb, /font-family:\s*var\(--font-mono\)/, '等宽字族没显式写：脱离基元后就不是仪器文字了')
  assert.match(lb, /color:\s*var\(--plate-hdr\)/, '标签没显式给浅色：会继承或被基元压成灰')
  assert.match(impl, /class="cue-track"/, '缺垂线')
  assert.match(impl, /class="cue-star"/, '缺星点')
  const t = block(impl, '.cue-track')
  assert.ok(t && /height:\s*36px/.test(t), '垂线长度不是 36px')
  assert.match(t, /linear-gradient\(to bottom, transparent, currentColor/, '垂线没有上端渐隐')
  const s = block(impl, '.cue-star')
  assert.ok(s, '找不到 .cue-star 块')
  assert.match(s, /border-radius:\s*50%/, '星点不是圆')
  assert.match(s, /animation:\s*cue-fall/, '星点没有下滑动画')
  assert.match(impl, /@keyframes cue-fall\s*\{[\s\S]*?translateY\(31px\)/, '星点没走完整条轨迹')
})

test('颜色走压深色底片令牌，不许用 --cold 当主色', () => {
  const b = block(impl, '.scroll-cue')
  assert.match(b, /color:\s*var\(--plate-hdr\)/, '主色没用 --plate-hdr：两主题压暗山脊才都清晰')
  const s = block(impl, '.cue-star')
  assert.match(s, /background:\s*var\(--plate-fg\)/, '星点没用 --plate-fg')
  // --cold 只许出现在注释里，不许当这枚钮的实际着色（浅色深蓝压暗山 1.8:1）
  assert.ok(!/var\(--cold\)/.test(b), '主色用了 --cold：浅色主题压暗山只有 1.8:1')
  assert.ok(!/var\(--cold\)/.test(s), '星点用了 --cold')
})

test('减弱动效下星点停在线中段可见，不剩空线', () => {
  const rms = [...impl.matchAll(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/g)]
  const rm = rms.find((m) => m[1].includes('.cue-star'))
  assert.ok(rm, '找不到管星点的减弱动效分支')
  assert.match(rm[1], /\.cue-star[\s\S]*?animation:\s*none/, '减弱动效下星点动画没停')
  assert.match(rm[1], /\.cue-star[\s\S]*?opacity:\s*1/, '减弱动效下星点被淡没了')
  assert.match(rm[1], /translateY\(16px\)/, '星点没停在线中段：会停在端点读成坏了')
})

test('契约不变：--shift 淡出、::after 热区、矮屏让位、文案走 N', () => {
  const b = block(impl, '.scroll-cue')
  assert.match(b, /opacity:\s*calc\(1 - var\(--shift, 0\) \* 6\)/, '淡出不再挂 --shift')
  assert.match(impl, /\.scroll-cue::after\s*\{[^}]*inset:\s*-6px/, '触控热区没了')
  assert.match(impl, /@media \(max-height: 430px\)\s*\{\s*\.scroll-cue\s*\{\s*display:\s*none/, '矮屏不让位会压刊头')
  assert.match(impl, /:aria-label="N\.hero\.scroll"/, '无障碍名又硬编码了')
  assert.match(code(N), /hero:\s*\{\s*scroll:\s*'向下滚动'\s*\}/, '文案层没有这枚钮的名字')
})
