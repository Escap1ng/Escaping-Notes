// 新版（neo · 长曝光星轨）全部界面文案（站点信息配置见 src/config/site.js）
// 分工：**界面只说人话**。按钮、眉标、提示、空态一律直陈其物，不借隐喻；
// 隐喻只留在两处文学位（首屏 `manifesto`、关于页 `aboutBio`）。主题名同样直白为「深色 / 浅色」，
// 「夜拍 / 显影」的说法留在 docs/design.md §2.2 讲概念，不进界面。
// 改新版文案 → 只改这个文件
export const N = {
  nav: [
    { to: '/', label: '首页', code: '00' },
    { to: '/blog', label: '文章', code: '01' },
    { to: '/updates', label: '动态', code: '02' },
    { to: '/records', label: '音乐', code: '03' },
    { to: '/gallery', label: '映像', code: '04' },
    { to: '/projects', label: '项目', code: '05' },
    { to: '/about', label: '关于', code: '06' },
  ],

  // 首屏：站名（打字机进入）+ 对偶联宣言（十六字）
  heroTitle: 'ESCAPING NOTES',
  manifesto: ['掷墨入渊，星惊不复；', '藏光于页，潮退犹闻。'],

  // 首屏之下的抽屉：一枚读数 + 精选/最近动态的眉标
  drawer: {
    clock: '此刻 · LOCAL',
    featured: '精选 · SELECTED',
    recent: '最近动态 · RECENT',
  },

  notes: {
    archive: '按时间倒序，越往下越早。',
  },

  sections: {
    blog: '// 文章 · JOURNAL',
    updates: '// 动态 · UPDATES',
    records: '// 音乐 · PLAYLIST',
    gallery: '// 映像 · GALLERY',
    projects: '// 项目 · WORKS',
    about: '// 关于 · ABOUT',
    post: '// 阅读 · READING',
  },

  hints: {
    updates: '短的、不成篇的记录。',
    records: '曲目表，点一行就能听。',
    gallery: '这一面墙收的是全站用过的图片。',
    projects: '做过的东西，和它们现在的状态。',
  },

  // 映像柜（/gallery）：墙上那行的计数与放大提示。照片的歪斜角不在这里，
  // 它按 src 哈希算出（src/lib/gallery.js），同一张图永远同一个姿态
  gallery: {
    count: '共 {n} 张图片',
    open: '点按放大',
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

  // 文学位之二：关于页自述。允许意象，但不借已退役的概念（下潜 / 深渊 / 视界 / 回声）说话
  aboutBio:
    'Escap1ng。写代码，也写杂记。这个站是一台一直开着快门的相机：写下的东西按时间落在同一张底片上，新的亮一些，旧的暗一些。',

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

  footer: { line: '// Escap1ng · BLOG', thanks: '谢谢你读到这里。', top: '回到顶部 ↑' },
  theme: { dark: '深色', light: '浅色' },

  empty: {
    posts: '// 还没有文章',
    search: '// 没有符合条件的结果', // 「筛选后为空」≠「本来就没有内容」
    updates: '// 还没有动态',
    gallery: '// 还没有图片',
    projects: '// 还没有项目',
  },

  // 后端机器码 → 给人看的一句话。键必须与 server/api.py 各分支返回的 error 值逐字对上
  //（改端点提示时跑 npm run check:api 与 npm test）。offline 与 unknown 两条负责分开
  // "服务器答了但拒绝"和"服务器根本没答话"——T2 那类误导提示正出在这里没分开。
  errors: {
    'bad credentials': '用户名或密码错误',
    unauthorized: '登录已过期，请重新登录',
    banned: '该账号已被停用',
    forbidden: '没有该操作的权限',
    'owner only': '仅站长可执行该操作',
    'bad username': '用户名需 3-20 位，只用小写字母、数字、下划线或连字符',
    'weak password': '密码至少 6 位',
    taken: '该用户名已被占用',
    exists: '已存在同标识符的文章',
    'bad role': '角色不合法（只能任命为管理员）',
    'bad json': '请求内容格式不正确',
    'already setup': '站长已初始化，请直接登录',
    'too fast': '操作过于频繁，请稍候再试',
    'storage unavailable': '服务器存储不可用，请稍后重试',
    'sync failed': '歌单同步失败，可能是源站未响应',
    'type not allowed': '不支持的文件类型',
    'bad file': '未收到文件',
    'bad image': '图片读取失败',
    empty: '内容不能为空',
    'bad slug': '标识符不合法（仅限小写字母、数字与连字符）',
    'not found': '未找到该条目',
    offline: '连不上服务器：后端未启动或网络不通',
    unknown: '请求未成功',
  },
}

// 各页的 <h2> 就是导航里那枚标签，不再各抄一份字面量：两处各写一遍的话，改名只会改到一处，
// 另一处静默留着旧词（顶栏说「音乐」、页面大标题说「歌单」就是这么来的）。
export const navLabel = (to) => N.nav.find((n) => n.to === to)?.label ?? ''
