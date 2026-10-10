// 站点信息：改名字 / 简介 / 社交链接 → 只改这个文件，见 docs/manual.md §2.1
export const site = {
  name: 'Escaping Notes',
  subtitle: '每一次书写，都是一次逃逸',
  author: 'Yu · Escap1ng',
  bio: 'China Jiliang University · Undergraduate',
  location: 'Hangzhou, Zhejiang',
  coords: '30.25°N 120.17°E',
  email: 'chunqi-yu@outlook.com',
  url: 'https://escaping.top', // 站点公开地址（RSS/OG/canonical 用）
  socials: [
    { label: 'GitHub · Escap1ng', url: 'https://github.com/Escap1ng' },
    { label: 'Steam · Escap1ng', url: 'https://steamcommunity.com/id/escap1ng/' },
  ],
  // 逃逸装备（关于页）：name 是名字，note 是它在这一站里干什么
  gear: [
    { name: 'Vue 3', note: '视图层与响应式；运行时只依赖它和 vue-router' },
    { name: 'Vite', note: '三档构建：dev / build / build:pages' },
    { name: 'Python', note: '后端是单文件 api.py，只用标准库' },
    { name: 'nginx', note: '自建服务器那侧的反代与证书' },
    { name: 'Canvas 2D', note: '星轨逐帧绘制，无 WebGL、无图表库' },
  ],
}
