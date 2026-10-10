// 映像柜（/gallery）里站点自己的那几张底片。
// 文章封面由 src/lib/gallery.js 从 frontmatter 的 image 自动收，不需要在这里登记；
// 这里只补「站点在用、但不属于任何文章」的图——也就是 neo.css 的 --plate-img / --hero-img
// 与分享卡。跑 npm test 会核对：这个清单与 neo.css 里出现的 /plates/ 路径必须互相咬合，
// 换底片时漏改这里，映像柜就会挂着已经不在用的那张。
export const sitePlates = [
  { src: '/plates/plate-hero.jpg', title: '首屏的地平线' },
  // 「其一…其五」是墙上的顺序，不是文件名里的号：paper2 那一档空着——那张图搬去当
  // 第三篇《怎么写、怎么发》的封面了（见 scripts/build_post_covers.ps1）。
  { src: '/plates/plate-bg-paper1.jpg', title: '浅色底片 · 其一' },
  { src: '/plates/plate-bg-paper3.jpg', title: '浅色底片 · 其二' },
  { src: '/plates/plate-bg-paper4.jpg', title: '浅色底片 · 其三' },
  { src: '/plates/plate-bg-paper5.jpg', title: '浅色底片 · 其四' },
  { src: '/plates/plate-bg-paper6.jpg', title: '浅色底片 · 其五' },
  { src: '/plates/plate-bg-deep.jpg', title: '深色那张压暗底' },
  { src: '/og.png', title: '分享卡 · 1200×630' },
]
