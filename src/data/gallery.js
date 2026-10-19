// 映像柜（/gallery）里站点自己的底片：只收浅色抽屉轮播的那三张。
// 文章封面由 src/lib/gallery.js 从各卷目录自动收，不需要在这里登记；
// 首屏地景（亮 / 暗两张）、深色压暗底与分享卡都不上墙。
// 跑 npm test 会核对：清单恰好是这三张，且每张仍被 site.css 引用。
export const sitePlates = [
  // 「其一…其三」是墙上的顺序，不是文件名里的号：paper2 搬去当第三篇
  // 《怎么写、怎么发》的封面（见 scripts/build_post_covers.ps1），paper5 已删除，
  // paper6 暂存到 photos-src/ 待用。
  { src: '/plates/plate-bg-paper1.jpg', title: '浅色底片 · 其一' },
  { src: '/plates/plate-bg-paper3.jpg', title: '浅色底片 · 其二' },
  { src: '/plates/plate-bg-paper4.jpg', title: '浅色底片 · 其三' },
]
