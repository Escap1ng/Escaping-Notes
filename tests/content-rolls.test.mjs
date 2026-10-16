// 卷目录与门禁的对拍：真读 content/posts/、真跑校验器，并且验"这一份口径确实只有一份"。
// 过去站内没有任何一条检查读过 content/posts/——封面漏了、日期写歪、键拼错，
// 全都是"构建绿、线上 404 或空块"。这一文件是那条空档的封口。跑法：npm test
import { existsSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { exitCode, formatReceipt, inspectPosts } from '../scripts/check_content.mjs'
import { INDEX_NAME } from '../src/lib/schema.js'
import { site } from '../src/data/site.js'
import { N } from '../src/data/narrative.js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = (p) => readFileSync(join(ROOT, p), 'utf8')
const tracked = () =>
  execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).split(/\r?\n/).filter(Boolean)
const found = inspectPosts(ROOT)

test('仓库里的每一卷都过门禁：0 问题，且每卷都解析得出记录', () => {
  assert.ok(found.rolls.length >= 1, '一卷都没读到，这条测试就成了假绿')
  assert.deepEqual(found.problems, [])
  for (const r of found.rolls) {
    assert.ok(r.dir, `${r.slug} 不在卷目录里（顶层散落的 md 不会被发布）`)
    assert.ok(r.record, `${r.slug} 没有可解析的 ${INDEX_NAME}`)
  }
})

test('封面的网址由目录构造，磁盘上就得真有那张文件', () => {
  for (const r of found.rolls) {
    if (!r.record.cover) continue
    assert.equal(r.record.cover, `/blog/${r.slug}/cover.jpg`)
    assert.ok(existsSync(join(r.dir, 'cover.jpg')), `${r.slug}/cover.jpg 缺文件`)
  }
})

test('frontmatter 里不再有 image，正文里不再手抄封面', () => {
  // 这两条是迁移守卫：旧写法不会报错，只会让阅读页顶部出现两张同一张图
  for (const r of found.rolls) {
    assert.ok(!/^image:\s/m.test(r.raw), `${r.slug} 还写着 image: ——封面现在由目录决定`)
    assert.ok(!r.raw.replace(/^---[\s\S]*?---/, '').includes(`/blog/${r.slug}/cover.jpg`),
      `${r.slug} 正文里手抄了一遍封面`)
  }
})

test('门禁会红：退出码认得出"没问题"、"有问题"和"一卷都没有"三种情况', () => {
  assert.equal(exitCode({ rolls: found.rolls, problems: [] }), 0)
  assert.equal(exitCode({ rolls: found.rolls, problems: ['某条判据'] }), 1)
  assert.equal(exitCode({ rolls: [], problems: [] }), 1)
  // 判据量得动：拿一个没有 content/posts 的目录当根，读到的必须是 0 卷而不是假绿
  assert.deepEqual(inspectPosts(join(ROOT, 'tests')).rolls, [])
})

test('回执一行一卷，问题与提示另起行且带上卷名', () => {
  const lines = formatReceipt(found)
  assert.equal(lines[0], `发文回执 · ${found.rolls.length} 卷`)
  assert.equal(lines.length, 1 + found.rolls.length + found.notes.length + found.problems.length)
  for (const l of lines.slice(1, 1 + found.rolls.length)) assert.ok(/ {2}\S/.test(l))
})

/* ---------------- 一份口径，两个岸 ---------------- */

test('schema.js 两端都 import 得动：不带 vue、node:fs、import.meta', () => {
  // 只量代码行：这个文件开头的注释就写着"不许出现 import.meta.*、node:fs、vue"，
  // 连注释一起查会变成永远红——那是量具自己的假阳，不是判据抓到了东西。
  const code = src('src/lib/schema.js')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n')
  for (const banned of ["from 'vue'", 'node:fs', 'import.meta']) {
    assert.ok(!code.includes(banned), `schema.js 的代码行里出现了 ${banned} —— 另一岸就 import 不动`)
  }
})

test('浏览器那一岸从 virtual:rolls 拿素材清单，从 schema 拿判据', () => {
  const s = src('src/lib/posts.js')
  assert.ok(s.includes("from 'virtual:rolls'"))
  assert.ok(s.includes("from './schema.js'"))
  assert.ok(s.includes('/content/posts/*/index.md'))
})

test('全站只剩一份 frontmatter 解析：代码里不许有第二份', () => {
  // 扫描按 git 跟踪清单来，不按扩展名猜：上一版就是 build_seo.mjs 里另抄了一条正则，
  // tags 从来没进 RSS、缺标题时页面给空串而 RSS 给 slug。
  const code = tracked().filter((f) => /\.(js|mjs|vue|py)$/.test(f) && f !== 'src/lib/schema.js')
  assert.ok(code.length > 20, '扫描面这么小，说明清单没读到，这条测试是假的')
  // 两条扫描的面不一样大：实现只许存在于 src/ 与 scripts/，而 tests/ 里为了造夹具写出
  // 同名函数与同样的正则是合法写法——把它们也算进"实现"这一条，这条扫描就会命中自己。
  const impl = code.filter((f) => !f.startsWith('tests/'))
  // 旧文件名拼出来而不是写全名：引用那一条扫得到本文件，字面量写在这儿就成了自我命中
  const OLD_PARSER = 'lib/' + 'frontmatter' + '.js'
  for (const f of impl) {
    const text = src(f)
    assert.ok(!/---\\r\?\\n/.test(text), `${f} 里又抄了一条 frontmatter 正则`)
    assert.ok(!/function\s+parseFrontmatter/.test(text), `${f} 里自己实现了一遍解析`)
  }
  for (const f of code) {
    assert.ok(!src(f).includes(OLD_PARSER), `${f} 还在引用已退役的 src/${OLD_PARSER}`)
  }
  assert.ok(src('scripts/build_seo.mjs').includes("from '../src/lib/schema.js'"))
  assert.ok(src('scripts/build_seo.mjs').includes("from '../src/data/index.js'"))
  const deploy = src('.github/workflows/deploy.yml')
  assert.ok(deploy.includes('npm test'), 'deploy.yml 不再跑测试了')
  assert.ok(deploy.includes('npm run check'), 'deploy.yml 不再跑门禁了')
})

test('构建配置里带着那条 /blog/<slug>/ 的资产路由与拷贝', () => {
  const s = src('vite.config.js')
  assert.ok(s.includes('parseRollUrl'), 'dev 的素材中间件不在了')
  assert.ok(s.includes('closeBundle'), '构建期不再把卷素材拷进 outDir')
  assert.ok(s.includes('virtual:rolls'))
})

test('旧 slug 的改道住在路由里，表由构建期算好', () => {
  const router = src('src/router/index.js')
  assert.ok(router.includes('beforeResolve'), '改道没挂在路由上')
  assert.ok(router.includes('rollRoutes'), '路由没查那张表')
  assert.ok(!/router\.(push|replace)\(/.test(src('src/views/PostView.vue')), '详情页又开始自己跳了')
  // 规则的实现在 schema（findAlias），插件只是把候选旧名递过去——别在别处再写一遍 includes
  assert.ok(src('vite.config.js').includes('findAlias'))
  assert.ok(!src('src/views/PostView.vue').includes('movedFrom'))
})

test('public/posts/ 与那份退役的旧解析器都不复存在', () => {
  assert.ok(!existsSync(join(ROOT, 'src', 'lib', 'frontmatter.js')))
  assert.ok(!existsSync(join(ROOT, 'public', 'posts')))
  assert.ok(!tracked().some((f) => f.startsWith('public/posts/')))
})

/* ---------------- 域名与副标题：写死的地方各只有一处，且对得上 ---------------- */

test('index.html 里的域名与 src/data/site.js 的 url 同一条（换域名不再靠人记两处）', () => {
  const html = src('index.html')
  const origin = site.url.replace(/\/+$/, '')
  const hits = [...html.matchAll(/(?:href|content)="([^"]*escaping[^"]*)"/g)].map((m) => m[1])
  // canonical / og:url / og:image / twitter:image —— 少一处或多一处都说明有人在别处新写了一份
  assert.equal(hits.length, 4, `index.html 里带域名的行数是 ${hits.length}，不是 4`)
  for (const h of hits) {
    assert.ok(h.startsWith(origin + '/'), `${h} 与 site.js 的 ${origin} 不是同一个源头`)
  }
})

test('RSS 与 index.html 的副标题都取自 narrative.js 的那句宣言，不再各抄一份', () => {
  const line = N.manifesto.join('')
  const html = src('index.html')
  assert.ok(html.includes(`content="${line}"`), 'index.html 的 og:description 与那句宣言对不上了')
  assert.ok(src('scripts/build_seo.mjs').includes('N.manifesto.join'), 'build_seo 不再从 narrative.js 取描述')
})
