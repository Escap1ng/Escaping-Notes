// 合集：把文章按主题成组。`parent` 指向另一个合集的 slug，于是合集可以再分级；
// 一篇文章只挂在某一个合集上（frontmatter 的 `collection`），上级合集页会自动汇总
// 所有后代的文章。slug 即网址片段：/collections/<slug>。
// 改这里不用动视图：树、计数与章节顺序由 src/lib/collections.js 算。
export const collections = [
  {
    slug: 'escaping-notes',
    title: '本站',
    summary: '这个博客本身：设计、实现，以及怎么在这里发文。',
    order: 1,
  },
  {
    slug: 'site-design',
    title: '设计与实现',
    summary: '首页、星轨、主题与排版，为什么做成现在这样。',
    parent: 'escaping-notes',
    order: 1,
  },
  {
    slug: 'site-guide',
    title: '使用与写作',
    summary: '这个站怎么用，文章怎么写、怎么发。',
    parent: 'escaping-notes',
    order: 2,
  },
  {
    slug: 'build-agent',
    title: '从零做一个 Agent',
    summary: '从跑通一个循环，到接上工具和评测，再到多 Agent、协议与安全。',
    order: 2,
  },
]
