// frontmatter 解析与字数/阅读时长统计：打包回退与 API 数据共用

export function parseFrontmatter(raw) {
  // \r? 不能省：api.py 与 build_seo.mjs 的另两份实现都写了。缺了它，Windows 上
  // core.autocrlf=true 的新克隆（CRLF 检出）会整份 frontmatter 不识别——标题变空、
  // 日期回落 1970-01-01、`---` 被当正文渲染。由 tests/frontmatter.test.mjs 把守。
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw)
  const meta = { tags: [] }
  let body = raw
  if (m) {
    body = m[2]
    for (const line of m[1].split('\n')) {
      const i = line.indexOf(':')
      if (i < 0) continue
      const k = line.slice(0, i).trim()
      const v = line.slice(i + 1).trim()
      if (k === 'tags') {
        meta.tags = v
          .replace(/^\[|\]$/g, '')
          .split(',')
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
          .filter(Boolean)
      } else if (k) {
        meta[k] = v
      }
    }
  }
  if (!meta.title) meta.title = ''
  if (!meta.date) meta.date = '1970-01-01'
  if (!meta.summary) meta.summary = ''
  return { meta, body }
}

export function stats(body) {
  const words = body.replace(/\s/g, '').length
  return { words, minutes: Math.max(1, Math.round(words / 400)) }
}
