// 代码块高亮：零依赖手写扫描器，按语言分发（python / json / js / powershell）。
// 口径与渲染器一致：**先转义再标色**——收 markdown.js 送来的未转义原文，产出已转义的
// HTML 片段，markdown.js 那边不再 esc 一遍；html / 陌生语言原样转义退出，与无高亮时代
// 的产出逐字一致（tests/markdown.test.mjs 把守）。配色语义见 site.css §9 的 tok-* 类。
// token 类只有六枚且两两同色：kw/num 取交互蓝，key/fn 是蓝与正文的中间档，str/com 落灰。

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const span = (cls, s) => `<span class="tok-${cls}">${esc(s)}</span>`

const PY_KW = new Set([
  'def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'break', 'continue', 'pass',
  'import', 'from', 'as', 'with', 'try', 'except', 'finally', 'raise', 'assert', 'yield', 'in',
  'not', 'and', 'or', 'is', 'lambda', 'global', 'nonlocal', 'del', 'async', 'await', 'match',
])
const PY_CONST = new Set(['True', 'False', 'None', 'self', 'cls'])
const PY_BUILTIN = new Set([
  'print', 'len', 'range', 'int', 'str', 'float', 'bool', 'list', 'dict', 'set', 'tuple', 'open',
  'enumerate', 'zip', 'map', 'filter', 'sorted', 'sum', 'min', 'max', 'abs', 'round', 'type',
  'isinstance', 'super', 'getattr', 'setattr', 'hasattr', 'any', 'all', 'repr',
])
const JS_KW = new Set([
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'break', 'continue',
  'import', 'from', 'export', 'default', 'class', 'extends', 'new', 'this', 'typeof', 'instanceof',
  'try', 'catch', 'finally', 'throw', 'async', 'await', 'yield', 'of', 'in', 'delete', 'void',
])
const JS_CONST = new Set(['true', 'false', 'null', 'undefined', 'NaN', 'Infinity'])

/* 通用扫描核心：一遍线性扫，规则表驱动。每条规则是 [粘性正则, 命中→产出]，
   命中即产出并前进；谁都不认的字符按单字符文本退出。规则顺序即优先级。 */
function scan(src, rules) {
  let out = ''
  let i = 0
  while (i < src.length) {
    let matched = false
    for (const [re, emit] of rules) {
      re.lastIndex = i
      const m = re.exec(src)
      if (m && m.index === i) {
        out += emit(m[0])
        i += m[0].length
        matched = true
        break
      }
    }
    if (!matched) {
      out += esc(src[i])
      i++
    }
  }
  return out
}

/* 多语言共用的粘性正则。十六进制在前：十进制分支会把 0x1F 的 0 抢走。
   数字/空白两条被多种语言共用，lastIndex 每次现场赋值，跨语言共享无状态。 */
const reNum = /0[xXbBoO][\da-fA-F_]+|\d[\d_]*\.?[\d_]*(?:[eE][+-]?\d+)?/y
const reWord = /[A-Za-z_][\w$]*/y
const reSpace = /\s+/y

/* ---------------- python ---------------- */
function py(src) {
  return scan(src, [
    [/#[^\n]*/y, (s) => span('com', s)],
    [
      /[rRbBuUfF]{0,2}(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?)/y,
      (s) => span('str', s),
    ],
    [reNum, (s) => span('num', s)],
    [
      reWord,
      (w) => (PY_KW.has(w) || PY_CONST.has(w) ? span('kw', w) : PY_BUILTIN.has(w) ? span('fn', w) : esc(w)),
    ],
    [reSpace, (s) => s],
  ])
}

/* ---------------- json ---------------- */
function json(src) {
  return scan(src, [
    [/"(?:[^"\\\n]|\\.)*"(?=\s*:)/y, (s) => span('key', s)],
    [/"(?:[^"\\\n]|\\.)*"?/y, (s) => span('str', s)],
    [/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/y, (s) => span('num', s)],
    [/\b(?:true|false|null)\b/y, (s) => span('kw', s)],
    [reSpace, (s) => s],
  ])
}

/* ---------------- js ---------------- */
function js(src) {
  return scan(src, [
    [/\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$)/y, (s) => span('com', s)],
    [/"(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?|`(?:[^`\\]|\\.)*`?/y, (s) => span('str', s)],
    [reNum, (s) => span('num', s)],
    [reWord, (w) => (JS_KW.has(w) || JS_CONST.has(w) ? span('kw', w) : esc(w))],
    [reSpace, (s) => s],
  ])
}

/* ---------------- powershell ---------------- */
function powershell(src) {
  return scan(src, [
    [/#[^\n]*/y, (s) => span('com', s)],
    [/<#[\s\S]*?(?:#>|$)/y, (s) => span('com', s)],
    [/"(?:[^"`\n]|`.)*"?|'[^'\n]*'?/y, (s) => span('str', s)],
    [reNum, (s) => span('num', s)],
    [/\$[\w:]+/y, (s) => span('key', s)],
    // 参数只认"空白之后的 -Verb"：Write-Host 这类 Verb-Noun 连写的 -Host 不能被劈成参数
    [/(?<=\s)-[A-Za-z][\w-]*/y, (s) => span('kw', s)],
    [reWord, (w) => esc(w)],
    [reSpace, (s) => s],
  ])
}

const BY_LANG = {
  python: py,
  py: py,
  json: json,
  js: js,
  javascript: js,
  powershell: powershell,
  ps1: powershell,
}

export function highlight(code, lang) {
  const f = BY_LANG[(lang || '').toLowerCase()]
  return f ? f(code) : esc(code)
}
