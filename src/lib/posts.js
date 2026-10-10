// 文章数据源：API 优先，后端缺席时回退打包文章（GitHub Pages 镜像可用）
import { api } from './api.js'
import { parseFrontmatter, stats } from './frontmatter.js'

// 封面焦点（frontmatter 的 imagePos）：它会被写进 style 属性，所以只放行取值字符，
// 其余一律回落 center。首页精选与文章列表共用这一份——两处各写一条正则，
// 将来只会有一条被修。
const POS_OK = /^[-\d.%a-z ]{1,24}$/i
export const coverPos = (p) =>
  typeof p.imagePos === 'string' && POS_OK.test(p.imagePos) ? p.imagePos : 'center'

const bundled = import.meta.glob('/content/posts/*.md', { query: '?raw', import: 'default' })

async function bundledPosts() {
  const items = []
  for (const [path, loader] of Object.entries(bundled)) {
    const raw = await loader()
    const { meta, body } = parseFrontmatter(raw)
    items.push({
      slug: path.split('/').pop().replace(/\.md$/, ''),
      ...meta,
      ...stats(body),
      body,
      source: 'bundle',
    })
  }
  return items.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
}

export async function loadPosts() {
  const remote = await api('/api/posts')
  if (Array.isArray(remote)) return remote.map((p) => ({ ...p, source: 'api' }))
  return bundledPosts()
}

export async function loadPost(slug) {
  const remote = await api(`/api/posts/${slug}`)
  if (remote && typeof remote.body === 'string') {
    return { ...remote.meta, ...stats(remote.body), body: remote.body, source: 'api' }
  }
  const loader = bundled[`/content/posts/${slug}.md`]
  if (!loader) return null
  const { meta, body } = parseFrontmatter(await loader())
  return { slug, ...meta, ...stats(body), body, source: 'bundle' }
}
