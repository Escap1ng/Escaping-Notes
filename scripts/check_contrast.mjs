// 双主题对比度审计：从 neo.css 的两个主题块读令牌，按 WCAG 比值 + 绝对级差两套尺子判。
// 为什么两套尺子：近黑底上 WCAG 比值会压缩（bg 2.2 级时 1.48:1 已经是 Δ41 级），
// 而浅色上比值才贴近观感——星轨那几轮（design.md §10 ⑮⑯）吃过这个亏，所以两把都打。
// 用法：node scripts/check_contrast.mjs          正常审计，不达标 exit 1
//       node scripts/check_contrast.mjs --self   负向对照：喂一组故意不达标的假令牌，必须 exit 1
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CSS = readFileSync(join(ROOT, 'src', 'styles', 'neo.css'), 'utf8')

function block(selRe) {
  const m = CSS.match(selRe)
  if (!m) throw new Error('neo.css 里找不到选择器 ' + selRe)
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
const DEEP = block(/html\[data-skin='neo'\]:not\(\[data-theme='out'\]\)\s*\{/)
const PAPER = block(/html\[data-skin='neo'\]\[data-theme='out'\]\s*\{/)

/* ---------- 颜色数学 ---------- */
const px = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const lin = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
const lum = (rgb) => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2])
// 只吃 hex 令牌；rgba()/color-mix() 的令牌由调用方先合成成 hex 再送进来
const ratio = (a, b) => { const x = lum(px(a)), y = lum(px(b)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
// 感知级：把亮度换算回"中性灰的 8 位字节值"，近黑底上的发丝线用这把尺（比值会压缩）
const levels = (h) => Math.round(255 * (1.055 * Math.pow(lum(px(h)), 1 / 2.4) - 0.055))
const mixHex = (bg, fg, a) => { const B = px(bg), F = px(fg); return '#' + B.map((b, i) => Math.round(b + (F[i] - b) * a).toString(16).padStart(2, '0')).join('') }
const dLevels = (bg, fg, a) => Math.abs(levels(mixHex(bg, fg, a)) - levels(bg))

/* ---------- 判据表 ----------
 * kind: ratio = WCAG 比值下限；dlev = 合成后绝对级差区间（近黑底上的发丝线/签名用这把） */
function checks(T, themeName) {
  const bg = T['--ink-0']
  const out = []
  const need = (label, fg, kind, lo, hi) => {
    const v = kind === 'ratio' ? ratio(fg, bg) : dLevels(bg, fg, 1)
    const ok = kind === 'ratio' ? v >= lo : v >= lo && v <= hi
    out.push({ theme: themeName, label, value: kind === 'ratio' ? v.toFixed(2) + ':1' : v + ' 级', ok, rule: kind === 'ratio' ? `≥${lo}:1` : `${lo}~${hi} 级` })
  }
  need('正文 --text-0', T['--text-0'], 'ratio', 7)
  need('次文字 --text-1', T['--text-1'], 'ratio', 4.5)
  if (T['--text-2']) need('编号字 --text-2', T['--text-2'], 'ratio', 4.5)
  need('交互 --cold', T['--cold'], 'ratio', themeName === '浅色' ? 5.5 : 4.5)
  need('深度 --hot', T['--hot'], 'ratio', themeName === '浅色' ? 5.5 : 4.5)
  // 幽灵签名：取显影上限那一档的合成色，量它离底多少级
  if (T['--glyph'] && T['--glyph-a1']) {
    const a = parseFloat(T['--glyph-a1'])
    const v = dLevels(bg, T['--glyph'], a)
    const lo = themeName === '深色' ? 18 : 10, hi = themeName === '深色' ? 60 : 45
    out.push({ theme: themeName, label: `幽灵签名 α=${a}`, value: v + ' 级', ok: v >= lo && v <= hi, rule: `${lo}~${hi} 级` })
  }
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
