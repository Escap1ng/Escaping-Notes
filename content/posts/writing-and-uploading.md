---
title: 怎么写、怎么发：本博客的写作与上传
date: 2026-10-10
tags: [手册]
summary: 从一枚 md 文件到 escaping.top 上的一张底片：frontmatter 写哪几行、封面从哪儿烘出来、站点内容存在哪里、上线怎么走。
image: /posts/writing-and-uploading.jpg
---

![暮色里覆雪的富士山压着一带云，山脚铺开一座城；右侧五重塔的剪影横出一轮落日星芒](/posts/writing-and-uploading.jpg)

这台相机怎么进一卷新底片，说清楚只要三句话：**正文是一个 md 文件，封面是从原图烘出来的派生素材，上线是一次 push**。下面把这三句摊开——它同时也是 `docs/manual.md` §2.2 与 §4 那两节的一份读者版。

## 只有一条路：改仓库里的文件

站内没有后台。文章就是仓库里的 `content/posts/*.md`，站点内容（动态 / 项目 / 装备 / 歌单 / 映像 / 友链）就是 `src/config/*.js`——改完 push，GitHub Actions 重新构建，线上就是新的。没有一份内容躺在别处等着同步，也没有"必须在网页上改才生效"的东西。

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
- 链接与图片的地址只接受站内相对路径、锚点、`http(s):`、`mailto:`、`tel:`。写成 `javascript:` 之类的不会变成链接，只保留可见文字。原因不是排版而是安全：正文会经 `v-html` 渲染给每一个读者，一条能点就能执行的地址足以在访客的浏览器里跑任意脚本。
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

## 上传：push 即上线

发之前跑一遍自检：

```powershell
npm run build       # 出 dist/（含 rss.xml / sitemap.xml），无报错即合格
npm test            # frontmatter 解析、Markdown 渲染、底片清单与 site.css 对拍
npm run check       # 文档死链与节号、命名规约、主题令牌对比度，漂移即退出码非 0
npm run preview     # 本地模拟线上环境，浏览器过一眼
```

| 方式 | 落在哪 | 是什么 |
| --- | --- | --- |
| GitHub Pages | `escaping.top`（主线） | `git push` 后 Actions 自动构建并发布。文章与配置都在构建期打包 |
| Vercel | `xxx.vercel.app` | 另一份出口，同样 push 即部署，看到的是一模一样的内容 |

两种方式都是纯静态托管，没有服务端能动态生成东西：`sitemap.xml` 与 `rss.xml` 由构建期的 `scripts/build_seo.mjs` 依 `content/posts/` 生成，随站点一起发布。

## 发完之后会自动变的三处

不用手工登记的地方有三处：文章列表多一格封面、首页抽屉的精选卡换了一轮（取最新三篇）、映像柜墙上多一枚拍立得（封面按 frontmatter 的 `image` 自动上墙，最新那篇在左上第一格）。

只有站点自己的底片要登记——首屏的地平线、抽屉轮播那五张、深色那张压暗底、分享卡，记在 `src/config/gallery.js`。这份清单与 `site.css` 里真正引用的 `/plates/` 路径由 `npm test` 对拍，两侧必须咬合：换底片只改了 CSS 而忘了这里，映像柜就会把一张全站已经不用的图留在墙上示众。
