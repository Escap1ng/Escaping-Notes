// 全站界面文案（长曝光星轨这套设计系统）；站点信息配置见 src/data/site.js
// 分工：**界面只说人话**。按钮、眉标、提示、空态一律直陈其物，不借隐喻；
// 隐喻只留在关于页 `aboutBio` 这一处。主题名同样直白为「深色 / 浅色」，
// 「夜拍 / 显影」的说法留在 docs/design.md §2 原则 2 讲概念，不进界面。
// 改新版文案 → 只改这个文件
import { site } from './site.js'

export const N = {
  // t 是这一页在标签页上说的整句话：路由 meta 与构建期那份静态壳（scripts/lib/shell.mjs
  // 给 /blog/<slug> 与各导航路由写好的 <title>/og:title）读的都是这一列。
  // 写第二处不会报错，只会让"分享出去的标题"和"打开后的标题"是两个句子。
  nav: [
    { to: '/', label: '首页', code: '00', t: 'Escaping Notes · 逃逸笔记' },
    { to: '/blog', label: '文章', code: '01', t: '文章 · Escaping Notes' },
    { to: '/collections', label: '合集', code: '02', t: '合集 · Escaping Notes' },
    { to: '/updates', label: '动态', code: '03', t: '动态 · Escaping Notes' },
    { to: '/gallery', label: '映像', code: '04', t: '映像 · Escaping Notes' },
    { to: '/projects', label: '项目', code: '05', t: '项目 · Escaping Notes' },
    { to: '/about', label: '关于', code: '06', t: '关于 · Escaping Notes' },
  ],

  // 首屏站名。`description` 是全站摘要：RSS 频道与分享卡的说法都从这里出，
  // 静态壳里那三枚 <meta> 逐字与它对齐（tests/content-rolls.test.mjs 会核）
  heroTitle: 'ESCAPING NOTES',
  description:
    'Escap1ng 的个人博客：记录技术思考、设计实践与生活片段。首页是一段随滚动加速的星轨长曝光，文章按时间排在这里。',

  // 首屏之下的卡片区：此刻一枚读数 + 四组内容。`all` 与导航标签拼成每组的出口
  //（全部文章 / 全部动态 / 全部合集 / 全部项目），所以这里只放"全部"两个字。
  drawer: {
    clock: '此刻',
    featured: '精选',
    recent: '最近动态',
    collections: '最近合集',
    projects: '最近项目',
    all: '全部',
  },

  notes: {
    archive: '按时间倒序，越往下越早。',
  },

  hints: {
    collections: '按主题成组；点开一个合集，按顺序往下读。',
    updates: '短的、不成篇的记录。',
    gallery: '这一面墙收的是文章封面，与抽屉轮播的三张底片。',
    projects: '做过的东西，点开卡片看介绍。',
  },

  // 动态时间线里文章自动条目的前缀（标题由 src/lib/feed.js 拼上去）
  feed: {
    post: '新文上线',
  },

  // 映像柜（/gallery）：墙上那行的计数与放大提示。照片的歪斜角不在这里，
  // 它按 src 哈希算出（src/lib/gallery.js），同一张图永远同一个姿态
  gallery: {
    count: '共 {n} 张图片',
    open: '点按放大',
  },

  // 合集（/collections）：树由 src/data/collections.js 定，这里只放界面读得懂的说法。
  // `{n}` 由页面替换；正文页的篇序用 `{i}` 与 `{n}`。
  collection: {
    crumb: '合集',
    children: '子合集',
    articles: '文章',
    kids: '{n} 个子合集',
    posts: '{n} 篇文章',
    position: '第 {i} 篇 · 共 {n} 篇',
    back: '返回合集',
    lost: '这里没有这个合集',
    loading: '正在取文章…',
  },

  // 项目页（/projects）：卡片点进去是 /projects/:slug 那一页（与 /blog → /blog/:slug 同一套路），
  // 所以这里只剩那一页上的两块眉标、仓库出口、返回与「名字对不上」那一态
  projects: {
    points: '要点',
    stack: '技术栈',
    repo: '查看仓库',
    back: '返回项目列表',
    lost: '这里没有这个项目的介绍',
  },

  // 看片灯箱：/gallery 的轮播框与 /blog/:slug 的单图框共用这一组标签
  //（两处各写一份的话，将来只会有一处被改）
  lightbox: {
    aria: '图片预览',
    close: '关闭',
    prev: '上一张',
    next: '下一张',
    keys: '← / → 翻页 · Esc 关闭',
  },

  // 唯一一处文学位：关于页自述。允许意象，但不借已退役的概念（下潜 / 深渊 / 视界 / 回声）说话
  aboutBio: 'Escap1ng。记录技术思考、设计实践与生活片段。',

  // 文章页：页尾出口、上下篇、复制链接与插图 alt。
  // 原先正文末尾那枚「时间膨胀」手记已删——字数与时长本来就在页眉读着，那行只是把同一件事说成诗
  reader: {
    copy: '复制链接',
    copied: '已复制 ✓',
    endsAria: '上下篇与返回目录',
    imgAlt: '文章插图，点按关闭预览',
  },
  postEnd: { back: '返回文章列表' },
  postPrev: '← 上一篇',
  postNext: '下一篇 →',

  nf: {
    title: '这里没有页面',
    text: '你访问的地址没有对应的页面，也许链接已经过期。可以从首页或文章列表继续。',
    home: '回到首页',
    blog: '查看文章',
  },

  // 协议链接的作用域提示：CC 只管博客内容，代码与设计不在它下面。放悬停不放页面上，
  // 因为这行只对"我能不能转载"这一类读者有用
  footer: {
    thanks: '谢谢你读到这里。',
    top: '回到顶部',
    licenseScope: '只覆盖博客内容（文章、原创图片与文案），源代码与设计保留原声明',
  },
  theme: { dark: '深色', light: '浅色' },

  empty: {
    posts: '// 还没有文章',
    search: '// 没有符合条件的结果', // 「筛选后为空」≠「本来就没有内容」
    collections: '// 还没有合集',
    collectionPosts: '// 这个合集还没有文章',
    updates: '// 还没有动态',
    gallery: '// 还没有图片',
    projects: '// 还没有项目',
  },
}

// 各页的 <h2> 就是导航里那枚标签，不再各抄一份字面量：两处各写一遍的话，改名只会改到一处，
// 另一处静默留着旧词（顶栏说「映像」、页面大标题说「相册」就是这么来的）。
export const navLabel = (to) => N.nav.find((n) => n.to === to)?.label ?? ''

// 标签页那整句话（路由 meta 与构建期的静态壳共用，见 N.nav 上那条注释）
export const navTitle = (to) => N.nav.find((n) => n.to === to)?.t ?? ''

// 「这一页 · 站名」的形状只写一次：导航之外的三类标题（文章、项目、找不到页）都从这里出。
// 路由与 scripts/build_seo.mjs 各拼一遍的话，分享卡上的标题和标签页上的迟早分成两句话。
export const pageTitle = (subject) => `${subject} · ${site.name}`