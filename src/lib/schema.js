// 内容层的唯一口径：一卷文章的字段定义、解析、派生与校验全在这里。
// 浏览器那岸（src/lib/posts.js 打包进产物）与 Node 那岸（scripts/build_seo.mjs 出
// sitemap/RSS、scripts/check_content.mjs 当门禁）import 的是同一份，所以「页面上看到的」
// 和「RSS 里写的」结构上不可能再分叉——过去分叉过，原因是这两处各抄了一遍解析。
//
// 因此这个文件不许带 import.meta.*、node:fs、vue：任何一样都会让另一岸 import 不动，
// 那一岸就只能再写一份。tests/schema.test.mjs 把这条也钉着。

// 一卷 = content/posts/<slug>/ 一个目录：`index.md` 是稿子，同目录其余文件是它的素材。
// 目录名即 slug 即网址（/blog/<slug>），素材 URL 即 /blog/<slug>/<文件名>。
// 封面按文件名认（cover.jpg）：列表页那格、阅读页顶部那张满栏图、映像柜墙上那张，
// 用的都是同一个文件——作者既不在 frontmatter 里写路径，也不必在正文手抄一遍 ![]()。
export const INDEX_NAME = 'index.md'
export const COVER_NAMES = ['cover.jpg', 'cover.jpeg', 'cover.png']

// frontmatter 只认这几个键。写错的键（titlee、data…）会被报出来而不是静默失效——
// 静默是站内最难查的一类：页面照样渲染，只是那块永远是空的。
export const POST_KEYS = ['title', 'date', 'tags', 'summary', 'imagePos', 'alt', 'draft', 'movedFrom']

// 写成数组的两个键（`tags: [甲, 乙]` 与 `movedFrom: [旧slug]`）：方括号可省，逗号分隔。
const LIST_KEYS = ['tags', 'movedFrom']

// 卷目录里 `*-src.jpg` 是烘图的**输入**（原图），既不提交也不上线，只有烘出来的
// cover.jpg 与正文引用的素材上线。这条判据两端共用：构建期拷哪些文件、校验时忽略哪些文件，
// 必须是同一个答案，否则原图会跟着进 dist。
export const SOURCE_ORIGINAL = /-src\.(jpe?g|png|webp|tif|tiff)$/i
export const isPublished = (name) => name !== INDEX_NAME && !SOURCE_ORIGINAL.test(name) && !name.startsWith('.')

// 素材文件名口径：全小写、不带空格。带空格的文件名会中断 ![](…) 的解析（那条正则不许有空格），
// 大写在 Windows 上不敏感、在 Linux 的静态托管上敏感，两边都不是"能跑"。
const NAME_OK = /^[a-z0-9][a-z0-9._-]*$/
const DATE_OK = /^\d{4}-\d{2}-\d{2}$/
const SLUG_OK = /^[a-z0-9][a-z0-9-]*$/
// imagePos 会被写进 style 属性，所以只放行取值字符，其余一律回落 center。
const POS_OK = /^[-\d.%a-z ]{1,24}$/i
// draft 的两种明确写法。`draft:` 光杆（值为空）既不算开也不算关，直接报——
// 手滑删掉一个值就等价于偷偷把草稿发出去，这种事不该静默。
const DRAFT_ON = /^(1|true|yes)$/i
const DRAFT_OFF = /^(0|false|no)$/i
const IMG_EXT = /\.(jpe?g|png|gif|webp|svg|avif)$/i
// 正文里的图片语法：与 src/lib/markdown.js 认的那一条同一形状，改动要同时改那边。
const MD_IMG = /!\[([^\]]*)\]\(([^)\s]+)\)/g

export const postUrl = (slug) => `/blog/${slug}`
export const assetUrl = (slug, name) => `/blog/${slug}/${name}`

// 把 /blog/<slug>/<文件名> 拆回两段；对不上这个形状就返回 null，让请求走回 SPA 的兜底。
// dev 中间件与构建期拷贝都先过这一道：名字里不许再带一层 /，slug 与文件名都得合口径，
// 于是 `..`、中文、空格、`?query` 都到不了磁盘路径。（构建那侧的路径来自读盘清单，本来就不可能歪。）
export function parseRollUrl(url) {
  const m = /^\/blog\/([^/]+)\/([^/]+)$/.exec((url || '').split('?')[0])
  if (!m) return null
  let slug = ''
  let name = ''
  try {
    slug = decodeURIComponent(m[1])
    name = decodeURIComponent(m[2])
  } catch {
    return null // % 后面不是合法十六进制：这不是站内素材名
  }
  if (!SLUG_OK.test(slug) || !NAME_OK.test(name)) return null
  return { slug, name }
}

// 2 月 30 日过得了 /^\d{4}-\d{2}-\d{2}$/，而 new Date() 会把它静默顺延成 3 月 2 日，
// RSS 的 pubDate 与 sitemap 的 lastmod 就各自拿一套值。按 UTC 构造后回读比对才算真是那一天。
function isRealDate(s) {
  const [y, m, d] = s.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d))
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d
}

export function parseFrontmatter(raw) {
  // \r? 不能省：缺了它，Windows 上 core.autocrlf=true 的新克隆（CRLF 检出）会整份
  // frontmatter 不识别——标题变空、日期回落 1970-01-01、`---` 被当正文渲染。
  // 由 tests/schema.test.mjs 用 LF 与 CRLF 两份同一稿子的内容把守。
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw)
  const meta = { tags: [] }
  let body = raw
  if (m) {
    body = m[2]
    for (const line of m[1].split('\n')) {
      const i = line.indexOf(':')
      if (i < 0) continue
      const k = line.slice(0, i).trim()
      let v = line.slice(i + 1).trim()
      if (LIST_KEYS.includes(k)) {
        meta[k] = v
          .replace(/^\[|\]$/g, '')
          .split(',')
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
          .filter(Boolean)
      } else if (k) {
        // 引号成对才剥：只写一边的值留着比剥掉更贴近作者写下的东西
        if (/^["'].*["']$/.test(v) && v[0] === v[v.length - 1]) v = v.slice(1, -1)
        meta[k] = v
      }
    }
  }
  return { meta, body, closed: !!m }
}

export function stats(body) {
  const words = body.replace(/\s/g, '').length
  return { words, minutes: Math.max(1, Math.round(words / 400)) }
}

// 一卷里那张封面：按 COVER_NAMES 的顺序认。两张都算（cover.jpg + cover.png）不是"选第一张"，
// 是那卷没定过用哪张——报出来，让作者删掉一张。
function coverOf(files) {
  const hits = COVER_NAMES.filter((n) => files.includes(n))
  return { name: hits[0] || '', dup: hits.length > 1 }
}

// 围栏（```）里的那些行是"给作者看的语法"，不是站内引用：改写与判据都要跳过它们，
// 否则一篇讲怎么写的文章会因为示范了一张图而被门禁拦下。
// 围栏的识别与 src/lib/markdown.js 同一条（行首三个反引号切换状态），未闭合时后面全按代码算，
// 也和那边一致。这一条只实现一次，改写与取正文都用它。
function markProse(body) {
  let fence = false
  return body.split('\n').map((line) => {
    if (/^\s*```/.test(line)) {
      fence = !fence
      return { line, prose: false }
    }
    return { line, prose: !fence }
  })
}

// 正文里的裸文件名 → 这一卷的资产 URL。已经是站内绝对路径（/ 起头）或带协议的不动，
// 交给 src/lib/markdown.js 的白名单判。
function rewriteImages(body, slug, files, problems) {
  const refs = new Set()
  const out = markProse(body)
    .map(({ line, prose }) => {
      if (!prose) return line
      return line.replace(MD_IMG, (all, alt, src) => {
        if (src.includes('..')) {
          problems.push(`正文引用的 \`${src}\` 想跨出这一卷：素材只许平铺在自己那一层`)
          return all
        }
        // 站内绝对路径与带协议的地址不改写，交给 src/lib/markdown.js 的白名单判
        if (/^\//.test(src) || /:/.test(src)) return all
        const name = src.replace(/^\.\//, '') // `./dune.jpg` 与 `dune.jpg` 是同一个意思
        refs.add(name)
        if (!files.includes(name)) {
          problems.push(`正文引用的 \`${name}\` 不在这一卷的目录里（漏放、拼错，或它本该写在别的卷）`)
          return all
        }
        return `![${alt}](${assetUrl(slug, name)})`
      })
    })
    .join('\n')
  return { body: out, refs }
}

// 判据看的正文：围栏那一块与它的 ``` 标记都剔除，示范写法不该被读成站内引用
const proseOnly = (body) =>
  markProse(body)
    .filter((l) => l.prose)
    .map((l) => l.line)
    .join('\n')

// 校验 + 归一：一卷的原文与素材清单进来，可渲染的记录与问题清单出去。
// 纯函数——不碰磁盘，所以门禁、测试、打包三处都能用同一套判据（测试可以凭空造一卷来验判据本身）。
export function normalizeRoll({ slug, raw, files, dirs = [] }) {
  const problems = []
  const notes = []
  const { meta, body, closed } = parseFrontmatter(raw)

  // 素材是平的：/blog/<slug>/<文件名> 一条路由对应一层文件名。再套一层目录，作者就得在正文里
  // 写相对路径，而引用改写只认裸文件名——嵌套的结局是图片静默指空。
  for (const d of dirs) problems.push(`\`${slug}/${d}\` 是子目录：一卷的素材平铺在这一层，图片直接放进来`)

  if (!SLUG_OK.test(slug)) problems.push(`目录名 \`${slug}\` 不能当网址片段（要小写字母/数字/短横线）`)
  if (!closed) problems.push('frontmatter 的两条 `---` 没闭合，整份被当正文渲染')

  const title = meta.title || ''
  const date = meta.date || ''
  const summary = meta.summary || ''
  const alt = meta.alt || ''
  if (!title) problems.push('缺 `title`：列表与阅读页的标题会是空的')
  if (!date) problems.push('缺 `date`：全站按它倒序排，这篇会沉在最末')
  else if (!DATE_OK.test(date)) problems.push(`\`date\` 要写成 2026-10-16 那样，现在的是 \`${date}\`——排序按字符串比，写歪了它就排到别处`)
  else if (!isRealDate(date)) problems.push(`\`date\` \`${date}\` 是这个月没有的一天`)
  if (!meta.tags.length) problems.push('缺 `tags`：列表页那排胶囊筛不到它')
  if (!summary) problems.push('缺 `summary`：列表卡那一行是空的')

  for (const k of Object.keys(meta)) {
    if (!POST_KEYS.includes(k)) problems.push(`frontmatter 里有不认识的键 \`${k}:\`（拼错了就是静默的空值）`)
  }

  const { name: coverName, dup } = coverOf(files)
  if (dup) problems.push(`这一卷里有两张候选封面（${COVER_NAMES.filter((n) => files.includes(n)).join(' 与 ')}），删掉不该上卡的那张`)
  if (coverName && !alt) problems.push(`有封面 \`${coverName}\` 却没写 \`alt\`：读屏软件与图像搜索都只能看见一个空 alt`)
  if (alt && alt.includes(']')) problems.push('`alt` 里有 `]`，它会中断封面那行图片语法')

  const focus = typeof meta.imagePos === 'string' && POS_OK.test(meta.imagePos) ? meta.imagePos : 'center'
  if (meta.imagePos && focus === 'center' && meta.imagePos !== 'center') {
    problems.push(`\`imagePos\` 的值 \`${meta.imagePos}\` 不是合法的 CSS 位置，已回落 center`)
  }

  for (const f of files) {
    if (f.startsWith('.')) continue
    if (!NAME_OK.test(f)) problems.push(`文件名 \`${f}\` 不合口径（要全小写、不带空格；烘图脚本在 PowerShell 5.1 上跑，中文名字会把它咬断）`)
  }

  const { body: bodyOut, refs } = rewriteImages(body, slug, files, problems)
  const prose = proseOnly(body)
  // 手抄的封面行要查在"正文（去掉围栏示范）"上：写成裸文件名 `![x](cover.jpg)` 与写成
  // 全 URL 的那一种都得抓到，否则顶部出现两张同一张图。
  if (coverName && (refs.has(coverName) || prose.includes(assetUrl(slug, coverName)))) {
    problems.push(`正文里手抄了一遍封面 \`${coverName}\`：阅读页顶部那张由这一卷自动放，删掉正文里的那一行`)
  }
  for (const f of files) {
    if (!isPublished(f) || f === coverName || !IMG_EXT.test(f)) continue
    if (!refs.has(f) && !prose.includes(assetUrl(slug, f))) {
      notes.push(`素材 \`${f}\` 既没当封面也没被正文引用——它会上线，但站内没有一处指向它`)
    }
  }

  // `draft` 只认写得明白的那几种。空值（光一行 `draft:`）不当作"是草稿"也不当作"不是"，
  // 而是报出来：把值删掉就等于偷偷发出去，这种口径不能靠猜。
  const draftRaw = 'draft' in meta ? meta.draft : ''
  const draft = DRAFT_ON.test(draftRaw)
  if ('draft' in meta && !DRAFT_ON.test(draftRaw) && !DRAFT_OFF.test(draftRaw)) {
    problems.push(`\`draft: ${draftRaw || '（空）'}\` 不认识，只接受 true/false——留空不算"是草稿"也不算"不是"`)
  }

  // `movedFrom` 登记这篇以前用过的 slug：目录名一改，旧链接就靠它改道到新网址。
  // 跨卷的碰撞（两卷认领同一个旧名、旧名撞上一卷现名）由门禁在全集上查，这里只查单卷能判的。
  const movedFrom = meta.movedFrom || []
  for (const from of movedFrom) {
    if (!SLUG_OK.test(from)) problems.push(`\`movedFrom\` 里的 \`${from}\` 不是合法的 slug（小写字母 / 数字 / 短横线）`)
    if (from === slug) problems.push(`\`movedFrom\` 里写着本卷自己的名字 \`${slug}\`：那是当前网址，不用登记`)
  }

  const record = {
    slug,
    url: postUrl(slug),
    title,
    date: date || '1970-01-01',
    tags: meta.tags || [],
    summary,
    alt,
    imagePos: focus,
    draft,
    movedFrom,
    cover: coverName ? assetUrl(slug, coverName) : '',
    // 字数按作者写的正文计，不含这里构造出来的封面行（URL 那一串不该计进"多少字"）
    ...stats(bodyOut),
    body: coverName ? `![${alt}](${assetUrl(slug, coverName)})\n\n${bodyOut}` : bodyOut,
  }
  return { record, problems, notes }
}

// 「这一卷发不发得出去」也只此一处：浏览器那一岸（列表、精选、映像柜、关于页读数）与
// Node 那一岸（RSS、sitemap、静态壳）都问它，免得出现"页面上没有、RSS 里却有"这种半发布。
export const isLive = (post) => !post.draft

// 全站只此一处排序：文章列表、首页精选、映像柜、RSS、sitemap 都跟着它。
export const sortByDate = (items) => [...items].sort((a, b) => (b.date || '').localeCompare(a.date || ''))

// 旧 slug → 现 slug。PostView 报「这里没有这篇」之前先问这一句。
// 两条规矩：现名永远优先（别名不得盖住一篇真身），草稿不认领别名（那等于从旧网址漏出
// 一篇没打算发的稿子）。
export function findAlias(rolls, slug) {
  if (!slug || rolls.some((r) => r.slug === slug)) return null
  const hit = rolls.find((r) => !r.draft && (r.movedFrom || []).includes(slug))
  return hit ? hit.slug : null
}

// 跨卷的两类碰撞——单卷判不出来，所以门禁拿全集跑这一条：
//   ① 两卷认领同一个旧名：那条旧链接该跳到哪一篇，取决于谁先被读到，这是运气不是设计；
//   ② 某个旧名正好是另一卷的现名：登记方把别人正在用的网址抢走了。
export function aliasClashes(rolls) {
  const owned = new Set(rolls.map((r) => r.slug))
  const claimed = new Map()
  const bad = []
  for (const r of rolls) {
    for (const from of r.movedFrom || []) {
      if (owned.has(from)) bad.push(`\`${from}\` 是一卷的现名，却被 \`${r.slug}\` 登记成旧名——那篇自己的网址会被抢走`)
      else if (claimed.has(from)) bad.push(`\`${from}\` 被两卷同时登记成旧名（${claimed.get(from)} 与 ${r.slug}）`)
      else claimed.set(from, r.slug)
    }
  }
  return bad
}
