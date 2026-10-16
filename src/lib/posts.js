// 文章取数（浏览器这一岸）：构建期把 content/posts/<slug>/index.md 打进产物，运行时零请求。
// 一卷里有哪些素材由 virtual:rolls 给出——那是 vite.config.js 的插件在构建/启动时读磁盘得来的，
// 与门禁、RSS 走的是同一个 readRolls，所以"线上画出来的"与"回执上列出的"是同一份清单。
// 字段口径、派生与校验都在 src/lib/schema.js，这里只做取数与草稿过滤。
// 旧 slug 的改道不在这条链上：那张「旧名 → 现名」的表由构建期算好交给路由（virtual:rolls），
// 免得为了深链上的一次跳转，把取数模块拖进入口 chunk。
import { isLive, normalizeRoll, sortByDate } from './schema.js'
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

// 全部卷，含草稿：别名要找的就是"哪一卷登记过这个旧名"，草稿与否在那一步再判
async function allRolls() {
  const items = []
  for (const slug of Object.keys(bundled).map(slugOf)) {
    const r = await read(slug)
    if (r) items.push(r)
  }
  return sortByDate(items)
}

// 草稿只在 dev 露面：列表、首页那三格精选、映像柜、关于页读数、RSS、sitemap、静态壳
// 全都不带它——写了一半的稿子不该被读者或搜索引擎先看见。
// dev 里保留是为了让他自己看一眼这篇成什么样了（`npm run dev` 是唯一能看到草稿的地方）。
export async function loadPosts() {
  const items = await allRolls()
  return import.meta.env.DEV ? items : items.filter(isLive)
}

export async function loadPost(slug) {
  const r = await read(slug)
  if (!r) return null
  return import.meta.env.DEV || isLive(r) ? r : null
}
