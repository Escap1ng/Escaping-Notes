<div align="center">

# Escaping Notes · 逃逸笔记

**DOPPLER DESCENT · A Long-Exposure Notebook under Star Trails**

> 掷墨入渊，星惊不复；藏光于页，潮退犹闻。

[![Vue 3](https://img.shields.io/badge/Vue-3.x-42b883?logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Vue Router](https://img.shields.io/badge/Vue%20Router-4-42b883?logo=vuedotjs&logoColor=white)](https://router.vuejs.org/)
[![Canvas 2D](https://img.shields.io/badge/Canvas%202D-Star%20Trails-1a9fff)](src/components/neo/StarTrails.vue)
[![Backend](https://img.shields.io/badge/Backend-Python%203-3776ab?logo=python&logoColor=white)](server/api.py)
[![License](https://img.shields.io/badge/License-Personal%20Use%20Only-d42b2b)](#许可与使用声明)
[![Release](https://img.shields.io/github/v/release/Escap1ng/Escaping-Notes)](https://github.com/Escap1ng/Escaping-Notes/releases)

**[在线体验](https://escap1ng.github.io/Escaping-Notes/)** · **[escaping.top](https://escaping.top)**

**中文** · [English](README.en.md)

</div>

---

## 关于项目

Escaping Notes 是一个个人书写与记录站点，把「写作」抽象为一次对夜空的长时间曝光。

首页是一台正在长曝光的相机：数千条同心星轨弧绕一枚偏心天极刚体旋转、累积与衰减。整站借此把「阅读」和「滚动」映射成一场有始有终的下潜——越往下读，曝光越久、夜空转得越快，直到页尾完成一整次夜拍。每篇文章被视作一枚定点脉动的变星：悬停其上会绽开锥形衍射十字芒，点击即坠入正文。

在这种设定下，指针成为一处时间膨胀区：光标半径内的星轨会局部加速、发亮、卷曲，像一支光绘 torch 划过夜空。偶有流星掠过曝光底片，页与页之间还沉着一枚巨大的幽灵汉字作为作者签名。

- **文章即变星**：每篇文章是一枚定点脉动的亮星，驻目绽开锥形衍射十字芒，点击坠入正文
- **滚动即时间**：下潜越深，曝光窗口越长、天空转得越快；页首到页尾是一整次夜拍
- **指针即时间膨胀**：光标半径内星轨局部加速卷曲
- **彩蛋即叙事**：偶有流星划过曝光底片；点击变星坠入文章；每页沉着一枚巨型幽灵汉字签名

## 特性

- **双主题**：深空（冷白/暖白/琥珀星轨）与纸面（天文干版底片：墨色轨迹 + 朱砂点睛），头部一键切换并记忆偏好；首次访问跟随系统 `prefers-color-scheme`
- **统一设计系统**：全部界面由同一套令牌与基元搭成——间距/字号/行高/字重四组刻度、卡片令牌、按钮「2 尺寸 × 4 语义」、输入「单行下划线 / 多行发丝框」、状态提示三态、单字符图标；组件内不写裸字号与裸间距，改刻度即全站同步
- **Canvas 2D 渲染**：星轨由离屏累积缓冲逐帧绘制；无第三方 UI 库、图表库或字体 CDN
- **优雅降级**：API 不可达（或超时）时自动切换本地种子数据，站点仍是完整的离线底片
- **沉浸光标（默认关闭）**：顶栏第三枚按钮开启并记忆；仅在首页接管，其余页面保留系统光标（图片 `zoom-in` 等原生语义不被吞掉）；指针静止约 1.4s 后平滑收力并停帧
- **无障碍**：抽屉与灯箱有焦点陷阱、路由切换向读屏播报、跳转链接与 `#main` 可聚焦、触控目标 ≥44px、`prefers-reduced-motion` 下有完整静态降级
- **性能**：次级页活背景限帧 30fps、全站 resize 去抖 150ms、`--shift` 缓存不每帧读 `scrollHeight`、常驻表面不用 `backdrop-filter`、透镜光斑走 transform 位移（`fall` 转场的整页模糊按下坠手感保留）
- **阅读可读性**：文章页磨砂玻璃底板以半透明页面色 + 背景模糊隔离星轨，四边羽化无硬边，前景对比度达 WCAG AA
- **反馈闭环**：文章列表有骨架屏，「本来没有内容」与「筛选无结果」分文案，搜索/标签筛选状态写入 URL（可分享、刷新不丢）
- **全功能后台**：`/admin` 网页端编辑文章、动态、歌单、站点信息；歌单可一键同步 QQ 音乐公开歌单；三角色权限；留言墙与 RSS

## 技术栈

| 层 | 选型 |
| --- | --- |
| 前端 | Vue 3（Composition API）+ Vite 5 + Vue Router 4 |
| 渲染 | Canvas 2D 离屏累积缓冲（长曝光底片模拟） |
| 样式 | 原生 CSS + 自定义属性令牌（`tokens.css` 基线 / `neo.css` 皮肤） |
| 后端 | Python 3 标准库单文件（`server/api.py`），无第三方依赖 |
| 部署 | GitHub Pages / Vercel / nginx + systemd |

## 快速开始

要求：Node.js **18+**；可选 Python 3.9+（只读浏览不需要后端）。

```bash
# 克隆并安装
git clone https://github.com/Escap1ng/Escaping-Notes.git
cd Escaping-Notes
npm install

# 启动前端（开发）
npm run dev

# 启动后端（另开终端；不启动则站点以只读 + 本地模式运行）
python server/api.py

# 生产构建
npm run build          # 自有域名（history 路由）+ 生成 dist/rss.xml、dist/sitemap.xml
npm run build:pages    # GitHub Pages 镜像（hash 路由）
npm run preview        # 本地预览 dist/
```

### 常用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | Vite 开发服务器，改文件即时热更 |
| `npm run build` / `build:pages` | 生产构建；后者自动启用 `/Escaping-Notes/` 前缀与 hash 路由 |
| `npm run preview` | 本地模拟线上环境预览 `dist/` |
| `npm run seo:build` | 只重跑 SEO 产物（`dist/rss.xml`、`dist/sitemap.xml`） |
| `npm run og:build` | 重绘分享卡片 `public/og.png`（1200×630，纯 Node 生成，需提交） |
| `npm run font:build` | 重切展示层子集字体（需要本机装有 Noto Serif SC；产物已提交，日常不用跑） |

## 页面地图

| 路由 | 页面 | 隐喻 |
| --- | --- | --- |
| `/` | 首页 · 长曝光星轨 | 相机正在夜拍 |
| `/blog` | 文章 | 底片柜 |
| `/blog/:slug` | 正文 | 坠入一颗变星 |
| `/updates` | 动态 | 脉冲记录 |
| `/records` | 歌单 | 曲目弦表 |
| `/projects` | 项目 | 载荷舱 |
| `/wall` | 留言 | 回声墙 |
| `/about` | 关于 | 夜幕尽头写「我」 |
| `/admin` | 管理 | 观测台后场 |

## 项目结构

```text
├── index.html             # 壳层：主题预置脚本、SEO/OG 元信息
├── server/api.py          # 后端：内容 / 鉴权 / 留言 / RSS / OG 注入 / 歌单同步
├── content/posts/         # Markdown 文章（frontmatter）
├── public/                # 静态资源：favicon、robots.txt、og.png
├── scripts/               # 构建期脚本（Node，零依赖）
│   ├── build_font.mjs     #   展示层子集字体裁切
│   └── build_seo.mjs      #   rss.xml / sitemap.xml / og.png
├── docs/                  # design-neo.md 设计依据 · manual.md 使用手册
└── src/
    ├── assets/fonts/      # 自托管子集字体 + OFL 许可
    ├── components/neo/    # StarTrails 星轨装置 · HorizonHero · NeoSiteHeader · NeoCursor …
    ├── config/            # narrative.js 文案层 · site.js 站点信息 · 各类内容种子
    ├── lib/               # api / auth / content / posts / theme / music / records / lens / debounce / focus
    ├── styles/            # tokens.css 令牌基线 · neo.css 全站皮肤
    └── views/neo/         # 全部页面视图
```

## 部署

三种方式（Vercel 只读镜像 / GitHub Pages 只读镜像 / 自有服务器 + nginx + systemd）的完整步骤、nginx 配置与备案注意事项见 **[docs/manual.md §4](docs/manual.md#4-上传方法部署上线)**。要点：

- 登录、发文、留言墙、全网计数依赖后端，只有自有服务器能跑完整版；两个免费平台是只读镜像
- 涉及登录务必启用 HTTPS
- 备份 = 复制服务器 `data/` 目录

## 文档

- [docs/design-neo.md](docs/design-neo.md) —— 界面设计唯一依据（概念、色彩与令牌、组件契约、开发指南）
- [docs/manual.md](docs/manual.md) —— 使用手册（编辑 / 适配 / 部署 / 常见问题）

## 许可与使用声明

1. **性质界定**：本项目（含源代码、设计文档、视觉与交互设计、文案等全部组成部分）系作者个人学习与实践性质的作品，仅供个人学习、研究及非商业性交流使用。
2. **禁止商用**：未经作者事先书面许可，不得将本项目全部或部分用于任何商业用途或以任何方式营利。
3. **原创保护**：未经许可，不得对核心原创设计（「多普勒坠入」隐喻、视觉语言、星轨交互装置）整体复制、仿冒或二次包装发布。
4. **学习引用**：学习性引用须显著注明项目来源与作者信息，并保留本声明。
5. **免责条款**：本项目按「现状」提供，不附任何明示或暗示的担保；因使用产生的任何损失或纠纷，作者不承担责任。
6. **授权联系**：商业授权或其他授权事宜，请联系 chunqi-yu@outlook.com。

字体：展示层子集取自 Noto Serif SC（SIL OFL 1.1），许可全文见 [src/assets/fonts/LICENSE-OFL.txt](src/assets/fonts/LICENSE-OFL.txt)。

© 2026 Escap1ng · 保留所有权利
