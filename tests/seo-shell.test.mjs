// 静态壳的钉子：head 的改写、壳的落点、以及"站内只有一种路由模式"这条。
// 壳写错位置或写歪一枚 og，后果是深链仍然 404 / 分享卡仍是站点那张图，而且构建全绿——
// 所以这一文件的每一条都带着自己的假样本。跑法：npm test
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { SHELL_KEYS, buildShell, planShells, shellHead, shellTagAudit, uncoveredRoutes } from '../scripts/lib/shell.mjs'
import { legacyPath } from '../src/lib/legacy.js'
import { N, navTitle, pageTitle } from '../src/data/narrative.js'
import { projects } from '../src/data/projects.js'
import { site } from '../src/data/site.js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = (p) => readFileSync(join(ROOT, p), 'utf8')
const tracked = () =>
  execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).split(/\r?\n/).filter(Boolean)

const TPL = src('index.html')
const BASE = site.url
const pick = (html, re) => (re.exec(html) || [])[1]

/* ---------------- head 的改写 ---------------- */

test('index.html 的 head 里，壳要改的那几枚各存在一次', () => {
  const audit = shellTagAudit(TPL)
  assert.deepEqual(audit.missing, [])
  assert.deepEqual(audit.doubled, [])
  assert.ok(SHELL_KEYS.length >= 12)
})

test('改后的值取自 patch，不是被匹配到的原文（第一版就错在这儿）', () => {
  const html = buildShell(TPL, {
    title: '甲 · 站名',
    ogTitle: '甲 · 站名',
    twitterTitle: '甲 · 站名',
    description: '一句 & 带"引号"的话',
    canonical: `${BASE}/blog/jia`,
    ogUrl: `${BASE}/blog/jia`,
  })
  assert.equal(pick(html, /<title>(.*?)<\/title>/), '甲 · 站名')
  assert.equal(pick(html, /property="og:title" content="([^"]*)"/), '甲 · 站名')
  // & 与 " 都必须转义：content 里一枚裸引号会把这行标签从中间截断，后半截掉进别的属性里去
  assert.equal(pick(html, /name="description" content="([^"]*)"/), '一句 &amp; 带&quot;引号&quot;的话')
  assert.equal(pick(html, /rel="canonical" href="([^"]*)"/), `${BASE}/blog/jia`)
  assert.equal(pick(html, /property="og:url" content="([^"]*)"/), `${BASE}/blog/jia`)
})

test('没要求改的标签原样留着（壳只动它认识的那几枚）', () => {
  const html = buildShell(TPL, { title: '只改标题' })
  assert.ok(html.includes('property="og:site_name"'))
  assert.ok(html.includes('property="og:image:width"'))
  assert.ok(html.includes('<link rel="alternate" type="application/rss+xml"'))
  assert.equal(pick(html, /property="og:image" content="([^"]*)"/), `${BASE}/og.png`)
})

test('换掉封面就撤掉那两行 1200×630（带着错的尺寸比不带更糟）', () => {
  const withCover = buildShell(TPL, shellHead({ base: BASE, path: '/blog/jia', title: '甲', image: '/blog/jia/cover.jpg', imageAlt: '一张图' }))
  assert.ok(!withCover.includes('og:image:width'))
  assert.equal(pick(withCover, /property="og:image" content="([^"]*)"/), `${BASE}/blog/jia/cover.jpg`)
  assert.equal(pick(withCover, /property="og:image:alt" content="([^"]*)"/), '一张图')
  assert.equal(pick(withCover, /name="twitter:image" content="([^"]*)"/), `${BASE}/blog/jia/cover.jpg`)
  assert.equal(pick(withCover, /property="og:type" content="([^"]*)"/), 'website')
})

/* ---------------- 判据必须能失败 ---------------- */

test('四种坏情况都抛错，而不是静默少写一份 og', () => {
  assert.throws(() => buildShell(TPL, { ogTile: '拼错键名' }), /不认识/)
  const noImage = TPL.replace(/<meta property="og:image" content="[^"]*" \/>/, '')
  assert.throws(() => buildShell(noImage, { ogImage: `${BASE}/x.jpg` }), /找不到/)
  const doubled = TPL.replace('</title>', '</title>\n    <title>第二枚</title>')
  assert.throws(() => buildShell(doubled, { title: '甲' }), /出现 2 次/)
  assert.deepEqual(shellTagAudit(doubled).doubled, ['title×2'])
  const noSizes = TPL.replace(/<meta property="og:image:width"[^>]*\/>\s*<meta property="og:image:height"[^>]*\/>/, '')
  assert.throws(() => buildShell(noSizes, { dropImageSize: true }), /尺寸行/)
})

/* ---------------- 壳落在 dist 的哪里 ---------------- */

const FAKE = {
  base: BASE,
  nav: N.nav,
  posts: [
    { slug: 'jia', url: '/blog/jia', title: '甲', summary: '甲的摘要', alt: '甲的画面', cover: '/blog/jia/cover.jpg' },
    { slug: 'yi', url: '/blog/yi', title: '乙', summary: '', alt: '', cover: '' },
  ],
  projects: [{ name: 'Demo One', desc: '一个演示' }],
  slugOf: (n) => n.trim().replace(/\s+/g, '-'),
}

test('计划里有导航、每一卷、每一个项目与一份 404，根路径不重复写', () => {
  const plans = planShells(FAKE)
  const files = plans.map((p) => p.file)
  assert.deepEqual(files.slice(0, 5), ['blog/index.html', 'updates/index.html', 'gallery/index.html', 'projects/index.html', 'about/index.html'])
  assert.deepEqual(files.slice(5), ['blog/jia/index.html', 'blog/yi/index.html', 'projects/Demo-One/index.html', '404.html'])
  assert.ok(!files.includes('index.html'), '站点根那份就是 index.html，不该再写一遍')
  assert.equal(files[files.length - 1], '404.html')
  for (const p of plans) assert.ok(p.url.startsWith('/') && !p.url.endsWith('/'), `${p.url} 的写法要和 sitemap 逐字一致`)
})

test('每份壳的 canonical、og:url 与它自己的网址是同一个串，标题形状取自 pageTitle', () => {
  for (const p of planShells(FAKE)) {
    assert.equal(p.patch.canonical, `${BASE}${p.url}`)
    assert.equal(p.patch.ogUrl, `${BASE}${p.url}`)
    assert.ok(p.patch.title && p.patch.title === p.patch.ogTitle && p.patch.title === p.patch.twitterTitle)
  }
  const post = planShells(FAKE).find((p) => p.url === '/blog/jia')
  assert.equal(post.patch.title, pageTitle('甲'))
  assert.equal(post.patch.ogType, 'article')
  assert.equal(post.patch.description, '甲的摘要')
  const bare = planShells(FAKE).find((p) => p.url === '/blog/yi')
  assert.equal(bare.patch.ogType, 'article')
  assert.ok(!('ogImage' in bare.patch), '本卷没封面却给个不存在的图，比沿用站点 og.png 更坏')
  assert.equal(pick(buildShell(TPL, bare.patch), /property="og:image" content="([^"]*)"/), `${BASE}/og.png`)
})

test('sitemap 推广的每条网址都有一份壳顶着；漏一条就报出来', () => {
  const plans = planShells(FAKE)
  const routes = N.nav.map((n) => n.to)
  assert.deepEqual(uncoveredRoutes(plans, routes, ['/blog/jia', '/blog/yi']), [])
  // 反向：新加一条导航却忘了让它进 N.nav，或者多了一卷而壳没算到它，都必须被抓到
  assert.deepEqual(uncoveredRoutes(plans, [...routes, '/reading'], []), ['/reading'])
  assert.deepEqual(uncoveredRoutes(plans, routes, ['/blog/jia', '/blog/漏的那卷']), ['/blog/漏的那卷'])
  // 站点根那份就是 index.html，不该被报成缺
  assert.deepEqual(uncoveredRoutes([], ['/'], []), [])
})

test('仓库里现役的每一份壳都算得出合法路径（项目名带 / 就会被当场抓到）', () => {
  const plans = planShells({ base: BASE, nav: N.nav, posts: [], projects, slugOf: (n) => n.trim().replace(/\s+/g, '-') })
  for (const p of plans) {
    assert.ok(!p.file.includes('\\') && !p.file.includes('//') && !p.file.split('/').includes('..'), p.file)
    assert.ok(p.file.length < 200, `${p.file} 长得不像一个文件名`)
  }
})

/* ---------------- 站内只有一种路由模式 ---------------- */

test('hash 模式与 mode=pages 这一整套已经拆干净，代码里不再读 VITE_DEPLOY', () => {
  // 扫描面是 src/ 与 scripts/ 的代码 + 两份配置：tests/ 里为了写判据而提到这些名字是合法的，
  // 把它们算进去这条规则就永远命中自己（这一族坑我这一轮踩过三次）
  const code = tracked().filter(
    (f) => (f.startsWith('src/') || f.startsWith('scripts/')) && /\.(js|mjs|vue)$/.test(f)
  )
  assert.ok(code.length > 25, '扫描面这么小，说明清单没读到')
  for (const f of code) assert.ok(!src(f).includes('VITE_DEPLOY'), `${f} 还在读构建模式`)
  for (const f of code) assert.ok(!src(f).includes('createWebHashHistory'), `${f} 还挂着 hash 路由`)
  assert.ok(!tracked().includes('.env.pages'))
  const pkg = src('package.json')
  assert.ok(!pkg.includes('build:pages'), 'package.json 还留着 pages 那一档构建')
  const flow = src('.github/workflows/deploy.yml')
  assert.ok(!flow.includes('build:pages') && flow.includes('npm run build'))
})

test('旧的 #/ 链接在挂载前改道，且只许改到本站的路径上', () => {
  const boot = src('src/main.js')
  assert.ok(boot.includes('legacyPath'), 'main.js 不再认旧链接形状')
  assert.ok(boot.indexOf('replaceState') < boot.indexOf('mount'), '改道必须排在应用挂载之前')
  // 能改道的
  assert.equal(legacyPath('#/blog/jia'), '/blog/jia')
  assert.equal(legacyPath('#/blog?q=%E6%98%9F'), '/blog?q=星')
  assert.equal(legacyPath('#/'), '/')
  // 不能改道的：页内锚点、跨站形状、畸形转义、带空格
  for (const bad of ['#h-3', '#h-3/', '//evil.com/x', '#/\\evil', '#/%zz', '#/a b', '#/../../etc', '']) {
    assert.equal(legacyPath(bad), '', `${bad} 不该被当成一条站内旧路径`)
  }
})

test('草稿「不进产物」这条只有一个判据，三个地方问的是同一句', () => {
  // 浏览器那一岸（列表/精选/读数/映像柜）、RSS 与 sitemap 与壳、以及构建拷素材那一步。
  // 三处各写一遍 `!post.draft` 的话，总有一处会漏——症状是页面看不到它、RSS 里却带着全文
  const isLive = /isLive/
  assert.match(src('src/lib/posts.js'), isLive)
  assert.match(src('scripts/build_seo.mjs'), isLive)
  assert.match(src('vite.config.js'), isLive)
  assert.match(src('src/lib/schema.js'), /export const isLive/)
})

test('标题的形状只有一处：路由与壳都从 pageTitle / N.nav 的 t 取', () => {
  assert.ok(!src('src/router/index.js').includes('Escaping Notes'), 'router 里还写着站名字面量')
  assert.ok(src('src/views/PostView.vue').includes('pageTitle('))
  assert.equal(navTitle('/blog'), '文章 · Escaping Notes')
  assert.equal(pageTitle('文章'), navTitle('/blog'))
  assert.equal(navTitle('/'), 'Escaping Notes · 逃逸笔记') // 根那一份是另一种形状，故意不套 pageTitle
  for (const n of N.nav) if (n.to !== '/') assert.equal(n.t, pageTitle(n.label))
})
