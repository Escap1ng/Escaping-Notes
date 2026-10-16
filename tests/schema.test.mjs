// src/lib/schema.js 的行为钉子：解析口径 + 派生 + 每一条校验判据。
// 这个文件钉的是"两个岸共用的一份口径"——浏览器那一岸（src/lib/posts.js）与 Node 那一岸
// （scripts/build_seo.mjs 出 sitemap/RSS、scripts/check_content.mjs 当门禁）import 的都是它，
// 所以这里的断言同时是那一岸的断言。跑法：npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  INDEX_NAME,
  assetUrl,
  isPublished,
  normalizeRoll,
  parseFrontmatter,
  parseRollUrl,
  sortByDate,
  stats,
} from '../src/lib/schema.js'

// 造一卷：不碰磁盘。判据要能凭空验，否则这条测试只是在复述仓库当下有几个文件
const SLUG = 'test-roll'
const GOOD_MD =
  '---\ntitle: 甲\ndate: 2026-09-01\ntags: [随笔]\nsummary: 一句话。\nalt: 一张图\n---\n正文\n'
const make = (md = GOOD_MD, files = [INDEX_NAME, 'cover.jpg'], dirs = []) =>
  normalizeRoll({ slug: SLUG, raw: md, files, dirs })
const roll = (md, files, dirs) => make(md, files, dirs).record

test('解析 LF 书写的 frontmatter，正文不含分隔线', () => {
  const { meta, body } = parseFrontmatter('---\ntitle: 甲\ndate: 2026-09-01\n---\n正文\n')
  assert.equal(meta.title, '甲')
  assert.equal(meta.date, '2026-09-01')
  assert.equal(body, '正文\n')
})

// 两端过去各抄一份解析，只有浏览器那份写了 \r?。合一份之后这条必须还站着：
// Windows 上 core.autocrlf=true 的新克隆拿到 CRLF，漏掉它等于整份 frontmatter 不识别——
// 标题空、日期回落 1970-01-01、`---` 当正文渲染，而且 RSS 与页面会给出两套答案。
test('CRLF 检出的文章与 LF 解析结果一致（这一份现在也管着 RSS）', () => {
  const crlf = GOOD_MD.replace(/\n/g, '\r\n')
  const a = parseFrontmatter(GOOD_MD)
  const b = parseFrontmatter(crlf)
  assert.deepEqual(b.meta, a.meta)
  // 正文只允许差在行尾（下游 stats 去空白、markdown 逐行 trim，都不受影响）
  assert.equal(b.body.replace(/\r\n/g, '\n'), a.body)
  assert.deepEqual(make(crlf).problems, [])
})

test('tags 支持方括号、引号与空值', () => {
  assert.deepEqual(parseFrontmatter('---\ntags: [a, "b", \'c\']\n---\n').meta.tags, ['a', 'b', 'c'])
  assert.deepEqual(parseFrontmatter('---\ntags: []\n---\n').meta.tags, [])
  assert.deepEqual(parseFrontmatter('---\n---\nx').meta.tags, [])
})

test('值里带冒号只切第一刀；成对的引号才剥', () => {
  assert.equal(parseFrontmatter('---\nsummary: 时间 12:30 的事\n---\n').meta.summary, '时间 12:30 的事')
  assert.equal(parseFrontmatter('---\ntitle: "甲"\n---\n').meta.title, '甲')
  assert.equal(parseFrontmatter('---\ntitle: "甲\ntags: []\n---\n').meta.title, '"甲')
})

test('stats 按去空白字数计，中文一字计一', () => {
  assert.deepEqual(stats('abcd'), { words: 4, minutes: 1 })
  assert.deepEqual(stats('掷 墨\n入渊'), { words: 4, minutes: 1 })
  assert.deepEqual(stats(''), { words: 0, minutes: 1 }) // 空正文也不显示 0 分钟
})

test('阅读时长按 400 字/分四舍五入，故 599 字仍显示 1 分钟', () => {
  // 口径备忘：这是 Math.round 而非 ceil，"不足 400 字算 1 分钟"只在 <600 字时成立。
  // 改这里就等于改全站所有文章显示的时长，别再当"四舍五入写错了"来"修"。
  assert.equal(stats('字'.repeat(599)).minutes, 1)
  assert.equal(stats('字'.repeat(600)).minutes, 2)
  assert.equal(stats('字'.repeat(1000)).minutes, 3)
})

/* ---------------- 派生：封面与素材 URL 由目录构造 ---------------- */

test('完整的一卷：零问题，封面与网址都从目录名派生', () => {
  const { problems, notes } = make()
  assert.deepEqual(problems, [])
  assert.deepEqual(notes, [])
  const p = roll()
  assert.equal(p.slug, SLUG)
  assert.equal(p.url, `/blog/${SLUG}`)
  assert.equal(p.cover, assetUrl(SLUG, 'cover.jpg'))
  assert.equal(p.imagePos, 'center')
  assert.equal(p.words, 2) // 「正文」两个字：构造出来的那行封面不许计进字数
})

test('阅读页顶部那张图由这一卷放，作者不必在正文手抄', () => {
  const p = roll()
  assert.ok(p.body.startsWith(`![一张图](/blog/${SLUG}/cover.jpg)\n\n`))
})

test('没有封面的一卷是合法状态：不合成图行，也不逼作者写 alt', () => {
  const md = GOOD_MD.replace('alt: 一张图\n', '')
  const { record, problems } = normalizeRoll({ slug: SLUG, raw: md, files: [INDEX_NAME] })
  assert.equal(record.cover, '')
  assert.ok(!record.body.includes('!['))
  assert.deepEqual(problems, [])
})

test('正文里的裸文件名指向本卷素材，站内绝对路径与外链不动', () => {
  const md = GOOD_MD.replace('正文\n', '看 ![沙丘](dune.jpg) 与 ![旧图](/plates/plate-hero.jpg)\n')
  const p = roll(md, [INDEX_NAME, 'cover.jpg', 'dune.jpg'])
  assert.ok(p.body.includes(`![沙丘](/blog/${SLUG}/dune.jpg)`))
  assert.ok(p.body.includes('![旧图](/plates/plate-hero.jpg)'), '站内绝对路径不该被改写')
})

test('./ 前缀认得，跨出这一卷的引用直接拦', () => {
  const dot = roll(GOOD_MD.replace('正文\n', '![沙丘](./dune.jpg)\n'), [INDEX_NAME, 'cover.jpg', 'dune.jpg'])
  assert.ok(dot.body.includes(`![沙丘](/blog/${SLUG}/dune.jpg)`))
  const up = make(GOOD_MD.replace('正文\n', '![旁篇](../core-idea/cover.jpg)\n'))
  assert.ok(up.problems.some((p) => p.includes('跨出这一卷')))
})

test('围栏里的示范写法不算站内引用（讲怎么写的文章自己不能被门禁拦下）', () => {
  const md = GOOD_MD.replace(
    '正文\n',
    '正文里这样写：\n\n```markdown\n![沙丘](dune.jpg)\n```\n\n用 ![沙丘](dune.jpg) 那张。\n'
  )
  const { problems, record } = make(md, [INDEX_NAME, 'cover.jpg', 'dune.jpg'])
  assert.deepEqual(problems, [])
  // 围栏里那行原样留着（它是给作者看的语法），正文里那行改成了本卷网址
  assert.ok(record.body.includes('```markdown\n![沙丘](dune.jpg)\n```'))
  assert.ok(record.body.includes('![沙丘](/blog/test-roll/dune.jpg)'))
})

/* ---------------- 校验判据：每一条都得能被单独踩响 ---------------- */

const MUTATIONS = [
  ['frontmatter 没闭合', (m) => m.replace('---\n正文\n', '正文\n'), undefined, undefined, '没闭合'],
  ['缺 title', (m) => m.replace('title: 甲\n', ''), undefined, undefined, 'title'],
  ['缺 date', (m) => m.replace('date: 2026-09-01\n', ''), undefined, undefined, 'date'],
  ['date 格式歪', (m) => m.replace('2026-09-01', '2026-9-1'), undefined, undefined, '要写成'],
  ['date 是不存在的一天', (m) => m.replace('2026-09-01', '2026-02-30'), undefined, undefined, '没有的一天'],
  ['缺 tags', (m) => m.replace('tags: [随笔]\n', ''), undefined, undefined, 'tags'],
  ['缺 summary', (m) => m.replace('summary: 一句话。\n', ''), undefined, undefined, 'summary'],
  ['键拼错', (m) => m.replace('title: 甲', 'titlee: 甲'), undefined, undefined, 'titlee'],
  ['有封面没 alt', (m) => m.replace('alt: 一张图\n', ''), undefined, undefined, '没写 `alt`'],
  ['alt 里有右方括号', (m) => m.replace('alt: 一张图', 'alt: 一张]图'), undefined, undefined, '中断'],
  ['两张候选封面', undefined, [INDEX_NAME, 'cover.jpg', 'cover.png'], undefined, '两张候选封面'],
  ['imagePos 不是位置值', (m) => m.replace('alt: 一张图', 'alt: 一张图\nimagePos: url(x)'), undefined, undefined, '不是合法'],
  ['正文引用不在这卷的图', (m) => m.replace('正文\n', '![沙丘](dune.jpg)\n'), undefined, undefined, '不在这一卷'],
  ['正文手抄了封面（裸名）', (m) => m.replace('正文\n', '![抄](cover.jpg)\n'), undefined, undefined, '手抄了一遍封面'],
  ['正文手抄了封面（全 URL）', (m) => m.replace('正文\n', `![抄](/blog/${SLUG}/cover.jpg)\n`), undefined, undefined, '手抄了一遍封面'],
  ['目录名不能当网址', undefined, undefined, undefined, null],
  ['素材名带空格', undefined, [INDEX_NAME, 'cover.jpg', 'my pic.jpg'], undefined, '不合口径'],
  ['素材名大写', undefined, [INDEX_NAME, 'cover.jpg', 'Dune.JPG'], undefined, '不合口径'],
  ['卷里套子目录', undefined, [INDEX_NAME, 'cover.jpg'], ['imgs'], '是子目录'],
]

test('每一条判据都抓得住对应的假样本，而好样本一条都不响', () => {
  assert.deepEqual(make().problems, []) // 先证明判据不是"永远响"
  for (const [name, mutate, files, dirs, fragment] of MUTATIONS) {
    if (!fragment) continue
    const raw = mutate ? mutate(GOOD_MD) : GOOD_MD
    const { problems } = make(raw, files, dirs)
    assert.ok(
      problems.some((p) => p.includes(fragment)),
      `${name}：判据该抓到「${fragment}」，实际报的是 ${JSON.stringify(problems)}`
    )
  }
})

test('目录名歪了会被报出来（它同时是网址）', () => {
  const { problems } = normalizeRoll({ slug: 'My Post', raw: GOOD_MD, files: [INDEX_NAME, 'cover.jpg'] })
  assert.ok(problems.some((p) => p.includes('网址片段')))
})

test('原图与稿子都不上线：isPublished 是唯一的排除口径', () => {
  assert.equal(isPublished(INDEX_NAME), false)
  assert.equal(isPublished('cover-src.jpg'), false)
  assert.equal(isPublished('cover-src.TIFF'.toLowerCase()), false)
  assert.equal(isPublished('.DS_Store'), false)
  assert.equal(isPublished('cover.jpg'), true)
  assert.equal(isPublished('dune.jpg'), true)
})

/* ---------------- 素材网址的解析：dev 中间件唯一的越界面 ---------------- */

test('parseRollUrl 只认 /blog/<slug>/<文件名> 这一种形状', () => {
  assert.deepEqual(parseRollUrl('/blog/test-roll/cover.jpg'), { slug: 'test-roll', name: 'cover.jpg' })
  assert.deepEqual(parseRollUrl('/blog/test-roll/cover.jpg?v=2'), { slug: 'test-roll', name: 'cover.jpg' })
  for (const bad of [
    '/blog/test-roll', // 路由本身，交给 SPA
    '/blog/test-roll/a/b', // 再套一层
    '/blog/test-roll/../index.md', // 名字里不许有点点
    '/blog/%2e%2e/cover.jpg',
    '/blog/test-roll/Dune.JPG', // 大写在 Linux 的托管上是另一张图
    '/blog/test-roll/my%20pic.jpg',
    '/plates/plate-hero.jpg',
    '',
    undefined,
  ]) {
    assert.equal(parseRollUrl(bad), null, `${bad} 不该被当成卷内素材`)
  }
})

/* ---------------- 排序：全站只有这一处 ---------------- */

test('sortByDate 倒序且不改入参（列表、精选、映像柜、RSS 共用它）', () => {
  const items = [{ date: '2026-09-01' }, { date: '2026-10-10' }, { date: '' }]
  const out = sortByDate(items)
  assert.deepEqual(out.map((i) => i.date), ['2026-10-10', '2026-09-01', ''])
  assert.equal(items[0].date, '2026-09-01')
})
