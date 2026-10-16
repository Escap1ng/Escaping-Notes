// 静态壳（纯字符串，不碰磁盘）：把构建好的 dist/index.html 的 head 改成「这一页自己的那一份」。
//
// 为什么要有这一步：GitHub Pages 不会把未知路径回退到 index.html，所以 /blog/<slug> 这种地址
// 在过去直接 404——而 sitemap 与 RSS 推广的正是这些地址。写一份真实文件在那里之后，状态码是 200，
// 浏览器拿到的是同一个应用（vite 已把 asset 链接注进 index.html，挂载后照常渲染这一页，观感与
// 站内一致），而读 head 的人（搜索引擎、IM 的分享卡）看到的是这一篇自己的标题与封面。
//
// 要打的那几枚标签列在 TAGS 里，定位方式与"值写在哪个属性上"都由那张表算出来——手写十二条
// 正则的成本是其中一条漏个转义也没人发现。index.html 里少了任何一枚就抛错：少打一份 og:image
// 的后果是分享卡又变回站点那张图，而且静默（见 docs/manual.md §2.6）。

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// 标题的形状与「这里没有页面」那句话都取自文案层：壳、路由、页面渲染读的是同一批字
import { N, pageTitle } from '../../src/data/narrative.js'

// 值写在哪个属性上：<title> 写在标签中间，<link> 写在 href，<meta> 写在 content
const VALUE_ATTR = { title: '', link: 'href', meta: 'content' }

// [键, 标签, 选择用的属性]——键是调用方传的字段名，选择属性在 index.html 里唯一命中那一枚
const TAGS = [
  ['title', 'title', ''],
  ['description', 'meta', 'name="description"'],
  ['canonical', 'link', 'rel="canonical"'],
  ['ogTitle', 'meta', 'property="og:title"'],
  ['ogDescription', 'meta', 'property="og:description"'],
  ['ogUrl', 'meta', 'property="og:url"'],
  ['ogImage', 'meta', 'property="og:image"'],
  ['ogImageAlt', 'meta', 'property="og:image:alt"'],
  ['ogType', 'meta', 'property="og:type"'],
  ['twitterTitle', 'meta', 'name="twitter:title"'],
  ['twitterDescription', 'meta', 'name="twitter:description"'],
  ['twitterImage', 'meta', 'name="twitter:image"'],
]

export const SHELL_KEYS = TAGS.map(([key]) => key)

const patternOf = (tag, sel) =>
  tag === 'title'
    ? /<title>[\s\S]*?<\/title>/
    : new RegExp(`<${tag} ${sel} ${VALUE_ATTR[tag]}="[^"]*"`)

const replacementOf = (tag, sel, value) =>
  tag === 'title'
    ? `<title>${esc(value)}</title>`
    : `<${tag} ${sel} ${VALUE_ATTR[tag]}="${esc(value)}"`

// 封面是长边 1600 的任意比例，而 head 里那两行写的是分享卡的 1200×630。带着错的尺寸上文章页
// 比不带更糟（有的客户端按它决定渲染比例），所以换了图就撤掉这两行。
const IMAGE_SIZE_PAIR =
  /\s*<meta property="og:image:width" content="\d+" \/>\s*<meta property="og:image:height" content="\d+" \/>/

export function buildShell(template, patch = {}) {
  for (const key of Object.keys(patch)) {
    if (key === 'dropImageSize') continue
    if (!SHELL_KEYS.includes(key)) throw new Error(`静态壳：不认识要改的 \`${key}\`（拼错了就是静默不改）`)
  }
  let html = template
  for (const [key, tag, sel] of TAGS) {
    if (patch[key] === undefined) continue
    const re = patternOf(tag, sel)
    // 不带 /g：这里只许命中第一处。head 里同一枚出现两次本来就是错，多换一处等于把它藏起来。
    // 替换函数收到的参数是**匹配到的原文**而不是要写进去的值——直接把它交给 replacementOf
    // 会把整段标签转义后塞进去（我第一版就是这么错的，产出的 head 全是 &lt;title&gt;）。
    if (!re.test(html)) throw new Error(`静态壳：index.html 里找不到 \`${key}\` 那一个标签`)
    // 同一枚出现两次也不放过：那意味着 head 里有两枚 og:title，换第一枚只会让第二枚继续说旧话
    const all = new RegExp(re.source, 'g')
    const hits = (html.match(all) || []).length
    if (hits > 1) throw new Error(`静态壳：\`${key}\` 在 index.html 里出现 ${hits} 次，壳只认一枚`)
    html = html.replace(re, () => replacementOf(tag, sel, patch[key]))
  }
  if (patch.dropImageSize) {
    if (!IMAGE_SIZE_PAIR.test(html)) throw new Error('静态壳：og:image 的尺寸行不是一对，撤不掉')
    html = html.replace(IMAGE_SIZE_PAIR, '')
  }
  return html
}

// head 里这几枚标签必须各存在一枚：缺一枚等于产出一堆分享卡不全的壳，重一枚等于改了
// 第一枚而让第二枚继续说旧话——两种都是静默的，所以在落盘之前一次问清（build_seo 调它）。
export function shellTagAudit(html) {
  const missing = []
  const doubled = []
  for (const [key, tag, sel] of TAGS) {
    const n = (html.match(new RegExp(patternOf(tag, sel).source, 'g')) || []).length
    if (n === 0) missing.push(key)
    else if (n > 1) doubled.push(`${key}×${n}`)
  }
  return { missing, doubled }
}

// 站点在 sitemap 与 RSS 里推广的每一条网址，都得在 dist/ 里有一份真实文件顶着。
// 缺一条就是这一批修复自己的回归：链接发出去了，读者点开是 404。
// （站点根那一份永远是 index.html，调用方把它算进 covered 里。）
export function uncoveredRoutes(plans, routes, postUrls) {
  const covered = new Set(plans.map((p) => p.url))
  const missing = []
  for (const r of routes) if (!covered.has(r) && r !== '/') missing.push(r)
  for (const u of postUrls) if (!covered.has(u)) missing.push(u)
  return missing
}

// 这一页该写进 head 的那几项。三类页面（导航路由 / 一卷文章 / 一个项目）都从这里出，
// 免得「文章的 og 用 summary、项目的 og 用 desc」这类不一致长在两个分支里。
export function shellHead({ base, path, title, description, image, imageAlt, type }) {
  const url = `${base}${path}`
  const head = { title, ogTitle: title, twitterTitle: title, canonical: url, ogUrl: url, ogType: type || 'website' }
  if (description) {
    head.description = description
    head.ogDescription = description
    head.twitterDescription = description
  }
  if (image) {
    const abs = image.startsWith('http') ? image : `${base}${image}`
    head.ogImage = abs
    head.twitterImage = abs
    if (imageAlt) head.ogImageAlt = imageAlt
    head.dropImageSize = true
  }
  return head
}

// 要写哪几份壳、各自落在 dist 的什么位置、head 改成什么——全部在这里算，
// build_seo 只管把结果写到磁盘上。壳写错位置等于深链仍然是 404，而构建全绿。
// file 用 posix 片段（调用方 join 到 outDir），url 与 sitemap/RSS 里的写法逐字一致：
// 都不带尾斜杠，canonical 才不会和推广出去的地址是两个句子。
export function planShells({ base, nav, posts, projects, slugOf }) {
  const plans = []
  for (const n of nav) {
    if (n.to === '/') continue // 根路径那一份就是 index.html 本身
    plans.push({ file: `${n.to.slice(1)}/index.html`, url: n.to, patch: shellHead({ base, path: n.to, title: n.t }) })
  }
  for (const p of posts) {
    plans.push({
      file: `blog/${p.slug}/index.html`,
      url: p.url,
      patch: shellHead({
        base,
        path: p.url,
        title: pageTitle(p.title),
        description: p.summary || undefined,
        image: p.cover || undefined, // 本卷没封面就沿用站点那张 og.png
        imageAlt: p.alt || undefined,
        type: 'article',
      }),
    })
  }
  for (const pr of projects) {
    const slug = slugOf(pr.name)
    const url = `/projects/${slug}`
    plans.push({ file: `projects/${slug}/index.html`, url, patch: shellHead({ base, path: url, title: pageTitle(pr.name), description: pr.desc }) })
  }
  // 拼错的地址与已删的页面：Pages 拿它当 404 的答案（状态码就该是 404），
  // 应用挂载后渲染「这里没有页面」那一态
  plans.push({
    file: '404.html',
    url: '/404.html',
    patch: shellHead({ base, path: '/404.html', title: pageTitle(N.nf.title), description: N.nf.text }),
  })
  return plans
}
