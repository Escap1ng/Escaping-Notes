// 旧链接形状的换算：站内一度在 GitHub Pages 上用 hash 路由（`/#/blog/<slug>`），
// 换成 history 之后那种地址不会 404，而是安静地落在首页——错位比断链难查，所以挂载前改道。
// 这一层是纯函数，判据由 tests/seo-shell.test.mjs 拿真假样本一起验。

// 只认 `#/` 开头这一种：`#h-3` 那类页内锚点是路由自己的事，动它会把文内跳转吃掉。
// 只许留在本站：`#//evil.com` 会被浏览器读成协议相对地址，拿它 replaceState 要么跳到
// 别人的站、要么当场抛错把首屏打断；带 `..` 的也不放行。查询串（`#/blog?q=甲`）跟着走。
export function legacyPath(hash) {
  const raw = (hash || '').startsWith('#/') ? hash.slice(1) : ''
  if (!raw) return ''
  let p = raw
  try {
    p = decodeURIComponent(raw.split('#')[0])
  } catch {
    return '' // % 后面不是合法十六进制：这不是一条能改道的链接
  }
  if (!p.startsWith('/') || p.startsWith('//') || p.includes('..') || p.includes('\\')) return ''
  // 反斜杠也要挡：WHATWG 的 URL 解析把 `\` 当 `/`，`/\evil.com` 与 `//evil.com` 是同一个落点
  return /\s/.test(p) ? '' : p
}
