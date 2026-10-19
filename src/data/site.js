// 站点信息：改名字 / 社交链接 / 内容许可 → 只改这个文件，见 docs/manual.md §2.1
export const site = {
  name: 'Escaping Notes',
  author: 'Escap1ng',
  location: 'Hangzhou, Zhejiang',
  coords: '30.25°N 120.17°E',
  email: 'chunqi-yu@outlook.com',
  // 关于页头像（外链；换图只改这一行）
  avatar: 'https://music-file.y.qq.com/songlist/u/oK6kowEAoK4z7eSz7KnF7K4l7n/2247c/a63193cbcaec147661f5c4503855c07370c220e1_726dd.jpg?imageView2/4/w/300/h/300',
  url: 'https://escaping.top', // 站点公开地址（RSS/OG/canonical 用）
  // 内容许可：页脚那行「© 年份 作者 · 协议」里的协议名与它的网址。
  // name 是要给人看的字面量，url 必须与它逐字对得上（写成 /by-sa/ 就是挂着 NC-SA 的名字链到别的条款）
  license: { name: 'CC BY-NC-SA 4.0', url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/' },
  socials: [
    { label: 'GitHub · Escap1ng', url: 'https://github.com/Escap1ng' },
    { label: 'Steam · Escap1ng', url: 'https://steamcommunity.com/id/escap1ng/' },
  ],
  // 逃逸装备（关于页）：name 是名字，note 是它在这一站里干什么
  gear: [
    { name: 'Vue 3', note: '视图层与响应式；运行时只依赖它和 vue-router' },
    { name: 'Vite', note: '两档跑法：dev 热更 / build 产出 dist（含静态壳与 feed）' },
    { name: 'GitHub Actions', note: 'push 即构建并发布到 Pages' },
    { name: 'Canvas 2D', note: '星轨逐帧绘制，无 WebGL、无图表库' },
  ],
}
