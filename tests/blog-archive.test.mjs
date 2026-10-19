// 归档页改版与搜索入口的钉子：搜索只有右上角一处，/blog 仍认 ?q= 当落地页。
// 为什么要钉：
//   ⑴ 「删掉页内搜索框」是删代码，删过头会把 ?q= 的读取一起带走——那之后搜索卡里
//      「看全部 N 篇」与 Enter 会跳到一个**不认词**的页面，链接照旧分享得出去，只是筛不动；
//   ⑵ 快捷键挂在 window 上，只 add 不 remove 就是每次换顶栏多留一个监听（本站顶栏不随路由
//      换，所以这条现在不响，但它是这类接线唯一可机检的形状）。
// 跑法：npm test（Node 内置 test runner，零依赖）
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = (p) => readFileSync(join(ROOT, p), 'utf8')

const BLOG = 'src/views/BlogView.vue'
const HEADER = 'src/components/SiteHeader.vue'
const CARD = 'src/components/SearchCard.vue'

test('归档页没有第二格搜索框，但 ?q= 仍然是落地页', () => {
  const blog = src(BLOG)
  assert.ok(!/type="search"/.test(blog), '/blog 里还留着 type="search"——页内搜索框没删干净')
  assert.ok(/route\.query\.q/.test(blog), '/blog 不再读 ?q=：搜索卡的「看全部 N 篇」会跳到一个筛不动的页面')
  // 交回词的那两条出口必须还指向归档页，否则 ?q= 成了没人写的死参数
  const card = src(CARD)
  assert.match(card, /path: '\/blog', query: \{ q: k \}/, 'Enter 不再把词交给 /blog')
  assert.match(card, /path: '\/blog', query: \{ q: q\.trim\(\) \}/, '「看全部」不再把词交给 /blog')
})

test('归档页四枚读数与带计数的胶囊都在', () => {
  const blog = src(BLOG)
  for (const k of ['文章 · POSTS', '标签 · TAGS', '总字数 · WORDS', '最近更新 · LATEST']) {
    assert.ok(blog.includes(`'${k}'`), `读数少了一枚：${k}`)
  }
  assert.equal((blog.match(/class="en-card stat/g) || []).length, 1, '读数卡改成了逐枚写死，不再由 stats 循环产出')
  assert.match(blog, /<span class="n">\{\{ t\.count/, '胶囊里的计数没了：只剩标签名读不出哪类多')
  assert.match(blog, /清除筛选/, '筛过了却没有清除的出口')
})

test('顶栏挂了 / 与 Ctrl/⌘+K，且成对注销', () => {
  const h = src(HEADER)
  assert.match(h, /function onHotkey/, '快捷键处理函数没了')
  assert.match(h, /k === 'k'/, "Ctrl/⌘+K 那一支没了")
  assert.match(h, /e\.key === '\/'/, "裸按 / 那一支没了")
  assert.match(h, /isContentEditable/, '没判"是不是在往框里打字"：输入框里的 / 会被吞掉')
  const on = (h.match(/addEventListener\('keydown', onHotkey\)/g) || []).length
  const off = (h.match(/removeEventListener\('keydown', onHotkey\)/g) || []).length
  assert.equal(on, 1, `注册了 ${on} 次，应当只有一次`)
  assert.equal(off, 1, `注销了 ${off} 次，与注册不对称`)
})

// 反向对照：三把尺子都真的量得动——同一正则去量已知有搜索框的那张卡必须命中，
// 去量已知没有快捷键的那个文件必须空手。少了这一段，"没搜到"可能只是正则写歪了。
test('反向：本文件的判据抓得住假象', () => {
  assert.match(src(CARD), /type="search"/, '尺子失效：搜索卡里明明有 type="search" 却没抓到')
  assert.ok(!/function onHotkey/.test(src('src/views/AboutView.vue')), '尺子失效：关于页不该有快捷键')
  const broken = src(BLOG).replace(/route\.query\.q/g, 'route.query.zz')
  assert.ok(!/route\.query\.q/.test(broken), '把 ?q= 的读法改歪之后，判据仍然不响')
})
