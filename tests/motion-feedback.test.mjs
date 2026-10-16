// 指针反馈一致性的钉子。
// 为什么要钉：这轮之前站内"鼠标指到会怎样"散得厉害——时长 0.22/0.24/0.25/0.28/0.3/0.32/0.5
// 七个值、同一个右移 8/5/4px 三套幅度、同一个"点开看大图"两种指针。这类漂移不会报错，
// 只会让使用感读起来"不统一"，所以把它写成会红的判据：新增 hover 动效时必须显式选一枚令牌，
// 或者承认它是例外（写进下面的 NON_FEEDBACK 名单）。
// 卡面亮不亮**不**在这套判据里做角色门控：试过只让 a / button 亮，整站读下来发白单薄，当日改回；
// "能点"这条信号交给 cursor 与透镜承担，所以透镜挂在非可点元素上才是这里要抓的失真。
// 跑法：npm test（Node 内置 test runner，零依赖）
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = (p) => readFileSync(join(ROOT, p), 'utf8')
// 判据量的是代码不是注释：先剥块注释与行注释（URL 里的 // 前面带冒号，放过）
const code = (p) =>
  src(p)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')

const CSS = 'src/styles/site.css'
const VUE_FILES = [
  'src/components/SiteHeader.vue',
  'src/components/MusicCard.vue',
  'src/views/ProjectsView.vue',
  'src/views/BlogView.vue',
  'src/views/RecordsView.vue',
  'src/views/UpdatesView.vue',
  'src/views/GalleryView.vue',
  'src/views/AboutView.vue',
  'src/views/PostView.vue',
  'src/views/ProjectView.vue',
]

/* 不是指针反馈、因此允许写裸秒数的地方：入场 / 开合 / 打字机 / sheen / 减弱动效开关。
 * 新增一条就等于承认"这是一处新的例外"——评审时看得见，不会悄悄漂。 */
const NON_FEEDBACK = {
  'src/styles/site.css': [
    /transition-duration: 0\.01ms !important/, // 减弱动效的全站开关
    /transition:\s*opacity 0\.26s ease,\s*transform 0\.4s/, // 衍射芒缓绽：读成"星光绽开"而不是"控件响应"，见 site.css §6b
  ],
  'src/components/SiteHeader.vue': [
    /transition: background-color 0\.3s ease, border-color 0\.3s ease, padding 0\.3s ease/, // 吸顶收拢
    /transition: opacity 0\.28s ease/, // 抽屉开合
    /transition: opacity 0\.34s ease, transform 0\.34s/, // 抽屉条目进出场
    /transition: opacity 0\.2s ease, transform 0\.22s/, // 播放器浮层开合
  ],
  'src/components/HorizonHero.vue': [/transition: opacity 0\.6s ease/], // 打字机光标退场
}

test('四枚指针反馈令牌定义了，而且真的被消费', () => {
  const css = code(CSS)
  for (const t of ['--dur-fast', '--dur', '--nudge', '--lift']) {
    assert.ok(new RegExp(`\\${t}:\\s*[^;]+;`).test(css), `site.css 里没有定义 ${t}`)
  }
  const all = [css, ...VUE_FILES.map((f) => code(f))].join('\n')
  assert.ok((all.match(/var\(--dur-fast\)/g) || []).length >= 10, 'fast 档没被用起来')
  assert.ok((all.match(/var\(--dur\)(?!-)/g) || []).length >= 8, '慢档没被用起来')
  assert.ok((all.match(/var\(--nudge\)/g) || []).length >= 5, 'nudge 没被用起来')
  assert.ok((all.match(/var\(--lift\)/g) || []).length >= 3, 'lift 没被用起来')
})

// 卡面亮不亮不分角色（试过分，全站读下来发白单薄，当日改回）；既然每张卡都会亮，
// 那"指针跟随的冷色聚光"就不该只给其中几页——透镜与卡面同生，缺一条就是漏接线。
test('卡面 hover 不分角色，且每张卡都带指针透镜', () => {
  const css = code(CSS)
  assert.ok(/(^|[,{\s])\.en-card:hover/.test(css), '裸 .en-card:hover 没了——不可点的卡又会跟着不亮')
  assert.ok(!/a\.en-card:hover/.test(css) && !/button\.en-card:hover/.test(css), '角色门控复活了：div 卡会重新变成不亮')
  const files = [
    'src/views/BlogView.vue',
    'src/views/HomeView.vue',
    'src/views/ProjectsView.vue',
    'src/views/RecordsView.vue',
    'src/views/UpdatesView.vue',
    'src/views/AboutView.vue',
  ]
  let cards = 0
  for (const f of files) {
    const text = src(f)
    for (const m of text.matchAll(/class="([^"]*)"/g)) {
      const cls = m[1].split(/\s+/)
      if (!cls.includes('en-card')) continue
      cards++
      assert.ok(cls.includes('en-lens'), `${f} 里有一枚卡没带透镜：class="${m[1]}"`)
    }
    assert.ok(!/class="[^"]*en-card[^"]*"/.test(text) || /@pointermove="onLens"/.test(text), `${f} 有卡带透镜却没接 onLens`)
  }
  assert.ok(cards >= 10, `只数到 ${cards} 枚卡——判据没量到东西（视图名单或 class 写法变了）`)
})

// 反向对照：上面那把尺子真的量得动。少了这一条，"零命中"可能只是正则写错（比如 \b 挡在门外）。
test('反向：裸秒数与旧位移字面量的尺子都抓得到东西', () => {
  // 同一把尺子去量已知例外，必须抓到——否则它是在盲目返回 0，那条泛判据就成了摆设
  const cssBare = code(CSS).match(/transition[^;]*?\s(0?\.\d+|\d+)m?s/g) || []
  assert.ok(cssBare.length >= 2, `尺子失效：site.css 连减弱动效开关与衍射芒的裸秒数都抓不到（实抓 ${cssBare.length}）`)
  const probe = code('src/components/SiteHeader.vue').match(/transition[^;]*?\s(0?\.\d+|\d+)m?s/g) || []
  assert.ok(probe.length >= 3, `尺子失效：顶栏连吸顶与开合的裸秒数都抓不到（实抓 ${probe.length}）`)
  const moved = [...VUE_FILES, CSS].map((f) => code(f)).join('\n')
  assert.ok(!/translateX\(5px\)|translateX\(var\(--space-1\)\)|translateY\(-1px\)|translate\(3px, -3px\)|scale\(1\.08\)/.test(moved), '旧的位移字面量复活了（8px/5px/4px 与 -1px/-2px 三套幅度）')
})

// 每个 transition 声明都必须要么用令牌、要么被显式列为非指针反馈的例外
test('指针反馈不许写裸时长：每条 transition 要么用令牌，要么进例外名单', () => {
  const files = [CSS, ...VUE_FILES, 'src/components/HorizonHero.vue']
  let whitelisted = 0
  for (const f of files) {
    const text = code(f)
    const decls = text.match(/transition[^;]*?;/g) || []
    const allow = NON_FEEDBACK[f] || []
    for (const d of decls) {
      if (!/\d(m?s)/.test(d)) continue // 全用令牌，合格
      const hit = allow.some((re) => re.test(d))
      assert.ok(hit, `${f} 里一条带裸秒数的 transition 不在例外名单里：${d.trim()}`)
      whitelisted++
    }
  }
  // 5 条是眼下所有"非指针反馈"的裸时长（吸顶 / 抽屉开合 / 抽屉条目 / 播放器浮层 / 光标退场）
  // 加上 site.css 的两条例外（减弱动效开关、衍射芒缓绽）。新例外要写进 NON_FEEDBACK 才算数。
  assert.ok(whitelisted >= 5 && whitelisted <= 7, `例外数量异常（${whitelisted}）：名单或判据出了问题`)
})

// 同一个"点开看大图"必须共用一种指针：文章页插图与映像墙照片都是 zoom-in
test('点开看大图的两处都是 zoom-in', () => {
  assert.ok(/cursor: zoom-in/.test(code(CSS)), '文章页插图的 zoom-in 没了')
  const gallery = code('src/views/GalleryView.vue')
  assert.ok(/\.shot\s*\{[^}]*cursor: zoom-in/.test(gallery), '映像墙照片不再是 zoom-in——它点开也是看大图')
})
