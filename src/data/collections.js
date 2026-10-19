// 合集：把文章按主题成组。`parent` 指向另一个合集的 slug，于是合集可以再分级；
// 一篇文章只挂在某一个合集上（frontmatter 的 `collection`），上级合集页会自动汇总
// 所有后代的文章。slug 即网址片段：/collections/<slug>。
// 改这里不用动视图：树、计数与章节顺序由 src/lib/collections.js 算。
export const collections = [
  {
    slug: 'escaping-notes',
    title: '本站',
    summary: '这座博客自己：为什么这样设计、怎么用、怎么把一篇稿子写进来。',
    order: 1,
  },
  {
    slug: 'site-design',
    title: '设计与实现',
    summary: '首页、星轨、主题与排版背后的取舍。',
    parent: 'escaping-notes',
    order: 1,
  },
  {
    slug: 'site-guide',
    title: '使用与写作',
    summary: '读者怎么用这个站，作者怎么把一篇稿子发上来。',
    parent: 'escaping-notes',
    order: 2,
  },
]
