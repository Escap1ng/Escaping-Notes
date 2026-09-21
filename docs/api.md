# Escaping Notes · 后端接口契约

> **这份文件是什么**：`server/api.py` 对外提供的每一个端点、每一种失败、以及前端如何消费它们的**唯一权威说明**。
> **它凭什么可信**：全部条目从 `api.py` 的路由与 `src/` 的调用点逐条抄出，不含推测；文末 §7 给了一个脚本，
> 能把本文的端点表与代码里的路由**双向对拍**，改了接口忘了改文档会当场对不上。
> `api.py` 的模块级 docstring 指回这里。**改任何端点前后都请回来看一次 §7。**

---

## 0. 范围与前提

- 后端是**单文件、零第三方依赖**（仅 Python 3 标准库）的 `ThreadingHTTPServer`，监听 `127.0.0.1:8787`，
  由 nginx 反代对外。**只监听回环**意味着它永远不该直接暴露公网。
- **没有 CORS、没有 `do_OPTIONS`**。前后端必须同源部署——这是"Vercel / GitHub Pages 只能做无后端只读镜像"的根因，
  不是配置疏漏。要跨源调用必须先补 CORS 预检。
- 静态产物与数据目录由环境变量决定：`SITE_DIST`（`/` 与 `/blog/*` 的 meta 注入要读 `dist/index.html`）、
  `SITE_DATA`（全部 JSON 与 `posts/`、`uploads/`）。默认值为仓库内相对布局，
  与部署手册的 `/opt` + `/var/www` 布局**不一致，必须显式设**（见 `docs/manual.md` §4.3）。
- 身份三档：`visitor`（注册即得）/ `admin`（站长任命）/ `owner`（站长，全站唯一）。

## 1. 通用约定

| 项 | 约定 |
| --- | --- |
| 鉴权 | 请求头 `Authorization: Bearer <token>`。token 为服务端 `secrets.token_urlsafe(32)`，存 `sessions.json`，**有效期 7 天**，`/api/logout` 主动作废。带无效/过期 token 等同游客（不报错，只是 `None`） |
| 请求体 | `application/json`；`_body()` 上限 **1 MB**（超出部分被截断 → 解析失败 → `400 bad json`）。解析失败统一 `400 {'error':'bad json'}` |
| 响应 | 一律 `application/json; charset=utf-8`（例外：`/uploads/*` 按扩展名、`/rss.xml` 为 `application/rss+xml`、`/` 与 `/blog/*` 为 `text/html`） |
| 限流 | **仅 `POST`**：每 IP **30 次 / 60 秒**，超出 `429 {'error':'too fast'}`。计数存进程内存 `RATE`，**重启即清零**；`GET` / `PUT` / `DELETE` 不限流 |
| 未知路径 | `404 {'error':'not found'}`（各方法内部都有兜底分支） |
| 访问日志 | `log_message()` 被显式置空——访问日志以 nginx 为准。**服务端唯一的日志通道是 `log()` 打到 stdout**（`[api] …`），由 systemd 收集 |

### 1.1 前端降级契约（最重要、也最容易被忽略的一条）

`src/lib/api.js` 的 `api()`：**任何** 非 2xx、网络错误、或超过 **10 秒** 的响应，一律 `return null`。

这换来的是"后端缺席时站点仍是完整只读站"（文章回退打包种子、留言走本地），但代价必须写明：

- **业务错误码对前端不可见。** 401（密码错）、403（被封）、409（用户名重复）、429（被限流）、502、503
  在调用方看来与"后端挂了"完全同形。
- 直接后果已在线上：`LoginView` / `RegisterView` 把这五种情况塌成**同一句**提示
  （"注册失败：用户名 3-20 位…"）。用户密码打错，看到的是"你格式不对"。
- 本轮加固后新增了一种被塌掉的码：`users.json` 损坏时 `/api/setup` 返回 `503`，
  而登录页仍会显示"初始化失败：用户名 3-20 位…"——**这条提示会误导排障方向**，见 §6 T2。

## 2. 端点总表

角色列：`—` = 公开；`u` = 任意登录用户；`a` = admin|owner；`o` = owner。
"前端"列指实际调用点；**空 = 该端点目前无任何前端消费方**（存在但未接线，别以为它在用）。

### GET

| 路径 | 角色 | 成功 | 失败 | 前端 |
| --- | --- | --- | --- | --- |
| `/api/health` | — | `{ok:true}` | — | — |
| `/api/bootstrap` | — | `{needsSetup:bool}` | — | `LoginView` |
| `/api/me` | 可选 | `{id,username,nickname,role}` | 401 | `lib/auth.js` |
| `/api/posts` | — | `[{slug,title,date,tags,summary,words,minutes}]` 按 date 倒序 | — | `lib/posts.js` |
| `/api/posts/{slug}` | — | `{meta:{…,slug},body}` | 404 | `lib/posts.js`、`AdminView` |
| `/api/messages` | — | `[{name,text,ts}]` **最近 100 条** | — | `NeoWallView`、`AdminView` |
| `/api/stats` | — | `{slug:count,…}` | — | `NeoPostView` |
| `/api/users` | a | `[{id,username,nickname,role,ban,created}]`（不含 `pass`） | 403 | `AdminView` |
| `/api/records` | — | 歌单对象 | — | `lib/records.js` |
| `/api/content` | — | `{site,updates,links,projects,gear,playlist}` | — | `lib/content.js` |
| `/api/fragments` | — | `[{ts,text,image}]` **最近 200 条** | — | — |
| `/api/uploads` | o | `[{name,url,size,mtime,kind}]` 前 100、mtime 倒序 | 403 | `AdminView` |
| `/uploads/{file}` | — | 文件字节 | 404 | — |
| `/rss.xml` | — | RSS | — | — |
| `/`、`/blog/{slug}` | — | 注入了 title/OG/canonical 的 HTML | 404（`SITE_DIST` 未设或无 `dist`） | — |

### POST

| 路径 | 角色 | 成功 | 失败 | 前端 |
| --- | --- | --- | --- | --- |
| `/api/upload` | o | `{ok:true,url}`（**multipart 单文件**，≤8 MB，落盘名加时间戳前缀） | 403 owner only · 400 bad file（无 boundary / 无 filename）· 415 type not allowed | `AdminView` ×2（裸 `fetch`，见 §6 T4） |
| `/api/setup` | — | `{token,user}` | 409 already setup · **503 storage unavailable** · 400 bad username / weak password · 409 taken | `LoginView` |
| `/api/register` | — | `{token,user}`（角色固定 `visitor`） | **503** · 400 · 409 taken | `RegisterView` |
| `/api/login` | — | `{token,user}` | 401 bad credentials · 403 banned | `LoginView` |
| `/api/logout` | u | `{ok:true}`（**无 token 也返回 200**） | — | `lib/auth.js` |
| `/api/messages` | — | `{ok:true}` | 400 empty | `NeoWallView` |
| `/api/view` | — | `{ok:true,count}` | 400 bad slug | `NeoPostView` |
| `/api/fragments` | o | `{ok:true}` | 403 · 400 empty · 400 bad image | — |
| `/api/sync/records` | o | 同 `/api/records` | 403 · 502 sync failed | `lib/records.js` |
| `/api/posts` | o | `{ok:true,slug}` | 403 · 400 empty · 400 bad slug | `AdminView` |
| `/api/posts/{slug}` | o | 同上（**POST 即"按 slug 写入/覆盖"**，本站没有 `PUT /api/posts/*`） | 同上 | `AdminView` |
| `/api/users/{id}/role` | o | `{ok:true}` | 403 · 400 bad role · 404 not found（目标不存在或目标本身是 owner） | `AdminView` |
| `/api/users/{id}/ban` | a | `{ok:true}` | 403（owner 不可被禁；admin 不可禁 admin） | `AdminView` |

### PUT

| 路径 | 角色 | 成功 | 失败 | 前端 |
| --- | --- | --- | --- | --- |
| `/api/content/{key}`<br>`key ∈ {site,updates,links,projects,gear,playlist}` | o | `{ok:true}` | 404（key 不在白名单）· 403 · 400 bad json | `updates` `projects` `gear` `playlist` 已接线；**`site` / `links` 无人写入** |

### DELETE

| 路径 | 角色 | 成功 | 失败 | 前端 |
| --- | --- | --- | --- | --- |
| `/api/posts/{slug}` | o | `{ok:true}`（文件不存在也算成功） | 403 | `AdminView` |
| `/api/messages/{ts}` | a | `{ok:true}` | 403 | `NeoWallView`、`AdminView` |
| `/api/users/{id}` | a | `{ok:true}` | 403（**不能删自己**、不能删 owner、admin 不能删 admin） | `AdminView` |
| `/api/fragments/{ts}` | o | `{ok:true}` | 403 | — |
| `/api/uploads/{name}` | o | `{ok:true}` | 403 | `AdminView` |

> 上传的**读**与**删**路径不对称，容易记错：公开读是 `/uploads/{file}`（没有 api 前缀），
> 后台删是 `/api/uploads/{name}`。列表才是 `/api/uploads`。

### 字段长度与取值上限（来自代码，不是建议）

`username` `^[a-z0-9_-]{3,20}$`（小写）· `password` ≥6 字符（无复杂度、**无最小长度以外的校验**）·
`nickname` ≤24 · 留言 `text` ≤200 · 碎片 `text` ≤500 · 文章 `title` ≤80、`summary` ≤120、`tags` ≤8 个 ·
`slug` `^[a-z0-9-]{1,60}$` · 上传单文件 ≤8 MB 且扩展名 ∈ 图片/mp3 白名单 · 内容上限：留言留最近 500、碎片留最近 200。

## 3. 数据形状

- **用户对象**（内部）：`{id, username, nickname, pass, role, ban, created}`。
  `pass` 是 `"<16字节盐hex>$<pbkdf2-hmac-sha256 120000 次>"`，**任何端点都不外发**（`_pub()` 只出 4 个字段，
  `/api/users` 白名单里也没有 `pass`）。
- **文章**：正文与元数据存在 `data/posts/{slug}.md`，frontmatter 为 `---` 块（`parse_post` 认 LF 与 CRLF）。
  `words` 按 CJK 与拉丁分别计数，`minutes = max(1, round(words/400))`。
- **歌单**：`/api/sync/records` 拉 QQ 接口写入 `records.json`；同一套抓取逻辑在
  `scripts/sync_records.py` 里**还有第二份实现**（逐字段重复），见 §6 T3。

## 4. 状态码

| 码 | 含义 |
| --- | --- |
| 200 | 成功 |
| 400 | `bad json` / `bad username` / `weak password` / `bad slug` / `empty` / `bad role` / `bad image` / `bad file` |
| 401 | `unauthorized`（`/api/me`）· `bad credentials`（登录） |
| 403 | `forbidden`（角色不足）· `owner only`（需站长）· `banned`（账号被禁） |
| 404 | `not found` |
| 409 | `already setup`（已有站长）· `taken`（用户名重复） |
| 415 | `type not allowed`（上传扩展名不在白名单） |
| 429 | `too fast`（POST 限流） |
| **503** | `storage unavailable` —— **2026-09-18 新增**，仅出现在建号路径：`users.json` 存在但读不出/不是数组。见下条 |
| 502 | `sync failed`（QQ 歌单上游不可达） |

## 5. 存储与 fail-closed 边界

「**文件不存在**」与「**文件存在但读不出**」是两件事，混为一谈曾是一个安全洞。

| 情形 | 普通读侧（留言/计数/歌单/内容…） | 建号侧（`/api/setup`、`/api/register`） |
| --- | --- | --- |
| 文件不存在 | 返回 `default`（首次运行的正常态） | 视为空表，**允许**建号 |
| 文件存在但损坏 / 不是数组 | 返回 `default` **并打 `[api] DATA 读不出…` 日志** | **503 拒绝，且不写文件** |

- `needsSetup` 只在"确实读得出用户表"时才可能为 `true`；损坏 → `false`。
  **绝不把损坏当成"还没有站长"**——否则任何人都能 `POST /api/setup` 自封站长。
- 收口点在 `_create_user()`（`setup` 与 `register` 共同的落库处），而不在两个调用点各判一次：
  因为那里紧接着的 `save()` 会用"只有一个新账号"的数组**覆盖整张用户表**。
- 写侧统一走 `save()`：唯一临时名 + `fsync` + `replace`，整段在 `LOCK`（RLock）内串行。
- 运维视角的说明（含"如何合法重置一台机器"）在 `docs/manual.md` §2.7。

## 6. 已知缺陷与待办（**不要当成已实现**）

| 编号 | 问题 | 影响 | 方向 |
| --- | --- | --- | --- |
| T1 | 无 CORS、无 `do_OPTIONS` | 跨源调用完全不可能；静态镜像只能是只读镜像 | 若确有需要再补预检，否则明确"同源 only" |
| T2 | `api()` 把 4xx/5xx 一律塌成 `null` | 登录/注册把**密码错、被封、重名、限流、后端宕、503 存储异常**显示成同一句"用户名 3-20 位…"，误导用户也误导排障 | `api()` 改返回 `{ok,status,data}`；这是结构方案 **S1** 的一部分 |
| T3 | 同一份 Markdown/frontmatter 有**三处**解析器（`api.py`、`src/lib/*`、`scripts/build_seo.mjs`），歌单抓取有**两份**实现 | 口径会漂；sitemap/RSS 可能与站内不一致 | 结构方案 **S2**（唯一事实源） |
| T4 | `AdminView.vue` 两处裸 `fetch('/api/upload')` 手拼 `Bearer` | 绕过超时/降级/鉴权头逻辑，是唯一不受 §1.1 契约保护的调用点 | **S1** 收口进 `api.js` |
| T5 | `POST /api/upload` 的写文件不在 `LOCK` 内、无扩展名之外的内容校验 | 同名覆盖可能；上传即信任 | 待定 |
| T6 | `/api/fragments`、`/api/health`、`PUT /api/content/site|links` **无前端消费方** | 属于"已实现未接线"，容易被误认为在用 | 接线或删除 |
| T7 | 无任何接口测试 | 本文与 §7 的对拍是唯一的防漂移手段 | **S0** 防护网 |
| T8 | `GET /api/*` 与 `PUT` / `DELETE` 不限流 | 列表型端点可被刷 | 待定 |

## 7. 让这份文档不撒谎

上面的表是手抄的，手抄会漏。所以对拍脚本是这份文档的一部分：

```bash
npm run check:api                      # 或 python scripts/check_api_doc.py
python scripts/check_api_doc.py --self # 自检：注入一条文档没写的新路由，确认它真的会报警
```

> `check:api` 里写的是 `python`（本机 Windows 用它）；只有 `python3` 的机器上直接跑
> `python3 scripts/check_api_doc.py`。

脚本从 `api.py` 抽出全部 `path == '…'` 与 `re.match(r'^…')` 路由，与本文 **§2 端点表**里的反引号路径
双向比对（参数统一规整成 `{}`），任何一侧多或少都会打印并**以退出码 1 结束**。
文档侧只扫 §2 一节——别处散文里出现的 `/blog/*` 之类不是端点声明。

> **实测记录，别把这表当"写完就可信"**：本文第一版就漏了整条 `POST /api/upload`（只写了列表 / 读 / 删），
> 是这套对拍在第一次运行时抓出来的。改了端点忘了改文档，同一个脚本会立刻点名。
> 把它接进 CI 是自然的一步，但目前只在本地 `npm run check:api`。
