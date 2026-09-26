// 新版（neo · 长曝光星轨）全部界面文案（站点信息配置见 src/config/site.js）
// 文风取向：古诗词气韵 + 对偶句式；改新版文案 → 只改这个文件
export const N = {
  // 每页一枚幽灵汉字（个人签名）：渊→藏→坠→息→弦→掷→响→我→无
  glyph: {
    home: '渊',
    blog: '藏',
    post: '坠',
    updates: '息',
    records: '弦',
    projects: '掷',
    wall: '响',
    about: '我',
    nf: '无',
  },

  nav: [
    { to: '/', label: '首页', code: '00' },
    { to: '/blog', label: '文章', code: '01' },
    { to: '/updates', label: '动态', code: '02' },
    { to: '/records', label: '歌单', code: '03' },
    { to: '/projects', label: '项目', code: '04' },
    { to: '/wall', label: '留言', code: '05' },
    { to: '/about', label: '关于', code: '06' },
  ],

  // 首屏宣言：对偶联
  manifesto: ['掷墨入渊，星惊不复；', '藏光于页，潮退犹闻。'],
  manifestoSub: '把写下的每一行，都推过事件视界。',
  heroEyebrow: '// 逃逸笔记 · Escap1ng',

  now: { writing: 'WRITING', listening: 'LISTENING', building: 'BUILDING' },
  descentHead: '下潜目录 · 由浅及深',

  notes: {
    archive: '按时间倒序，越往下越早。',
    wall: '匿名也可以，无需署名。',
  },

  sections: {
    blog: '// 文章 · JOURNAL',
    updates: '// 动态 · UPDATES',
    records: '// 歌单 · PLAYLIST',
    projects: '// 项目 · WORKS',
    wall: '// 留言 · ECHOES',
    about: '// 关于 · ABOUT',
    post: '// 阅读 · READING',
  },

  hints: {
    updates: '随手所记，皆成信号。',
    records: '听过的歌，收藏于此。',
    projects: '做出的东西，还在转动着。',
    wall: '留言不会消失，只会沉到更深。',
  },

  aboutBio:
    'Escap1ng。写代码，也写杂记。此站是一次漫长的下潜：把日子投进渊里，在盘上聚成光，在视界上留下回声——最后在这一切的底端，写一个「我」。',
  dilation: '你在此处停留的光阴，比人间慢一拍。',

  postEnd: { escape: '上浮 · 回归文章' },
  postPrev: '← 更浅处',
  postNext: '更深处 →',

  nf: {
    title: '此星不在星图',
    text: '你循着的那道弧，并未落入这一夜的取景框。夜色仍长，请回身另寻他径。',
    home: '回到首页',
    blog: '查看文章',
  },

  footer: { line: '// Escap1ng · BLOG', thanks: '曝光将尽，谢你停驻至此。', top: '回到顶部 ↑' },
  theme: { dark: '深空', light: '纸面' },

  empty: {
    posts: '// 底片无光',
    search: '// 此范围内无星', // 「筛选后为空」≠「本来就没有内容」
    updates: '// 暂无脉冲',
    wall: '// 尚无回声落于此',
    projects: '// 载荷舱空',
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
    'bad role': '角色不合法（仅 admin / visitor）',
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
