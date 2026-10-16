// 卷清单（Node 这一岸）：读磁盘上真实存在的 content/posts/*，交 src/lib/schema.js 归一与校验。
// 浏览器那一岸只 import schema.js——这里带 node:fs，进了打包就是废的。
// 用它的三方：scripts/check_content.mjs（门禁与回执）、scripts/build_seo.mjs（sitemap/RSS）、
// vite.config.js 的那条卷资产路由。判据只有一份，读盘的方式也只有一份。
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { INDEX_NAME, isPublished, normalizeRoll } from '../../src/lib/schema.js'

// 消息里出现的路径一律用 /：Windows 上 join 会给出 `content\posts`，而这一行是给人
// 比对 docs 与网址用的，两种分隔符会让"这是同一个位置吗"重新变成一次判断。
export const POSTS_DIR = 'content/posts'

function bare(slug, files, problem) {
  return { slug, dir: null, files, raw: '', record: null, problems: [problem], notes: [] }
}

// 返回 [{slug, dir, files, raw, record, problems, notes}]，按 slug 字典序——
// 门禁的输出要能一行一行和上一轮对得上，按日期排会随每次发文整体挪位。
export function readRolls(root = process.cwd()) {
  const dir = join(root, POSTS_DIR)
  if (!existsSync(dir)) return []
  const out = []

  for (const name of readdirSync(dir, { withFileTypes: true })) {
    if (!name.isDirectory()) continue
    const slug = name.name
    const rollDir = join(dir, slug)
    const entries = readdirSync(rollDir, { withFileTypes: true })
    const files = entries.filter((e) => e.isFile()).map((e) => e.name).sort()
    const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name)
    const indexPath = join(rollDir, INDEX_NAME)
    if (!existsSync(indexPath)) {
      out.push(bare(slug, files, `这一卷里没有 \`${INDEX_NAME}\`：稿子的文件名是固定的，不认别的`))
      continue
    }
    const raw = readFileSync(indexPath, 'utf8')
    // 判据全在 schema 那一岸（浏览器的打包与这里读到的必须是同一套），这一层只负责读盘
    const { record, problems, notes } = normalizeRoll({ slug, raw, files, dirs })
    out.push({ slug, dir: rollDir, files, raw, record, problems, notes })
  }

  // 还躺在目录外的 .md = 上一版"一篇一文件"的形状。不报出来就是静默不发布，
  // 而它看起来完全像已经发好了（frontmatter 齐、图也在）。
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.md')) continue
    const slug = name.slice(0, -3)
    out.push(
      bare(slug, [], `顶层那篇 \`${POSTS_DIR}/${name}\` 不会被发布：一卷是一个目录，稿子叫 ${slug}/${INDEX_NAME}`)
    )
  }
  return out
}

// 这一卷要上线的文件（绝对路径），供构建期拷贝与 dev 请求回落。
// 排除项就是 schema.isPublished 的那一条，两边必须同一个答案。
export function publishedAssets(roll) {
  if (!roll.dir) return []
  return roll.files.filter(isPublished).map((f) => ({ name: f, path: join(roll.dir, f) }))
}
