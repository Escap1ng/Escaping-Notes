// 双主题对比度审计：从 site.css 的两个主题块读令牌，按 WCAG 比值判。
// 这里只有**一把**尺子：曾经还有一条"合成后绝对级差"（近黑底上比值会压缩，bg 2.2 级时 1.48:1
// 已经是 Δ41 级——星轨那几轮 docs/design.md §9 第 8、10 条吃过这个亏），它唯一的消费者是
// 每页一枚巨型空心汉字的那层签名，那件东西已整体删除（docs/design.md §9 第 19 条），
// 尺子连同 levels/mixHex/dLevels 一起撤了。要再量发丝线级的绝对差，先把这套数学重新写回来并**当场**接上消费者。
// 用法：node scripts/check_contrast.mjs          正常审计，不达标 exit 1
//       node scripts/check_contrast.mjs --self   负向对照：喂一组故意不达标的假令牌，必须 exit 1
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CSS = readFileSync(join(ROOT, 'src', 'styles', 'site.css'), 'utf8')

function block(selRe) {
  const m = CSS.match(selRe)
  if (!m) throw new Error('site.css 里找不到选择器 ' + selRe)
  const open = CSS.indexOf('{', m.index)
  let depth = 0, j = open
  for (; j < CSS.length; j++) {
    if (CSS[j] === '{') depth++
    else if (CSS[j] === '}') { depth--; if (!depth) break }
  }
  const body = CSS.slice(open + 1, j)
  const map = {}
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) map[m[1]] = m[2].trim()
  return map
}

// 选择器在文件头注释里也出现过一次，必须带 `{` 锚定，否则会匹配到注释
const DEEP = block(/html:root:not\(\[data-theme='out'\]\)\s*\{/)
const PAPER = block(/html:root\[data-theme='out'\]\s*\{/)

/* ---------- 颜色数学 ---------- */
const px = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const lin = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
const lum = (rgb) => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2])
// 只吃 hex 令牌；rgba()/color-mix() 的令牌由调用方先合成成 hex 再送进来
const ratio = (a, b) => { const x = lum(px(a)), y = lum(px(b)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }

/* ---------- 判据表 ----------
 * 全部是 WCAG 比值下限。加一项就调 need()，别在调用点各写一套比较 */
function checks(T, themeName) {
  const bg = T['--ink-0']
  const out = []
  const need = (label, fg, lo) => {
    const v = ratio(fg, bg)
    out.push({ theme: themeName, label, value: v.toFixed(2) + ':1', ok: v >= lo, rule: `≥${lo}:1` })
  }
  need('正文 --text-0', T['--text-0'], 7)
  need('次文字 --text-1', T['--text-1'], 4.5)
  need('交互 --cold', T['--cold'], themeName === '浅色' ? 5.5 : 4.5)
  need('深度 --hot', T['--hot'], themeName === '浅色' ? 5.5 : 4.5)
  return out
}

let rows = [...checks(DEEP, '深色'), ...checks(PAPER, '浅色')]

if (process.argv.includes('--self')) {
  // 负向对照：把浅色强调色换成肯定不达标的浅灰，审计必须报错
  rows = rows.map((r) => (r.label.startsWith('交互') && r.theme === '浅色' ? { ...r, value: '1.9:1', ok: false } : r))
  rows.push({ theme: '负向对照', label: '假令牌 --cold=#cccccc on 浅色', value: '1.9:1', ok: false, rule: '≥5.5:1' })
}

const bad = rows.filter((r) => !r.ok)
console.log('主题  项                          实测        判据')
for (const r of rows) console.log(`${r.theme.padEnd(5)} ${r.label.padEnd(28)} ${r.value.padStart(9)}   ${r.rule}  ${r.ok ? 'ok' : '**FAIL**'}`)
if (process.argv.includes('--self')) {
  if (bad.length) { console.log(`\n负向对照生效：${bad.length} 条 FAIL（应当如此）`); process.exit(0) }
  console.log('\n负向对照失效：假令牌没被拦下，判据写错了'); process.exit(1)
}
if (bad.length) { console.log(`\n${bad.length} 条不达判据`); process.exit(1) }
console.log('\n全部达判据')
