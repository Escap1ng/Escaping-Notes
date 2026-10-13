# Escaping Notes · 使用手册

> 面向第一次接手这个仓库的人：怎么跑起来、怎么改内容、怎么换外观、怎么上线。
> 本文只写**现在照做就成立**的步骤；某年某月改过什么交给 `git log`，§6 只留写 Release 要用的里程碑条目。
> 约定：「项目根目录」指含 `package.json` 的那一层（本机是 `D:\000GH more\BLOG`）。
> 章节顺序：0 结构 → 1 本地跑 → 2 改内容 → 3 改外观 → 4 上线 → 5 常见问题 → 6 里程碑。
> 界面设计的依据与实测数值在 **[docs/design.md](design.md)**，本文不重复。

---

## 0. 目录结构速览

```text
BLOG/
├── index.html          ← 壳层：首帧内联脚本（主题 + 底片模糊，都不闪一下）、SEO/OG 元信息
├── server/api.py       ← 后端：单文件、只用 Python 3 标准库，监听 127.0.0.1:8787
├── content/posts/      ← Markdown 文章（带 frontmatter）——种子与离线回退；上线后发文主路径是 /admin
├── public/
│   ├── plates/ posts/ audio/   ← 三个**必须入库**的派生素材目录（重烘命令见 README 的「常用脚本」）
│   └── favicon.svg  robots.txt  og.png  images/
├── scripts/            ← 构建期脚本，按动词分族：build_* / check_* / sync_*
│   ├── build_font.mjs        ←   展示层子集字体裁切（依赖 devDep subset-font）
│   ├── build_seo.mjs         ←   dist/rss.xml、dist/sitemap.xml、public/og.png
│   ├── build_readme_art.mjs  ←   README 配图：按 StarTrails 常数离线复算
│   ├── build_plate_bg.ps1 / build_post_covers.ps1  ←  底图与封面烘培（Windows PowerShell）
│   ├── check_api_doc.py / check_doc_refs.py / check_naming.py / check_contrast.mjs  ← 四道门禁
│   ├── sync_records.py       ←   抓 QQ 公开歌单 → 生成 src/config/records.js
│   ├── data/  lib/           ←   脚本输入数据（GB2312 一级字表）／共用模块（PNG 编码器）
├── docs/               ← design.md 设计依据 · manual.md 本文 · api.md 后端接口契约
│   └── assets/readme/  ← README 配图
├── tests/              ← 零依赖防护网：node --test + unittest，跑 npm test
└── src/
    ├── assets/fonts/   ← 自托管子集字体（一枚 woff2，700 字重）+ OFL 许可
    ├── components/     ← SiteHeader 顶栏+抽屉 · SiteFooter · HorizonHero 首屏 · StarTrails 星轨 · MusicCard · SettingsCard · SearchCard
    ├── config/         ← narrative.js 文案层 · site.js 站点信息 · 内容种子（动态/项目/音乐/歌单/映像/友链）
    ├── lib/            ← api auth content posts frontmatter markdown theme storage music records gallery plate ridge lens shift sky debounce focus exit projects
    ├── router/         ← 12 条路由，全部懒加载
    ├── styles/site.css ← **唯一的样式表**：基线令牌 + 两套主题 + 全站基元（内部按 §0–§11 分节）
    └── views/          ← 12 个页面各一个文件，平铺
```

三条会反复用到的事实：

- **`src/styles/site.css` 是唯一的样式表**，改外观不碰别的文件。
- **`src/config/*.js` 是种子，不是线上内容**：后端有数据时以后端为准（§2 开头）。
- **派生素材要提交**（`public/plates/`、`public/posts/`、`public/audio/`），构建机不会重跑烘培脚本。

---

## 1. 快速开始（本地运行）

1. 装 Node.js **18 或更高**（推荐 LTS）：nodejs.org 下载一路下一步。装完在 PowerShell 里 `node -v` 能看到版本号即成功。
2. 进入项目根目录：

   ```powershell
   cd "D:\000GH more\BLOG"
   ```

3. 首次使用装依赖（以后不用重复）：

   ```powershell
   npm install
   ```

4. 启动前端：

   ```powershell
   npm run dev
   ```

   浏览器打开终端里显示的地址（通常是 `http://localhost:5173`）。改任何文件保存后浏览器自动刷新——这就是你的实时画板。

5. （可选）要登录、发文、看真实阅读数，另开一个终端启动后端：

   ```powershell
   python server/api.py
   ```

   不启动它，站点以**只读 + 本地种子**运行，内容照样能读完。`/api` 由 Vite 代理到 `127.0.0.1:8787`，代理不通就自动降级，不报错。

6. 停止服务器：在对应终端按 `Ctrl + C`。

---

## 2. 编辑方法

> **日常编辑的主路径是 `/admin` 网页界面**（文章 / 动态 / 项目 / 歌单 / 装备 / 插图与音乐上传 / 图片管理），改完即时生效，不用碰代码。
> 本章的配置文件方法是另外三件事：① 初始种子（服务器数据为空时的默认值）；② 无后端只读镜像（GitHub Pages / Vercel）的内容来源；③ 进阶与批量修改通道。
> 低语（井外随机浮现）与 `/fragments` 碎片功能已随旧版下线，接口保留（§2.4）。

### 2.1 改站点信息（名字 / 简介 / 邮箱 / 社交链接）

打开 `src/config/site.js`，改引号里的文字即可。每个字段用在哪：

| 字段 | 用在哪 |
| --- | --- |
| `name` | 站名：顶栏品牌、`document.title` 后缀、OG |
| `author` | 作者名（关于页 OBSERVER 读数、页脚版权行 `© 年份 名字`） |
| `bio` | 身份简介（关于页自述下方） |
| `location` / `coords` | 关于页与抽屉读数里的地点与经纬度（可改成你城市的） |
| `email` | 关于页 SOCIAL 卡 |
| `url` | **站点公开地址**：RSS / OG / canonical 都取它。换域名必改（另两处见 §2.6） |
| `license` | **内容许可**：页脚版权行那枚协议链接，`{name, url}`。两项必须一起改——名字写 `BY-SA` 而网址指到 `by-nc-sa/` 是挂着这条协议的名、链到别条的正文 |
| `socials` | 关于页 SOCIAL 卡，每项 `{label, url}` |
| `gear` | 关于页技术栈，每项 `{name, note}`（`note` 写它在这一站里干什么） |

注意：每项结尾的逗号、引号、花括号不能删改，否则页面报错（终端会给出行号）。

### 2.2 写一篇新文章

1. 在 `content/posts/` 里新建文件，文件名用英文短横线，如 `my-first-post.md`。
2. 文件开头必须是 frontmatter（两条 `---` 之间），格式照抄 `hello-world.md`：

   ```markdown
   ---
   title: 文章标题
   date: 2026-09-01
   tags: [技术, 随笔]
   summary: 一句话摘要，显示在列表里。
   image: /posts/my-first-post.jpg
   imagePos: 60% 40%
   ---

   正文从这里开始，标准 Markdown 语法。
   ```

   `image` 可选：列表页那格封面 + 正文顶部那张满栏图（同一个文件）；`imagePos` 是裁切焦点，缺省居中。封面文件由 `npm run cover:build` 从 `plates-src/` 烘出来，或直接放进 `public/posts/`。

3. 常用语法速查：

   | 写法 | 效果 |
   | --- | --- |
   | `## 二级标题` | 标题（`#` 数 1–5 可用：`#` 留给文章标题，所以实际渲染为 h2–h6） |
   | `**加粗**` | **加粗** |
   | `[文字](https://url)` | 链接 |
   | `![描述](/images/xx.png)` | 插图（图放 `public/images/`） |
   | 三个反引号包裹 | 代码块 |
   | `- 条目` | 列表 |
   | `> 引用` | 引用块 |
   | `---` | 分隔线 |
   | `\| 名 \| 值 \|` + `\|:--\|--:\|` + 数据行 | 表格（首行表头，第二行的分隔行**必须**写，否则整段按普通文字渲染） |

   表格列对齐由分隔行的冒号决定：`:---` 左、`---:` 右、`:---:` 居中。

   **链接与图片的地址只接受**：站内相对路径（`/…`、`./…`）、锚点（`#…`）、`http(s):`、`mailto:`、`tel:`。写成 `javascript:` 之类协议的不会变成链接，只保留可见文字。原因不是排版而是权限：正文会经 `v-html` 渲染给**每一个读者**，一条能点就能执行的地址足以把访客自己浏览器里那份登录令牌取走。

4. 发文主路径是**站长网页编辑器**（`/admin`），或直接把 md 投到服务器 `data/posts/`；本地 `content/posts/` 用作开发预览与离线回退。`/blog` 列表与阅读页优先从服务器拉取，后端缺席时回退本目录种子。
   - **SEO 产物取两个目录的并集**（`scripts/build_seo.mjs`，按文件名去重、`data/posts/` 优先）。两个直接后果：⑴ 构建机必须**看得见** `server/data/posts/` 才能把网页上发的文章收进 `dist/sitemap.xml`——本地很久没跑后端时该目录可能只是早期副本，发布新文章后先从服务器同步一次再 `npm run build`；⑵ Vercel / GitHub Pages 这类**无后端镜像**本来就没有 `data/`，列进 sitemap 的后台文章 URL 在镜像上会落到离线回退页。只维护一条域名时以自建服务器为准。

### 2.3 发一条动态

打开 `src/config/updates.js`，在数组**最前面**加一行（新的在上）：

```js
{ date: '2026-09-01', text: '今天做了什么……' },
```

### 2.4 音乐 / 项目 / 映像 / 友链 / 碎片

- **项目 `/projects`（05 导航位）**：卡面那四样（`name|desc|year|url`）在 `/admin` 的 PROJECTS 块按行编辑，一行一个项目。点卡片进去的那一页上的介绍（`detail` 段落 / `points` 要点 / `stack` 技术栈）**只在 `src/config/projects.js` 里改**——行式编辑装不下多段正文。后台点保存不会把介绍抹掉（`src/lib/content.js` 按 `name` 把它贴回来），但**在后台改了项目名字等于同时做两件事**：把它和介绍断开，并换掉那一页的 URL（URL 由名字现算，空格换成连字符）。改名时同步改 `projects.js` 里那个 `name`。`tests/projects-intro.test.mjs` 钉着这条。
- **音乐 `/records`（03 导航位）**：展示你的 QQ 音乐公开歌单（曲名 / 艺术家 / 逐行跳转；表内两列，默认折到前 8 首，点表头「展开其余 N 首」看全）。站长登录后点表头「同步歌单」，后端调用 QQ 公开接口拉取并缓存到 `server/data/records.json`（默认歌单 ID 用环境变量 `QQ_DISSTID` 覆盖）；无后端 / 离线镜像时回退打包的 `src/config/records.js` 静态快照（可由 `python scripts/sync_records.py` 重新生成——**这个文件是脚本产物，别手改**）。前提是歌单设为公开。
- **关于页的头像**：取 `records.cover`（QQ 歌单封面的外链，与音乐页同源）。要换人就换 QQ 那张歌单封面再同步；离线 / 镜像用的是快照里的 URL。
- **映像 `/gallery`（04 导航位）**：这一墙摊的是**全站用过的图**，不用另外登记——文章封面（frontmatter 的 `image`，或 `/admin` 里给文章配的图）自动上墙，最新那篇在左上第一格；站点自己的底片（首屏亮 / 暗两张、抽屉五张轮播、深色压暗底、分享卡）记在 `src/config/gallery.js`。**换底片时这份清单必须跟着改**，`npm test` 会拿它和 `site.css` 里真正引用的 `/plates/` 对拍，漏了就把旧图留在墙上示众。同一张图被两篇用过只出现一次。
- **图片管理**：`/admin` 文章页签可「上传图片并插入」正文光标处，下方 IMAGES 列表可插入 / 删除已上传图片；接口 `GET /api/uploads`、`DELETE /api/uploads/:文件名`（均仅站长）。上传白名单：png / jpg / jpeg / webp / gif / svg / mp3，≤8MB。
- **友情链接**：在 `src/config/friends.js` 的数组里追加 `{ label, url }`（关于页的友链卡，宽屏与 SOCIAL 卡同排、窄屏单列时在其下方）。
- **碎片（已随旧版下线，代码保留参考）**：`/fragments` 不占导航位、非 1.0.0 对外功能；接口 `GET/POST/DELETE /api/fragments` 仍保留。

### 2.5 播放器

全站只有一台播放器：`<audio>` 与全部状态收在 `src/lib/music.js`，界面上是它的两张脸。

- **顶栏「音乐」按钮 → 播放器卡片**（`src/components/MusicCard.vue`，锚在顶栏下沿、右对齐）：上一首 / 播放暂停 / 下一首 / 进度 / 音量 / 曲目队列。**点卡外或按 Esc 收起，焦点回按钮**；没有曲目时按钮置灰。左上那枚绕极旋转的弧是星轨符号占位（本地曲目无封面数据），播放时才转。
- **`/records` 的「在线听歌」卡**：满宽一张、卡内两列，只放曲目表、不放进度条——点一行即播，再点当前曲即暂停；当前曲红移，与顶栏按钮播放中同一个记号。没按下之前没有任何一行是「当前曲」（`music.started` 把关），否则第一行会一直红着、看着像已经在播。也别把听歌卡与别的卡并排：曲目会一首首加上去，第 5 首起就会把整行拉高。
- **QQ 曲目表默认折叠**：只列前 8 首，表头右侧「展开其余 N 首 ↓」点开、「收起 ↑」收回（`aria-expanded`）。几十首时它是档案，不该把整页拖长压住真正能播的那一张。

曲目清单来自 `content.playlist`：主路径是 `/admin` 的 PLAYLIST 设置块（`title|artist|/uploads/文件名.mp3`，音频经 `/admin` 上传至 `/uploads/`）；种子与离线 / 只读镜像回退见 `src/config/music.js`，其音频是仓库内的 `public/audio/*.mp3`（构建后落在 `dist/audio/`，Pages 镜像不接后端也能播）。

### 2.6 改网页标题 / 搜索描述 / 分享卡片

打开根目录 `index.html`：

- `<title>`、`<meta name="description">`：浏览器标签与搜索结果里的标题摘要。
- `<link rel="canonical">`、`og:url`、`og:image`、`twitter:*`：搜索引擎与社交平台分享用的信息。**换域名时三处一起改**：`index.html` 里的域名、`src/config/site.js` 的 `url`、后端的环境变量 `SITE_URL`（§4.3 第 8 步）。
- 分享卡片图 `public/og.png`（1200×630）由 `npm run og:build` 生成（纯 Node 绘制，不需要额外软件）；想换配色改 `scripts/build_seo.mjs` 里的 `TRAIL` 色板。
- `public/robots.txt` 与 `dist/sitemap.xml`：抓取范围与页面清单，一般不用改。

### 2.7 账号与角色

- 首次部署后**直接访问 `/login`**（顶栏没有登录入口）：尚无任何账号时，系统会引导你**初始化站长账号**（用户名 / 昵称 / 密码）。
- **没有自助注册**：除了站长初始化，后端没有任何端点能创建账号。要增设管理员，先手工往 `data/users.json` 里加一条账号（或把已有账号的 `role` 写成 `admin`），再在 `/admin` 任命。
- 权限速览（与 `server/api.py` 的判定一致）：

| 身份 | 权限 |
| --- | --- |
| 游客（未登录） | 浏览全部 |
| 管理员 `admin` | 用户管理（任命 / 禁用 / 删除）、读取含草稿的文章列表；**不能发文章、不能改站点设置** |
| 站长 `owner` | 以上全部 + 文章发布 / 编辑 / 删除 + 站点设置 + 上传 + 歌单同步 |

- 管理界面在 `/admin`，仅管理员 / 站长可见；站长比管理员多「文章」「设置」两个页签。
- **撤销任命没有中间档可回落**：要收权就用**禁用**，要撤号就**删除**。
- 鉴权是 `Authorization: Bearer`，会话 **7 天**过期；限流按 IP **30 请求 / 60 秒且只计 POST**。
- 忘密码应急：到服务器编辑 `data/users.json`，操作前先备份该文件。注意初始化闸门看的是**"表里有没有账号"而不是"有没有站长"**（`owner_gate()` 判的是 `len(users) == 0`）——只删掉站长那一条、表里还剩别的账号时，登录页不会重新进入初始化。
- **`users.json` 损坏 ≠ 没有账号（fail-closed）**。以前"文件读不出"会被当成"站点从未初始化"，于是任何人都能重开站长注册——那是安全洞，而且全程没有日志。现在的行为：文件**不存在** = 合法的首次运行，正常引导建站长；文件**存在但 JSON 写坏 / 不是数组** = 拒绝按未初始化处理（`/api/bootstrap` 的 `needsSetup` 为 `false`、建号请求返回 `503 storage unavailable`），并在 stdout 打 `[api] users.json 损坏…`。对人工编辑的直接影响：上一条"删掉某个账号"之后**必须确认文件仍是合法 JSON**（`python3 -c "import json;json.load(open('data/users.json'))"`）；真要重置一台机器，把 `users.json` **移出目录**即可（"不存在"才是合法的未初始化状态），不要留一个坏文件在里面——那会把你自己锁在门外。

---

## 3. 适配方法（外观与设备）

### 3.1 改外观（颜色 / 字体 / 字号 / 间距 / 栏宽 / 圆角）

只有一个文件 `src/styles/site.css`（由 `src/main.js` 一处导入）：基线令牌在前、皮肤规则在后，两套主题块靠 `html:root` 的 (0,1,1) 特异性覆盖基线 `:root`。

- **基线 `:root`**：`--ink-0/1/2` 灰阶、`--text-0/1` 文字、`--line` 发丝线、`--font-*` 字体栈、`--measure` 阅读栏宽，以及**四组刻度**——
  - `--space-0…5` 间距（4 / 8 / 16 / 32 / 64 / 96px）
  - `--fs-3xs…4xl` 字号（11.5 → 34px，共 11 档）
  - `--lh-tight/snug/normal/relaxed` 行高（1.35 / 1.6 / 1.75 / 1.9）
  - `--fw-normal/medium/bold` 字重（400 / 600 / 700）
  - **指针反馈四枚**：`--dur-fast`（0.22s，颜色 / 描边）、`--dur`（0.3s，位移 / 缩放）、`--nudge`（4px，行内右移）、`--lift`（-2px，控件抬起）——见 design.md §4.6。入场动画与开合转场不归这四枚管。
- **两套主题块**：真正生效的配色——`--cold`（交互 / 蓝移）、`--hot`（深度 / 红移）、`--white`（星核高光）、`--shadow`（抬升阴影）、`--panel-frost-bg`（阅读底板在无 `backdrop-filter` 时的兜底）、`--polar` / `--tape`（映像柜）、`--void-a`（画布覆盖色，**是字面量，改底色要两处一起动**）。另有 `--r-sm/--r-md/--r-lg/--r-pill` 圆角、`--font-display` 标题字体、`--page-top` 次级页顶部留白、**卡片令牌** `--card-bg/--card-bg-hover/--card-brd/--card-brd-hover/--card-pad/--card-pad-lg`，以及**卡面 resting 的色面** `--card-solid`（深色 `var(--ink-1)` / 浅色 `#ffffff`）——`--card-bg` 默认就取它，`site.css` §3 之后那条 `html[data-card-surface='glass']` 门控块把填充绕回 52%/62% 的半透那一档；档位由设置卡经 `src/lib/surface.js` 拨，**默认是不透底**。`--card-bg` 的消费方不止卡片：`.en-chip`、`.en-field` 与 §6c 的阅读底板 `.en-glass` 都取它，所以那一档开关一次翻满全站表面。

改完保存即生效。四条约定：

1. **冷暖严格分工**：`--cold` 只用于 hover / 链接 / 焦点 / 选中项，`--hot` 只用于进度 / 主动作 / 当前项 / 破坏性动作；不要给不同按钮各配一种颜色。
2. **改刻度，不要逐处替换**。觉得全站字太小，改 `--fs-sm` 一处；觉得太挤，改 `--space-*`。卡片质感改 `--card-*` 一组，文章卡 / 图片格 / 后台面板同时跟随。
3. **不要写裸 `px`**。新样式里的字号、间距、行高、字重都从刻度取；只有控件高度、封面边长、图标盒这类"结构性尺寸"才写字面量。
4. **新增颜色令牌必须两套主题各定义一份**——漏一份会让使用处那条 `var(...)` 声明整条静默失效（不报错、不红，只是没颜色）。历史上 `--scrim` 漏定义过一次，浅色首页的文字底衬当场消失。

改完跑 `npm run check:contrast`：它从两套主题块重算 WCAG 对比度，文本令牌不达标就退出码非 0。**它核的是令牌对纯色底**，不等于核照片合成底（后者见 design.md §3.3）。

### 3.1.1 组件库：新页面该用哪些类

全站只有一套组件，都在 `src/styles/site.css`：**按钮**（`en-btn` + `en-btn-sm` 尺寸 × `primary`/`ghost`/`danger`/`quiet` 语义；`quiet` 那一档的字面是等宽仪器字面，不是 sans，见 design.md §4.3）、**筛选与页签**（`en-chip`）、**标签**（`en-tag` / `en-tag-quiet`）、**输入**（`en-field`，多行用 `textarea.en-field`；`en-chip` 与 `en-field` 的底和边都取 `--card-bg` / `--card-brd`，即与卡片同一块色面，设置卡「卡片颜色」两档一起翻）、**状态提示**（`en-note-ok` / `en-note-err` / `en-note-info`）、**卡片**（`en-card` 一张卡面 + `en-cards` 两列栅格，音乐 / 项目 / 关于 / 首页精选 / 文章列表都用它；动态满宽、一条一枚卡，不吃 `en-cards`；带封面的再加 `en-flush`（图贴边）与一格 `en-shot`（3:2 封面，没图时加 `blank` 给斜纹空版））、**阅读底板**（`en-glass`——文章页与项目详情页共用同一块；填充取 `--card-bg`，即与卡片、胶囊、输入框同一块色面，设置卡「卡片颜色」两档一起翻）、**图标**（`en-ico` 单字符符号：`▶ ❚ « » ✦ ✧ ≡ ✕ → ↗ ↑`；方向图标另有 `en-ico-up`，被指到时朝自己那侧让一枚 `--nudge`；**例外**只有描边 SVG `.en-svg`——顶栏右上角那四枚（搜索 / 主题 / 音乐 / 设置，主题那枚两副字形按当前档取一副）与播放器卡片里那枚星轨符号）。

- **不要**为某个页面另造按钮、输入框、卡片或提示类。早期 `/login` `/admin` 各自写过一套，现已全部并入上面这些类。
- 唯一一处**故意不用** `.en-card` 的是 `/gallery` 那面拍立得墙（`.wall` / `.shot` / `.frame` / `.tape` / `.cap`，全在 `GalleryView.vue` 的 scoped 里）：一张照片被胶带钉在桌面上的相纸感，与"这是一组卡片"不是同一件事。它的颜色仍走令牌（`--polar` 白框 / `--tape` 胶带 / `--shadow` 框影），页面里没有写死的色值，别把它当"另造了一套卡面"合并回去。
- 功能页（`/login` `/admin`）用 `site.css` 的 `.page` / `.readout` / `.field` 打底，交互元素同样用上面的 `.en-*`。
- 基元的特异度规则、以及"为什么有些类刻意不带 `html:root` 前缀"见 design.md §6.4——**加错前缀会让页面里的覆盖静默失效**。

### 3.2 设备适配（响应式）

断点都是 `max-width`，实际约定如下（改版式前先对照，别新造一套）：

| 断点 | 变化 |
| --- | --- |
| `1240px` | 顶栏收起昵称（昵称宽度不可控，最先收） |
| `1280px` | 顶栏收起整条导航（登录后还有管理 / 登出），改由汉堡抽屉承载。**加一枚导航就要往上抬约 72px**：单枚实测 67.6px + 4px 间距，同时改 `SiteHeader.vue` 的 CSS 与 `onResize` 两处 |
| `900px` | 音乐页两张曲目表（在线听歌 / QQ 曲目）2 列 → 1 列；关于页三枚读数 3 列 → 1 列；首页精选 3 列 → 1 列；文章列表 `.cards` 3 列 → 2 列；映像墙 3 列 → 2 列 |
| `880px` | 共用卡片栅格 `.en-cards` 2 列 → 1 列（项目 / 关于） |
| `720px` | 手机版：页边距收窄、输入框字号 ≥16px（防 iOS 聚焦放大）、文章列表 `.cards` 与映像墙收到单列、动态行内日期另起一行（正文仍缩进到日期之下）（灯箱翻页箭头隐去，改横滑） |
| `480px` | 顶栏隐藏品牌文字，只留那枚圆环图标 |

另外两类与宽度无关的媒体查询：

- `@media (pointer: coarse)`：触控设备上把按钮 / 胶囊撑到 44px 高，只影响手指，不动鼠标观感。
- `@media (prefers-reduced-motion: reduce)`：见 §3.3。

给新组件加手机适配：

```css
@media (max-width: 720px) {
  .你的类名 { /* 手机下的样式 */ }
}
```

自测：浏览器 `F12` → 设备工具栏（`Ctrl+Shift+M`）→ 选 iPhone / Pixel 等机型预览。

### 3.3 双主题（深色 / 浅色）与"减弱动态效果"

- 头部主题开关切换，选择自动记住。深色 = 近纯黑夜空，浅色 = 冷灰白档案风，**默认浅色**。**首帧不读系统 `prefers-color-scheme`**——`index.html` 只认「存储值 → 否则浅色」，因为首屏是一张亮底照片，跟着系统翻到深色会变成亮图压在黑底上。
- 主题默认值只在 `index.html` 的首帧内联脚本里决定一次（避免首屏闪一下），`src/lib/theme.js` 只读取结果——**不要在别处再写一遍默认逻辑**。它唯一的例外：`data-theme` 压根没写上时补成浅色（只补属性、不写 `localStorage`，否则兜底值会被当成访客的选择永久固化）。这两条由 `tests/theme-default.test.mjs` 钉着，含负向对照。
- 改浅色配色：`site.css` 的 `html:root[data-theme='out']` 变量块；改深色配色：`html:root:not([data-theme='out'])` 变量块（它同时是 `data-theme` 缺失时的兜底，所以选择器不是 `[data-theme='well']`）。**两套都要改**（§3.1 第 4 条）。
- 访客系统开启"减弱视觉效果"时，全站动画自动关停、`fall` 转场与晕影取消，星轨装置降级为一次性快进的静态底片，底片轮播停成单张，无需手动处理。

### 3.4 性能与无障碍约定（改代码时请遵守）

- **动画只动 `opacity` / `transform`**。不要**新增**整页或大面积的 `filter: blur()`——那会每帧重新栅格化整棵子树。两处既有例外：`fall` 转场（换页时的下坠模糊，刻意保留的手感），以及底片的 `--plate-blur`（运行时可调参数，见 design.md §8「首页折线以下」条）。后者的边界条件：**初值 12px = 拉满**，所以默认就会建这层渲染面，只有滑杆拖回 0 时 filter 整条消失；图层向四周多撑 3 倍模糊半径，免得边缘淡进透明露出白边。新组件仍请勿照抄大面积 blur。
- **不要给常驻悬在画布之上的元素加 `backdrop-filter`**——星轨每动一帧它就要重算背后模糊。实际消费方清单（都落在"瞬时模态"或"长时间阅读面"两类里）：首页抽屉 `.sheet`、文章页与项目详情页的 `.en-glass`（**只在设置卡「卡片颜色 = 半透明」那一档建**：不透底时板后已被卡面挡死，留着模糊只剩开销）、`/gallery` 灯箱糊底与那条胶带、顶栏抽屉。**常驻顶栏刻意不用** `backdrop-filter`，用高不透明实底。
- **`resize` 一律经 `src/lib/debounce.js` 去抖（150ms）**，因为大多数处理要重建画布或重新测量布局。
- **不要各自写滚动监听**。滚动深度统一由 `App.vue` 写入 `--shift`（0..1），CSS 里 `var(--shift, 0)`，JS 里读 `src/lib/shift.js` 的 `shift.v`；`scrollHeight` 会强制同步布局，绝不能每帧读。
- **星轨那几条数值约束**（改常量前必读 design.md §3.1 与 §9）：① 往累积缓冲沉积的那笔 alpha 必须乘帧时长比例（`accPass(…, dep, step)`）——漏乘会让高刷屏整体变亮变密，而 60Hz 开发机上看不见；② `DEP` 与 `FADE_*` 是一对，只能同倍率一起动，且 `fd` 不许低于 ~0.1——底片是 RGBA8，`α·fd < 0.5 LSB` 的那一档永远掉不下去；③ 改线宽必须同倍率反向改 `DEP`（单位弧长的墨 = α·lw）；④ 天空的口味常量按主题分档，不许两主题共用一个数，新增这类常量时两档都要各测各的、报结论也报两遍。
- **焦点与播报**：新增模态 / 浮层请用 `src/lib/focus.js` 的 `trapFocus()` 锁住 Tab 并在关闭时归还焦点；`#main` 带 `tabindex="-1"` 供「跳到内容」使用；路由切换由 `App.vue` 的 `aria-live` 区域播报 `route.meta.t`——**新页面记得在 `src/router/index.js` 写上 `meta.t`**。
- **详情页的返回不要自己写**：`/blog/:slug` 与 `/projects/:slug` 共用 `src/lib/exit.js` 的 `useDetailExit(列表路径, canExit)`（Esc 与点空白）。再抄一份 Esc 监听就是站内第二套返回机制，`tests/detail-exit.test.mjs` 会红。
- **触控目标 ≥44px**：直接复用 `.en-btn` / `.en-chip` 就自动满足；只有自己写控件时才需补 `min-height: 44px`。
- **最小字号 11.5px**（`--fs-3xs`），不要再往下调。
- **复用现有组件，不要新造**：按钮、输入框、卡片、提示一律取 §3.1.1 的那套类。基元不够用时先扩 `site.css` 里的基元本身，再让所有页面一起切换——不要在建页面时顺手写一份"只有这个页面用"的样式。
- **状态提示用 `.en-note-ok` / `.en-note-err` / `.en-note-info`**，统一以 `//` 打头；不要新增 `.err` / `.warn` / `.notice` 之类的一次性类，也不要给"失败"用冷色、"成功"用热色。
- **界面只说人话**：按钮、眉标、提示、空态一律直陈其物，隐喻只留在 `manifesto` 与 `aboutBio` 两处。文案全在 `narrative.js`——**删字段是静默失败**：视图不会报错，只会渲染成空文本。

### 3.5 键盘与指针动作清单

站内所有"点开 / 收起"的既有动作，新页面照这套走，不要另发明：

| 位置 | 动作 | 结果 |
| --- | --- | --- |
| 详情页（文章 / 项目） | `Esc` | 退回列表（站内没有历史时也是回列表，不会把人送出站） |
| 详情页 | 点正文底板以外的空白 | 同上（按下与抬起都要落在空白才算，拖选文字不算） |
| 文章页 / 映像墙灯箱 | `Esc` | 只关框，不退页 |
| 映像墙灯箱 | `←` / `→`、触屏横滑 >50px | 上一张 / 下一张 |
| 任意模态（顶栏抽屉 / 两处灯箱 / 播放器卡 / 设置卡 / 搜索卡） | `Tab` | 锁在框内，关闭后焦点回到触发它的那一枚 |
| 播放器卡 / 设置卡 / 搜索卡 | 点卡外或 `Esc` | 收起，焦点回顶栏按钮 |
| 搜索卡 | 输入词 | 即时筛（标题 / 摘要 / 标签，与 `/blog` 那一格同一条判据）；`Enter` 带着词进 `/blog?q=`，点结果行进文章，换页即收卡 |
| 设置卡「卡片颜色」 | 方向键 | 在同组两档之间移动即选中（原生 `radio` 组，不用先 `Tab` 到另一枚再按空格） |
| `/records` 曲目表 | 点一行 | 播放 / 暂停该曲 |
| 任意页面 | 第一次 `Tab` | 先落「跳到内容」，再进 `#main` |

---

## 4. 上传方法（部署上线）

主推荐：**自有服务器 + 域名（方式 C，§4.3）**——登录 / 发文 / 全网计数依赖后端，只有自有服务器能跑完整版。方式 A/B（Vercel / GitHub Pages）定位为**只读镜像**：能看文章，登录 / 发文自动禁用，用作备份出口。**当前测试期先用方式 B（GitHub Pages）**，域名备案就绪后切方式 C。

### 4.0 上传前自检

```powershell
npm run build       # 生成 dist/ 目录（含 rss.xml / sitemap.xml），无报错即合格
npm test            # 零依赖防护网：node --test + python unittest
npm run check:api   # docs/api.md 的端点表 vs server/api.py 的路由，双向对拍
npm run check:docs  # 文档里的文件引用与 § 节号是否还指得到东西 + README 路由表 vs src/router 是否一致
npm run check:naming    # 命名规约扫描（文件名 / 类前缀 / 存储键字面量）
npm run check:contrast  # 双主题的文字与强调色对比度审计，任一项不达标即退出码非 0
npm run preview     # 本地模拟线上环境，浏览器打开检查一遍
```

四条 `check` 查的是**代码与文档有没有开始说谎**（漂移即退出码非 0），已串进 `npm run check`。其中两条要 `python`：脚本里写的是 `python`，只有 `python3` 的机器上直接跑 `python3 scripts/check_api_doc.py` 等对应脚本；`check:contrast` 与 `check:naming` 另有 `--self` 负向对照模式（验证规则本身抓得住违规）。

**三个门禁核不到的一件事**：文档在讲一个已经删掉的功能。删功能时要自己把 `docs/` 与代码注释里的 `§` 引用一起清掉——`check:docs` 只扫五份文档，`src/`、`scripts/`、`tests/` 里的引用不在扫描范围内。

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

项目已内置 Pages 自动部署：推送 `main` 后由 GitHub Actions 自动构建发布（`.github/workflows/deploy.yml`），**无需改任何配置**——`build:pages` 只切换路由历史模式（hash，见 `src/router/index.js` 读 `VITE_DEPLOY`），`base` 与生产同为 `/`。

镜像已绑自有域名 **`https://escaping.top/`**（裸域名给 Pages，`www` 留给 §4.3 的自建服务器）。绑域名后 `https://escap1ng.github.io/Escaping-Notes` 会 301 到域名根路径，**带仓库名前缀的那份不再单独服务**——这就是 `base` 不能写 `/Escaping-Notes/` 的原因。

1. 仓库 Settings → Pages → **Source** 选 **GitHub Actions**（仅首次）。
2. DNS 记录（仅首次，华为云）：控制台 → **云解析服务 → 公网权威解析** → `escaping.top` → 添加记录集：主机记录 `@`、类型 A、TTL 300、记录值四行一次填完。

   ```
   185.199.108.153
   185.199.109.153
   185.199.110.153
   185.199.111.153
   ```

   四条都要：GitHub 按这四个 IP 轮转发证书，少一条会概率性拿到无证书节点。裸域名不能用 CNAME。
   入口只认**云解析服务**；"域名注册"里那一排 tab（含"自定义 DNS Host"）是登记 NS 服务器与过户用的，没有解析记录。
3. 验证解析生效。用境内可达的解析器，`dns.google` 在境内不通，别拿它下结论：

   ```bash
   nslookup escaping.top 223.5.5.5
   curl -s -H 'accept: application/dns-json' "https://doh.pub/dns-query?name=escaping.top&type=A"
   ```

   第一条证明 AliDNS 缓存里已是这 4 个 IP；第二条 `Answer` 数组证明对外公共解析已生效（`TTL` 从 300 往下倒数正常）。PowerShell 里 `curl` 是 `Invoke-WebRequest` 的别名，要用 Git Bash 或改写 `curl.exe`。
4. 把域名登记到 Pages（**必须等第 3 步通了再做**，否则 GitHub 签不出证书）：Settings → Pages → Custom domain 填 `escaping.top` → Save → 勾 **Enforce HTTPS**。命令行等价：

   ```bash
   gh api -X PATCH repos/Escap1ng/Escaping-Notes/pages -f custom_domain=escaping.top -F enforce_https=true
   gh api repos/Escap1ng/Escaping-Notes/pages --jq '{cname:.cname,https:.https_enforced}'
   ```

   第二条是证明：返回 `escaping.top` 与 `true` 即绑定完成。

   两个实测过的坑，别再试第二遍：

   - **仓库里放 `public/CNAME` 不生效**。`build_type: workflow` 下 Pages 只认设置里的域名；CNAME 会被原样拷进 `dist`、部署也成功，但 `cname` 仍是 `null`。
   - **上面那条 `gh api` 需要 fine-grained token 的 Pages: Read and write 权限**。`gh auth login` 默认拿到的凭据没有，表现很迷惑：`PATCH /pages` 一律回 404，连只改 `enforce_https` 的 no-op 也 404，而同一时刻 GET 该端点和 `git push` 都正常。用浏览器点 UI 最快。

   绑完页面会出黄条 `www.escaping.top is improperly configured (InvalidDNSError)`：GitHub 自动把 `www` 当成裸域名的别名去查记录，而 `www` 是故意留给 §4.3 自建服务器的。**这条警告不用管**，判据是输入框下面那行 `DNS valid for primary`。
5. 推送代码：`git push`。
6. 等 Actions 跑完（约 1 分钟），访问 `https://escaping.top/`，F12 → Network 里 `index.html` 引的应是 `/assets/…`（不带 `/Escaping-Notes/`）。

   证明证书已为该域名签好（而不是 `*.github.io` 兜底）：

   ```bash
   curl -s -o /dev/null -w "HTTP %{http_code} ssl_verify=%{ssl_verify_result}\n" https://escaping.top/
   echo | openssl s_client -connect 185.199.110.153:443 -servername escaping.top 2>/dev/null | openssl x509 -noout -subject -issuer
   ```

   期望 `HTTP 200 ssl_verify=0` 与 `subject=CN=escaping.top`。
   旧地址 `escap1ng.github.io/Escaping-Notes`（不带尾斜杠）会 301 到新域名；带尾斜杠的那份可能仍直接返回产物、资源 404——GitHub 的重定向表要等 Fastly 缓存过期，不用管，站内所有 canonical/OG/RSS 都已指向 `escaping.top`。

Pages 版是只读测试镜像：文章用打包版，登录 / 发文不可用（无后端）。自建服务器（§4.3）上线后落在 `www.escaping.top`，Pages 保留作备份出口；两者内容不同源，届时 canonical/OG 指向哪一处要按 §2.6 一起改。

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
       server_name www.escaping.top;
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

   > 项目详情页 `/projects/:slug` **不在**上面的代理列表里：它的内容来自前端（种子 + `/api/content`），没有服务端 meta 注入。要给它也做注入，就照 `/blog/` 加一条 `location /projects/`，并同步 `server/api.py` 的注入分支。
4. 裸 nginx 执行 `nginx -t ; nginx -s reload` 校验并重载；宝塔保存配置即生效。
5. 验证：浏览器打开 `http://服务器IP`，刷新 `/blog` 等子页面不 404 即成功。
6. 域名绑定与备案：
   - 在域名商后台为 `www` 添加 A 记录指向服务器 IP。**裸域名 `@` 已绑给 Pages 镜像**（§4.2 第 2 步），要用它做生产得先把 Pages 迁到子域名。
   - **大陆服务器：域名必须完成 ICP 备案**（走服务器厂商的备案系统），否则 80/443 端口会被拦截；不想备案就选香港 / 海外服务器。
   - 把配置里的 `server_name` 改成你的域名；宝塔保存即生效。
7. HTTPS（涉及登录后必启）：certbot 或宝塔 SSL 一键申请；启用后把 `src/config/site.js` 的 `url` 字段改成你的 https 域名（RSS/OG/canonical 用），重新构建上传。
8. 部署极简后端（登录 / 发文必需；零依赖、仅 Python3 标准库，服务器一般预装，无需 pip/npm），内存约 20MB：

   ```powershell
   scp server/api.py 用户名@服务器IP:/opt/escaping-notes/api.py
   ```

   在服务器创建自启服务 `/etc/systemd/system/escaping-notes-api.service`：

   `SITE_DIST` **必须设**：`api.py` 原先把 dist 写死成"自己上一级的 `dist/`"，而本手册的布局是 `api.py` 在 `/opt/escaping-notes`、静态产物在 `/var/www/escaping-notes` —— 指错时服务端 meta 注入与 `/rss.xml` 会直接 404。`SITE_DATA` 的默认值虽也是 `/opt/escaping-notes/data`，仍建议显式写出：路径一旦被移动，`api.py` 会读到一个空目录（表现为"站点未初始化"，见 §2.7 的 fail-closed 说明）。

   ```ini
   [Unit]
   Description=Escaping Notes API
   After=network.target

   [Service]
   Environment=SITE_URL=https://escaping.top
   Environment=SITE_DIST=/var/www/escaping-notes
   Environment=SITE_DATA=/opt/escaping-notes/data
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

   数据存于服务器 `/opt/escaping-notes/data/` 的 JSON 文件，备份 = 复制文件。
   前端已全线接线；API 不可达（含 10 秒超时）时站点自动降级为本地模式，不报错。

注意：

- 服务器**不需要安装 Node**——静态托管与 Node 无关。
- 不部署后端时站点仍可只读浏览（文章用打包版），但登录 / 发文不可用；文章页的阅读数**没有来源就显示 `--`**——不再有"本机自增的本地读数"那回事（那笔数每次进页自增、只有本机看得见，摆在 `VIEWS` 后面就是冒充全站读数）。
- **涉及登录后务必启用 HTTPS**（§4.3 第 7 步），避免密码明文传输。
- 备份 = 复制服务器 `data/` 目录（文章 / 用户 / 计数全在里面），建议定期拷走。

### 4.4 以后更新内容的流程

改文章 / 配置 → 本地 `npm run dev` 检查 → `git add . ; git commit -m "说明" ; git push` → 线上自动更新（Vercel / Pages）。
自有服务器用户：重新 `npm run build` 后重复第 2 步上传即可（可后续做成一条脚本命令）。
只在 `/admin` 里改内容不需要构建与部署——那是"记得备份 `data/`"的问题，不是发布的问题。

---

## 5. 常见问题

| 症状 | 原因与处理 |
| --- | --- |
| 双击 `index.html` 打开是空白 | 必须通过 `npm run dev` 或 `npm run preview` 访问，不能直接双击文件 |
| 改了配置页面报错 | 99% 是少了逗号 / 引号。看终端报错行号，对照 §2.1 修复 |
| `npm install` 很慢 | 可换国内镜像：`npm install --registry=https://registry.npmmirror.com` |
| GitHub Pages 刷新 404 | Pages 版自动用 hash 路由；若手动构建，确认用的是 `npm run build:pages` |
| 端口 5173 被占用 | Vite 会自动换 5174…，以终端显示为准 |
| 文章列表一直显示灰色骨架卡 | 后端没启动或响应很慢。接口 10 秒超时后会自动降级到打包的文章种子，稍等即可 |
| 文章页阅读数显示 `--` | 正常降级：读数只有服务端那一份，后端不可达时不拿本机数字冒充全站读数（§4.3 注意段） |
| 项目详情页显示"这里没有这个项目的介绍" | 后台改了项目名，或 URL 拼错。名字与 `src/config/projects.js` 里的 `name` 对不上时，介绍与 URL 会一起断（§2.4） |
| 后台保存过项目，介绍还在吗 | 在——`src/lib/content.js` 按 `name` 回贴。若真不见了，先查那个 `name` 是否被改过，再跑 `npm test` |
| 分享链接没有卡片图 | 确认 `public/og.png` 存在，且 `index.html` 里的域名是你的真实域名（换域名见 §2.6） |
| 提交前该跑什么 | `npm test` + `npm run check`，两条都绿再提交（§4.0） |

---

## 6. 版本与里程碑

本站已发布 **v1.0.0**（2026-09），其后 **v1.1.0**（阅读体验）、**v1.2.0**（运行时性能 / 无障碍 / SEO）、**v1.3.0**（统一设计系统）、**v1.3.1**（连续曝光落地、取数与存储收口）。**这一节是写 GitHub Release 正文的取材处**，按版本记"当时交付了什么"；此后已下线的能力单列在末尾，不要当现状读。

- **v1.3.1 · 连续曝光落地、取数与存储收口**
  - 连续曝光——底片跨路由常驻，`src/lib/sky.js` 以单例接管画布（`ensurePlate` / `claimPlate` / `ownsPlate` / `releasePlate`），切页不再重置星轨；滚动深度经 `src/lib/shift.js` 的 `shift.v` 交给样式消费。
  - 可读性暗带契约——文字底下的天空由 `StarTrails.vue` 一处 `--_sky-mask` 统一压低，不再外包给卡片背景；几何收为 `--sky-band` / `--sky-feather`，压低系数按主题给 `--sky-k`；卡片同步重定标（`--card-bg` 44%→52%、hover 72%→62%）。
  - 存储层 fail-closed——`server/api.py` 新增 `CorruptJSON` 与 `MISSING` 哨兵，「读不出」不再被当成「未初始化」；数据损坏时建号返回 503 且**不写文件**。`save()` 改唯一临时名 + `fsync` + `replace`，整段进锁。部署路径改读 `SITE_DATA` / `SITE_DIST`。
  - 取数层收口——`src/lib/api.js` 的 `tryApi()` 返回 `{ok,status,data,code,reason}`，失败原因不再塌成 `null`（网络不通为 `offline` 且 `status:0`；`reason` 查 `narrative.js` 的 `errors` 表）；上传走同一契约（`uploadFile()`，60s 超时）。
  - 防护网——`tests/` 零依赖（`node --test` + `unittest`），装上时即抓到两个真实缺陷：frontmatter 正则不认 CRLF（Windows 检出的稿子解析不出元数据）、markdown 放行 `javascript:` 链接（现由 `safeHref()` 只放行白名单协议）。
  - 门禁——新增 `docs/api.md` 接口契约与 `check_api_doc.py`（端点表 ⇄ 路由双向对拍）、`check_doc_refs.py`（死引用 / 节号 / 路由表）、`check_naming.py`（命名规约）。
  - 部署——GitHub Pages 镜像绑裸域名 `escaping.top`，`vite.config.js` 的 `base` 固定为 `/`（两种构建只差路由模式），`www` 留给自建服务器（§4.2）。
  - 内容渲染——`src/lib/markdown.js` 支持 GFM 管道表，标题层级收到 h2–h6（h1 让给文章标题）。
- **v1.3.0 · 统一设计系统（界面一致性）**
  - 建立刻度——间距 `--space-0…5`、字号 `--fs-3xs…4xl`（11 档）、行高 `--lh-*`（4 档）、字重 `--fw-*`（3 档）、卡片 `--card-*` 一组、次级页顶栏避让 `--page-top`；组件内不再写裸字号 / 裸间距。
  - 收敛组件——按钮从 6 套并为「2 尺寸 × 4 语义」；输入框从 2 套并为「单行下划线 / 多行发丝框」；卡片 3 套规格并为 `--card-*`；状态提示 5 种各自实现并为 `.en-note-ok/err/info` 三态；图标统一为 `.en-ico` 单字符符号。
  - 功能页并入——`/login` `/admin` 的私有类（`.submit` / `.act` / `.tab` / `.err` / `.notice` / `.warn`）全部删除，改用同一套 `en-*` 基元；后台页签选中态由热色改冷色。
- **v1.2.0 · 运行时性能 / 无障碍 / SEO**
  - 性能——次级页活背景限帧 30fps（长曝光按真实时长累积，流速不变）；四处 `resize` 统一去抖 150ms；`--shift` 缓存 `scrollHeight`，不再每帧强制布局；吸顶栏与播放器改用高不透明实底、去掉常驻 `backdrop-filter`；指针透镜光斑改 `transform` 位移。
  - 无障碍——焦点陷阱 + 关闭时归还焦点；路由切换向读屏播报；`#main` 可聚焦供「跳到内容」；触控目标 ≥44px；最小字号下限 11.5px。
  - 反馈——文章列表骨架屏；"本来没有内容"与"筛选无结果"分文案；搜索 / 标签筛选写进 URL（可分享、刷新不丢）。
  - SEO——`og:*` / `canonical` / `twitter:*` 补全；构建期生成 `rss.xml` 与 `sitemap.xml`；新增 `robots.txt`。
- **v1.1.0 · 阅读体验优化**：文章页磨砂玻璃阅读底板（半透明页面色 + 背景模糊，对比达 WCAG AA）；星轨尾部渐隐防饱和、拉长尾迹、随机起点使圆环连续、弧端错落；阅读栏加宽并提高底板透明度、加大底板宽度。
- **v1.0.0 · 概念与交互冻结**：长曝光星轨（流星 / 指针时间膨胀 / 滚动即时间）、顶栏编号导航、`fall` 转场、双主题、文章闭环、关于页、后端 v2（登录 / 角色 / 文章 CRUD / meta 注入 / RSS / 上传 / 计数 / 歌单同步）。
- **此后已下线**（上面的条目里仍按"当时交付了什么"记着，那是历史，不是现状）：低语与 `/fragments` 碎片（接口保留，§2.4）；自绘沉浸光标（现用系统默认光标）；每页一枚巨型空心汉字的签名装置；首屏变星（文章节点）入口；**自助注册与留言墙**（`/register`、`/wall`、`/api/register`、`/api/messages` 的读写删端点、`data/messages.json` 全部删除，角色由三档收敛为站长 + 管理员两档，见 §2.7）。
