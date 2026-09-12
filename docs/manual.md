# Escaping Notes · 使用手册

> 面向网站设计新手的操作手册 · v1.3.0（2026-09）
> 约定：本手册中“项目根目录”指包含 `package.json` 的文件夹（即 BLOG 文件夹）。
> 章节顺序：0 目录结构 → 1 本地运行 → 2 改内容 → 3 改外观 → 4 上线部署 → 5 常见问题 → 6 版本进度。

---

## 0. 目录结构速览

```
BLOG/
├── content/posts/        ← 文章种子/回退；上线后发文主路径是 /admin 网页编辑器
├── public/               ← 静态资源：favicon.svg、robots.txt、og.png（分享卡片）
├── server/               ← 后端 api.py（登录/发文/留言墙/上传/内容/歌单同步 API）
├── scripts/              ← 构建期脚本（Node，零依赖）：
│   ├── build_font.mjs    ←   展示层子集字体裁切
│   └── build_seo.mjs     ←   dist/rss.xml、dist/sitemap.xml、public/og.png
├── src/
│   ├── assets/fonts/     ← 自托管子集字体 + OFL 许可
│   ├── config/           ← 内容种子（站点信息/动态/项目/歌单/records 快照），改内容主路径是 /admin
│   ├── lib/              ← API/内容/会话/光标开关等前端客户端（自动维护，无需手改）
│   ├── components/       ← 头部、页脚、星轨/光标装置等公共组件（`neo/` 内为 neo 组件）
│   ├── views/            ← 每个页面一个文件（含 /admin /login /register）
│   ├── router/           ← 网址路由与页面标题
│   └── styles/           ← 改外观只碰这两个文件：
│       ├── tokens.css    ←   基线令牌（灰阶/间距/字体栈）
│       └── neo.css       ←   皮肤令牌（深浅两套配色 + 圆角/阴影）
├── docs/                 ← 设计文档与本手册
└── index.html            ← 网页标题、描述、OG/SEO 元信息在这里改
```

## 1. 快速开始（本地运行）

1. 安装 Node.js **18 或更高**（推荐 LTS）：nodejs.org 下载一路下一步。装完打开 PowerShell 输入 `node -v` 能看到版本号即成功。
2. 打开 PowerShell，进入项目根目录：

   ```powershell
   cd "C:\Users\ycq\Desktop\GH more\BLOG"
   ```

3. 首次使用安装依赖（以后不用重复）：

   ```powershell
   npm install
   ```

4. 启动开发服务器：

   ```powershell
   npm run dev
   ```

   浏览器打开终端里显示的地址（通常是 `http://localhost:5173`）。**改任何文件保存后，浏览器自动刷新**，这就是你的实时画板。

5. 停止服务器：在终端按 `Ctrl + C`。

## 2. 编辑方法

> **日常编辑的主路径是 `/admin` 网页界面**（文章/动态/项目/歌单/装备/插图音乐上传/图片管理），改完即时生效，无需碰代码。注：低语（井外随机浮现）与 `/fragments` 碎片功能已随旧版下线。
> 本章的配置文件方法保留为：① 初始种子（服务器数据为空时的默认值）；② 无后端只读镜像（GitHub Pages）的内容来源；③ 进阶/批量修改通道。

### 2.1 改站点信息（名字 / 简介 / 邮箱 / 社交链接）

打开 `src/config/site.js`，按字段修改引号里的文字即可：

```js
export const site = {
  name: 'Escaping Notes',   // 站名
  subtitle: '每一次书写，都是一次逃逸', // 副标题
  author: 'Xia',           // 你的名字
  bio: '...',              // 身份简介（关于页显示）
  location: 'Chengdu, Sichuan',
  coords: '30.66°N 104.06°E', // 首页读数显示的坐标（可改成你城市的经纬度）
  email: '...',
  url: 'https://你的域名', // 站点公开地址（RSS/OG/canonical 用）；域名就绪后填写
  socials: [ { label: 'GitHub', url: 'https://github.com/你的用户名' } ],
}
```

注意：每项结尾的逗号、引号、花括号不能删改，否则页面会报错（报错时看终端提示行号）。

### 2.2 写一篇新文章

1. 在 `content/posts/` 里新建文件，文件名用英文短横线，如 `my-first-post.md`。
2. 文件开头必须是 frontmatter（两条 `---` 之间的信息），格式照抄 `hello-world.md`：

   ```markdown
   ---
   title: 文章标题
   date: 2026-09-01
   tags: [技术, 随笔]
   summary: 一句话摘要，显示在列表里。
   ---

   正文从这里开始，标准 Markdown 语法。
   ```

3. 常用 Markdown 语法速查：

   | 写法 | 效果 |
   | --- | --- |
   | `## 二级标题` | 标题（# 数量=层级） |
   | `**加粗**` | **加粗** |
   | `[文字](https://url)` | 链接 |
   | `![描述](/images/xx.png)` | 插图（图放 `public/images/`） |
   | 三个反引号包裹 | 代码块 |
   | `- 条目` | 列表 |

4. 插图：把图片放进 `public/images/`，正文里写 `![描述](/images/图片名.png)`。
5. 文章系统已接通：`/blog` 列表与阅读页优先从服务器拉取；后端缺席时（如 GitHub Pages 镜像）回退本目录种子文件。
6. 发文主路径是**站长网页编辑器**（`/admin`），或直接把 md 投到服务器 `data/posts/`；本地 `content/posts/` 用作开发预览与离线回退。

### 2.3 发一条动态

打开 `src/config/updates.js`，在数组**最前面**加一行：

```js
{ date: '2026-09-01', text: '今天做了什么……' },
```

### 2.4 歌单 / 碎片 / 友情链接

- **歌单 `/records`（03 导航位）**：展示你的 QQ 音乐公开歌单（曲名/艺术家/逐行跳转）。站长登录后点页面上的「同步歌单」，后端即调用 QQ 接口拉取并缓存到 `server/data/records.json`（默认歌单 ID 可用环境变量 `QQ_DISSTID` 覆盖）；无后端/离线镜像时回退打包的 `src/config/records.js` 静态快照（可由 `python scripts/sync_records.py` 重新生成）。前提是歌单设为公开。
- **碎片（已随旧版下线，代码保留参考）**：`/fragments` 不占导航位、非 1.0.0 对外功能；接口 `GET/POST/DELETE /api/fragments` 仍保留。
- **图片管理**：`/admin` 文章页签可「上传图片并插入」正文光标处，下方 IMAGES 列表可插入/删除已上传图片；接口 `GET /api/uploads`、`DELETE /api/uploads/:文件名`（均仅站长）。上传白名单：png/jpg/jpeg/webp/gif/svg/mp3，≤8MB。
- **友情链接**：在 `src/config/friends.js` 的数组里追加 `{ label, url }`（关于页 SOCIAL 下方展示）。

### 2.5 音乐播放器

顶栏「音乐」按钮播放本地 mp3 曲目（无需外部音乐 API）。曲目清单与音频上传见 `/admin` 的「歌单」设置块（`title|artist|/uploads/文件名.mp3`），音频文件经 `/admin` 上传至 `/uploads/`；种子与离线回退见 `src/config/music.js`。

### 2.6 改网页标题 / 搜索描述 / 分享卡片

打开根目录 `index.html`：

- `<title>`、`<meta name="description">`：浏览器标签与搜索结果里的标题摘要。
- `<link rel="canonical">`、`og:url`、`og:image`、`twitter:*`：搜索引擎与社交平台分享用的信息。**换域名时，`index.html` 里的 `escaping.top`、`src/config/site.js` 的 `url`、`server/api.py` 的 `SITE_URL` 三处要一起改。**
- 分享卡片图 `public/og.png`（1200×630）由 `npm run og:build` 生成（纯 Node 绘制，不需要额外软件）；想换配色改 `scripts/build_seo.mjs` 里的 `TRAIL` 色板即可。
- `public/robots.txt` 与 `dist/sitemap.xml`：站点抓取范围与页面清单，一般不用改。

### 2.7 账号与角色

- 首次部署后打开登录页：尚无任何账号时，系统会引导你**初始化站长账号**（用户名/昵称/密码）。
- 普通注册得到**访客**身份；**管理员**由站长在 `/admin` 任命，不能自行注册。
- 权限速览：

| 身份 | 权限 |
| --- | --- |
| 游客（未登录） | 浏览全部、留言墙匿昵称投递 |
| 访客（注册） | 具名留言 |
| 管理员 | 访客权限 + 管理界面：用户管理（改角色/禁用/删除）、留言墙管理（删除留言）；**不能发文章** |
| 站长 | 管理员权限 + 文章发布/编辑/删除 + 任命管理员 |

- 管理界面在 `/admin`，仅管理员/站长可见；站长比管理员多一个“文章”页签。
- 忘密码应急：到服务器编辑 `data/users.json`（删除对应账号后重新注册/初始化），操作前先备份该文件。

## 3. 适配方法（外观与设备）

### 3.1 改外观（颜色 / 字体 / 字号 / 间距 / 栏宽 / 圆角）

分两个文件（`neo.css` 必须在 `tokens.css` 之后，靠导入顺序 + `data-skin` 特异性覆盖，见 `src/main.js`）：

- `src/styles/tokens.css` 的 `:root`：基线令牌 —— `--ink-0/1/2` 灰阶、`--text-0/1` 文字、`--line` 发丝线、`--font-*` 三层字体栈、`--measure` 阅读栏宽，以及**四组刻度**：
  - `--space-0…5` 间距（4 / 8 / 16 / 32 / 64 / 96px）
  - `--fs-3xs…4xl` 字号（11.5 → 34px，共 11 档）
  - `--lh-tight/snug/normal/relaxed` 行高（1.35 / 1.6 / 1.75 / 1.9）
  - `--fw-normal/medium/bold` 字重（400 / 600 / 700）
- `src/styles/neo.css` 的两套主题块：真正生效的配色 —— `--cold`（交互/蓝移）、`--hot`（深度/红移）、`--white`（星核高光）、`--shadow`（抬升阴影）、`--scrim`（文字底衬）、`--panel-*`（文章页玻璃底板）。另有 `--r-sm/--r-md/--r-lg/--r-pill` 圆角、`--font-display` 标题字体、`--page-top` 次级页顶部留白，以及**卡片令牌** `--card-bg/--card-bg-hover/--card-brd/--card-brd-hover/--card-pad/--card-pad-lg`。

改完保存即生效。三条约定：

1. **冷暖严格分工**：`--cold` 只用于 hover/链接/焦点/选中项，`--hot` 只用于进度/主动作/当前项/破坏性动作；不要给不同按钮各配一种颜色。
2. **改刻度，不要逐处替换**。比如觉得全站字太小，改 `--fs-sm` 一处即可；觉得整站太挤，改 `--space-*`。卡片质感改 `--card-*` 一组，文章卡/留言卡/图片格/后台面板会同时跟随。
3. **不要写裸 `px`**。新样式里的字号、间距、行高、字重都从上面取；只有控件高度、封面边长、图标盒这类“结构性尺寸”才写字面量。

### 3.1.1 组件库：新页面该用哪些类

全站只有一套组件，都在 `src/styles/neo.css`：**按钮**（`neo-btn` + `neo-btn-sm` 尺寸 × `primary`/`ghost`/`danger`/`quiet` 语义）、**筛选与页签**（`neo-chip`）、**标签**（`neo-tag` / `neo-tag-quiet`）、**输入**（`neo-field`，多行长文用 `textarea.neo-field`）、**状态提示**（`neo-note-ok` / `neo-note-err` / `neo-note-info`）、**图标**（`neo-ico`，只用 `▶ ❚ » ✦ ✧ ≡ ✕ → ↗` 这类单字符符号）。

- **不要**为某个页面另造按钮、输入框、卡片或提示类。1.3.0 之前 `/login` `/register` `/admin` 各自写过一套，现已全部并入上面这些类。
- 功能页（`/login` `/register` `/admin`）用 `tokens.css` 的 `.page` / `.readout` / `.field` 打底，交互元素同样用上面的 `.neo-*`。
- 规则与理由的完整版见 `docs/design-neo.md` §5.3。

### 3.2 设备适配（响应式）

断点都是 `max-width`，实际约定如下（改版式前先对照，别新造一套）：

| 断点 | 变化 |
| --- | --- |
| `1400px` | 顶栏四枚图标按钮收起文字，只留图标 |
| `1240px` | 顶栏收起昵称（昵称宽度不可控，最先收） |
| `1200px` | 顶栏收起整条导航与登录入口，改由汉堡抽屉承载 |
| `900px` | 歌单曲目 2 列 → 1 列 |
| `880px` | 文章卡片 / 留言回声卡 2 列 → 1 列 |
| `720px` | 手机版：页边距收窄、输入框字号 ≥16px（防 iOS 聚焦放大）、首页「现在」栏改竖排并显示内容 |
| `480px` | 顶栏隐藏品牌文字，只留吸积环图标 |

另外有两类与宽度无关的媒体查询：

- `@media (pointer: coarse)`：触控设备上把按钮/胶囊撑到 44px 高，只影响手指，不动鼠标观感。
- `@media (prefers-reduced-motion: reduce)`：见 §3.3。

给新组件加手机适配：

```css
@media (max-width: 720px) {
  .你的类名 { /* 手机下的样式 */ }
}
```

自测方法：浏览器按 `F12` → 点左上角“设备工具栏”图标（或 `Ctrl+Shift+M`）→ 选 iPhone / Pixel 等机型预览。

### 3.3 双主题（深空 / 纸面）与“减弱动态效果”

- 头部主题开关切换，选择会自动记住。深空=近纯黑夜空（默认），纸面=纸感暖白档案风；**首次访问跟随系统 `prefers-color-scheme`**，之后以你的手动选择为准。切换是设计叙事的一部分（夜拍 / 显影），不是普通明暗切换。
- 主题默认值只在 `index.html` 的首帧内联脚本里决定一次（避免首屏闪一下），`src/lib/theme.js` 只读取结果——不要在别处再写一遍默认逻辑。
- 改纸面配色：`src/styles/neo.css` 的 `html[data-skin='neo'][data-theme='out']` 变量块；改深空配色：「深空（默认）」块。**两套都要改**，尤其新增颜色令牌时不要只定义一套（历史上 `--scrim` 漏定义就导致纸面首页文字底衬整条失效）。
- 当访客系统开启“减弱视觉效果”（prefers-reduced-motion）时，全站动画自动关停、`fall` 转场与晕影取消，星轨装置降级为一次性快进的静态底片，无需手动处理。

### 3.4 沉浸光标（默认关闭）

- 顶栏第三枚按钮（✦/✧）开启，开关状态记在浏览器本地；**只在首页生效**，其余页面保留系统光标，图片 `zoom-in` 等原生语义不被吞掉。
- 需满足两个条件按钮才可用：设备是精细指针（鼠标/触控板）且未开启“减弱视觉效果”；不满足时按钮置灰，提示会说明原因。
- 指针静止约 1.4s 后轨道转速平滑归零并停帧，指针一动立刻唤醒——这是为省电做的，不是卡顿。
- 想让光标在别的页面也生效：改 `src/components/neo/NeoCursor.vue` 里的 `sync()`（`route.path === '/'` 判断）。

### 3.5 性能与无障碍约定（改代码时请遵守）

- **动画只动 `opacity` / `transform`**。不要**新增**整页或大面积的 `filter: blur()`——那会每帧重新栅格化整棵子树。唯一的例外是 `fall` 转场（换页时的下坠模糊），它是刻意保留的手感，新组件请勿照抄。
- **不要给常驻悬在画布之上的元素加 `backdrop-filter`**。它会让浏览器在星轨每动一帧时重算背后模糊；全站只保留抽屉一处（模态、瞬时）。需要“玻璃感”时用 94% 不透明实底替代。
- **`resize` 一律经 `src/lib/debounce.js` 去抖（150ms）**，因为大多数处理要重建画布或重新测量布局。
- **不要各自写滚动监听**。滚动深度统一由 `App.vue` 写入 `--shift`（0..1），需要就 `var(--shift, 0)`；`scrollHeight` 会强制同步布局，绝不能每帧读。
- **焦点与播报**：新增模态/浮层请用 `src/lib/focus.js` 的 `trapFocus()` 锁住 Tab 并在关闭时归还焦点；`#main` 带 `tabindex="-1"` 供「跳到内容」使用；路由切换由 `App.vue` 的 `aria-live` 区域播报 `route.meta.t`——新页面记得在 `src/router/index.js` 写上 `meta.t`。
- **触控目标 ≥44px**：直接复用 `.neo-btn` / `.neo-chip` 就会自动满足（`neo.css` 的 `@media (pointer: coarse)` 已统一处理）；只有自己写控件时才需补 `min-height: 44px`。
- **最小字号 11.5px**：仪器文字再小就不可读了，即 `--fs-3xs`，不要再往下调。
- **复用现有组件，不要新造**：按钮、输入框、卡片、提示一律取 §3.1.1 的那套类。若发现基元不够用，先扩 `neo.css` 里的基元本身，再让所有页面一起切换——不要在建页面时顺手写一份“只有这个页面用”的样式。
- **状态提示用 `.neo-note-ok` / `.neo-note-err` / `.neo-note-info`**，统一以 `//` 打头；不要新增 `.err` / `.warn` / `.notice` 之类的一次性类，也不要给“失败”用冷色、“成功”用热色。

## 4. 上传方法（部署上线）

主推荐：**自有服务器 + 域名（方式 C，§4.3）**——登录/留言墙/全网计数依赖后端，只有自有服务器能跑完整版。方式 A/B（Vercel/GitHub Pages）定位为**只读镜像**：能看文章，登录/发文/留言自动禁用，用作备份出口。**当前测试期先用方式 B（GitHub Pages）**，域名备案就绪后切方式 C。

### 4.0 上传前自检

```powershell
npm run build     # 生成 dist/ 目录（含 rss.xml / sitemap.xml），无报错即合格
npm run preview   # 本地模拟线上环境，浏览器打开检查一遍
```

构建会顺带跑 `scripts/build_seo.mjs` 产出 `dist/rss.xml` 与 `dist/sitemap.xml`：自有服务器上这两条路由会被 nginx 转给后端（动态、含后台上传的文章），构建产物只是 GitHub Pages 镜像的兜底。

### 4.1 方式 A：Vercel（免费、自动更新，只读镜像）

1. 把代码推到 GitHub（首次）：

   ```powershell
   git init
   git add .
   git commit -m "init: Escaping Notes blog"
   git branch -M main
   git remote add origin https://github.com/你的用户名/你的仓库名.git
   git push -u origin main
   ```

   （需先安装 Git 并在 github.com 注册账号；推送时按提示登录。）
2. 打开 vercel.com → 用 GitHub 登录 → **Add New… → Project** → 选择刚推送的仓库 → **Import**。
3. Vercel 会自动识别 Vite：Build Command `npm run build`、Output `dist`，**不用改任何设置**，点 Deploy。
4. 完成后得到 `https://xxx.vercel.app` 地址。以后每次 `git push`，Vercel 自动重新部署。
5. 项目里已含 `vercel.json`，刷新任何子页面都不会 404。

### 4.2 方式 B：GitHub Pages（免费，当前测试期主用）

项目已内置 Pages 自动部署：推送 `main` 后由 GitHub Actions 自动构建发布（`.github/workflows/deploy.yml`），**无需改任何配置**——`build:pages` 会自动启用 `/Escaping-Notes/` 前缀与 hash 路由，本地 `dev`/`build` 始终是自有域名生产参数。

1. 仓库 Settings → Pages → **Source** 选 **GitHub Actions**（仅首次）。
2. 推送代码：`git push`。
3. 等 Actions 跑完（约 1 分钟），访问 `https://escap1ng.github.io/Escaping-Notes/`。

Pages 版是只读测试镜像：文章用打包版，登录/发文/留言墙不可用（无后端）。域名就绪后按 §4.3 切自有服务器，Pages 可保留作备份镜像或关停。

### 4.3 方式 C：自有轻量服务器（nginx，适用 2核2G）

前端部分纯静态、无数据库：2核2G 服务器上 nginx 托管 `dist` 目录内存占用 <10MB。后端是可选的单个 Python 文件（零第三方依赖，见第 8 步），不跑它站点仍可只读浏览。

1. 本地构建 `npm run build`。**推荐本地构建后上传**；2G 内存的服务器也能跑构建，但峰值几百 MB，不建议与其他服务同时跑。
2. 上传 `dist` 内容到服务器，例如 `/var/www/escaping-notes`：

   ```powershell
   scp -r dist/* 用户名@服务器IP:/var/www/escaping-notes/
   ```

   （宝塔面板用户：文件管理器上传 dist 压缩包并解压到站点目录即可。）
3. 站点配置（宝塔：网站 → 设置 → 配置文件；裸 nginx：`/etc/nginx/conf.d/escaping-notes.conf`）：

   ```nginx
   server {
       listen 80;
       server_name escaping.top;
       root /var/www/escaping-notes;
       index index.html;

       gzip on;
       gzip_types text/css application/javascript image/svg+xml;

       # 带哈希的构建产物可长期缓存
       location /assets/ {
           add_header Cache-Control "public, max-age=31536000, immutable";
       }

       # 文档路由经后端做 meta 注入（SEO/分享卡片）；RSS 同源；上传文件同源
       location = / { proxy_pass http://127.0.0.1:8787; }
       location /blog/ { proxy_pass http://127.0.0.1:8787; }
       location = /rss.xml { proxy_pass http://127.0.0.1:8787; }
       location /uploads/ { proxy_pass http://127.0.0.1:8787; }

       # SPA history 路由回退：刷新子页面不 404
       location / {
           try_files $uri $uri/ /index.html;
       }
   }
   ```

4. 裸 nginx 执行 `nginx -t ; nginx -s reload` 校验并重载；宝塔保存配置即生效。
5. 验证：浏览器打开 `http://服务器IP`，刷新 `/blog` 等子页面不 404 即成功。
6. 域名绑定与备案：
   - 域名注册完成后，在域名商后台添加 A 记录：`@` 与 `www` 都指向服务器 IP。
   - **大陆服务器：域名必须完成 ICP 备案**（走服务器厂商的备案系统），否则 80/443 端口会被拦截；不想备案就选香港/海外服务器。
   - 把配置里的 `server_name` 改成你的域名；宝塔保存即生效。
7. HTTPS（涉及登录后必启）：certbot 或宝塔 SSL 一键申请；启用后把 `src/config/site.js` 的 `url` 字段改成你的 https 域名（RSS/OG/canonical 用），重新构建上传。
8. 部署极简后端（登录/发文/跨设备留言必需；零依赖、仅 Python3 标准库，服务器一般预装，无需 pip/npm），内存约 20MB：

   ```powershell
   scp server/api.py 用户名@服务器IP:/opt/escaping-notes/api.py
   ```

   在服务器创建自启服务 `/etc/systemd/system/escaping-notes-api.service`：

   ```ini
   [Unit]
   Description=Escaping Notes API
   After=network.target

   [Service]
   Environment=SITE_URL=https://escaping.top
   ExecStart=/usr/bin/python3 /opt/escaping-notes/api.py
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```

   ```powershell
   # 在服务器执行
   systemctl daemon-reload ; systemctl enable --now escaping-notes-api
   ```

   nginx 站点配置里加反代（API 只监听 127.0.0.1，不直接对外）：

   ```nginx
   location /api/ {
       proxy_pass http://127.0.0.1:8787;
   }
   ```

   数据存于服务器 `/opt/escaping-notes/data/` 的 JSON 文件，备份=复制文件。
   前端已全线接线；API 不可达（含 10 秒超时）时站点自动降级为本地模式，不报错。

注意：

- 服务器**不需要安装 Node**——静态托管与 Node 无关。
- 不部署后端时站点仍可只读浏览（文章用打包版、留言/计数走本地模式），但登录/发文/跨设备留言不可用。
- **涉及登录后务必启用 HTTPS**（§4.3 第 7 步），避免密码明文传输。
- 备份=复制服务器 `data/` 目录（文章/用户/留言/计数全在里面），建议定期拷走。

### 4.4 以后更新内容的流程

改文章/配置 → 本地 `npm run dev` 检查 → `git add . ; git commit -m "说明" ; git push` → 线上自动更新（Vercel）。
自有服务器用户：重新 `npm run build` 后重复第 2 步上传即可（可后续做成一条脚本命令）。

## 5. 常见问题

| 症状 | 原因与处理 |
| --- | --- |
| 双击 `index.html` 打开是空白 | 必须通过 `npm run dev` 或 `npm run preview` 访问，不能直接双击文件 |
| 改了配置页面报错 | 99% 是少了逗号/引号。看终端报错行号，对照 §2.1 示例修复 |
| `npm install` 很慢 | 可换国内镜像：`npm install --registry=https://registry.npmmirror.com` |
| GitHub Pages 刷新 404 | Pages 版自动用 hash 路由；若手动构建，确认用的是 `npm run build:pages` |
| 端口 5173 被占用 | Vite 会自动换 5174…，以终端显示为准 |
| 文章列表一直显示灰色骨架卡 | 后端没启动或响应很慢。接口 10 秒超时后会自动降级到打包的文章种子，稍等即可 |
| 顶栏「光标」按钮是灰的、点不动 | 沉浸光标需要精细指针（鼠标/触控板）且系统未开启“减弱视觉效果”；触屏设备不支持，见 §3.4 |
| 开了沉浸光标却只有首页生效 | 设计如此：其余页面保留系统光标，避免吞掉图片 `zoom-in` 等原生语义，见 §3.4 |
| 首页「现在」三栏一直显示 `--` | 后端不可达时的正常降级：读数来自本地种子数据，没有内容就是空的 |
| 分享链接没有卡片图 | 确认 `public/og.png` 存在，且 `index.html` 里的域名是你的真实域名（换域名见 §2.6） |

## 6. 当前进度与阶段说明

本站已发布 **v1.0.0 正式版**（2026-09），其后发布 **v1.1.0**（阅读体验优化）、**v1.2.0**（运行时性能、无障碍与 SEO）与 **v1.3.0**（统一设计系统）。以下里程碑均已交付：

- **v1.3.0 · 统一设计系统（界面一致性）**：
  - 建立刻度——间距 `--space-0…5`、字号 `--fs-3xs…4xl`（11 档）、行高 `--lh-*`（4 档）、字重 `--fw-*`（3 档）、卡片 `--card-*` 一组、次级页顶栏避让 `--page-top`；组件内不再写裸字号/裸间距。
  - 收敛组件——按钮从 6 套并为「2 尺寸 × 4 语义」；输入框从 2 套并为「单行下划线 / 多行发丝框」；卡片 3 套规格并为 `--card-*`；状态提示 5 种各自实现并为 `.neo-note-ok/err/info` 三态；图标统一为 `.neo-ico` 单字符符号（播放符号两套合并）。
  - 功能页并入——`/login` `/register` `/admin` 的私有类（`.submit` / `.act` / `.tab` / `.err` / `.notice` / `.warn`）全部删除，改用 `.neo-*`；后台页签选中态由热色改冷色，与全站 `.neo-chip` 一致。
  - 修正——`.field` 显式声明 `font-family` / `text-transform`，避免嵌在 `.readout` 标签里被带成等宽大写；修复本次重构一度造成的提交按钮无样式、错误提示无颜色。
- **v1.2.0 · 运行时性能 / 无障碍 / SEO**：
  - 性能——次级页活背景限帧 30fps（长曝光按真实时长累积，流速不变）；四处 `resize` 监听统一去抖 150ms；`--shift` 缓存 `scrollHeight`，不再每帧强制布局；吸顶栏与播放器改用高不透明实底、去掉常驻 `backdrop-filter`；指针透镜光斑改为 `transform` 位移（不再逐帧重绘渐变）。（`fall` 转场的整页模糊经评估后按设计取舍保留，见设计文档 §10。）
  - 无障碍——抽屉与灯箱加焦点陷阱并在关闭时归还焦点；路由切换向读屏播报；`#main` 可聚焦供「跳到内容」；触控目标 ≥44px；最小字号下限 11.5px。
  - 反馈——文章列表骨架屏；「本来没有内容」与「筛选无结果」分文案；搜索/标签筛选写入 URL（可分享、刷新不丢）。
  - SEO——`og:image` / `og:url` / `canonical` / `twitter:*` 补全；构建期生成 `rss.xml` 与 `sitemap.xml`；新增 `robots.txt`。
- **v1.1.0 · 阅读体验优化**：文章页磨砂玻璃阅读底板（半透明页面色 + 背景模糊，四边羽化无硬边，对比达 WCAG AA）；星轨"防饱和尾部渐隐 + 拉长尾迹 + 随机尾迹起点"使圆环连续、弧端错落无断口；阅读栏加宽（78ch）并提高底板透明度、加大底板宽度。
- **核心装置**：长曝光星轨（变星/流星/指针时间膨胀）、星图目录导航、`fall` 转场。
- **后端 v2**：注册/登录/三角色、文章 CRUD、meta 注入、RSS、留言墙、上传、计数；歌单支持运行时同步 QQ 音乐公开歌单。
- **管理界面 `/admin`**：用户/留言管理、文章发布与编辑、站点设置（动态/项目/歌单/装备/上传）、图片管理与插图；动态与项目支持「＋ 新增」与按需保存。
- **内容与页面**：文章列表与阅读闭环、动态时间线、歌单（QQ 同步）、项目载荷舱、留言墙、关于、404；双语 eyebrow 与「现在」读数栏。
- **体验与性能**：双主题（深空/纸面，默认深空并跟随系统）、沉浸光标（默认关闭、仅首页）、音乐播放器、移动端适配、`prefers-reduced-motion` 降级、像素预算封顶、次级页限帧、全站 resize 去抖。
- **SEO 与分享**：文章页由后端注入 `title`/`description`/`og`/`canonical`；`rss.xml`、`sitemap.xml`、`robots.txt`、分享卡片 `og.png`。
- **已下线**：低语（井外随机浮现）与 `/fragments` 碎片功能（接口保留，见 §2.4）。
