// 小型 Markdown 渲染器：先转义再渲染，覆盖个人博客常用语法
// 支持：标题/加粗/斜体/行内代码/链接/图片/代码块/列表/引用/分隔线

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
}

export function renderMarkdown(src) {
  const out = []
  const toc = []
  let para = []
  let list = null // { t: 'ul'|'ol', items: [] }
  let quote = []
  let code = null
  let lang = ''
  let hn = 0

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
  const flushAll = () => {
    flushPara()
    flushList()
    flushQuote()
  }

  for (const raw of src.split('\n')) {
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

    const h = /^(#{1,4})\s+(.*)$/.exec(t)
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
      quote.push(q[1])
      continue
    }

    const ul = /^[-*]\s+(.*)$/.exec(t)
    if (ul) {
      flushPara()
      flushQuote()
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
      if (!list || list.t !== 'ol') {
        flushList()
        list = { t: 'ol', items: [] }
      }
      list.items.push(ol[1])
      continue
    }

    flushList()
    flushQuote()
    para.push(t)
  }

  if (code !== null) out.push(`<pre data-lang="${esc(lang)}"><code>${code.join('\n')}</code></pre>`)
  flushAll()
  return { html: out.join('\n'), toc }
}
