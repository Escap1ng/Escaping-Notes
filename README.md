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

[中文](README.md) · [English](README.en.md)

</div>

---

## 关于项目

Escaping Notes 是一个个人书写与记录站点，把「写作」抽象为一次对夜空的长时间曝光。首页是一台架在三脚架上的相机正在长曝光，下面四条设定都从这台相机长出来——

- **文章即变星**：每篇文章是一枚定点脉动的亮星，驻目绽开锥形衍射十字芒，点击坠入正文
- **滚动即时间**：下潜越深，曝光窗口越长、天空转得越快；页首到页尾是一整次夜拍
- **指针即时间膨胀**：光标半径内星轨局部加速卷曲
- **彩蛋即叙事**：偶有流星划过曝光底片；点击变星坠入文章；每页沉着一枚巨型幽灵汉字签名

<table>
  <tr>
    <td width="50%"><img src="docs/assets/readme/plate-deep-space.png" alt="深空主题的长曝光底片：数百条同心星轨弧绕一枚偏心天极累积" title="深空"></td>
    <td width="50%"><img src="docs/assets/readme/plate-paper.png" alt="纸面主题的同一张底片：墨色轨迹压在干版上，朱砂点睛" title="纸面"></td>
  </tr>
</table>

> 左 深空 / 右 纸面：两张都是**按站点同一套常数离线复算的底片**（`npm run art:build`），不是站点截图；出图提了 ×2.8 / ×1.6 一档冲印增益，**实际观感更暗**。

## 特性

- **双主题**：深空（冷白/暖白/琥珀星轨）与纸面（天文干版底片：墨色轨迹 + 朱砂点睛），头部一键切换并记忆偏好；首次访问跟随系统 `prefers-color-scheme`
- **统一设计系统**：全部界面由同一套令牌与基元搭成——四组刻度（间距/字号/行高/字重）、卡片令牌、按钮「2 尺寸 × 4 语义」、输入「单行下划线 / 多行发丝框」、状态三态提示、单字符图标；组件内不写裸字号与裸间距（流体展示字号用 `clamp()` 表达），改刻度即全站同步
- **Canvas 2D 渲染**：星轨由离屏累积缓冲逐帧绘制；无第三方 UI 库、图表库或字体 CDN（运行时依赖只有 Vue 与 Vue Router）
- **优雅降级**：API 不可达（或超时）时自动切换本地种子数据，站点仍是完整的离线底片
- **沉浸光标（默认关闭）**：顶栏第三枚按钮开启并记忆；只在首页接管，其余页面保留系统光标；指针静止约 1.4s 后平滑收力并停帧
- **无障碍**：抽屉与灯箱有焦点陷阱、路由切换向读屏播报、跳转链接与 `#main` 可聚焦、触控目标 ≥44px、`prefers-reduced-motion` 下有完整静态降级
- **性能**：次级页活背景限帧 30fps、resize 去抖 150ms、`--shift` 缓存不每帧读 `scrollHeight`、常驻表面不用 `backdrop-filter`、透镜光斑走 transform
- **阅读可读性**：文字底下的天空由全站一处的「暗带」压低（自适应、分主题定强），不靠每张卡片各自蒙一层；文章页另有磨砂玻璃底板做长时间阅读隔离，前景对比度达 WCAG AA
- **反馈闭环**：文章列表有骨架屏，「本来没有内容」与「筛选无结果」分文案，搜索/标签筛选状态写入 URL（可分享、刷新不丢）
- **全功能后台**：`/admin` 网页端编辑文章、动态、歌单、站点信息；歌单可一键同步 QQ 音乐公开歌单；三角色权限；留言墙与 RSS

## 读图：两处承重设计

### 暗带契约——可读性只在一处负责

<img src="docs/assets/readme/dark-band.svg" alt="暗带契约剖面图：视口正中 1120px 的天空被压到 --sky-k，两侧羽化回全亮，并给出改前改后的对比度实测值" width="920">

次级页文字底下的天空，由 `StarTrails.vue` 上**一条** `mask-image` 横向渐变压低：视口正中 `--sky-band`（对齐内容列 1120px）压到 `--sky-k`，两侧各 `--sky-feather` 羽化回全亮。改之前 11 个次级页只有文章页做过可读性底板，同一套文字色在实际合成底上的对比度从 15.7:1 到 1.7:1 都有——「阅读困难 + 体验割裂」的数值形态就是这样。压低系数是**按峰值而非中位数**解不等式解出来的，因为星轨在动、同一枚文字像素的底随时间明暗波动。取舍与推导见 [docs/design-neo.md §3.3](docs/design-neo.md#33-暗带契约天空与文字的位置协议)。

### 一次导航 = 一次快门

<img src="docs/assets/readme/fall-timing.svg" alt="fall 转场与快门层的时序图：进出场重叠 260 毫秒，快门两片帘幕 0.52 秒同时长同曲线" width="920">

底片跨路由常驻之后，换页在语义上只剩一次快门开合。`fall` 的进/出场重叠 260ms，这 260ms 里两台相机看的是**同一张还在感光的底片**——`src/lib/sky.js` 只锁沉积（`claimPlate`）不锁重绘，否则交出底片那台会冻在半帧上，那正是「切换顿挫」的真正来源。快门两片帘幕必须同时长同曲线：`animationend` 会冒泡两次，先到那次就把整层摘掉。

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
| `npm run art:build` | 重绘本页顶部那两张底片图（常数从源码里读，改星轨参数后要重跑） |
| `npm run font:build` | 重切展示层子集字体（需要本机装有 Noto Serif SC；产物已提交，日常不用跑） |
| `npm run check:api` | `docs/api.md` 的端点表与 `server/api.py` 的路由双向对拍，漂移即退出码非 0 |
| `npm run check:docs` | 扫文档里的文件引用与 § 节号是否还指得到东西，并核对 README 路由表与 `src/router` 一致 |

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
| `/login` `/register` | 登录 / 注册 | 功能页，不套隐喻 |
| `/admin` | 管理 | 观测台后场 |

> 任何未匹配路由落到 404 ——「此星不在星图」。

## 项目结构

```text
├── index.html             # 壳层：主题预置脚本、SEO/OG 元信息
├── server/api.py          # 后端：内容 / 鉴权 / 留言 / RSS / OG 注入 / 歌单同步
├── content/posts/         # Markdown 文章（frontmatter）
├── public/                # 静态资源：favicon、robots.txt、og.png
├── scripts/               # 构建期与内容刷新脚本
│   ├── build_font.mjs     #   展示层子集字体裁切（Node，依赖 devDep `subset-font`）
│   ├── build_seo.mjs      #   rss.xml / sitemap.xml / og.png（纯 Node 内置模块）
│   ├── build_readme_art.mjs#  本页顶部两张底片图：按 StarTrails 常数离线复算
│   ├── check_api_doc.py   #   docs/api.md ⇄ server/api.py 端点对拍（带 --self 负向对照）
│   ├── check_doc_refs.py  #   文档引用 / § 节号 / README 路由表 的漂移扫描
│   └── sync_records.py    #   抓 QQ 公开歌单 → 生成 src/config/records.js（Python3 标准库；只读镜像用）
├── docs/                  # design-neo.md 设计依据 · manual.md 使用手册 · api.md 后端接口契约
│   └── assets/readme/     # README 配图（含生成方式与换真截图的步骤）
└── src/
    ├── assets/fonts/      # 自托管子集字体 + OFL 许可
    ├── components/        # neo/ 下 StarTrails 星轨装置 · HorizonHero · NeoSiteHeader · NeoCursor …；MusicPlayer.vue 在上一层
    ├── config/            # narrative.js 文案层 · site.js 站点信息 · 内容种子（records.js 由脚本生成，勿手改）
    ├── lib/               # api / auth / content / posts / frontmatter / markdown / theme / music / records / lens / cursor / shift / sky / debounce / focus
    ├── styles/            # tokens.css 令牌基线 · neo.css 全站皮肤
    └── views/             # 12 个视图：neo/ 9 个（首页与内容页），另有 AdminView / LoginView / RegisterView
```

## 部署

三种方式（Vercel 只读镜像 / GitHub Pages 只读镜像 / 自有服务器 + nginx + systemd）的完整步骤、nginx 配置与备案注意事项见 **[docs/manual.md §4](docs/manual.md#4-上传方法部署上线)**。要点：

- 登录、发文、留言墙、全网计数依赖后端，只有自有服务器能跑完整版；两个免费平台是只读镜像
- 涉及登录务必启用 HTTPS
- 自建服务器需设 `SITE_DIST` 与 `SITE_DATA` 两个环境变量（与手册的 /opt + /var/www 布局对齐），否则服务端 meta 注入与 `/rss.xml` 会 404
- 备份 = 复制服务器 `data/` 目录

## 文档

- [docs/design-neo.md](docs/design-neo.md) —— 界面设计唯一依据（概念、色彩与令牌、组件契约、开发指南）
- [docs/manual.md](docs/manual.md) —— 使用手册（编辑 / 适配 / 部署 / 常见问题）
- [docs/api.md](docs/api.md) —— 后端接口契约：端点全表、鉴权与限流、状态码、存储与 fail-closed 边界、已知缺陷。附 `npm run check:api`，把文档与 `server/api.py` 的路由双向对拍——**改端点必须同步这份文档**
- [docs/assets/readme/README.md](docs/assets/readme/README.md) —— 本页四张配图的来源、重跑方式与「想换真截图该怎么做」

## 许可与使用声明

1. **性质界定**：本项目（含源代码、设计文档、视觉与交互设计、文案等全部组成部分）系作者个人学习与实践性质的作品，仅供个人学习、研究及非商业性交流使用。
2. **禁止商用**：未经作者事先书面许可，不得将本项目全部或部分用于任何商业用途或以任何方式营利。
3. **原创保护**：未经许可，不得对核心原创设计（「长曝光星轨」隐喻、视觉语言、星轨交互装置）整体复制、仿冒或二次包装发布。
4. **学习引用**：学习性引用须显著注明项目来源与作者信息，并保留本声明。
5. **免责条款**：本项目按「现状」提供，不附任何明示或暗示的担保；因使用产生的任何损失或纠纷，作者不承担责任。
6. **授权联系**：chunqi-yu@outlook.com。

字体：展示层子集取自 Noto Serif SC（SIL OFL 1.1），许可全文见 [src/assets/fonts/LICENSE-OFL.txt](src/assets/fonts/LICENSE-OFL.txt)。

© 2026 Escap1ng · 保留所有权利
