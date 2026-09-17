// 小型 Markdown 渲染器：先转义再渲染，覆盖个人博客常用语法
// 支持：标题/加粗/斜体/行内代码/链接/图片/代码块/列表/引用/分隔线/表格（GFM 管道语法）

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1" loading="lazy" decoding="async" />')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
}

/* ---------------- 表格 ---------------- */
// 只认 GFM 的必需分隔行：没有 `|---|` 那一行就不算表，退回普通段落文本。
const DELIM = /^\|?\s*:?-{1,}:?\s*(?:\|\s*:?-{1,}:?\s*)*\|?$/
const cells = (s) => s.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim())
// 对齐只可能取 left/right/center 三个自造值（分隔行除 : - | 与空格外无其他字符），不来自用户文本
const alignOf = (c) =>
  c.startsWith(':') && c.endsWith(':') ? 'center' : c.endsWith(':') ? 'right' : c.startsWith(':') ? 'left' : ''
const al = (a) => (a ? ` style="text-align:${a}"` : '')

export function renderMarkdown(src) {
  const lines = src.split('\n')
  const out = []
  const toc = []
  let para = []
  let list = null // { t: 'ul'|'ol', items: [] }
  let quote = []
  let code = null
  let lang = ''
  let hn = 0
  let tbl = null // 已确认的分隔行之后才是表：{ head, align: [], rows }

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${para.map(inline).join('<br />')}</p>`)
      para = []
    }
  }
  const flushList = () => {
    if (list) {
      out.push(`<${list.t}>${list.items.map((i) => `<li>${inline(i)}</li>`).join('')}</${list.t}>`)
      list = null
    }
  }
  const flushQuote = () => {
    if (quote.length) {
      out.push(`<blockquote><p>${quote.map(inline).join('<br />')}</p></blockquote>`)
      quote = []
    }
  }
  const flushTable = () => {
    if (!tbl) return
    const th = tbl.head.map((c, i) => `<th${al(tbl.align[i])}>${inline(c)}</th>`).join('')
    const body = tbl.rows
      .map((r) => `<tr>${r.map((c, i) => `<td${al(tbl.align[i])}>${inline(c)}</td>`).join('')}</tr>`)
      .join('')
    out.push(`<table><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table>`)
    tbl = null
  }
  const flushAll = () => {
    flushPara()
    flushList()
    flushQuote()
    flushTable()
  }

  for (let li = 0; li < lines.length; li++) {
    const raw = lines[li]
    const t = raw.trim()

    if (code !== null) {
      if (/^```/.test(t)) {
        out.push(`<pre data-lang="${esc(lang)}"><code>${code.join('\n')}</code></pre>`)
        code = null
      } else {
        code.push(esc(raw))
      }
      continue
    }

    if (/^```/.test(t)) {
      flushAll()
      code = []
      lang = t.slice(3).trim()
      continue
    }
    if (!t) {
      flushAll()
      continue
    }

    const h = /^(#{1,5})\s+(.*)$/.exec(t)
    if (h) {
      flushAll()
      const level = h[1].length + 1 // h1 留给文章标题
      const id = `h-${++hn}`
      if (level <= 3) toc.push({ level, text: h[2], id })
      out.push(`<h${level} id="${id}">${inline(h[2])}</h${level}>`)
      continue
    }

    if (/^(-{3,}|\*{3,})$/.test(t)) {
      flushAll()
      out.push('<hr />')
      continue
    }

    const q = /^>\s?(.*)$/.exec(t)
    if (q) {
      flushPara()
      flushList()
      flushTable()
      quote.push(q[1])
      continue
    }

    const ul = /^[-*]\s+(.*)$/.exec(t)
    if (ul) {
      flushPara()
      flushQuote()
      flushTable()
      if (!list || list.t !== 'ul') {
        flushList()
        list = { t: 'ul', items: [] }
      }
      list.items.push(ul[1])
      continue
    }

    const ol = /^\d+[.)]\s+(.*)$/.exec(t)
    if (ol) {
      flushPara()
      flushQuote()
      flushTable()
      if (!list || list.t !== 'ol') {
        flushList()
        list = { t: 'ol', items: [] }
      }
      list.items.push(ol[1])
      continue
    }

    // 表格：正在表中 → 后续竖线行都是数据行
    if (tbl && t.includes('|')) {
      tbl.rows.push(cells(t))
      continue
    }
    // 开表：必须"下一行就是分隔行"才算，否则只是碰巧含竖线的普通文字
    if (t.includes('|') && DELIM.test((lines[li + 1] || '').trim())) {
      flushAll()
      tbl = { head: cells(t), align: cells(lines[++li].trim()).map(alignOf), rows: [] }
      continue
    }

    flushList()
    flushQuote()
    flushTable()
    para.push(t)
  }

  if (code !== null) out.push(`<pre data-lang="${esc(lang)}"><code>${code.join('\n')}</code></pre>`)
  flushAll()
  return { html: out.join('\n'), toc }
}
