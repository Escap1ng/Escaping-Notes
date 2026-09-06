// 新版（neo · 多普勒坠入）全部界面文案：旧版与 src/config/site.js 不受影响
// 文风取向：古诗词气韵 + 对偶句式；改新版文案 → 只改这个文件
export const N = {
  // 每页一枚幽灵汉字（个人签名）
  glyph: {
    home: '坠',
    blog: '盘',
    post: '坠',
    updates: '脉',
    records: '振',
    projects: '抛',
    wall: '回',
    about: '我',
    nf: '无',
  },

  nav: [
    { to: '/', label: '首页', code: '00', depth: '∞' },
    { to: '/blog', label: '文章', code: '01', depth: '8.4' },
    { to: '/updates', label: '动态', code: '02', depth: '5.2' },
    { to: '/records', label: '歌单', code: '03', depth: '3.6' },
    { to: '/projects', label: '项目', code: '04', depth: '2.4' },
    { to: '/wall', label: '留言', code: '05', depth: '1.4' },
    { to: '/about', label: '关于', code: '06', depth: '1.1' },
  ],

  // 首屏宣言：对偶联
  manifesto: ['掷墨入渊，星惊不复；', '藏光于页，潮退犹闻。'],
  manifestoSub: '把写下的每一行，都推过事件视界。',
  heroEyebrow: '// 观星手记 · Escap1ng',
  orbitIdle: (n) => `${n} 体在轨 · 驻目可辨其名`,
  orbitReadout: (i, p) => `在轨 ${String(i + 1).padStart(2, '0')} · ${p.title} · ${p.date}`,

  now: { writing: '著文', listening: '听弦', building: '铸器' },
  descentHead: '下潜目录 · 由浅及深',

  notes: {
    home: '（这一屏只有星星。往下才是我。）',
    archive: '按时间倒序排列，越往下越早。',
    post: '读到这里，你已经比我当时更靠近它了。',
    wall: '匿名也可以，话不必署名。',
  },

  sections: {
    blog: '// 文章 · 列表',
    updates: '// 动态 · 时间线',
    records: '// 歌单 · 曲目',
    projects: '// 项目 · 作品',
    wall: '// 留言 · 墙',
    about: '// 关于 · 我',
    post: '// 阅读 · 正文',
  },

  hints: {
    updates: '随手记下的点滴，也是信号。',
    records: '一路听过的歌，都在这里。',
    projects: '做出来、仍在运行的东西。',
    wall: '留下的留言不会消失，只会沉到更深。',
  },

  aboutBio:
    'Escap1ng。写代码，也写杂记。此站即我的观测手记：把每天吸进来的东西压缩、点亮，再抛还视界之外。',
  dilation: '你在此处停留的光阴，比人间慢一拍。',

  postEnd: { escape: '逃逸 · 回归归档', deeper: '继续下潜' },
  postPrev: '← 更浅处',
  postNext: '更深处 →',

  nf: {
    title: '已越事件视界',
    text: '此轨之光已坠渊底，请回身另寻他径。',
    home: '回到视界之外',
    blog: '去归档',
  },

  footer: { line: '// Escap1ng · 仍在坠入', thanks: '光年之外，谢你下潜至此。', top: '逃逸 ↑' },
  theme: { dark: '深空', light: '纸面' },
  skin: { toLegacy: '显示旧版界面', toNeo: '显示新版界面' },

  empty: { posts: '// 盘空无光', updates: '// 暂无脉冲', wall: '// 尚无回声落于此', projects: '// 载荷舱空' },
}
