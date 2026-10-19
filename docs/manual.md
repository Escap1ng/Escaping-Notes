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
├── index.html          ← 壳层：首帧内联脚本（主题 + 底片模糊 + 卡面档位，都不闪一下；并按当前主题预加载首屏地景）、SEO/OG 元信息
├── content/posts/      ← 文章：**一篇一个目录**（`<slug>/index.md` + 它的封面与插图），全站文章的唯一来源，构建期整体打包
├── public/
│   ├── plates/ audio/  ← 两个**必须入库**的派生素材目录（重烘命令见 README 的「常用脚本」；文章封面不在这儿，它躺在自己那一卷目录里）
│   └── favicon.svg  robots.txt  og.png
├── scripts/            ← 构建期脚本，按动词分族：build_* / check_*
│   ├── build_font.mjs        ←   展示层子集字体裁切（依赖 devDep subset-font）
│   ├── build_font_didone.mjs ←   刊头 Didone 子集裁切（只留大写与空格；源 TTF 在 fonts-src/，不进仓库）
│   ├── build_seo.mjs         ←   dist/rss.xml、dist/sitemap.xml、public/og.png
│   ├── build_readme_art.mjs  ←   README 配图：按 StarTrails 常数离线复算
│   ├── build_plate_bg.ps1 / build_post_covers.ps1  ←  底图与封面烘培（Windows PowerShell）
│   ├── check_content.mjs     ←   发文门禁与回执（构建会先跑它，红则不出产物）
│   ├── check_doc_refs.py / check_naming.py / check_contrast.mjs  ← 另三道门禁
│   ├── data/  lib/           ←   脚本输入数据（GB2312 一级字表）／共用模块（PNG 编码器、读卷清单、静态壳的 head 改写）
├── docs/               ← design.md 设计依据 · manual.md 本文
│   └── assets/readme/  ← README 配图
├── tests/              ← 零依赖防护网：node --test 的 .mjs 用例，跑 npm test
└── src/
    ├── assets/fonts/   ← 自托管子集 woff2（正文衬线按 unicode-range 分片 + 刊头 Didone，均 700 字重）+ OFL 许可
    ├── components/     ← SiteHeader 顶栏+抽屉 · SiteFooter · HorizonHero 首屏 · StarTrails 星轨 · MusicCard · SettingsCard · SearchCard
    ├── data/           ← 站点自有内容全在这一目录：index.js 是唯一那道门 · narrative.js 文案层 · site.js 站点信息 · 5 份数据（动态/项目/音乐/映像/友链）
    ├── lib/            ← posts feed schema markdown theme storage music gallery plate surface ridge lens shift sky debounce focus exit legacy projects（取数不经这里，走 data/index.js）
    ├── router/         ← 9 条路由，全部懒加载
    ├── styles/site.css ← **唯一的样式表**：基线令牌 + 两套主题 + 全站基元（内部按 §0–§11 分节）
    └── views/          ← 9 个页面各一个文件，平铺
```

三条会反复用到的事实：

- **`src/styles/site.css` 是唯一的样式表**，改外观不碰别的文件。
- **`src/data/*.js` 是站点内容（动态 / 项目 / 装备 / 音乐 / 映像 / 友链）的唯一来源**，改内容改这里；它们进界面只经过 `src/data/index.js` 那一道门，所以**加一类内容 = 放一份文件 + 在门上挂一行**，视图那边不用新开一条路。
- **派生素材要提交**（`public/plates/`、`content/posts/*/cover.jpg`、`public/audio/`），构建机不会重跑烘培脚本。

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

5. 停止开发服务器：在对应终端按 `Ctrl + C`。

---

## 2. 编辑方法

> **站内没有后台，编辑都在仓库里改文件**：文章改 `content/posts/<slug>/index.md`（一卷是一个目录），站点内容（动态 / 项目 / 装备 / 音乐 / 映像 / 友链）改 `src/data/*.js`；改完 `git push`，等 CI 重新构建即上线。
> 本章按内容类型分节：站点信息、文章、动态、内容种子、播放器、SEO、账号（已下线）。
> 低语（井外随机浮现）与 `/fragments` 碎片已随旧版下线，服务端那三个端点也已于 2026-10-16 删除（§2.4）。

### 2.1 改站点信息（名字 / 简介 / 邮箱 / 社交链接）

打开 `src/data/site.js`，改引号里的文字即可。每个字段用在哪：

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

1. 在 `content/posts/` 里新建一个**目录**：名字用英文小写短横线，如 `my-first-post/`，它就是网址 `/blog/my-first-post`。目录里固定有一枚 `index.md`（稿子，文件名不变），其余文件都是这一篇自己的图。
2. `index.md` 开头是 frontmatter（两条 `---` 之间），一行一条 `key: value`：

   ```markdown
   ---
   title: 文章标题
   date: 2026-09-01
   tags: [技术, 随笔]
   summary: 一句话摘要，显示在列表里。
   alt: 封面上能看到什么——一句真的描述
   imagePos: 60% 40%
   ---

   正文从这里开始，标准 Markdown 语法。
   ```

   **封面不写在这里**：这一卷的目录里有 `cover.jpg`，它就是封面——列表页那格、正文顶部那张满栏图、映像柜墙上那枚，三处共用同一个文件，一处也不用提第二遍。没有 `cover.jpg` 是合法状态，列表那一格留一张等高的斜纹空版。`imagePos` 可选，是封面在 3:2 卡格里的裁切焦点（CSS `background-position` 那套写法），缺省居中。`alt` 在有封面时必须写：读屏软件与图挂了的时候只有它。

   **没写完的稿子：`draft: true`**。草稿只在 `npm run dev` 里露面，构建产物里不留任何痕迹——列表、首页那三格精选、动态时间线、映像柜、关于页那三枚读数、RSS、sitemap、静态壳，连它自己那张 `cover.jpg` 都不拷进 `dist/`。判据只有一处（`src/lib/schema.js` 的 `isLive`），所以不会出现"页面上没有、RSS 里却有"这种半发布。写了一半直接 push 也不会被读者先看见；回执那一行会标着【草稿：只在 dev 可见，不进产物】，不会让你以为它发出去了。

   **改过目录名：`movedFrom: [旧slug]`**。一卷的目录名就是它的网址，改名等于换网址；把用过的旧名登记在这里，读者从旧链接进来会由文章页改道到现名，不会看见「这里没有这一篇」。两条限制：Pages 上那条旧网址本身没有对应文件（构建只给现名写壳），所以它是"经 `404.html` 装载应用、再跳到正确一篇"——看得到内容，首个请求的状态码仍是 404；旧名若撞上另一卷的现名、或被两卷同时认领，门禁当场拦下，不会让那条链接随机跳到某一篇。

   `cover.jpg` 是烘出来的，不是原图：把原图丢进同一目录、名字以 `-src.jpg` 收尾（`.png`/`.webp`/`.tif` 都认），跑 `npm run cover:build`——就地烘出 `cover.jpg`（长边 1600px、JPEG 质量 72），`*-src.*` 在 `.gitignore` 里、不进仓库也不上线。烘哪些由目录决定，脚本里没有映射表要改。

3. 常用语法速查：

   | 写法 | 效果 |
   | --- | --- |
   | `## 二级标题` | 标题（`#` 数 1–5 可用：`#` 留给文章标题，所以实际渲染为 h2–h6） |
   | `**加粗**` | **加粗** |
   | `[文字](https://url)` | 链接 |
   | `![描述](dune.jpg)` | 插图（图就放在这一卷的目录里，正文只写文件名；构建期换成 `/blog/<slug>/dune.jpg`） |
   | 三个反引号包裹 | 代码块 |
   | `- 条目` | 列表 |
   | `> 引用` | 引用块 |
   | `---` | 分隔线 |
   | `\| 名 \| 值 \|` + `\|:--\|--:\|` + 数据行 | 表格（首行表头，第二行的分隔行**必须**写，否则整段按普通文字渲染） |

   表格列对齐由分隔行的冒号决定：`:---` 左、`---:` 右、`:---:` 居中。

   **链接与图片的地址只接受**：站内相对路径（`/…`、`./…`）、锚点（`#…`）、`http(s):`、`mailto:`、`tel:`。写成 `javascript:` 之类协议的不会变成链接，只保留可见文字。原因不是排版而是权限：正文会经 `v-html` 渲染给**每一个读者**，一条能点就能执行的地址足以在访客浏览器里执行任意脚本。

4. 提交推送即可上线：`git add . ; git commit -m "说明" ; git push`。`content/posts/` 是文章的唯一来源，构建期整体打包进站点；`scripts/build_seo.mjs` 依同一份解析生成 `dist/sitemap.xml` 与 `dist/rss.xml`（RSS 带全文与标签）。发之前先跑 `npm run build` 或 `npm run check:content`：它会打一份**发文回执**并逐卷校验——日期写歪、键名拼错、正文引用的图不在这卷目录里，都会在这里红掉而不会等到线上才看见（§4.0）。

   发文**不用再手补动态**：已发布文章会按 frontmatter 的 `date` 自动进动态时间线（见 §2.3）。

### 2.3 发一条动态

动态时间线由两部分合成，顺序、去重与条目形状只有一处口径（`src/lib/feed.js` 的 `mergeFeed`）：

- **发文自动进动态**：`content/posts/` 里每一卷已发布文章按 frontmatter 的 `date` 生成一条「新文上线：《标题》」，链向正文。日期就是发文日期，不用另补；草稿不进（与全站同一条 `isLive` 判据）。
- **手写动态**：只记文章之外的事（改版、下线、节日）。打开 `src/data/updates.js`，在数组**最前面**加一行（新的在上）：

  ```js
  { date: '2026-09-01', text: '今天做了什么……' },
  ```

两条来源按日期倒序合并；同一天的文章排在手写条目前（文章是内容，手写条目是注脚）。首页抽屉取前 5 条，`/updates` 列全部。**不要**再手写「某篇上线」——那会和自动条目同一篇出现两条。

### 2.4 项目 / 映像 / 友链 / 碎片

- **项目 `/projects`（04 导航位）**：卡面（`name|desc|year|url`）与详情页的介绍（`detail` 段落 / `points` 要点 / `stack` 技术栈）都写在 `src/data/projects.js` 一处。详情页 URL 由 `name` 现算（`src/lib/projects.js` 的 `projectSlug()`，空格换成连字符、大小写原样），**不另设 slug 字段**——改名等于换 URL，旧链接会落到「这里没有这个项目的介绍」那一态。
- **关于页的头像**：取 `site.avatar`（外链；换图只改 `src/data/site.js` 那一行）。
- **映像 `/gallery`（03 导航位）**：这一墙摊的是**全站用过的图**，不用另外登记——文章封面（各卷目录里的 `cover.jpg`）自动上墙，最新那篇在左上第一格；站点自己的底片（首屏亮 / 暗两张、抽屉五张轮播、深色压暗底、分享卡）记在 `src/data/gallery.js`。**换底片时这份清单必须跟着改**，`npm test` 会拿它和 `site.css` 里真正引用的 `/plates/` 对拍，漏了就把旧图留在墙上示众。同一张图被两篇用过只出现一次。
- **图片**：文章封面躺在自己那一卷的目录里——原图以 `-src.jpg` 收尾丢进 `content/posts/<slug>/`，`npm run cover:build` 就地烘出同目录的 `cover.jpg`（提交进仓库）；正文插图也放同一目录，正文里只写文件名。`public/images/` 这个目录**不存在**，也不需要什么目录：插图跟着卷走。
- **友情链接**：在 `src/data/friends.js` 的数组里追加 `{ label, url }`（关于页的友链卡，宽屏与 SOCIAL 卡同排、窄屏单列时在其下方）。
- **碎片（已下线并删除）**：站内**没有** `/fragments` 这条路由、也没有对应视图（现役 9 条路由里不含它）；服务端原有的 `GET/POST /api/fragments` 与 `DELETE /api/fragments/{ts}` 三个端点在 2026-10-16 摘掉（连同 `fragments.json` 的读写），前端零消费方是它们被删的原因。同批删掉的还有 `/api/health`。

### 2.5 播放器

全站只有一台播放器：`<audio>` 与全部状态收在 `src/lib/music.js`，界面上只有顶栏「音乐」按钮点开的那张卡。

- **顶栏「音乐」按钮 → 播放器卡片**（`src/components/MusicCard.vue`，锚在顶栏下沿、右对齐）：卡头 + 关闭键；上一首 / 播放暂停 / 下一首 / 进度 / 音量 / 曲目队列。**关闭键、点卡外或按 Esc 都能收起，焦点回按钮**；没有曲目时按钮置灰。走带三枚按钮的热区是 44×44（中间播放键 48×48），图标与顶栏同一套描边 SVG；播放键走冷蓝，红色只留作"当前曲"的小记号（唱片符号的芯、当前曲名与三根小柱）。左上那枚绕极旋转的弧是星轨符号占位（本地曲目无封面数据），播放时才转。
- **续播与系统媒体键**：当前曲与位置存在 `localStorage`（`en-track` / `en-track-progress`），刷新后第一次按播放从上次那一首、那个位置续上；主动换曲一律从头。支持的浏览器里，系统媒体面板的播放 / 暂停 / 上一首 / 下一首 / 进度都接回同一台引擎（Media Session）。音频取不到时卡片显示「无法播放 · 检查音频文件」，不会一直停在「载入中」。

曲目清单在 `src/data/music.js`：每项 `{ title, artist, file }`，音频是仓库内的 `public/audio/*.mp3`（构建后落在 `dist/audio/`）。曲目只进顶栏播放器的队列，站内没有独立的音乐页。

### 2.6 改网页标题 / 搜索描述 / 分享卡片

打开根目录 `index.html`：

- `<title>`、`<meta name="description">`：浏览器标签与搜索结果里的标题摘要——**这两行只是站点级的兜底**。构建期会为每一卷文章、每一个项目与每条导航各写一份这份 HTML 的副本，把 `title` / `description` / `canonical` / `og:*` / `twitter:*` 换成那一页自己的值：文章的标题取自 frontmatter 的 `title`，摘要取自 `summary`，**分享卡的图就是这一卷目录里那张 `cover.jpg`**（没有封面才回落到 `og.png`）。所以"分享出去显示什么"这件事在 `content/posts/<slug>/` 里改，不在这里改。
- `<link rel="canonical">`、`og:url`、`og:image`、`twitter:*`：搜索引擎与社交平台分享用的信息。**换域名时两处一起改**：`index.html` 里的四处地址与 `src/data/site.js` 的 `url`——这两处的对拍写在 `tests/content-rolls.test.mjs`，漏改一处就红，不再靠人记。
- 分享卡片图 `public/og.png`（1200×630，站点级那张）由 `npm run og:build` 生成（纯 Node 绘制，不需要额外软件）；想换配色改 `scripts/build_seo.mjs` 里的 `TRAIL` 色板。
- `public/robots.txt` 与 `dist/sitemap.xml`：抓取范围与页面清单，一般不用改。sitemap 里列的路由就是构建期写了壳的那些（导航取自 `src/data/narrative.js` 的 `N.nav`，文章取自 `content/posts/`）。

### 2.7 账号（已于 2026-10-16 下线）

本节原讲后端账号系统：访问 `/login` 初始化站长、`Authorization: Bearer` 会话、`users.json` 的 fail-closed 读写、以及限流与两档权限。这套东西连同承载它的后端已于 2026-10-16 整体撤除——站内现在没有登录、没有账号、没有后台，也没有只登录后才可见的按钮。

---

## 3. 适配方法（外观与设备）

### 3.1 改外观（颜色 / 字体 / 字号 / 间距 / 栏宽 / 圆角）

只有一个文件 `src/styles/site.css`（由 `src/main.js` 一处导入）：基线令牌在前、组件规则在后，两套主题块靠 `html:root` 的 (0,1,1) 特异性覆盖基线 `:root`。（旧版那层 `html[data-skin='neo']` 皮肤网关已于 2026-10-11 退役，别再往里加。）

- **基线 `:root`**：`--ink-0/1/2` 灰阶、`--text-0/1` 文字、`--line` 发丝线、`--font-*` 字体栈、`--measure` 阅读栏宽，以及**四组刻度**——
  - `--space-0…5` 间距（4 / 8 / 16 / 32 / 64 / 96px）
  - `--fs-3xs…4xl` 字号（11.5 → 34px，共 11 档）
  - `--lh-tight/snug/normal/relaxed` 行高（1.35 / 1.6 / 1.75 / 1.9）
  - `--fw-normal/medium/bold` 字重（400 / 600 / 700）
  - **指针反馈四枚**：`--dur-fast`（0.22s，颜色 / 描边）、`--dur`（0.3s，位移 / 缩放）、`--nudge`（4px，行内右移）、`--lift`（-2px，控件抬起）——见 design.md §4.6。入场动画与开合转场不归这四枚管。
- **两套主题块**：真正生效的配色——`--cold`（交互 / 蓝移）、`--hot`（深度 / 红移）、`--white`（星核高光）、`--shadow`（抬升阴影）、`--panel-frost-bg`（阅读底板在无 `backdrop-filter` 时的兜底）、`--polar` / `--tape`（映像柜）、`--void-a`（画布覆盖色，**是字面量，改底色要两处一起动**）。另有 `--r-sm/--r-md/--r-pill` 三档圆角（没有 `--r-lg`，用到"大圆角"的地方取 `--r-pill`）、`--font-display` 标题字体、`--page-top` 次级页顶部留白、**卡片令牌** `--card-bg/--card-bg-hover/--card-brd/--card-brd-hover/--card-pad/--card-pad-lg`，以及**卡面 resting 的色面** `--card-solid`（深色 `var(--ink-1)` / 浅色 `#ffffff`）——`--card-bg` 默认就取它，`site.css` §3 之后那条 `html[data-card-surface='glass']` 门控块把填充绕回 52%/62% 的半透那一档；档位由设置卡经 `src/lib/surface.js` 拨，**默认是不透底**。`--card-bg` 的消费方不止卡片：`.en-chip`、`.en-field` 与 §6c 的阅读底板 `.en-glass` 都取它，所以那一档开关一次翻满全站表面。

改完保存即生效。四条约定：

1. **冷暖严格分工**：`--cold` 只用于 hover / 链接 / 焦点 / 选中项，`--hot` 只用于进度 / 主动作 / 当前项 / 破坏性动作；不要给不同按钮各配一种颜色。
2. **改刻度，不要逐处替换**。觉得全站字太小，改 `--fs-sm` 一处；觉得太挤，改 `--space-*`。卡片质感改 `--card-*` 一组，文章卡 / 图片格同时跟随。
3. **不要写裸 `px`**。新样式里的字号、间距、行高、字重都从刻度取；只有控件高度、封面边长、图标盒这类"结构性尺寸"才写字面量。
4. **新增颜色令牌必须两套主题各定义一份**——漏一份会让使用处那条 `var(...)` 声明整条静默失效（不报错、不红，只是没颜色）。历史上 `--scrim` 漏定义过一次，浅色首页的文字底衬当场消失。

改完跑 `npm run check:contrast`：它从两套主题块重算 WCAG 对比度，文本令牌不达标就退出码非 0。**它核的是令牌对纯色底**，不等于核照片合成底（后者见 design.md §3.3）。

### 3.1.1 组件库：新页面该用哪些类

全站只有一套组件，都在 `src/styles/site.css`：**按钮**（`en-btn` + `en-btn-sm` 尺寸 × `primary`/`ghost`/`danger`/`quiet` 语义；`quiet` 那一档的字面是等宽仪器字面，不是 sans，见 design.md §4.3）、**筛选与页签**（`en-chip`）、**标签**（`en-tag` / `en-tag-quiet`）、**输入**（`en-field`，多行用 `textarea.en-field`；`en-chip` 与 `en-field` 的底和边都取 `--card-bg` / `--card-brd`，即与卡片同一块色面，设置卡「卡片颜色」两档一起翻）、**状态提示**（`en-note-ok` / `en-note-err` / `en-note-info`）、**卡片**（`en-card` 一张卡面 + `en-cards` 两列栅格，音乐 / 项目 / 关于 / 首页精选 / 文章列表都用它；动态满宽、一条一枚卡，不吃 `en-cards`；带封面的再加 `en-flush`（图贴边）与一格 `en-shot`（3:2 封面，没图时加 `blank` 给斜纹空版））、**阅读底板**（`en-glass`——文章页与项目详情页共用同一块；填充取 `--card-bg`，即与卡片、胶囊、输入框同一块色面，设置卡「卡片颜色」两档一起翻）、**图标**（`en-ico` 单字符符号：`▶ ❚ « » ✦ ✧ ≡ ✕ → ↗ ↑`；方向图标另有 `en-ico-up`，被指到时朝自己那侧让一枚 `--nudge`；**例外**只有描边 SVG `.en-svg`——顶栏右上角那四枚（搜索 / 主题 / 音乐 / 设置，主题那枚两副字形按当前档取一副）与播放器卡片里那枚星轨符号）。

- **不要**为某个页面另造按钮、输入框、卡片或提示类。早期 `/login` `/admin` 各自写过一套，现已全部并入上面这些类。
- 唯一一处**故意不用** `.en-card` 的是 `/gallery` 那面拍立得墙（`.wall` / `.shot` / `.frame` / `.tape` / `.cap`，全在 `GalleryView.vue` 的 scoped 里）：一张照片被胶带钉在桌面上的相纸感，与"这是一组卡片"不是同一件事。它的颜色仍走令牌（`--polar` 白框 / `--tape` 胶带 / `--shadow` 框影），页面里没有写死的色值，别把它当"另造了一套卡面"合并回去。
- 基元的特异度规则、以及"为什么有些类刻意不带 `html:root` 前缀"见 design.md §6.4——**加错前缀会让页面里的覆盖静默失效**。

### 3.2 设备适配（响应式）

断点都是 `max-width`，实际约定如下（改版式前先对照，别新造一套）：

| 断点 | 变化 |
| --- | --- |
| `1240px` | 顶栏收起昵称（昵称宽度不可控，最先收） |
| `1280px` | 顶栏收起整条导航，改由汉堡抽屉承载。**加一枚导航就要往上抬约 72px**：单枚实测 67.6px + 4px 间距，同时改 `SiteHeader.vue` 的 CSS 与 `onResize` 两处 |
| `900px` | 关于页三枚读数 3 列 → 1 列；首页精选 3 列 → 1 列；文章列表 `.cards` 3 列 → 2 列；映像墙 3 列 → 2 列 |
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
| 播放器卡 / 设置卡 / 搜索卡 | 卡头关闭键、点卡外或 `Esc` | 收起，焦点回顶栏按钮 |
| 播放器卡 | 系统媒体键（支持的浏览器） | 播放 / 暂停、上一首 / 下一首、进度；与卡内按钮共用 `lib/music.js` |
| 搜索卡 | 输入词 | 即时筛（标题 / 摘要 / 标签，与 `/blog` 那一格同一条判据）；`Enter` 带着词进 `/blog?q=`，点结果行进文章，换页即收卡 |
| 设置卡「卡片颜色」 | 方向键 | 在同组两档之间移动即选中（原生 `radio` 组，不用先 `Tab` 到另一枚再按空格） |
| 任意页面 | 第一次 `Tab` | 先落「跳到内容」，再进 `#main` |

---

## 4. 上传方法（部署上线）

现在只有两种交付方式：**方式 B（GitHub Pages，主线，绑 `escaping.top`）** 与 **方式 A（Vercel，只读镜像）**，两者都是纯静态托管，看到的内容完全一致。曾作为生产主推的 **方式 C（自有服务器 + nginx + 后端）已于 2026-10-16 下线**（§4.3）。

### 4.0 上传前自检

```powershell
npm run build       # 先过发文门禁并打回执，再生成 dist/（rss.xml / sitemap.xml / 每条路由一份静态壳）
npm test            # 零依赖防护网：node --test 跑 tests/ 下的 .mjs 用例
npm run check:content # 只跑发文门禁与回执（构建与 npm run check 都含它）
npm run check:docs  # 文档里的文件引用与 § 节号是否还指得到东西 + README 路由表 vs src/router 是否一致
npm run check:naming    # 命名规约扫描（文件名 / 类前缀 / 存储键字面量）
npm run check:contrast  # 双主题的文字与强调色对比度审计，任一项不达标即退出码非 0
npm run preview     # 本地模拟线上环境，浏览器打开检查一遍
```

四条 `check` 查的是**代码与文档有没有开始说谎**（漂移即退出码非 0），已串进 `npm run check`。其中两条要 `python`：脚本里写的是 `python`，只有 `python3` 的机器上直接跑 `python3 scripts/check_doc_refs.py` 等对应脚本；`check:contrast` 与 `check:naming` 另有 `--self` 负向对照模式（验证规则本身抓得住违规）。

发文门禁与 `npm test` 里的内容校验是同一套判据（`src/lib/schema.js`），构建期会再跑一遍：`content/posts/` 里的日期写歪、frontmatter 键拼错、正文引用了本卷没有的图，都会让 `npm run build` 红掉而不出产物。`npm run dev` 只打回执不拦——半篇稿子要能接着写。CI 的发布路径（`.github/workflows/deploy.yml`）现在跑 `npm test` 与 `npm run check` 再构建，任一条红就不发布。

**门禁核不到的一件事**：文档在讲一个已经删掉的功能。删功能时要自己把 `docs/` 与代码注释里的 `§` 引用一起清掉——`check:docs` 只扫那几份文档本身，`src/`、`scripts/`、`tests/` 里的引用不在扫描范围内。

构建会顺带跑 `scripts/build_seo.mjs` 产出 `dist/rss.xml` 与 `dist/sitemap.xml`，两者都是构建期生成的静态文件，直接随站点发布。

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

### 4.2 方式 B：GitHub Pages（主线，绑 escaping.top）

项目已内置 Pages 自动部署：推送 `main` 后由 GitHub Actions 自动构建发布（`.github/workflows/deploy.yml`），**无需改任何配置**。站内只有一种路由模式（history，`base` 固定 `/`），而 Pages 不会把未知路径回退到 `index.html`——所以构建期为每条真实路由写一份 HTML：6 条导航、每一卷文章、每一个项目各一份 `index.html`，加一份 `404.html`（见 §4.0 与 `scripts/lib/shell.mjs`）。直接访问 `/blog/<slug>` 因此是 **200 + 这一篇自己的分享卡**；拼错的地址走 `404.html`，状态码就该是 404。

以前 Pages 走 hash（`/#/blog/<slug>`）。那种链接现在仍然能用：`src/main.js` 在应用挂载前把它改道成路径形状，不会静默落在首页。

镜像已绑自有域名 **`https://escaping.top/`**。绑域名后 `https://escap1ng.github.io/Escaping-Notes` 会 301 到域名根路径，**带仓库名前缀的那份不再单独服务**——这就是 `base` 不能写 `/Escaping-Notes/` 的原因。

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

   绑完页面可能出现黄条 `www.escaping.top is improperly configured`：`www` 的解析记录已于 2026-10-16 删除，站点只保留裸域名 `escaping.top`，这条警告可忽略；判据是输入框下面那行 `DNS valid for primary`。
5. 推送代码：`git push`。
6. 等 Actions 跑完（约 1 分钟），访问 `https://escaping.top/`，F12 → Network 里 `index.html` 引的应是 `/assets/…`（不带 `/Escaping-Notes/`）。

   证明证书已为该域名签好（而不是 `*.github.io` 兜底）：

   ```bash
   curl -s -o /dev/null -w "HTTP %{http_code} ssl_verify=%{ssl_verify_result}\n" https://escaping.top/
   echo | openssl s_client -connect 185.199.110.153:443 -servername escaping.top 2>/dev/null | openssl x509 -noout -subject -issuer
   ```

   期望 `HTTP 200 ssl_verify=0` 与 `subject=CN=escaping.top`。
   旧地址 `escap1ng.github.io/Escaping-Notes`（不带尾斜杠）会 301 到新域名；带尾斜杠的那份可能仍直接返回产物、资源 404——GitHub 的重定向表要等 Fastly 缓存过期，不用管，站内所有 canonical/OG/RSS 都已指向 `escaping.top`。

Pages 是主线交付：文章用打包版，站点内容来自 `src/data/*.js`，页脚与 canonical / OG 都指向 `escaping.top`。Vercel 是同源只读镜像（§4.1）。

### 4.3 方式 C：自有轻量服务器（已于 2026-10-16 下线）

本节原讲第三种交付：在 2核2G 自有服务器上用 nginx 托管 `dist`，并跑一个单文件、零依赖的 Python 后端（原 `server/api.py`，监听 `127.0.0.1:8787`，由 nginx 反代），提供登录 / 网页发文 / 图片上传 / 阅读计数 / QQ 歌单代抓 / `/blog/:slug` 的服务端 OG 注入 / RSS；配 systemd 自启，用 `SITE_URL` / `SITE_DIST` / `SITE_DATA` 三个环境变量定位站点与数据，域名走 `www` 并涉及 ICP 备案。

2026-10-16，承载它的服务器与 `www.escaping.top` 的解析记录一并删除，**整条后端链路整体下线**：原 `server/api.py`、原 `docs/api.md`、登录 / 后台 / 阅读计数 / 服务端 OG 注入随之撤除，`SITE_DIST` / `SITE_DATA` / nginx / systemd / 备案那一套不再维护。站点此后只有两种纯静态交付：GitHub Pages（主线）与 Vercel（只读镜像）（§4.1、§4.2）。

### 4.4 以后更新内容的流程

改文章（`content/posts/*.md`）或站点内容（`src/data/*.js`）→ 本地 `npm run dev` 检查 → `git add . ; git commit -m "说明" ; git push` → 线上自动重建并更新（GitHub Pages / Vercel）。

---

## 5. 常见问题

| 症状 | 原因与处理 |
| --- | --- |
| 双击 `index.html` 打开是空白 | 必须通过 `npm run dev` 或 `npm run preview` 访问，不能直接双击文件 |
| 改了配置页面报错 | 99% 是少了逗号 / 引号。看终端报错行号，对照 §2.1 修复 |
| `npm install` 很慢 | 可换国内镜像：`npm install --registry=https://registry.npmmirror.com` |
| Pages 上直接打开 `/blog/<slug>` 是 404 | 这一份 `dist/` 里没有那条路由的静态壳。先跑 `npm run build`（`build_seo.mjs` 会按卷与按导航写出 `index.html`），再确认发布用的就是这个 `dist/`；只改了文章没重新构建、或 CI 缓存了旧产物都会出现这一条 |
| 端口 5173 被占用 | Vite 会自动换 5174…，以终端显示为准 |
| 文章列表短暂显示灰色骨架卡 | 加载态的占位，文章是构建期打包的，数据到位即替换，稍等即可 |
| `npm run build` 红：发文门禁 N 个问题 | 红之前那份回执逐条写着是哪一卷、哪一条（缺 `alt` / `date` 歪 / 键名拼错 / 正文引用的图不在这卷目录里 / 旧名被两卷同时认领）。对照 §2.2 改，改完再构建 |
| 改了卷目录名，旧链接还在吗 | 在——前提是你把旧名登记进那卷的 `movedFrom`（§2.2）。没登记的话旧链接落到「这里没有这一篇」；Pages 上那条旧网址首个请求仍是 404（它没有对应的壳），但应用装载后会改道到现名 |
| 草稿会不会被读者或搜索引擎看见 | 不会。`draft: true` 的卷不进列表 / 精选 / 映像柜 / 读数 / RSS / sitemap / 壳，连封面文件都不拷进 `dist/`；只有 `npm run dev` 看得到它。回执会标出哪几卷是草稿，不会让你以为发出去了（§2.2） |
| 线上某张文章图 404 | 那一卷的 `cover.jpg` 或插图文件没提交进仓库（`*-src.*` 是烘图输入，永远不上线，这是故意的）。`content/posts/<slug>/` 里有的文件名，就是 `/blog/<slug>/` 里该有的那张 |
| 项目详情页显示"这里没有这个项目的介绍" | URL 拼错，或与 `src/data/projects.js` 里的 `name` 对不上——URL 由 `name` 现算，改过名字老链接就断（§2.4） |
| 分享链接没有卡片图 | 确认 `public/og.png` 存在，且 `index.html` 里的域名是你的真实域名（换域名见 §2.6） |
| 提交前该跑什么 | `npm test` + `npm run check`，两条都绿再提交（§4.0） |

---

## 6. 版本与里程碑

本站当前版本 **v1.3.1**（连续曝光落地、取数与存储收口）。**这一节是写 GitHub Release 正文的取材处**，按版本记"当时交付了什么"；旧版本记录已清理，此后已下线的能力单列在末尾，不要当现状读。

- **v1.3.1 · 连续曝光落地、取数与存储收口**
  - 连续曝光——底片跨路由常驻，`src/lib/sky.js` 以单例接管画布（`ensurePlate` / `claimPlate` / `ownsPlate` / `releasePlate`），切页不再重置星轨；滚动深度经 `src/lib/shift.js` 的 `shift.v` 交给样式消费。
  - 可读性暗带契约——文字底下的天空由 `StarTrails.vue` 一处 `--_sky-mask` 统一压低，不再外包给卡片背景；几何收为 `--sky-band` / `--sky-feather`，压低系数按主题给 `--sky-k`；卡片同步重定标（`--card-bg` 44%→52%、hover 72%→62%）。
  - 存储层 fail-closed——原 `server/api.py` 新增 `CorruptJSON` 与 `MISSING` 哨兵，「读不出」不再被当成「未初始化」；数据损坏时建号返回 503 且**不写文件**。`save()` 改唯一临时名 + `fsync` + `replace`，整段进锁。部署路径改读 `SITE_DATA` / `SITE_DIST`。
  - 取数层收口——原 `src/lib/api.js` 的 `tryApi()` 返回 `{ok,status,data,code,reason}`，失败原因不再塌成 `null`（网络不通为 `offline` 且 `status:0`；`reason` 查 `narrative.js` 的 `errors` 表）；上传走同一契约（`uploadFile()`，60s 超时）。
  - 防护网——`tests/` 零依赖（`node --test` + `unittest`），装上时即抓到两个真实缺陷：frontmatter 正则不认 CRLF（Windows 检出的稿子解析不出元数据）、markdown 放行 `javascript:` 链接（现由 `safeHref()` 只放行白名单协议）。
  - 门禁——新增 `check_doc_refs.py`（死引用 / 节号 / 路由表）与 `check_naming.py`（命名规约），以及接口契约与端点双向对拍两道（随后端一并撤除）。
  - 部署——GitHub Pages 绑裸域名 `escaping.top`，`vite.config.js` 的 `base` 固定为 `/`（`build` 与 `build:pages` 只差路由模式）。
  - 内容渲染——`src/lib/markdown.js` 支持 GFM 管道表，标题层级收到 h2–h6（h1 让给文章标题）。
- **此后已下线**（上面的条目里仍按"当时交付了什么"记着，那是历史，不是现状）：低语与 `/fragments` 碎片（端点在 2026-10-16 删除，§2.4）；自绘沉浸光标（现用系统默认光标）；每页一枚巨型空心汉字的签名装置；首屏变星（文章节点）入口；**自助注册与留言墙**（`/register`、`/wall`、`/api/register`、`/api/messages` 的读写删端点、`data/messages.json` 全部删除，角色由三档收敛为站长 + 管理员两档；2026-10-16 用户管理与角色机制整体撤除，收敛为单账号，见 §2.7）；**后端整体下线**（2026-10-16）——承载它的服务器与 `www.escaping.top` 的解析记录已删除，原 `server/api.py`、原 `docs/api.md` 与登录 / 后台 / 阅读计数 / 服务端 OG 注入随之撤除，站点改为纯静态：文章由 `content/posts/` 打包、站点内容由 `src/data/*.js` 提供。
