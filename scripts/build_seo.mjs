// 构建期 SEO 产物（Node 内置模块，零依赖）：
//   npm run seo:build        → dist/sitemap.xml + dist/rss.xml
//   node scripts/build_seo.mjs --og  → 额外重绘 public/og.png（提交进仓库的分享卡片）
//
// 为什么 RSS/Sitemap 走构建期而不是服务端：GitHub Pages 只读镜像没有后端，
// index.html 里 <link rel="alternate" href="/rss.xml"> 会直接 404。
// 自有域名场景下 nginx 把 /rss.xml 反代给 api.py（动态、含后台上传的文章），
// 那份永远优先，本脚本产物只是镜像兜底。
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'dist')
const POSTS = join(ROOT, 'content', 'posts')

/* ---------------- 站点信息 / 文章 ---------------- */
function siteUrl() {
  const src = readFileSync(join(ROOT, 'src', 'config', 'site.js'), 'utf8')
  const m = src.match(/url:\s*'([^']+)'/)
  return (m ? m[1] : 'https://escaping.top').replace(/\/+$/, '')
}

function parsePosts() {
  if (!existsSync(POSTS)) return []
  const out = []
  for (const name of readdirSync(POSTS)) {
    if (!name.endsWith('.md')) continue
    const raw = readFileSync(join(POSTS, name), 'utf8')
    const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
    const meta = {}
    const body = m ? m[2] : raw
    if (m) {
      for (const line of m[1].split(/\r?\n/)) {
        const i = line.indexOf(':')
        if (i < 0) continue
        meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')
      }
    }
    out.push({
      slug: name.replace(/\.md$/, ''),
      title: meta.title || name.replace(/\.md$/, ''),
      date: meta.date || '1970-01-01',
      summary: meta.summary || '',
      body,
    })
  }
  // 与前端一致：按日期倒序
  return out.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
}

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

const DESC = '日常是引力，把我拉回井底；笔记是逃逸，送我抵达井外。'

/* ---------------- sitemap ---------------- */
const STATIC_ROUTES = ['/', '/blog', '/updates', '/records', '/projects', '/wall', '/about']

function sitemapXml(base, posts) {
  const urls = [
    ...STATIC_ROUTES.map((p) => ({ loc: `${base}${p}`, lastmod: '' })),
    ...posts.map((p) => ({ loc: `${base}/blog/${p.slug}`, lastmod: p.date })),
  ]
  const body = urls
    .map(
      (u) =>
        `<url><loc>${esc(u.loc)}</loc>` + (u.lastmod ? `<lastmod>${esc(u.lastmod)}</lastmod>` : '') + '</url>'
    )
    .join('\n  ')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  ${body}\n</urlset>\n`
}

/* ---------------- rss ---------------- */
function rssXml(base, posts) {
  const items = posts
    .slice(0, 20)
    .map((p) => {
      const link = `${base}/blog/${p.slug}`
      return (
        '<item>' +
        `<title>${esc(p.title)}</title>` +
        `<link>${esc(link)}</link>` +
        `<guid isPermaLink="true">${esc(link)}</guid>` +
        `<pubDate>${rfc822(p.date)}</pubDate>` +
        `<description>${esc(p.summary)}</description>` +
        '</item>'
      )
    })
    .join('')
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<rss version="2.0"><channel>' +
    '<title>Escaping Notes</title>' +
    `<link>${esc(base)}</link>` +
    `<description>${esc(DESC)}</description>` +
    items +
    '</channel></rss>\n'
  )
}

/* ---------------- og.png（长曝光底片，无文字） ---------------- */
const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const t = Buffer.from(type, 'latin1')
  const sum = Buffer.alloc(4)
  sum.writeUInt32BE(crc32(Buffer.concat([t, data])), 0)
  return Buffer.concat([len, t, data, sum])
}

// 逐行自适应滤波（PNG 标准做法，SAD 启发式）。
// 这张图主体是平滑渐变，用预测型滤波（Sub/Up/Paeth）后体积能降一个量级；
// 若一律用 filter 0，1200×630 会接近 700 KB。
function encodePng(w, h, rgb) {
  const stride = w * 3
  const bpp = 3
  const raw = Buffer.alloc((stride + 1) * h)
  const cand = Buffer.alloc(stride)
  const best = Buffer.alloc(stride)
  let prev = null
  for (let y = 0; y < h; y++) {
    const cur = rgb.subarray(y * stride, (y + 1) * stride)
    let bestType = 0
    let bestSad = Infinity
    let bestBuf = cur
    for (let type = 0; type <= 4; type++) {
      let sad = 0
      for (let i = 0; i < stride; i++) {
        const a = i >= bpp ? cur[i - bpp] : 0
        const b = prev ? prev[i] : 0
        const c = prev && i >= bpp ? prev[i - bpp] : 0
        let v
        if (type === 0) v = cur[i]
        else if (type === 1) v = cur[i] - a
        else if (type === 2) v = cur[i] - b
        else if (type === 3) v = cur[i] - ((a + b) >> 1)
        else {
          const p = a + b - c
          const pa = Math.abs(p - a)
          const pb = Math.abs(p - b)
          const pc = Math.abs(p - c)
          v = cur[i] - (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)
        }
        v &= 0xff
        cand[i] = v
        sad += v < 128 ? v : 256 - v
      }
      if (sad < bestSad) {
        bestSad = sad
        bestType = type
        best.set(cand)
        if (type !== 0) bestBuf = best
      }
    }
    const off = y * (stride + 1)
    raw[off] = bestType
    bestBuf.copy(raw, off + 1)
    prev = cur
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // truecolor
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

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

  const N = 150
  for (let n = 0; n < N; n++) {
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
const base = siteUrl()
const posts = parsePosts()

mkdirSync(OUT, { recursive: true })
writeFileSync(join(OUT, 'sitemap.xml'), sitemapXml(base, posts), 'utf8')
writeFileSync(join(OUT, 'rss.xml'), rssXml(base, posts), 'utf8')
console.log(`seo: dist/sitemap.xml (${STATIC_ROUTES.length + posts.length} urls) · dist/rss.xml (${Math.min(posts.length, 20)} items)`)

if (process.argv.includes('--og')) {
  const png = buildOg()
  writeFileSync(join(ROOT, 'public', 'og.png'), png)
  console.log(`seo: public/og.png (1200x630, ${(png.length / 1024).toFixed(1)} KB)`)
}
