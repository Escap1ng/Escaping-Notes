<script setup>
// 新版坠入阅读：顶部进度线 + 单栏衬线正文
// 文章页：上报/降级/灯箱/Esc 成对监听/复制/上下篇
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { loadPost, loadPosts } from '../lib/posts.js'
import { chainOf, collectionHref, directPostsOf, findCollection } from '../lib/collections.js'
import { renderMarkdown } from '../lib/markdown.js'
import { trapFocus } from '../lib/focus.js'
import { useDetailExit } from '../lib/exit.js'
import { content } from '../data/index.js'
import { N, pageTitle } from '../data/narrative.js'

const route = useRoute()
const post = ref(null)
const missing = ref(false)
const htmlBody = ref('')
const toc = ref([])
const all = ref([])
const copied = ref(false)
const lightbox = ref('')
const lightboxEl = ref(null)
let trap = null

/* 正文渲染完才存在的三样东西：代码块工具条、插图序列、目录观察。
   正文是 v-html 灌进来的，Vue 不认它的内部结构，所以这三件只能在 nextTick 之后
   拿原生 DOM 做；样式相应地写在 site.css §9（"命中 v-html，放全局"那条口径），
   不在本页 scoped 里——scoped 的属性选择器挂不到注入出来的节点上。 */
const proseEl = ref(null)
const shots = ref([]) // 正文全部插图的地址，按文档顺序
const shotIndex = ref(0)
const activeId = ref('') // 目录带里此刻该亮的那一条
const showTop = ref(false) // 读过了开头才浮出「回到顶部」
const sentinelEl = ref(null)
let tocObserver = null
let topObserver = null

// Esc / 点空白退回 /blog；灯箱开着时先让位给灯箱（它自己吃这两下）
useDetailExit('/blog', () => !lightbox.value)

// 所属合集：当前合集内按 order/日期排出的兄弟篇。合集内的「上一篇 / 下一篇」
// 与页眉那条路径读的是同一份顺序，不会出现目录和翻页各说一套。
const series = computed(() => {
  const p = post.value
  if (!p || !p.collection) return null
  const collection = findCollection(content.collections, p.collection)
  if (!collection) return null
  const siblings = directPostsOf(all.value, collection.slug)
  const i = siblings.findIndex((x) => x.slug === p.slug)
  if (i < 0) return null
  return {
    collection,
    chain: chainOf(content.collections, collection.slug),
    index: i,
    total: siblings.length,
    prev: siblings[i - 1] || null, // 目录按顺序排，所以上一篇是更小的下标
    next: siblings[i + 1] || null,
    position: N.collection.position.replace('{i}', i + 1).replace('{n}', siblings.length),
  }
})

// 没有合集（或合集数据缺失）时退回全站时间倒序的前后篇
const neighbors = computed(() => {
  if (series.value) return { prev: series.value.prev, next: series.value.next }
  const i = all.value.findIndex((p) => p.slug === route.params.slug)
  if (i < 0) return { prev: null, next: null }
  return { prev: all.value[i + 1] || null, next: all.value[i - 1] || null }
})

/* 灯箱 */
// 多张插图时可以左右翻：点开的就是序列里的第几张，←/→ 在同一个序列里走。
// shots 在正文渲染完那一刻收好（含懒加载未到位的图：currentSrc 为空则退回 src 属性）。
function onProseClick(e) {
  if (e.target.tagName !== 'IMG') return
  const url = e.target.currentSrc || e.target.src
  const i = shots.value.indexOf(url)
  shotIndex.value = i < 0 ? 0 : i
  lightbox.value = url
}

function stepShot(d) {
  const n = shots.value.length
  if (n < 2) return
  const i = (shotIndex.value + d + n) % n // 两端绕回：翻过头不是"到头了"，是回到第一张
  shotIndex.value = i
  lightbox.value = shots.value[i]
}

// Esc 关灯箱、←/→ 翻页是这盏灯自己的事；「退回列表」不在这里写，走 lib/exit.js
//（与项目详情页同一处实现）。useDetailExit 的 canExit 在灯箱开着时返回 false，
// 所以这里 Esc 一下只关灯，不会连页一起退掉。
function onLightboxKey(e) {
  if (!lightbox.value) return
  if (e.key === 'Escape') lightbox.value = ''
  else if (e.key === 'ArrowLeft') stepShot(-1)
  else if (e.key === 'ArrowRight') stepShot(1)
}

/* 灯箱是模态：打开时把 Tab 锁在框内、锁掉 body 滚动，关闭后焦点回到原处。
   判据盯的是"开着没有"这个布尔量，不是图片地址——翻页会换 lightbox 的值，
   若直接 watch(lightbox) 就会把陷阱拆掉重建一次，焦点被拽回容器，
   键盘连按第二下方向键就落空了。布尔量在翻页时不变，watch 不触发。 */
const lightboxOpen = computed(() => !!lightbox.value)
watch(lightboxOpen, async (open) => {
  if (open) {
    await nextTick()
    document.body.style.overflow = 'hidden'
    trap = trapFocus(lightboxEl.value)
  } else {
    document.body.style.overflow = ''
    trap?.()
    trap = null
  }
})

/* 顶部曝光进度线不在这里算：直接消费 App.vue 写入的 --shift，
   省掉一套重复的滚动监听与 scrollHeight 强制布局（见 design.md §3.2） */

/* ---- 代码块工具条 ----
   markdown.js 早就把语言写进了 <pre data-lang>，只是没人消费它：读代码的人想知道
   "这段是什么语言"、想直接拿走原文，原先都得自己判断、自己拖选。这里在渲染完之后
   给每个 pre 套一层壳，壳里放语言名与一枚复制钮。
   为什么不用 Vue 模板做：正文是 v-html 灌进来的，Vue 不认它内部的结构，也挂不上
   scoped 属性——所以壳用原生 DOM 建，样式写在 site.css §9（那一节的存在理由就是
   "命中 v-html，放全局"）。 */
function decorateProse() {
  const root = proseEl.value
  if (!root) return
  for (const pre of root.querySelectorAll('pre')) {
    if (pre.parentElement?.classList.contains('code-wrap')) continue // 已经套过，别套两层
    const wrap = document.createElement('div')
    wrap.className = 'code-wrap'
    const bar = document.createElement('div')
    bar.className = 'code-bar'

    const lang = (pre.dataset.lang || '').trim()
    if (lang) {
      const tag = document.createElement('span')
      tag.className = 'code-lang en-mono'
      tag.textContent = lang
      bar.appendChild(tag)
    }

    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'code-copy'
    btn.textContent = N.reader.codeCopy
    btn.addEventListener('click', () => copyCode(btn, pre))
    bar.appendChild(btn)

    pre.replaceWith(wrap)
    wrap.append(bar, pre)
  }
}

// 复制的三态直接借 §5b 那套全站唯一的反馈语言：默认中性、成功 --cold、失败 --hot。
// 失败不是理论情形：非安全上下文（http 直连 IP）里 navigator.clipboard 压根不存在，
// 静默不动读者会以为按钮是坏的。
async function copyCode(btn, pre) {
  const text = pre.querySelector('code')?.textContent ?? pre.textContent ?? ''
  let ok = false
  try {
    await navigator.clipboard.writeText(text)
    ok = true
  } catch {
    ok = false
  }
  btn.textContent = ok ? N.reader.codeCopied : N.reader.codeFail
  btn.dataset.state = ok ? 'ok' : 'err'
  // 定时器挂在按钮自己身上：连续点两个不同的代码块时，各自独立复位，
  // 不会因为一个全局 timer 被 clearTimeout 而把前一个卡在"已复制"。
  clearTimeout(btn._copyTimer)
  btn._copyTimer = setTimeout(() => {
    btn.textContent = N.reader.codeCopy
    delete btn.dataset.state
    btn._copyTimer = null
  }, 1600)
}

/* ---- 插图序列 ----
   灯箱原先只能看一张：多图的文章里点第二张之前得先关掉第一张，而 ←/→ 什么都不做。
   这里把正文的图按文档顺序收成一条序列，灯箱就成了它本来该有的样子。
   currentSrc 在懒加载到位前是空的，退回 src 属性（与 onProseClick 同一个口径，
   两边算出的地址必须逐字相同，否则 indexOf 找不到、翻页从第一张重新开始）。 */
function collectShots() {
  const root = proseEl.value
  shots.value = root ? [...root.querySelectorAll('img')].map((i) => i.currentSrc || i.src) : []
  shotIndex.value = 0
}

/* ---- 目录带高亮 ----
   目录原先只是开头那一屏的一份清单：滚到第三段之后它就出了视野，读者想知道
   "我读到哪了"只能往回翻。这里用 IntersectionObserver 把当前小节亮出来。
   观测带的上沿 = 标题锚点真正的落点（§9 的 scroll-margin-top：--page-top - 24），
   下沿收在视口 30% 处：锚点跳进来停在哪，这里就认哪，两处口径必须同源，
   否则高亮的那一节与眼前这一节会差一节。带里同时有几条时取文档顺序最靠前的那条。
   刻意不挂滚动监听：全站只许 App.vue 那一个（design.md §3.2）。 */
function observeToc() {
  const root = proseEl.value
  if (!root || !toc.value.length || typeof IntersectionObserver === 'undefined') return
  const heads = [...root.querySelectorAll('h2[id], h3[id]')]
  if (!heads.length) return
  // 从标题自己身上读实际生效的 scroll-margin-top：由 §9 那一处 CSS 决定，
  // 这里不抄第二份数字（抄了就会与锚点落点分叉，高亮差一节）
  const land = parseFloat(getComputedStyle(heads[0]).scrollMarginTop) || 96
  const seen = new Set()
  tocObserver = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) seen.add(e.target.id)
        else seen.delete(e.target.id)
      }
      const hit = heads.find((h) => seen.has(h.id))
      // 带里一条都没有时保留上一次的判断：刚滚过某条标题的瞬间它已经离开观测带，
      // 清空会让高亮闪一下没（那正是这条 observer 要消灭的抖动）
      if (hit) activeId.value = hit.id
    },
    { rootMargin: `-${Math.round(land)}px 0px -70% 0px`, threshold: 0 },
  )
  for (const h of heads) tocObserver.observe(h)
}

/* ---- 回到顶部 ----
   页脚那枚要滚到最底才够得着，长文中段读到一半想回头就得先翻到底。这里补一枚浮在
   右下角的钮，但**不新增滚动监听**（全站只许 App.vue 那一个，见 design.md §3.2）：
   改用一枚哨兵——正文开头那条 1px 的线，离开视口就浮出按钮、回来就收起，
   IntersectionObserver 只在跨界时回调，不逐帧触发。 */
function observeTop() {
  if (typeof IntersectionObserver === 'undefined') return
  topObserver = new IntersectionObserver(
    ([e]) => (showTop.value = !e.isIntersecting),
    { threshold: 0 },
  )
  if (sentinelEl.value) topObserver.observe(sentinelEl.value)
}

// 与页脚那枚同一个口径：减弱动效时瞬时回顶，其余平滑滚
function toTop() {
  scrollTo({
    top: 0,
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
  })
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(location.href)
    copied.value = true
    setTimeout(() => (copied.value = false), 1600)
  } catch {
    copied.value = false
  }
}

onMounted(async () => {
  const slug = route.params.slug
  const [p, list] = await Promise.all([loadPost(slug), loadPosts()])
  all.value = list
  if (!p) {
    // 旧 slug 的改道在 router 的 beforeResolve 里做（见 src/router/index.js）：
    // 走到这里说明它不是任何一卷的别名，也不是草稿，那就是真没有这一篇
    missing.value = true
    return
  }
  post.value = p
  const rendered = renderMarkdown(p.body)
  htmlBody.value = rendered.html
  toc.value = rendered.toc
  // 与构建期那份静态壳同一个拼法（scripts/lib/shell.mjs 用同一个 pageTitle）：
  // 分享卡上的标题与打开后标签页的标题必须是同一句话
  document.title = pageTitle(p.title)

  addEventListener('keydown', onLightboxKey)

  // 正文这时才刚进 DOM：代码块壳、插图序列、目录观察都要等 v-html 落地之后再做
  await nextTick()
  decorateProse()
  collectShots()
  observeToc()
  observeTop()
})

onUnmounted(() => {
  removeEventListener('keydown', onLightboxKey)
  tocObserver?.disconnect()
  tocObserver = null
  topObserver?.disconnect()
  topObserver = null
  trap?.()
  // 这里不复位 document.title：afterEach 与新页的挂载都排在本次卸载之后，
  // 写上兜底值反而把「文章 · Escaping Notes」覆成站名（实测：从文章 Esc 退回列表，标签页说两句话）
})
</script>

<template>
  <section class="en-shell post">
    <div class="progress" aria-hidden="true"></div>

    <div v-if="missing" class="lost">
      <header class="en-head">
        <h2 class="en-h2">{{ N.nf.title }}</h2>
      </header>
      <RouterLink class="en-btn en-btn-ghost" to="/blog">{{ N.nf.blog }}</RouterLink>
    </div>

    <!-- 骨架：正文从列表数据现渲，数据没到之前别交白卷——空盒会读成「这篇不存在」；
         与 /blog 列表骨架同一配方（1.5s 光扫、130% → -30%），格子照真文章摆：
         日期行 · 大标题 · 字数行 · 正文块，全部坐在 .en-glass 底板上 -->
    <div v-else-if="!post" class="skel" aria-busy="true">
      <article class="en-glass" aria-hidden="true">
        <p class="s meta"></p>
        <h1 class="s title"></h1>
        <p class="s mono"></p>
        <div class="s prose"></div>
      </article>
    </div>

    <template v-else-if="post">
      <!-- 「回到顶部」的哨兵：正文开头这条 1px 的线离开视口就浮出那枚钮。
           用观察哨兵而不是滚动监听——全站只许 App.vue 一个监听（design.md §3.2） -->
      <span ref="sentinelEl" class="top-sentinel" aria-hidden="true"></span>
      <article class="en-glass">
        <header class="head">
          <nav v-if="series" class="series-line en-mono" aria-label="所属合集">
            <RouterLink to="/collections">{{ N.collection.crumb }}</RouterLink>
            <template v-for="c in series.chain" :key="c.slug">
              <span class="sep" aria-hidden="true">/</span>
              <RouterLink v-if="c.slug !== series.collection.slug" :to="collectionHref(c.slug)">
                {{ c.title }}
              </RouterLink>
              <span v-else>{{ c.title }}</span>
            </template>
            <span class="pos">{{ series.position }}</span>
          </nav>
          <p class="en-eyebrow">{{ post.date }}</p>
          <h1 class="title">{{ post.title }}</h1>
          <p class="meta en-mono">
            {{ post.words }} 字 · {{ post.minutes }} 分钟
            <button class="en-btn en-btn-sm en-btn-quiet" type="button" @click="copyLink">
              {{ copied ? N.reader.copied : N.reader.copy }}
            </button>
          </p>
          <p v-if="post.tags && post.tags.length" class="tags">
            <span v-for="t in post.tags" :key="t" class="en-tag">{{ t }}</span>
          </p>
        </header>

        <!-- 目录：宽屏是底板右沿之外那条竖栏（.toc 定位、.toc-inner 粘顶），
             ≤1400px 退回正文上方的静态横带。两层是因为 absolute 与 sticky 不能同体 -->
        <nav v-if="toc.length" class="toc" aria-label="目录">
          <div class="toc-inner">
            <span class="en-mono toc-label">{{ N.reader.toc }}</span>
            <a
              v-for="item in toc"
              :key="item.id"
              :class="['toc-item', { sub: item.level === 3, active: item.id === activeId }]"
              :href="`#${item.id}`"
              :aria-current="item.id === activeId ? 'true' : undefined"
            >
              {{ item.text }}
            </a>
          </div>
        </nav>

        <div ref="proseEl" class="en-prose" v-html="htmlBody" @click="onProseClick"></div>

        <nav class="ends" :aria-label="N.reader.endsAria">
          <RouterLink v-if="neighbors.prev" :to="`/blog/${neighbors.prev.slug}`" class="end">
            <span class="en-spike" aria-hidden="true"></span>
            <span class="en-mono">{{ N.postPrev }}</span>
            <span class="end-title">{{ neighbors.prev.title }}</span>
          </RouterLink>
          <span v-else></span>
          <RouterLink v-if="neighbors.next" :to="`/blog/${neighbors.next.slug}`" class="end next">
            <span class="en-spike" aria-hidden="true"></span>
            <span class="en-mono">{{ N.postNext }}</span>
            <span class="end-title">{{ neighbors.next.title }}</span>
          </RouterLink>
        </nav>

        <div class="exit">
          <RouterLink class="en-btn en-btn-primary" to="/blog">{{ N.postEnd.back }}</RouterLink>
          <RouterLink v-if="series" class="en-btn en-btn-ghost" :to="collectionHref(series.collection.slug)">
            {{ N.collection.back }}
          </RouterLink>
        </div>
      </article>
    </template>

    <!-- 灯箱：点图开、点空白或 Esc 关。多张插图时 ←/→ 或两枚箭头在序列里走，
         计数与键位提示只在真的有多张时才出——单图时那两个字段一个都不该露。
         箭头自己 @click.stop：整块底片是"点哪儿都关"，不截住就成了"点翻页把灯关了" -->
    <div
      v-if="lightbox"
      ref="lightboxEl"
      class="lightbox"
      role="dialog"
      aria-modal="true"
      :aria-label="N.lightbox.aria"
      tabindex="-1"
      @click="lightbox = ''"
    >
      <button
        v-if="shots.length > 1"
        class="lb-nav prev"
        type="button"
        :aria-label="N.lightbox.prev"
        @click.stop="stepShot(-1)"
      >
        <span class="en-ico" aria-hidden="true">«</span>
      </button>
      <!-- 图自己也截一下：点图关灯的旧行为在多张时会与"翻页"抢同一次点击 -->
      <img :src="lightbox" :alt="N.reader.imgAlt" @click.stop="lightbox = ''" />
      <button
        v-if="shots.length > 1"
        class="lb-nav next"
        type="button"
        :aria-label="N.lightbox.next"
        @click.stop="stepShot(1)"
      >
        <span class="en-ico" aria-hidden="true">»</span>
      </button>
      <p v-if="shots.length > 1" class="lb-meta en-mono">
        <span class="lb-count">{{ shotIndex + 1 }} / {{ shots.length }}</span>
        <span class="lb-keys">{{ N.lightbox.keys }}</span>
      </p>
    </div>

    <!-- 回到顶部：读过开头才浮出。位置避开右下角的播放器浮层（MusicCard 是 right + bottom），
         所以贴左下角；aria-label 复用页脚那枚的文案，不另造一句话 -->
    <button
      v-if="showTop"
      class="to-top en-btn en-btn-ghost en-btn-sm"
      type="button"
      :aria-label="N.footer.top"
      @click="toTop"
    >
      <span class="en-ico en-ico-up" aria-hidden="true">↑</span>
      <span class="to-top-label">{{ N.footer.top }}</span>
    </button>
  </section>
</template>

<style scoped>
.post {
  /* 骨架默认 1120px，会把 §6c 那块 1280px 的阅读底板夹回 1056px。
     只有文章页需要比骨架更宽：1344 = 底板 1280 + .en-shell 左右各 32 的内边距。 */
  max-width: 1344px;
  padding-top: var(--page-top);
}

/* .en-glass（阅读底板）已上移到 site.css §6c：它是 docs/design.md §6.4 列出的全站基元，不该锁在本页 scoped 里 */

/* 顶部进度线（冷 → 热）：--shift 直接喂给 scaleX，零 JS、零滚动监听。
   必须是 transform 而非 width：--shift 每个滚动帧都在变，改宽度等于每帧一次布局。
   渐变随 scaleX 一起被压缩，观感与原先按宽度绘制时一致。 */
.progress {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  z-index: 65;
  transform-origin: left;
  transform: scaleX(var(--shift, 0));
  background: var(--cold);
}

.lost {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
}

/* 骨架盒自己不做宽度——.en-glass 全局规则已带 max-width: min(1280px, 94vw) 与 auto 边距，
   别再叠一层把板间距算重 */
.skel article {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-height: 56vh;
}

/* 光扫底与 /blog 骨架同一公式；标题块走真标题的展示字号档（--fs-2xl 同量级） */
.s {
  display: block;
  border-radius: var(--r-sm);
  background: linear-gradient(
    100deg,
    color-mix(in srgb, var(--ink-1) 34%, transparent) 32%,
    color-mix(in srgb, var(--ink-1) 68%, transparent) 50%,
    color-mix(in srgb, var(--ink-1) 34%, transparent) 68%
  );
  background-size: 220% 100%;
  animation: skel 1.5s ease-in-out infinite;
}

.s.meta {
  width: 128px;
  height: 14px;
  margin: var(--space-1) 0 0;
}

.s.title {
  width: min(70%, 640px);
  height: clamp(28px, 4vw, 44px);
}

.s.mono {
  width: 180px;
  height: 14px;
}

.s.prose {
  width: calc(var(--measure) - var(--space-2));
  height: 240px;
}

@keyframes skel {
  from {
    background-position: 130% 0;
  }
  to {
    background-position: -30% 0;
  }
}

/* 减弱动效：骨架停成一版灰底，不闪 */
@media (prefers-reduced-motion: reduce) {
  .s {
    animation: none;
  }
}

.head {
  max-width: var(--measure);
  margin: 0 auto;
}

/* 合集路径：和正文同宽，排在日期之上。当前合集不设链接，祖先可点；
   篇序靠右，窄屏折行时跟着路径走 */
.series-line {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-0);
  margin-bottom: var(--space-1);
}

.series-line a {
  color: var(--text-1);
  text-decoration: none;
  transition: color var(--dur-fast);
}

.series-line a:hover {
  color: var(--cold);
}

.series-line .sep {
  color: var(--text-1);
}

.series-line .pos {
  margin-left: auto;
  font-size: var(--fs-3xs);
  color: var(--text-1);
  white-space: nowrap;
}

.title {
  font-family: var(--font-display);
  font-size: clamp(32px, 5.6vw, 58px);
  font-weight: var(--fw-bold);
  letter-spacing: -0.02em;
  line-height: 1.16; /* 展示级标题：行高刻意脱离四档刻度（同 .en-title/.en-h2） */
  margin: var(--space-2) 0;
}

.meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-1);
}

/* 目录：右侧竖栏（2026-11-16 作者定「目录不能放右侧吗，顶部看不清」）。
   在此之前它是页眉与正文之间那条横带，加过一版粘顶——横带压住正文顶沿、字又小，
   作者判看不清，那一版整体撤掉（连 --toc-h 让位与 §9 的额外 scroll-margin 一起）。

   现在的形态：一列竖排小节名，坐在阅读底板**右沿之外**那条空白边槽里，随滚动粘住。
   为什么不挤进板内：正文栏宽 --measure = --prose-size × 44 是 §6c 量过的（一行恒 44 汉字），
   在板内切一列出来等于把正文压窄，那是 §9 早否掉的"右浮栏破版"。挂到板外则正文一寸没动。
   宽度与断点是算出来的，不是挑的：栏宽 160 + 间距 16 = 176px 边槽，
   底板在有右栏那一档收到 1040px（§6c 默认 1280），于是临界视口 = 1040 + 2×176 = 1392px。
   取 1400px 作断点：1440 及以上的主流桌面都看得到右栏。
   底板收窄不伤正文：最宽正文栏 --measure = 20×44 = 880，加左右各 32 内边距 = 944 < 1040。
   表面：内层坐一张卡面（--card-bg / --card-brd / --r-md，与页头卡同一配方）。
   第一版不铺底、只画左发丝线，实拍里灰字压在亮底片上读不出来——§9 第 2 条那笔债
   （裸字压照片到不了 AA，与形状无关）原样复发。项目自己的既定修法就是"字换地方坐"：
   页头卡、阅读底板都这么救的，右栏照办。卡面随「卡片颜色」两档一起翻。 */
.toc {
  position: absolute;
  /* top + bottom 都要写：sticky 的子元素只能在父盒**多出来的那段高度**里移动。
     只写 top: 0 的话外层高度 = 内容高度，内层没有可走的余量，右栏会跟着正文一起滚走
     （这正是第一版的毛病）。撑满底板全高，内层才真的粘得住。 */
  top: 0;
  bottom: 0;
  /* 板右沿 + 一档间距。right 用负值把栏推到板外：包含块是 .en-glass（position: relative） */
  right: calc(-1 * (160px + var(--space-2)));
  width: 160px;
}

/* 粘顶的是栏内这一层，不是 .toc 自己：absolute 的元素不能同时 sticky。
   外层负责"坐在板外右侧"，内层负责"跟着视口走"，卡面也画在内层——
   粘到哪，卡就跟到哪，不会留下一条空轨。
   top 取 --page-top - 24（与 §9 标题锚点落点同一档）：目录第一项与正文小节标题齐平。
   max-height 收在视口内并允许内滚——小节多的长文不会把栏拖到屏幕外。 */
.toc-inner {
  position: sticky;
  top: calc(var(--page-top) - 24px);
  display: flex;
  flex-direction: column;
  gap: var(--space-0);
  max-height: calc(100vh - var(--page-top) - var(--space-3));
  overflow-y: auto;
  padding: var(--space-2);
  background: var(--card-bg);
  border: 1px solid var(--card-brd);
  border-radius: var(--r-md);
}

.toc-label {
  color: var(--text-1);
  font-size: var(--fs-3xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: var(--space-0);
}

.toc-item {
  font-family: var(--font-mono);
  font-size: var(--fs-3xs);
  line-height: var(--lh-snug);
  color: var(--text-1);
  text-decoration: none;
  /* 竖栏里小节名要折行读全，不截断——截断的目录等于让人猜 */
  padding: 2px 0;
  transition: color var(--dur-fast);
}

.toc-item:hover {
  color: var(--cold);
}

/* 读到哪一节，那条就亮起来（IntersectionObserver 判定，见 observeToc）。
   左侧那根 2px 竖条用 ::before 绝对定位，脱离文档流——不参与栏宽，也不会让条目抖。 */
.toc-item.active {
  position: relative;
  color: var(--cold);
  font-weight: var(--fw-bold);
}

/* 竖条落在卡面内边距里（-12px：条目左沿退 12，卡内边距 16，条宽 2，
   于是条与卡边框之间还留 2px 呼吸），不贴边框也不出卡 */
.toc-item.active::before {
  content: '';
  position: absolute;
  left: -12px;
  top: 0;
  bottom: 0;
  width: 2px;
  border-radius: var(--r-pill);
  background: var(--cold);
}

.toc-item.sub {
  padding-left: var(--space-1);
}

/* 有右栏的那一档：底板收到 1040px，把右边那条 176px 边槽让出来（算法见上）。
   只在这一档收，别的宽度上底板仍是 §6c 的 min(1280px, 94vw)。
   .post 也相应放宽：1040 + 右栏 176 + .en-shell 左右各 32 = 1280。 */
@media (min-width: 1401px) {
  .post {
    max-width: 1280px;
  }
  .post :deep(.en-glass) {
    max-width: 1040px;
    /* 底板 + 右栏当成一个整体居中：右边留出整条边槽（176px），左边不留，
       于是板子自身左移 88px、右栏右移 88px，两者合起来的重心仍在视口中线上。
       只把板子 margin: auto 居中的话，右栏会独占右侧、整页读起来偏左。 */
    margin-left: 0;
    margin-right: calc(160px + var(--space-2));
  }
}

/* ≤1400px：板外没有 176px 的边槽，右栏会被 html 的 overflow-x: clip 直接裁掉（连滚都滚不到）。
   这一档退回正文上方的静态横带——不粘顶（作者判顶部看不清），
   它此时只是"开头那份清单"，滚动位置由顶部那条进度线交代。 */
@media (max-width: 1400px) {
  .toc {
    position: static;
    right: auto;
    /* 横带自己按内容收高：宽屏那档的 top/bottom 撑满底板，这里必须一起复位 */
    top: auto;
    bottom: auto;
    width: auto;
    max-width: var(--measure);
    margin: var(--space-3) auto 0;
    padding: var(--space-1) 0 var(--space-2);
    border-left: 0;
    border-top: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
    flex-direction: row;
    flex-wrap: wrap;
    align-items: baseline;
    column-gap: var(--space-2);
  }
  .toc-inner {
    position: static;
    max-height: none;
    overflow: visible;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: baseline;
    column-gap: var(--space-2);
    row-gap: var(--space-0);
    /* 横带坐在阅读底板里（板自己就是卡面），内层不再叠第二张卡 */
    padding: 0;
    background: none;
    border: 0;
    border-radius: 0;
  }
  .toc-item {
    font-size: var(--fs-xs);
    padding: 0;
  }
  .toc-item.active::before {
    left: calc(-1 * var(--space-0));
    top: 0.2em;
    bottom: 0.2em;
  }
  .toc-item.sub {
    padding-left: 0;
    margin-left: var(--space-2);
  }
}

/* 「回到顶部」的哨兵：1px 高、透明，只为给 IntersectionObserver 一个观测对象。
   block 是为了它真的占住正文顶端那一行位置（inline 空元素高度为 0，观察不到） */
.top-sentinel {
  display: block;
  height: 1px;
}

.tags {
  display: flex;
  gap: var(--space-1);
  flex-wrap: wrap;
  margin-top: var(--space-1);
}

.ends {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
  max-width: var(--measure);
  margin: var(--space-3) auto 0;
  padding-top: var(--space-2);
  border-top: 1px solid var(--line);
}

.end {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-0);
  /* 左出让 28px 给衍射芒，指针移过来时"这颗星"在文字外侧亮起 */
  padding-left: 28px;
  text-decoration: none;
  color: inherit;
}

.end.next {
  text-align: right;
  align-items: flex-end;
  padding-left: 0;
  padding-right: 28px;
}

/* 形态与绽放在 site.css §6b；这里只给位置。上下用 inset + auto 外边距居中，
   不碰 transform——那是基元用来做缓绽的。 */
.end .en-spike {
  top: 0;
  bottom: 0;
  left: 0;
  margin: auto 0;
}

.end.next .en-spike {
  left: auto;
  right: 0;
}

.end .en-mono {
  color: var(--cold);
  font-size: var(--fs-3xs);
}

.end-title {
  font-family: var(--font-display);
  font-size: var(--fs-base);
  font-weight: var(--fw-bold);
  transition: color var(--dur-fast);
}

.end:hover .end-title {
  color: var(--cold);
}

.exit {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-1);
  margin: var(--space-4) 0 var(--space-2);
}

.lightbox {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--ink-0) 88%, transparent);
  cursor: zoom-out;
}

.lightbox img {
  max-width: 92vw;
  max-height: 92vh;
  border: 1px solid var(--line);
}

/* 翻页箭头：底片本身就是"点哪儿都关"，所以这两枚必须自带底色与边框才读得出是可点的钮，
   而不是一层浮在暗处的字。用 --ink-0 兑透明度，两套主题下都压得住图。 */
.lb-nav {
  position: absolute;
  top: 0;
  bottom: 0;
  margin: auto 0;
  height: 52px;
  width: 44px;
  display: grid;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: var(--r-pill);
  background: color-mix(in srgb, var(--ink-0) 78%, transparent);
  color: var(--text-0);
  cursor: pointer;
  font-size: var(--fs-lg);
  transition:
    color var(--dur-fast),
    border-color var(--dur-fast),
    background var(--dur-fast);
}

.lb-nav.prev {
  left: var(--space-2);
}

.lb-nav.next {
  right: var(--space-2);
}

.lb-nav:hover {
  color: var(--cold);
  border-color: var(--cold);
}

/* 计数与键位：压在底片下沿，别挡住图。pointer-events: none 让它不吃掉"点空白关灯" */
.lb-meta {
  position: absolute;
  bottom: var(--space-2);
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: var(--space-2);
  margin: 0;
  font-size: var(--fs-3xs);
  color: var(--text-1);
  pointer-events: none;
}

.lb-count {
  color: var(--cold);
}

/* 浮动「回到顶部」：贴左下角——右下角是播放器浮层的位置（MusicCard: right + bottom）。
   z-index 压在顶栏(60)与进度线(65)之下、正文之上；灯箱(80)开着时它被盖住，正好。 */
.to-top {
  position: fixed;
  left: var(--space-3);
  bottom: var(--space-3);
  z-index: 55;
  gap: var(--space-0);
}

@media (max-width: 720px) {
  .series-line .pos {
    margin-left: 0;
    width: 100%;
  }
  .ends {
    grid-template-columns: 1fr;
    gap: var(--space-2);
  }
  .end.next {
    text-align: left;
    align-items: flex-start;
  }
  /* 灯箱箭头贴边收窄，给图留地方；键位提示在触屏上没有意义（没有方向键） */
  .lb-nav {
    width: 36px;
    height: 44px;
  }
  .lb-nav.prev {
    left: var(--space-0);
  }
  .lb-nav.next {
    right: var(--space-0);
  }
  .lb-keys {
    display: none;
  }
  /* 回顶钮只留图标：文字靠按钮上的 aria-label 播报，不靠这四个字 */
  .to-top .to-top-label {
    display: none;
  }
  /* 目录带退回静态：窄屏上它折成三四行，粘住会吃掉半屏正文 */
  .toc {
    position: static;
  }
}
</style>
