# Escaping Notes · 使用手册

> 面向网站设计新手的操作手册 · v0.1（2026-09-01）
> 约定：本手册中“项目根目录”指包含 `package.json` 的文件夹（即 BLOG 文件夹）。
> 手册会随开发阶段更新；当前未接通的功能会标注“阶段 N 接通”。

---

## 0. 目录结构速览

```
BLOG/
├── content/posts/        ← 你的文章（Markdown 文件），写文章只碰这里
├── public/               ← 静态资源：favicon、图片、音乐文件放这里
├── src/
│   ├── config/           ← 站点信息/动态/链接等“内容配置”，改内容主要碰这里
│   ├── components/       ← 头部、页脚等公共组件
│   ├── views/            ← 每个页面一个文件
│   ├── router/           ← 网址路由
│   └── styles/tokens.css ← 主题色/字体/栏宽（改外观只碰这里）
├── docs/                 ← 设计文档与本手册
└── index.html            ← 网页标题、描述在这里改
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

> **阶段三上线后，日常编辑的主路径是 `/admin` 网页界面**（文章/动态/链接/项目/装备/歌单/站点信息/插图音乐上传），改完即时生效，无需碰代码。
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
5. 当前进度：文章列表与阅读页在**阶段二**接通；现在新文件会先出现在 `/blog` 页的“检测到的信号”列表里，可用来验证格式正确。
6. 阶段三上线后，发文主路径变为**站长网页编辑器**（`/admin`），或直接把 md 投到服务器 `data/posts/`；本地 `content/posts/` 用作开发预览与离线回退。

### 2.3 发一条动态

打开 `src/config/updates.js`，在数组**最前面**加一行：

```js
{ date: '2026-09-01', text: '今天做了什么……' },
```

### 2.4 改资源分享 / 友情链接

打开 `src/config/links.js`，在对应分组里加 `{ name: '名字', url: 'https://…' }`。`#` 表示占位链接，记得换成真实地址。

### 2.5 音乐（阶段四接通）

把 mp3 放进 `public/audio/`，之后在 `src/config/music.js`（阶段四创建）登记歌名与文件路径。不使用任何外部音乐 API。

### 2.6 改网页标题 / 搜索描述

打开根目录 `index.html`，改 `<title>` 和 `<meta name="description">` 的引号内容。

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

### 3.1 改主题色 / 字体 / 栏宽

全部集中在 `src/styles/tokens.css` 顶部的 `:root` 变量：

- `--signal`：唯一信号色（夜视琥珀）。改这一个变量即可换全站强调色。
- `--ink-0/1/2`：背景灰阶；`--text-0/1`：文字灰阶。
- `--font-mono / --font-serif / --font-sans`：三层字体栈。
- `--measure`：正文阅读栏宽。

改完保存即生效。请保持“单一信号色”原则，不要给不同按钮配不同颜色。

### 3.2 设备适配（响应式）

- 断点约定：`≤720px` 手机、`721–1080px` 平板、`>1080px` 桌面。
- 现有页面已按此适配（如首页索引在手机上自动隐藏描述列）。
- 给新组件加手机适配的写法：

  ```css
  @media (max-width: 720px) {
    .你的类名 { /* 手机下的样式 */ }
  }
  ```

- 自测方法：浏览器按 `F12` → 点左上角“设备工具栏”图标（或 `Ctrl+Shift+M`）→ 选 iPhone / Pixel 等机型预览。

### 3.3 双主题（井底 / 井外）与“减弱动态效果”

- 头部 `LOC: 井底/井外` 开关切换主题，选择会自动记住。井底=夜航墨蓝（默认），井外=纸感暖白档案风；切换是设计叙事的一部分（逃逸/档案），不是普通明暗切换。
- 改井外配色：`src/styles/tokens.css` 里的 `:root[data-theme='out']` 变量块，改完保存即生效。
- 当访客系统开启“减弱视觉效果”（prefers-reduced-motion）时，全站动画自动关停，轨迹场装置自动降级为静态轨迹图（阶段一实现），无需你手动处理。

## 4. 上传方法（部署上线）

主推荐：**自有服务器 + 域名（方式 C，§4.3）**——登录/留言墙/全网计数依赖后端，只有自有服务器能跑完整版。方式 A/B（Vercel/GitHub Pages）定位为**只读镜像**：能看文章，登录/发文/留言自动禁用，用作备份出口。**当前测试期先用方式 B（GitHub Pages）**，域名备案就绪后切方式 C。

### 4.0 上传前自检

```powershell
npm run build     # 生成 dist/ 目录，无报错即合格
npm run preview   # 本地模拟线上环境，浏览器打开检查一遍
```

### 4.1 方式 A：Vercel（推荐，免费、自动更新）

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

本站纯静态、无后端、无数据库；2核2G 服务器只需 nginx 托管 `dist` 目录，内存占用 <10MB，性能余量极大。

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
       server_name 你的域名或IP;
       root /var/www/escaping-notes;
       index index.html;

       gzip on;
       gzip_types text/css application/javascript image/svg+xml;

       # 带哈希的构建产物可长期缓存
       location /assets/ {
           add_header Cache-Control "public, max-age=31536000, immutable";
       }

       # 文档路由经后端做 meta 注入（SEO/分享卡片）；RSS 同源
       location = / { proxy_pass http://127.0.0.1:8787; }
       location /blog/ { proxy_pass http://127.0.0.1:8787; }
       location = /rss.xml { proxy_pass http://127.0.0.1:8787; }

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
   前端接线在阶段三/四上线；API 不可达时站点自动降级为本地模式，不报错。

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

## 6. 当前进度与阶段说明

- **已完成（阶段 0）**：工程骨架、路由、六个页面框架、内容配置、视觉基线、示例文章、本手册。
- **阶段 1**：首屏引力井轨迹场 + 引力干扰 + 逃逸坐标导航（核心装置）。
- **阶段 2**：后端 v2（注册/登录/三角色/文章 CRUD/meta 注入/RSS）+ 文章系统接通 + 标签过滤/搜索 + 阅读闭环。
- **阶段 3**：前端接线、`/admin` 管理界面（用户/留言/文章/六项设置/上传，日常编辑全网页化）、`/projects` 载荷舱、关于逃逸装备、动态/收藏/留言墙（跨设备可见）完整化。
- **阶段 4**：转场、音乐、全网计数、微交互。
- **阶段 5–6**：适配复核、生产构建、自审重构、部署。
