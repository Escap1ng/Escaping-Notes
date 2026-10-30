// 构建期 SEO 产物（Node 内置模块 + 站内的源码，零外部依赖）：
//   npm run seo:build          → dist/sitemap.xml + dist/rss.xml
//   node scripts/build_seo.mjs --og → 额外重绘 public/og.png（提交进仓库的分享卡片）
//
// RSS/Sitemap 走构建期：站点是纯静态的（GitHub Pages），没有服务端能动态生成这两个文件，
// 而 index.html 里 <link rel="alternate" href="/rss.xml"> 指向的就是这份产物。
//
// 这个文件不许自己解析 frontmatter：字段口径、封面派生、日期判据都在 src/lib/schema.js，
// 由浏览器那一岸共用。过去这里抄了一份，结果 tags 从来没进过 RSS、缺标题时页面与 RSS
// 一边给空串一边给 slug。现在直接 import 那一岸用的模块（它们都不带 vue / import.meta）。
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderMarkdown } from '../src/lib/markdown.js'
import { isLive, sortByDate } from '../src/lib/schema.js'
import { collectionHref } from '../src/lib/collections.js'
import { projectSlug } from '../src/lib/projects.js'
import { content } from '../src/data/index.js'
import { N } from '../src/data/narrative.js'
import { buildShell, planShells, shellTagAudit, uncoveredRoutes } from './lib/shell.mjs'
import { inspectPosts } from './check_content.mjs'
import { encodePng } from './lib/png.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'dist')
// 站点信息、项目与合集都从那道门取：src/data/index.js 不带 vue，Node 这一岸也 import 得动——
// 浏览器那一岸与这一岸读的是同一个对象，不是两份各自的 import 清单
const { site, projects, collections } = content

/* ---------------- 站点信息 / 文章 ---------------- */
const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// 用 UTC 拼 RFC 822（RSS pubDate 要求），避免依赖构建机时区
function rfc822(date) {
  const d = new Date(`${date}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return ''
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const p = (n) => String(n).padStart(2, '0')
  return `${days[d.getUTCDay()]}, ${p(d.getUTCDate())} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()} 00:00:00 GMT`
}

/* ---------------- sitemap ---------------- */
// 静态路由不在这里另写一份：顶栏那排导航就是站点结构本身（见 design.md §6.3）
const STATIC_ROUTES = N.nav.map((n) => n.to)
// 合集详情不在导航上，但每一页都是真实网址：sitemap 要推广、每页也要一份壳
const COLLECTION_ROUTES = collections.map((c) => collectionHref(c.slug))

function sitemapXml(base, posts) {
  const urls = [
    ...STATIC_ROUTES.map((p) => ({ loc: `${base}${p}`, lastmod: '' })),
    ...COLLECTION_ROUTES.map((p) => ({ loc: `${base}${p}`, lastmod: '' })),
    ...posts.map((p) => ({ loc: `${base}${p.url}`, lastmod: p.date })),
  ]
  const body = urls
    .map((u) => `<url><loc>${esc(u.loc)}</loc>` + (u.lastmod ? `<lastmod>${esc(u.lastmod)}</lastmod>` : '') + '</url>')
    .join('\n  ')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  ${body}\n</urlset>\n`
}

/* ---------------- rss ---------------- */
function rssXml(base, posts) {
  const items = posts
    .slice(0, 20)
    .map((p) => {
      const link = `${base}${p.url}`
      const cats = p.tags.map((t) => `<category>${esc(t)}</category>`).join('')
      // 全文进 content:encoded：阅读器里能直接读完，不必先跳一次站。正文顶部那张封面
      // 由 schema 从卷目录构造出来，所以这里也自然带着它——和线上是同一串 HTML。
      const html = renderMarkdown(p.body).html
      return (
        '<item>' +
        `<title>${esc(p.title)}</title>` +
        `<link>${esc(link)}</link>` +
        `<guid isPermaLink="true">${esc(link)}</guid>` +
        `<pubDate>${rfc822(p.date)}</pubDate>` +
        `<description>${esc(p.summary)}</description>` +
        cats +
        `<content:encoded><![CDATA[${html.replace(/]]>/g, ']]]]><![CDATA[>')}]]></content:encoded>` +
        '</item>'
      )
    })
    .join('')
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"' +
    ' xmlns:atom="http://www.w3.org/2005/Atom"><channel>' +
    `<title>${esc(site.name)}</title>` +
    `<link>${esc(base)}</link>` +
    `<description>${esc(N.description)}</description>` +
    `<language>zh-CN</language>` +
    `<managingEditor>${esc(site.email)} (${esc(site.author)})</managingEditor>` +
    `<atom:link href="${esc(base)}/rss.xml" rel="self" type="application/rss+xml"/>` +
    items +
    '</channel></rss>\n'
  )
}

/* ---------------- 静态壳（深链、分享卡、状态码） ---------------- */
// dist/ 里每一条真实路由都要有一份服务器能直接答出来的 HTML：状态码 200，head 写的是这一页
// 自己的标题与封面。文件里带着同一个应用（vite 已把 asset 链接注进 index.html），挂载后照常
// 渲染这一页，所以观感与站内一致——这一步只换 head，不重排任何版式。
// 写哪几份、落在哪里、head 成什么样都由 planShells 算（scripts/lib/shell.mjs，可凭空测），
// 这里只负责读模板与落盘。
// 首帧要跑的视图块。路由是按路径动态 import 的，浏览器拿到入口 chunk 之后才知道去取哪一块；
// 把这一块写进 <link rel=modulepreload>，它就与入口并行起跑，少一跳（4G 上约一次 RTT）。
const VIEW_OF = (url) => {
  if (url === '/') return 'src/views/HomeView.vue'
  if (url === '/blog') return 'src/views/BlogView.vue'
  if (url.startsWith('/blog/')) return 'src/views/PostView.vue'
  if (url === '/collections') return 'src/views/CollectionsView.vue'
  if (url.startsWith('/collections/')) return 'src/views/CollectionView.vue'
  if (url === '/updates') return 'src/views/UpdatesView.vue'
  if (url === '/gallery') return 'src/views/GalleryView.vue'
  if (url === '/projects') return 'src/views/ProjectsView.vue'
  if (url.startsWith('/projects/')) return 'src/views/ProjectView.vue'
  if (url === '/about') return 'src/views/AboutView.vue'
  if (url === '/404.html') return 'src/views/NotFoundView.vue'
  return null
}

function routeAssets(html, manifest, view) {
  if (!view) return html
  const m = manifest[view]
  if (!m) throw new Error(`视图预载：构建清单里没有 ${view}（vite.config.js 的 build.manifest 开着吗？）`)
  // data-route-asset 是给"单独重跑 seo:build"认的记号：下一次进来先把旧标记整段摘掉，
  // 否则根路径模板里的 HomeView 预载会串进每一份壳
  const tags = [`<link rel="modulepreload" crossorigin data-route-asset href="/${m.file}">`]
  // 视图自己的 scoped CSS 也一起排进去：不写的话它要等视图 chunk 执行后才由 JS 插入
  for (const css of m.css || []) tags.push(`<link rel="stylesheet" crossorigin data-route-asset href="/${css}">`)
  if (!html.includes('</head>')) throw new Error('视图预载：HTML 里没有 </head>')
  const fresh = tags.filter((tag) => !html.includes(`href="${tag.match(/href="([^"]+)"/)[1]}"`))
  if (!fresh.length) return html
  return html.replace('</head>', `  ${fresh.join('\n    ')}\n  </head>`)
}

function emitShells(base, posts) {
  // 重跑 seo:build 时 dist/index.html 已带着上一次的视图预载：先摘干净再当模板
  const tpl = readFileSync(join(OUT, 'index.html'), 'utf8').replace(/[ \t]*<link[^>]*data-route-asset[^>]*>\n?/g, '')
  const manifestFile = join(OUT, '.vite/manifest.json')
  if (!existsSync(manifestFile)) throw new Error('静态壳：dist/.vite/manifest.json 不存在，先跑 vite build')
  const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'))
  const audit = shellTagAudit(tpl)
  if (audit.missing.length || audit.doubled.length) {
    throw new Error(
      `静态壳：index.html 的 head 里 ${audit.missing.length ? `缺 ${audit.missing.join(' / ')}` : ''}` +
        `${audit.doubled.length ? ` 重复 ${audit.doubled.join(' / ')}` : ''}`
    )
  }
  const plans = planShells({ base, nav: N.nav, posts, projects, collections, slugOf: projectSlug })
  // 先验覆盖再落盘：sitemap 与 RSS 会把每一条网址推广出去，少一份壳就是发出去一条 404
  const gaps = uncoveredRoutes(
    plans,
    [...STATIC_ROUTES, ...COLLECTION_ROUTES],
    posts.map((p) => p.url)
  )
  if (gaps.length) throw new Error(`静态壳：${gaps.join(' / ')} 在 dist/ 里没有对应的文件，却会被写进 sitemap`)
  for (const s of plans) {
    const file = join(OUT, ...s.file.split('/'))
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, routeAssets(buildShell(tpl, s.patch), manifest, VIEW_OF(s.url)), 'utf8')
  }
  // 根路径那一份最后写：它也是所有壳的模板，先把壳都产完，根路径的预载才不会串到别的页
  writeFileSync(join(OUT, 'index.html'), routeAssets(tpl, manifest, VIEW_OF('/')), 'utf8')
  return plans
}

/* ---------------- og.png（长曝光底片，无文字） ---------------- */
// PNG 编码器抽到 scripts/lib/png.mjs 与 README 配图共用；抽前后 og.png 必须逐字节一致。

// 与 StarTrails 同源的三档色温：冷白 / 暖白 / 琥珀
const TRAIL = [
  [142, 201, 255],
  [255, 247, 237],
  [255, 176, 84],
]
const BANDS = [
  [0.03, 0.32],
  [0.36, 0.55],
  [0.59, 0.8],
  [0.84, 1],
]

function buildOg(W = 1200, H = 630) {
  const px = new Float32Array(W * H * 3)
  const pole = { x: W * 0.62, y: H * 0.4 }
  const maxR = Math.hypot(Math.max(pole.x, W - pole.x), Math.max(pole.y, H - pole.y))

  // 底：近纯黑 + 天极处一层极淡的暖辉，中心亮、四角沉（长曝光的暗角）
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - pole.x, y - pole.y) / maxR
      const glow = Math.max(0, 1 - d * 2.1) ** 2
      const i = (y * W + x) * 3
      px[i] = 3 + glow * 22
      px[i + 1] = 3 + glow * 13
      px[i + 2] = 6 + glow * 9
    }
  }

  // 星轨：同心弧按带分布，随机起点/弧长/亮度，加性叠出"曝光累积"
  let seed = 20260912
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)

  const band = (rn) => {
    const tot = BANDS.reduce((s, b) => s + (b[1] - b[0]), 0)
    let u = rn * tot
    for (const b of BANDS) {
      const w = b[1] - b[0]
      if (u <= w) return b[0] + u
      u -= w
    }
    return 1
  }

  const splat = (x, y, col, a, rad) => {
    const x0 = Math.max(0, Math.floor(x - rad))
    const x1 = Math.min(W - 1, Math.ceil(x + rad))
    const y0 = Math.max(0, Math.floor(y - rad))
    const y1 = Math.min(H - 1, Math.ceil(y + rad))
    const r2 = rad * rad
    for (let py = y0; py <= y1; py++) {
      for (let pxx = x0; pxx <= x1; pxx++) {
        const dd = (pxx - x) ** 2 + (py - y) ** 2
        if (dd > r2) continue
        const f = a * (1 - dd / r2) ** 2
        const i = (py * W + pxx) * 3
        px[i] += col[0] * f
        px[i + 1] += col[1] * f
        px[i + 2] += col[2] * f
      }
    }
  }

  const N_TRAIL = 150
  for (let n = 0; n < N_TRAIL; n++) {
    const R = band(rnd()) * maxR * 0.96 + 24
    const a0 = rnd() * Math.PI * 2
    const span = 0.5 + rnd() * 2.4 // 弧长 rad
    const tier = rnd() < 0.62 ? 0 : rnd() < 0.82 ? 1 : 2
    const col = TRAIL[tier]
    const bright = 0.16 + rnd() * 0.3
    const steps = Math.max(24, Math.round((span * R) / 0.8))
    for (let s = 0; s <= steps; s++) {
      const t = s / steps
      const a = a0 + span * t
      // 首尾渐隐：两端细弱，中段最实（像被快门裁过的弧）
      const env = Math.sin(Math.PI * t) ** 0.7
      splat(
        pole.x + Math.cos(a) * R,
        pole.y + Math.sin(a) * R,
        col,
        bright * env * 0.5,
        2.4 + R * 0.004
      )
    }
  }

  // 左下文字底衬方向的压暗：给"封面若有标题"预留低干扰区
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 3
      const k = 1 - 0.62 * Math.max(0, 1 - Math.hypot(x / W, (H - y) / H) * 1.15) ** 2
      px[i] *= k
      px[i + 1] *= k
      px[i + 2] *= k
    }
  }

  // 3×3 轻模糊：长曝光本来就是连续的软轨迹，这一步既贴合观感，
  // 又抹掉逐像素噪声、显著减小 PNG 体积（本图的体积主要由高频细节决定）。
  const blur = new Float32Array(px.length)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let r = 0
      let g = 0
      let b = 0
      let n = 0
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy
        if (yy < 0 || yy >= H) continue
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx
          if (xx < 0 || xx >= W) continue
          const j = (yy * W + xx) * 3
          r += px[j]
          g += px[j + 1]
          b += px[j + 2]
          n++
        }
      }
      const i = (y * W + x) * 3
      blur[i] = r / n
      blur[i + 1] = g / n
      blur[i + 2] = b / n
    }
  }

  const rgb = Buffer.alloc(W * H * 3)
  for (let i = 0; i < blur.length; i++) {
    const v0 = blur[i]
    const v = 255 * (1 - Math.exp(-v0 / 255))
    rgb[i] = v < 0 ? 0 : v > 255 ? 255 : Math.round(v)
  }
  return encodePng(W, H, rgb)
}

/* ---------------- 执行 ---------------- */
// 门禁在构建里已经拦过一次；单独跑 seo:build 时这里再拦一次，
// 免得一份带问题日期的文章写进 pubDate 空着的文件里。
const found = inspectPosts(ROOT)
if (found.problems.length) {
  for (const p of found.problems) console.error(`seo: ${p}`)
  throw new Error(`发文门禁：${found.problems.length} 个问题，不出 sitemap/RSS`)
}
const all = found.rolls.map((r) => r.record)
// 草稿不进 RSS、不进 sitemap、也不写壳：判据与浏览器那一岸同一条（src/lib/schema.js 的 isLive）
const posts = sortByDate(all.filter(isLive))
const drafts = all.length - posts.length
const base = site.url.replace(/\/+$/, '')

mkdirSync(OUT, { recursive: true })
writeFileSync(join(OUT, 'sitemap.xml'), sitemapXml(base, posts), 'utf8')
writeFileSync(join(OUT, 'rss.xml'), rssXml(base, posts), 'utf8')
console.log(
  `seo: dist/sitemap.xml (${STATIC_ROUTES.length + COLLECTION_ROUTES.length + posts.length} urls) · dist/rss.xml (${Math.min(posts.length, 20)} items，全文)` +
    (drafts ? ` · ${drafts} 篇草稿不进产物` : '')
)

const shells = emitShells(base, posts)
console.log(
  `seo: 静态壳 ${shells.length} 份 · 导航 ${STATIC_ROUTES.length - 1} · 合集 ${collections.length} · 文章 ${posts.length} · 项目 ${projects.length} · 404 一份`
)

if (process.argv.includes('--og')) {
  const png = buildOg()
  writeFileSync(join(ROOT, 'public', 'og.png'), png)
  console.log(`seo: public/og.png (1200x630, ${(png.length / 1024).toFixed(1)} KB)`)
}
