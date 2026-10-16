// 文章取数（浏览器这一岸）：构建期把 content/posts/<slug>/index.md 打进产物，运行时零请求。
// 一卷里有哪些素材由 virtual:rolls 给出——那是 vite.config.js 的插件在构建/启动时读磁盘得来的，
// 与门禁、RSS 走的是同一个 readRolls，所以"线上画出来的"与"回执上列出的"是同一份清单。
// 字段口径、派生与校验都在 src/lib/schema.js，这里只做取数。
import { normalizeRoll, sortByDate } from './schema.js'
import { rollFiles } from 'virtual:rolls'

const bundled = import.meta.glob('/content/posts/*/index.md', { query: '?raw', import: 'default' })

// /content/posts/<slug>/index.md → <slug>
const slugOf = (path) => path.split('/').slice(-2, -1)[0]

const read = async (slug) => {
  const loader = bundled[`/content/posts/${slug}/index.md`]
  if (!loader) return null
  const { record } = normalizeRoll({ slug, raw: await loader(), files: rollFiles[slug] || [] })
  return record
}

export async function loadPosts() {
  const items = []
  for (const slug of Object.keys(bundled).map(slugOf)) {
    const r = await read(slug)
    if (r) items.push(r)
  }
  return sortByDate(items)
}

export const loadPost = (slug) => read(slug)
