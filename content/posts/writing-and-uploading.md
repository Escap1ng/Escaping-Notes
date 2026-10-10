---
title: 怎么写、怎么发：本博客的写作与上传
date: 2026-10-10
tags: [手册]
summary: 从一枚 md 文件到 escaping.top 上的一张底片：frontmatter 写哪几行、封面从哪儿烘出来、/admin 与仓库种子各管哪一段、三种上线方式怎么选。
image: /posts/writing-and-uploading.jpg
---

![暮色里覆雪的富士山压着一带云，山脚铺开一座城；右侧五重塔的剪影横出一轮落日星芒](/posts/writing-and-uploading.jpg)

这台相机怎么进一卷新底片，说清楚只要三句话：**正文是一个 md 文件，封面是从原图烘出来的派生素材，上线是一次 push 或一次后台保存**。下面把这三句摊开——它同时也是 `docs/manual.md` §2.2 与 §4 那两节的一份读者版。

## 两条路，一条主一条备

日常发文走 `/admin` 的网页编辑器：登录后填表、保存即生效，不碰代码。这条路要后端，而后端只有自建服务器那一条路会跑起来（`www.escaping.top`）——Pages 与 Vercel 那两份是只读镜像，登录与发文在镜像上自动禁用。

另一条路是仓库里的 `content/posts/*.md`。它同时是三样东西：服务器数据为空时的**初始种子**、无后端镜像的**内容来源**、以及批量修改的**通道**。阅读端不关心你走的哪条：`src/lib/posts.js` 先请求 `/api/posts`，拿不到（后端没起、超时、或者站点本身就是镜像）就回退打包进构建产物的那批 md。所以「后端挂了」不等于「文章没了」，这是设计而不是巧合。

## 写作：一个文件就是一篇

**文件名就是网址。** `content/posts/writing-and-uploading.md` 落在 `/blog/writing-and-uploading`，所以名字用英文短横线，改名字等于换网址。

文件开头两条 `---` 之间是 frontmatter，一行一条 `key: value`：

```markdown
---
title: 文章标题
date: 2026-10-10
tags: [手册, 设计]
summary: 一句话摘要，列表页、RSS 和分享卡都读它。
image: /posts/writing-and-uploading.jpg
---
```

五个字段里 `date` 最容易被忽略，也最要紧：全站按它倒序排——文章列表、首页抽屉那三格精选、映像柜墙上第一格，都是最新那篇在前。漏写会回落到 `1970-01-01`，这篇就永远沉在最后。`image` 可以省，省了列表页那一格会留一张等高的斜纹空版——卡片高度不齐比没图更难看。还有个可选的 `imagePos`，值是 CSS `background-position` 那套写法（比如 `50% 30%`），管封面在 3:2 的卡格里露哪一块；不写就是 `center`。

正文是标准 Markdown，四条本站特有的约定：

- `#` 让给文章标题，正文从 `##` 起，所以实际渲染出来最高到 h6。
- 表格第二行那行分隔符**必须**写，缺了整段会按普通文字排版。列对齐由它上面的冒号决定：`:---` 左、`---:` 右、`:---:` 居中。
- 链接与图片的地址只接受站内相对路径、锚点、`http(s):`、`mailto:`、`tel:`。写成 `javascript:` 之类的不会变成链接，只保留可见文字。原因不是排版而是权限：读者登录后令牌就存在他自己浏览器的 `localStorage` 里，一个点下去就能执行的地址足以把它取走。
- 插图先放进 `public/images/`，正文里用「感叹号 + 方括号包 alt + 圆括号包路径」的语法引用它。alt 要真的描述画面——读屏靠它，图挂了也靠它。

字数与阅读时长不用你写：正文按 400 字一分钟现算，卡片脚线上那行「N 字 · M 分钟」是读文件读出来的。

## 封面：原图不进仓库

`image` 指的那张图是派生物，不是素材。三步：

1. 原图丢进 `plates-src/`。这张是 7952×5304、5.2MB，而 `plates-src/` 在 `.gitignore` 里。
2. 在 `scripts/build_post_covers.ps1` 顶部的 `$Map` 里手写一行映射：`'plate2.jpg' = 'writing-and-uploading.jpg'`。
3. `npm run cover:build`，产出 `public/posts/writing-and-uploading.jpg`——长边 1600px、JPEG 质量 72，155KB。

映射是手写的，不是「取目录里第一张 jpg」：后者会让一份提交里的素材取决于最后丢进 `plates-src/` 的是什么。长边 1600 也不是拍脑袋——这张图最宽只会被画到阅读栏，而阅读栏封顶是 `--measure` = 44 × 20px = 880 CSS px，1600 给 2x 屏留了余量。质量 72 高于底片那批，因为底片是垫在文字后面被糊的，这张是读者点开来看的。

列表页那一格和正文顶部这一张是**同一个文件**：一边圆一边方会读出「换了个东西」，所以两处共用同一份派生图，圆角由 CSS 给。

`public/posts/` 与 `public/plates/` 这两批派生物**必须进仓库**。原因很实在：烘图脚本跑在 Windows PowerShell + System.Drawing 上，Pages 的 ubuntu runner 执行不了，CI 里也装不了 PIL 或 sharp。仓库里这一份就是唯一的一份，加一条忽略规则的后果还是静默的——构建不报错，线上每张 `/posts/*.jpg` 都是 404。

## 上传：先选身份，再选方式

发之前跑一遍自检：

```powershell
npm run build       # 出 dist/（含 rss.xml / sitemap.xml），无报错即合格
npm test            # frontmatter 解析、Markdown 渲染、底片清单与 neo.css 对拍
npm run check       # api 文档 vs 路由、文档死链与节号、命名规约，漂移即退出码非 0
npm run preview     # 本地模拟线上环境，浏览器过一眼
```

| 方式 | 落在哪 | 能做什么 |
| --- | --- | --- |
| GitHub Pages | `escaping.top`（当前测试期主用） | 只读。`git push` 后 Actions 自动构建，文章读打包种子，登录与发文禁用 |
| Vercel | `xxx.vercel.app` | 只读。同样 push 即部署，适合当第二个出口 |
| 自建服务器 + nginx | `www.escaping.top` | 完整版。登录、发文、全站计数都要那个后端 |

自建服务器那条的实际动作是：本地 `npm run build`，把 `dist/` 传上去，再跑单文件的 Python 后端（零第三方依赖，约 20MB 内存），nginx 把 `/api/` 反代给它。前端在 API 不可达时自动降级，不报错。

有一处坑要单独说：SEO 产物（`sitemap.xml` / `rss.xml`）取的是 `content/posts/` 与服务器 `data/posts/` 的**并集**，按文件名去重、`data/` 优先。这意味着构建机必须**看得见** `server/data/posts/` 才能把后台发的文章收进产物——本地很久没跑后端时那目录可能只是早期副本，从后台发了新文章后请先从服务器同步一次再 `npm run build`。后台发的文章不进 git，它的备份就是复制服务器上的 `data/` 目录。

## 发完之后会自动变的三处

不用手工登记的地方有三处：文章列表多一格封面、首页抽屉的精选卡换了一轮（取最新三篇）、映像柜墙上多一枚拍立得（封面按 frontmatter 的 `image` 自动上墙，最新那篇在左上第一格）。

只有站点自己的底片要登记——首屏的地平线、抽屉轮播那五张、深色那张压暗底、分享卡，记在 `src/config/gallery.js`。这份清单与 `neo.css` 里真正引用的 `/plates/` 路径由 `npm test` 对拍，两侧必须咬合：换底片只改了 CSS 而忘了这里，映像柜就会把一张全站已经不用的图留在墙上示众。
