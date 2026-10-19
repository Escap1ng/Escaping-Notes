// 合集树：纯函数，浏览器与 Node 门禁共用。
// 数据在 src/data/collections.js，经 src/data/index.js 那道门进入；这里不 import 任何数据，
// 调用方把清单传进来——门禁要用它在「全站合集 + 全部卷」上查跨集合的问题。
const SLUG = /^[a-z0-9][a-z0-9-]*$/
const orderOf = (c) => (Number.isInteger(c.order) ? c.order : Number.POSITIVE_INFINITY)
const byOrder = (a, b) => orderOf(a) - orderOf(b) || String(a.title).localeCompare(String(b.title), 'zh')

export const collectionHref = (slug) => `/collections/${slug}`

export const findCollection = (list, slug) => list.find((c) => c.slug === slug) || null

export const rootsOf = (list) => list.filter((c) => !c.parent).sort(byOrder)

export const childrenOf = (list, slug) => list.filter((c) => c.parent === slug).sort(byOrder)

// 从根到当前（不含当前）的祖先链。父链断了或成环时停在最后一个能走到的节点——
// 数据错误由 collectionProblems 报，页面不该在渲染时死循环。
export function ancestorsOf(list, slug) {
  const out = []
  const seen = new Set([slug])
  let cur = findCollection(list, slug)
  while (cur?.parent) {
    if (seen.has(cur.parent)) break
    const parent = findCollection(list, cur.parent)
    if (!parent) break
    seen.add(parent.slug)
    out.unshift(parent)
    cur = parent
  }
  return out
}

// 根 → 当前，用于面包屑；链断了就只给从断点往后能认出来的那一段。
export const chainOf = (list, slug) => {
  const cur = findCollection(list, slug)
  return cur ? [...ancestorsOf(list, slug), cur] : []
}

// 自己 + 全部后代（先序）。合集页拿它汇总文章，列表页拿它算"子合集"与总篇数。
export function subtreeOf(list, slug) {
  const out = []
  const seen = new Set()
  const walk = (s) => {
    if (seen.has(s)) return
    const cur = findCollection(list, s)
    if (!cur) return
    seen.add(s)
    out.push(cur)
    for (const kid of childrenOf(list, s)) walk(kid.slug)
  }
  walk(slug)
  return out
}

// 合集内的阅读顺序：显式 `order`（从 1 起）在前、按数字升序；没写 order 的排在后面，
// 再按发布日期升序。同一天、同 order 时用 slug 兜底，保证任何机器上顺序一致。
export function sortChapter(posts) {
  const order = (p) => (Number.isInteger(p.order) ? p.order : Number.POSITIVE_INFINITY)
  return [...posts].sort(
    (a, b) =>
      order(a) - order(b) ||
      String(a.date || '').localeCompare(String(b.date || '')) ||
      String(a.slug || '').localeCompare(String(b.slug || ''))
  )
}

export const directPostsOf = (posts, slug) => sortChapter(posts.filter((p) => p.collection === slug))

export function postsOf(list, slug, posts) {
  const slugs = new Set(subtreeOf(list, slug).map((c) => c.slug))
  return sortChapter(posts.filter((p) => slugs.has(p.collection)))
}

// 合集页的正文分组：先当前合集里直接挂的文章，再逐个后代合集（先序）。
// 只有直接挂过文章的合集才成一组——空的子合集在上面的"子合集"里已经有了。
export function sectionize(list, slug, posts) {
  const out = []
  const walk = (s, depth) => {
    const cur = findCollection(list, s)
    const direct = directPostsOf(posts, s)
    if (cur && direct.length) out.push({ collection: cur, depth, posts: direct })
    for (const kid of childrenOf(list, s)) walk(kid.slug, depth + 1)
  }
  walk(slug, 0)
  return out
}

// 只有拿全集才查得出的问题：slug 重复/不合法、父链指向不存在的合集或成环、
// 文章挂在不存在的合集上。文章的 `collection` 缺失由 schema 逐卷报，这里不重复。
export function collectionProblems(list, posts = []) {
  const bad = []
  const bySlug = new Map()
  for (const c of list) {
    if (bySlug.has(c.slug)) bad.push(`合集 slug \`${c.slug}\` 重复`)
    else bySlug.set(c.slug, c)
    if (!SLUG.test(c.slug || '')) bad.push(`合集 slug \`${c.slug}\` 不能当网址片段（要小写字母/数字/短横线）`)
    if (!c.title) bad.push(`合集 \`${c.slug}\` 缺 title`)
  }
  for (const c of list) {
    if (!c.parent) continue
    if (c.parent === c.slug) bad.push(`合集 \`${c.slug}\` 的 parent 指向自己`)
    else if (!bySlug.has(c.parent)) bad.push(`合集 \`${c.slug}\` 的 parent \`${c.parent}\` 不存在`)
  }
  for (const c of list) {
    const seen = new Set()
    let cur = c
    while (cur?.parent && bySlug.has(cur.parent)) {
      if (seen.has(cur.slug)) {
        bad.push(`合集 \`${c.slug}\` 在父子链上成环`)
        break
      }
      seen.add(cur.slug)
      cur = bySlug.get(cur.parent)
    }
  }
  for (const p of posts) {
    if (p.collection && !bySlug.has(p.collection)) {
      bad.push(`文章 \`${p.slug}\` 挂的合集 \`${p.collection}\` 不在 collections.js 里`)
    }
  }
  return [...new Set(bad)]
}
