<div align="center">

# Escaping Notes · 逃逸笔记

**DOPPLER DESCENT · A Long-Exposure Notebook under Star Trails**

> 掷墨入渊，星惊不复；藏光于页，潮退犹闻。

[![Vue 3](https://img.shields.io/badge/Vue-3.x-42b883?logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Canvas 2D](https://img.shields.io/badge/Canvas%202D-Hand--drawn%20Star%20Trails-1a9fff)](src/components/neo/StarTrails.vue)
[![Backend](https://img.shields.io/badge/Backend-Python%203%20Stdlib-3776ab?logo=python&logoColor=white)](server/api.py)
[![License](https://img.shields.io/badge/License-Personal%20Use%20Only-d42b2b)](#许可与使用声明)

**[在线体验](https://escap1ng.github.io/Escaping-Notes/)** · **[escaping.top](https://escaping.top)**

**中文** · [English](README.en.md)

</div>

---

## 关于项目

Escaping Notes 是一座手工建造的个人观星站。首页是一台架在三脚架上的相机正在长曝光——数千条同心星轨弧绕一枚偏心天极刚体旋转、累积、衰减，正如你在北半球用一个夜晚写下的一行行笔记。

- **文章即变星**：每篇博文是一枚定点脉动的亮星，驻目绽开锥形衍射十字芒，点击即坠入正文
- **滚动即时间**：下潜越深，曝光窗口越长、天空转得越快；页首到页尾是一整次夜拍
- **指针即引力**：光标半径内星轨局部加速卷曲，如光绘 torch 划过夜空
- **彩蛋即叙事**：偶有流星划过曝光底片；点击变星坠入文章；每页沉着一枚巨型幽灵汉字签名

## 特性

- 🎨 **双主题**：深空（冷白/暖白/琥珀星轨）与纸面（天文干版底片：墨色轨迹 + 朱砂点睛），头部一键切换并记忆偏好
- 🧮 **零依赖美学**：零 webfont、零第三方 UI 库、零图表库——所有画面由 Canvas 2D 逐帧手绘
- 🛰 **优雅降级**：API 不可达时自动切换本地种子数据，站点仍是完整的离线底片
- ♿ **无障碍与性能**：`prefers-reduced-motion` 下渲染静态快进底片；像素预算封顶自动降 DPR；rAF 单循环与页面可见性暂停
- ✍️ **全功能后台**：`/admin` 网页端编辑文章、动态、歌单、站点信息；三角色权限；留言墙与 RSS

## 技术栈

| 层 | 选型 |
| --- | --- |
| 前端 | Vue 3（Composition API）+ Vite + Vue Router |
| 渲染 | Canvas 2D 离屏累积缓冲（长曝光底片模拟） |
| 后端 | Python 3 标准库单文件（`server/api.py`），零依赖 |
| 部署 | GitHub Pages / Vercel / nginx + systemd |

## 快速开始

```bash
# 克隆并安装
git clone https://github.com/Escap1ng/Escaping-Notes.git
cd Escaping-Notes
npm install

# 启动前端（开发）
npm run dev

# 启动后端（另开终端，零依赖）
python server/api.py

# 生产构建
npm run build          # 自有域名（history 路由）
npm run build:pages    # GitHub Pages 镜像（hash 路由）
```

## 页面地图

| 路由 | 页面 | 隐喻 |
| --- | --- | --- |
| `/` | 首页 · 长曝光星轨 | 相机正在夜拍 |
| `/blog` | 归档 | 底片柜 |
| `/blog/:slug` | 正文 | 坠入一颗变星 |
| `/updates` | 动态 | 脉冲记录 |
| `/records` | 歌单 | 曲目弦表 |
| `/projects` | 项目 | 载荷舱 |
| `/wall` | 留言 | 回声墙 |
| `/about` | 关于 | 夜幕尽头写「我」 |
| `/admin` | 管理 | 观测台后场 |

## 项目结构

```text
├── server/api.py          # 零依赖后端：内容 / 鉴权 / 留言 / RSS / OG 注入
├── content/posts/         # Markdown 文章（frontmatter）
├── docs/                  # design-neo.md 设计依据 · manual.md 使用手册
└── src/
    ├── components/neo/    # StarTrails 星轨装置 · HorizonHero · NeoCursor 等
    ├── config/            # narrative.js 文案层 · site.js 站点信息
    ├── lib/               # api / auth / content / posts / theme / music ...
    ├── styles/            # tokens.css 令牌基线 · neo.css 全站皮肤
    └── views/neo/         # 全部页面视图
```

## 文档

- [docs/design-neo.md](docs/design-neo.md) —— 界面设计唯一依据（概念、色彩系统、页面要点）
- [docs/manual.md](docs/manual.md) —— 使用手册（编辑 / 适配 / 上传）

## 许可与使用声明

1. **性质界定**：本项目（含源代码、设计文档、视觉与交互设计、文案等全部组成部分）系作者个人学习与实践性质的作品，仅供个人学习、研究及非商业性交流使用。
2. **禁止商用**：未经作者事先书面许可，不得将本项目全部或部分用于任何商业用途或以任何方式营利。
3. **原创保护**：未经许可，不得对核心原创设计（「多普勒坠入」隐喻、视觉语言、星轨交互装置）整体复制、仿冒或二次包装发布。
4. **学习引用**：学习性引用须显著注明项目来源与作者信息，并保留本声明。
5. **免责条款**：本项目按「现状」提供，不附任何明示或暗示的担保；因使用产生的任何损失或纠纷，作者不承担责任。
6. **授权联系**：商业授权或其他授权事宜，请联系 chunqi-yu@outlook.com。

© 2026 Escap1ng · 保留所有权利
