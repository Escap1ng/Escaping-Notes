<script setup>
// 首页：星轨首屏 + 折线以下的章节区（此刻 / 精选 / 最近动态 / 最近合集 / 最近项目）
// 折线以下没有总底板，也不逐条包卡：一个章节共用一张半透明底卡，条目在卡内排成行或瓦片。
import { computed, onMounted, onUnmounted, ref } from 'vue'
import HorizonHero from '../components/HorizonHero.vue'
import { loadPosts } from '../lib/posts.js'
import { mergeFeed } from '../lib/feed.js'
import { ancestorsOf, collectionHref, postsOf } from '../lib/collections.js'
import { projectSlug } from '../lib/projects.js'
import { content } from '../data/index.js'
import { debounce } from '../lib/debounce.js'
import { whenHeroReady } from '../lib/hero.js'
import { WAVE_PEAK, ridgePath } from '../lib/wave.js'
import { N, navLabel } from '../data/narrative.js'

const posts = ref([])
const loading = ref(true)
const drawerEl = ref(null)
const open = ref(false)

const featured = computed(() => posts.value.slice(0, 3))
// 最近动态 = 手写动态 + 已发布文章（lib/feed.js 统一合并、按日期倒序），取前 5 条；
// 与 /updates 共用同一份数据。条目在本章底卡里排成独立行，不各占一张卡。
// 文章取数与上面三格精选同源（posts），所以新文一发就会自己出现在这里，不用再手补动态。
const recent = computed(() => mergeFeed(content.updates, posts.value).slice(0, 5))

/* 最近合集：按"这个合集里最新一篇文章"的日期倒序，取前三。
   计数与 /collections 同一口径（lib/collections.js 的 postsOf 会算上后代合集），
   上级合集因此汇总的是整棵子树的文章。 */
const recentCollections = computed(() => {
  const list = content.collections
  const rows = list.map((c) => {
    const items = postsOf(list, c.slug, posts.value)
    const latest = items.reduce((m, p) => (p.date > m ? p.date : m), '')
    return {
      slug: c.slug,
      title: c.title,
      summary: c.summary,
      href: collectionHref(c.slug),
      latest,
      up: ancestorsOf(list, c.slug)
        .map((a) => a.title)
        .join(' / '),
      n: items.length,
      order: Number.isInteger(c.order) ? c.order : Number.MAX_SAFE_INTEGER,
    }
  })
  return rows
    .sort(
      (a, b) =>
        b.latest.localeCompare(a.latest) ||
        a.order - b.order ||
        a.title.localeCompare(b.title, 'zh-Hans-CN')
    )
    .slice(0, 3)
})

// 合集那一行的读数：上级合集 · 最近一篇的日期 · 篇数。取数未完成时写 — 而不是 0。
function collectionMeta(c) {
  if (loading.value) return '—'
  return [c.up, c.latest, N.collection.posts.replace('{n}', c.n)].filter(Boolean).join(' · ')
}

// 最近项目：数据本身就是手挑的顺序（src/data/projects.js），取前三。
// 项目没有发布日期，这里不编一个"最近"的排序口径。
const recentProjects = computed(() => content.projects.slice(0, 3))

/* 一枚读数：本地时刻与日期星期。
   （「本次停留 / 这一夜已曝」计时读数 2026-10-09 删除——它数的是打开页面后的秒数，
    没有任何信息量，还把 `sky.t0` 的全站曝光时钟错标成"自这一页打开时起算"。） */
const clock = ref('--:--:--')
const day = ref('')
let clk = 0
const WEEK = ['日', '一', '二', '三', '四', '五', '六']

/* 折线波脊：一条连续的山脊线（前层亮、后层暗两层），公式在 src/lib/wave.js。
   2026-10-30 第三次改版——前两版都是等宽竖条：204 根 5px 柱子在 1440px 上是"频谱条/围栏"，
   作者三次判"生硬/不够自然"。波浪分隔线在别处一律是连续曲线（shapedivider / getwaves 那类），
   所以这里也改成曲线：包络仍是与整排同宽的 sin(πu)（正中最高、两端归零，与首屏山脊同向），
   里面叠三列同向行波（长波快、短波慢，水的色散）——脊线在动、轮廓不动，才不像整块带子呼吸。
   宽度按抽屉的 clientWidth 量（绝对定位的 left/right:0 落在它的 padding box 上）；
   30fps 重算路径，离屏 / 标签页隐藏 / 减弱动效时停。 */
const waveW = ref(typeof document === 'undefined' ? 1440 : document.documentElement.clientWidth)
const waveFront = ref('')
const waveBack = ref('')
let waveT0 = 0
let waveRaf = 0
let waveLast = 0
let waveOn = true
const waveStill = () => matchMedia('(prefers-reduced-motion: reduce)').matches

function paintWave(now) {
  const t = (now - waveT0) / 1000
  waveFront.value = ridgePath(waveW.value, t, 0)
  waveBack.value = ridgePath(waveW.value, t, 1)
}

function loopWave(now) {
  waveRaf = 0
  if (!waveOn || document.hidden) return
  if (now - waveLast >= 32) {
    waveLast = now
    paintWave(now)
  }
  waveRaf = requestAnimationFrame(loopWave)
}

function kickWave() {
  if (waveRaf || !waveOn || document.hidden || waveStill()) return
  waveRaf = requestAnimationFrame(loopWave)
}

// 藏起来的标签页 rAF 会停：回来时补一脚，别等下一次滚动
const onWaveVisible = () => {
  if (!document.hidden) kickWave()
}

function syncWave() {
  const width = drawerEl.value?.clientWidth || document.documentElement.clientWidth
  if (width !== waveW.value) {
    waveW.value = width
    waveFront.value = ''
    waveBack.value = ''
  }
  paintWave(performance.now() || waveT0)
}
const onWaveResize = debounce(syncWave)

function tick() {
  const now = new Date()
  clock.value = now.toLocaleTimeString('zh-CN', { hour12: false })
  day.value = `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日 · 星期${WEEK[now.getDay()]}`
}

let io = null
let waveRo = null
let waveIo = null
onMounted(async () => {
  tick()
  clk = setInterval(tick, 1000)
  waveT0 = performance.now()
  // 挂在早退分支之前：下面那条「隐藏页」路径会 return，波脊不该只服务于可见页
  addEventListener('resize', onWaveResize)
  // setup 时 DOM 还没渲染，宽度只能拿 clientWidth 的初值；挂载后读一次抽屉的实宽，
  // 把竖向滚动条出现前后那几像素收回来（读 clientWidth 会强制一次布局）
  syncWave()
  // 滚动条出现/消失只改容器宽、不发 resize：波脊按容器宽重算
  if (drawerEl.value && 'ResizeObserver' in window) {
    waveRo = new ResizeObserver(onWaveResize)
    waveRo.observe(drawerEl.value)
  }
  // 波脊只在接缝附近有像素：滚进章节区深处就停帧，滚回来自动续上
  const waveEl = drawerEl.value?.querySelector('.wave')
  if (waveStill()) {
    paintWave(waveT0)
  } else if (waveEl && 'IntersectionObserver' in window) {
    waveIo = new IntersectionObserver(
      ([e]) => {
        waveOn = e.isIntersecting
        if (waveOn) kickWave()
        else if (waveRaf) {
          cancelAnimationFrame(waveRaf)
          waveRaf = 0
        }
      },
      { rootMargin: '160px' }
    )
    waveIo.observe(waveEl)
    kickWave()
  } else {
    kickWave()
  }
  document.addEventListener('visibilitychange', onWaveVisible)
  // 章节数据等首屏照片 load 完再取：精选封面与动态行会和 LCP 抢带宽与主线程，
  // 而它们在折线以下，晚一步没人看得见空窗；合集/项目是同步数据，照常先渲染。
  await whenHeroReady()
  posts.value = await loadPosts()
  loading.value = false
  // 抽屉第一次进入视口时拉出一次，之后断开——它不是滚动监听，docs/design.md §3.2 那条「不要各自写滚动监听」的禁令不适用。
  // 两道兜底都要：⑴ 没有 IntersectionObserver；⑵ 有，但页面是隐藏页，回调永远不来
  // （后台标签页打开、以及内置/无头 surfaces 都是这一类）。缺了第二道，内容会停在 opacity:0。
  if (!('IntersectionObserver' in window) || !drawerEl.value || document.visibilityState === 'hidden') {
    open.value = true // 没有动画只能等于"没有动画"，不能等于"没有内容"
    return
  }
  io = new IntersectionObserver(
    ([e]) => {
      if (!e.isIntersecting) return
      open.value = true
      io.disconnect()
      io = null
    },
    { rootMargin: '0px 0px -10% 0px' }
  )
  io.observe(drawerEl.value)
})
onUnmounted(() => {
  clearInterval(clk)
  removeEventListener('resize', onWaveResize)
  onWaveResize.cancel()
  document.removeEventListener('visibilitychange', onWaveVisible)
  if (waveRo) waveRo.disconnect()
  if (waveIo) waveIo.disconnect()
  if (waveRaf) cancelAnimationFrame(waveRaf)
  waveRaf = 0
  if (io) io.disconnect()
})
</script>

<template>
  <div class="home">
    <HorizonHero />

    <!-- 折线以下的风景底片层已上移到 App.vue（fixed 层不能放在带 filter 的页根子树里），
         这里只留章节区。 -->
    <section ref="drawerEl" class="drawer" :class="{ open }">
      <!-- 折线波脊：一条连续山脊立在首屏/章节区接缝之上，只向上长，折线以下不留任何一段；
           后层矮而暗、前层满高，两层相位错开 → 读作两道浪叠在一起。装饰层。 -->
      <svg
        class="wave"
        :viewBox="`0 0 ${waveW} ${WAVE_PEAK}`"
        :style="{ '--wave-h': WAVE_PEAK }"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="wave-ink" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="var(--wave-ink-top)" />
            <stop offset="1" stop-color="var(--wave-ink)" />
          </linearGradient>
        </defs>
        <path class="wave-back" :d="waveBack" />
        <path class="wave-front" :d="waveFront" />
      </svg>

      <div class="content">
        <!-- 此刻：一行日期读数，不单独占一张卡 -->
        <div class="dateline">
          <span class="dl-k">{{ N.drawer.clock }}</span>
          <span class="dl-v en-mono">{{ clock }}</span>
          <span class="dl-d">{{ day }}</span>
        </div>

        <!-- 一个章节一张半透明底卡：章节头与条目共用这块面 -->
        <section class="pane pane-picks" aria-labelledby="home-featured">
          <header class="pane-h">
            <h2 id="home-featured" class="pane-t">{{ N.drawer.featured }}</h2>
            <RouterLink class="pane-link en-mono" to="/blog"
              >{{ N.drawer.all }}{{ navLabel('/blog') }} →</RouterLink
            >
          </header>
          <div class="picks">
            <RouterLink v-for="p in featured" :key="p.slug" :to="`/blog/${p.slug}`" class="pick">
              <span class="en-shot" :class="{ blank: !p.cover }">
                <img
                  v-if="p.cover"
                  :src="p.cover"
                  :alt="p.title"
                  :style="{ objectPosition: p.imagePos }"
                  loading="lazy"
                  decoding="async"
                />
              </span>
              <span class="pick-body">
                <span class="pick-date en-mono">{{ p.date }}</span>
                <span class="pick-ttl">{{ p.title }}</span>
                <span class="pick-sum">{{ p.summary }}</span>
              </span>
            </RouterLink>
          </div>
        </section>

        <section class="pane pane-feed" aria-labelledby="home-recent">
          <header class="pane-h">
            <h2 id="home-recent" class="pane-t">{{ N.drawer.recent }}</h2>
            <RouterLink class="pane-link en-mono" to="/updates"
              >{{ N.drawer.all }}{{ navLabel('/updates') }} →</RouterLink
            >
          </header>
          <ol class="feed">
            <li v-for="(u, i) in recent" :key="u.key" class="pulse">
              <span class="dot" :class="i === 0 ? 'hot' : 'cold'" aria-hidden="true"></span>
              <span class="when en-mono">{{ u.date }}</span>
              <RouterLink v-if="u.to" :to="u.to" class="what">
                {{ u.text }}<span class="go" aria-hidden="true">→</span>
              </RouterLink>
              <p v-else class="what">{{ u.text }}</p>
            </li>
            <li v-if="!recent.length" class="empty en-mono">{{ N.empty.updates }}</li>
          </ol>
        </section>

        <div
          v-if="recentCollections.length || recentProjects.length"
          class="duo"
        >
          <section
            v-if="recentCollections.length"
            class="pane pane-colls"
            aria-labelledby="home-collections"
          >
            <header class="pane-h">
              <h2 id="home-collections" class="pane-t">{{ N.drawer.collections }}</h2>
              <RouterLink class="pane-link en-mono" to="/collections"
                >{{ N.drawer.all }}{{ navLabel('/collections') }} →</RouterLink
              >
            </header>
            <ul class="rows">
              <li v-for="c in recentCollections" :key="c.slug">
                <RouterLink class="row coll" :to="c.href">
                  <span class="row-top">
                    <span class="coll-ttl">{{ c.title }}</span>
                    <span class="row-go" aria-hidden="true">→</span>
                  </span>
                  <span class="coll-k en-mono">{{ collectionMeta(c) }}</span>
                  <span class="coll-sum">{{ c.summary }}</span>
                </RouterLink>
              </li>
            </ul>
          </section>

          <section
            v-if="recentProjects.length"
            class="pane pane-projs"
            aria-labelledby="home-projects"
          >
            <header class="pane-h">
              <h2 id="home-projects" class="pane-t">{{ N.drawer.projects }}</h2>
              <RouterLink class="pane-link en-mono" to="/projects"
                >{{ N.drawer.all }}{{ navLabel('/projects') }} →</RouterLink
              >
            </header>
            <ul class="rows">
              <li v-for="p in recentProjects" :key="p.name">
                <RouterLink class="row proj" :to="`/projects/${projectSlug(p.name)}`">
                  <span class="row-top">
                    <h3 class="name">{{ p.name }}</h3>
                    <span class="year en-mono">{{ p.year }}</span>
                    <span class="row-go" aria-hidden="true">→</span>
                  </span>
                  <p class="desc">{{ p.desc }}</p>
                  <span v-if="p.stack" class="stack en-mono">{{ p.stack }}</span>
                </RouterLink>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home {
  position: relative;
  /* 必须 isolate：把 .drawer 的 z-index:2 关在本组件的层叠上下文里，不让它到根层级去和
     App.vue 那层 fixed 的 .sub-plate（z-index:-1）、顶栏抢序。去掉它抽屉照样在图之上，
     但排序对象从"本页内部"变成"全站根层"，改动会波及别的页。 */
  isolation: isolate;
}

/* 章节区：整块在首次进入视口时从下方拉出一次。
   呈现走 animation 而不是 transition：常态必须是可见的。隐藏文档里 transition 不推进，
   "默认 opacity:0 + 加类翻 1"会让整块内容永久停在起点；动画只在 .open 那一刻跑，
   最坏情况是少一次动画，不会是"没有内容"。 */
.drawer {
  position: relative;
  z-index: 2;
  padding: var(--space-4) var(--space-3) var(--space-5);
}

.drawer.open {
  animation: drawer-out 0.55s cubic-bezier(0.2, 0.8, 0.2, 1);
}

@keyframes drawer-out {
  from {
    opacity: 0;
    transform: translateY(28px);
  }
}

/* 折线波脊：容器把底边钉在 .drawer 的顶边（bottom:100%），SVG 的 viewBox 高 = WAVE_PEAK，
   y = WAVE_PEAK 就是接缝，路径在那里闭合——所以折线以下一段都没有。
   两层：后层矮（0.62）、暗、相位错开，前层满高带渐变；两层各自在动，读作两道浪叠着走。
   不再有辉光与 clip-path：连续曲线的轮廓自己就够清楚，而一直重画路径的元素上挂
   box-shadow / drop-shadow 等于每帧重新栅格化一遍。
   宽度是量出来的（viewBox 宽 = 抽屉 clientWidth），所以曲线不被拉伸，任何屏上粗细一致。 */
.wave {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 100%;
  z-index: 3;
  display: block;
  width: 100%;
  height: calc(var(--wave-h) * 1px);
  pointer-events: none;
  overflow: visible;
}

/* 两条脊线都是"水"不是"墙"：填充只到 26% / 16%，靠一条 1.5px 的亮脊线定形。
   整块不透明的冷色在这张照片上会读成一块蓝板——折线以下是风景，不是纯色分区。 */
.wave-front {
  fill: url(#wave-ink);
  fill-opacity: 0.16;
  stroke: var(--wave-ink-top);
  stroke-width: 1.4;
  stroke-opacity: 0.92;
}

.wave-back {
  fill: var(--wave-ink);
  fill-opacity: 0.09;
  stroke: var(--wave-ink-top);
  stroke-width: 0.8;
  stroke-opacity: 0.3;
}

/* 底卡错峰显影：整块拉出后，一块面接一块面从下方浮起。只动 opacity / transform——
   大面积的 filter 会每帧重新栅格化整棵子树（manual.md §3.5），玻璃面尤其不该进动画。 */
.drawer.open .dateline,
.drawer.open .pane {
  animation: pane-in 0.55s cubic-bezier(0.2, 0.8, 0.2, 1) backwards;
}

.drawer.open .dateline {
  animation-delay: 0.04s;
}

.drawer.open .pane-picks {
  animation-delay: 0.12s;
}

.drawer.open .pane-feed {
  animation-delay: 0.2s;
}

.drawer.open .pane-colls {
  animation-delay: 0.28s;
}

.drawer.open .pane-projs {
  animation-delay: 0.34s;
}

@keyframes pane-in {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
}

.content {
  max-width: 1120px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

/* 章节底卡：一个章节一块面，条目不再各包一层。
   填充与边线直接取卡面令牌（--card-bg / --card-brd）：默认档浅色就是纯白、深色是实底，
   设置卡「卡片颜色」翻到半透明时这一层也跟着翻，与全站卡片同一套开关、同一种表面语言。
   刻意不建 backdrop-filter：这片区域常驻（manual.md §3.4），底片自己已经带着
   --plate-blur（默认拉满 12px）的模糊。旧 .sheet 的 42% + blur(22px) 是一整块面的手笔。 */
.dateline,
.pane {
  border: 1px solid var(--card-brd);
  border-radius: var(--r-md);
  background: var(--card-bg);
}

/* ---------- 此刻：一行日期读数 ---------- */
.dateline {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: var(--space-1) var(--space-2);
  padding: var(--space-1) var(--card-pad-lg);
}

.dl-v {
  font-size: var(--fs-xl);
  letter-spacing: 0.04em;
  color: var(--text-0);
  font-variant-numeric: tabular-nums;
}

.dl-d {
  margin-left: auto;
  font-size: var(--fs-xs);
  color: var(--text-1);
}

/* ---------- 章节头 ---------- */
.pane {
  padding: var(--card-pad-lg);
}

.pane-h {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

/* 「此刻」不是仪器小标签，是这一章的章名：章名体（.pane-t）与它共用一条规则。 */
.pane-t,
.dl-k {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(20px, 2.6vw, 26px);
  font-weight: var(--fw-bold);
  letter-spacing: -0.01em;
  line-height: var(--lh-tight);
}

.pane-link {
  margin-left: auto;
  color: var(--cold);
  font-size: var(--fs-3xs);
  white-space: nowrap;
  text-decoration: none;
  transition: color var(--dur-fast);
}

.pane-link:hover {
  color: var(--text-0);
}

/* ---------- 精选：三块封面瓦片，底卡只铺一次 ---------- */
.picks {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-2);
}

.pick {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--card-brd);
  border-radius: var(--r-md);
  color: inherit;
  text-decoration: none;
  transition: border-color var(--dur-fast);
}

.pick:hover,
.pick:focus-visible {
  border-color: var(--card-brd-hover);
}

/* 外框里的封面顶到边框：图的圆角由 .pick 的 overflow 裁出来 */
.pick .en-shot {
  border-radius: 0;
}

.pick .en-shot img {
  transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.pick:hover .en-shot img {
  transform: scale(1.035);
}

.pick-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--card-pad);
}

.pick-date {
  font-size: var(--fs-3xs);
  letter-spacing: 0.1em;
  color: var(--text-1); /* 日期是元数据；热色只留给当前播放与错误 */
}

.pick-ttl {
  font-family: var(--font-display);
  font-size: var(--fs-lg);
  font-weight: var(--fw-bold);
  line-height: var(--lh-tight);
  color: var(--text-0);
  transition:
    color var(--dur-fast),
    transform var(--dur) cubic-bezier(0.2, 0.8, 0.2, 1);
}

.pick:hover .pick-ttl {
  color: var(--cold);
  transform: translateX(var(--nudge));
}

.pick-sum {
  font-size: var(--fs-sm);
  line-height: var(--lh-normal);
  color: var(--text-1);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ---------- 最近动态：底卡里的独立行，与 /updates 同一种行语法 ---------- */
.feed {
  list-style: none;
  margin: 0 calc(var(--space-1) * -1);
  padding: 0;
}

.pulse {
  display: grid;
  grid-template-columns: auto max-content minmax(0, 1fr);
  align-items: baseline;
  gap: var(--space-2);
  padding: calc(var(--space-1) * 1.5) var(--space-1);
  border-radius: var(--r-sm);
  transition: background var(--dur-fast);
}

.pulse:hover {
  background: color-mix(in srgb, var(--text-0) 5%, transparent);
}

/* 日期列取 max-content 而不是 10ch：ch 在栅格列上按容器字体度量算（这里是 body 的 sans），
   换一台机器 mono 就不是那个宽度。所有日期都是十个字符，所以各行正文对齐在同一条竖线上 */
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  transition: transform var(--dur) cubic-bezier(0.2, 0.8, 0.2, 1);
}

.pulse:hover .dot {
  transform: scale(1.8);
}

.dot.cold {
  background: var(--cold);
}

.dot.hot {
  background: var(--hot);
}

.when {
  color: var(--text-1);
  font-size: var(--fs-sm);
  line-height: var(--lh-tight);
  white-space: nowrap;
  transition: color var(--dur-fast);
}

.pulse:hover .when {
  color: var(--cold);
}

.what {
  margin: 0;
  font-family: var(--font-serif);
  font-size: var(--fs-md);
  line-height: var(--lh-relaxed);
  transition: transform var(--dur) cubic-bezier(0.2, 0.8, 0.2, 1);
}

/* 文章条目是链接：正文同色，hover 冷移；箭头只做"能点进去"的提示 */
a.what {
  color: inherit;
  text-decoration: none;
}

a.what:hover {
  color: var(--cold);
  transform: translateX(var(--nudge));
}

.go {
  display: inline-block;
  margin-left: var(--space-1);
  color: var(--cold);
  font-family: var(--font-sans);
  font-size: var(--fs-sm);
  transition: transform var(--dur) cubic-bezier(0.2, 0.8, 0.2, 1);
}

a.what:hover .go {
  transform: translateX(var(--nudge));
}

.empty {
  padding: var(--space-1);
  color: var(--text-1);
}

/* ---------- 最近合集 / 最近项目：下半区并排两章 ---------- */
.duo {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
}

/* 数据里只剩一边时，独章铺满整行而不是留下半张空面 */
.duo > .pane:only-child {
  grid-column: 1 / -1;
}

.rows {
  list-style: none;
  margin: 0 calc(var(--space-1) * -1);
  padding: 0;
}

.row {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-1) / 2);
  padding: calc(var(--space-1) * 1.5) var(--space-1);
  border-radius: var(--r-sm);
  color: inherit;
  text-decoration: none;
  transition: background var(--dur-fast);
}

.row:hover {
  background: color-mix(in srgb, var(--text-0) 5%, transparent);
}

.row-top {
  display: flex;
  align-items: baseline;
  gap: var(--space-1);
}

.row-go {
  margin-left: auto;
  color: var(--cold);
  transition: transform var(--dur) cubic-bezier(0.2, 0.8, 0.2, 1);
}

.row:hover .row-go {
  transform: translateX(var(--nudge));
}

.coll-ttl {
  font-family: var(--font-display);
  font-size: clamp(18px, 2.2vw, 22px);
  font-weight: var(--fw-bold);
  line-height: var(--lh-tight);
  letter-spacing: -0.01em;
  transition:
    color var(--dur-fast),
    transform var(--dur) cubic-bezier(0.2, 0.8, 0.2, 1);
}

.row:hover .coll-ttl {
  color: var(--cold);
  transform: translateX(var(--nudge));
}

.coll-k {
  font-size: var(--fs-3xs);
  color: var(--text-1);
}

.coll-sum {
  font-family: var(--font-serif);
  font-size: var(--fs-sm);
  line-height: var(--lh-normal);
  color: var(--text-1);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.year {
  color: var(--text-1);
  font-size: var(--fs-3xs);
}

/* 年份挪到行首右端：两章的条目名都从章节面左沿起排。原先年份排在名字左边，
   那一列 30.6px + 一节间隙把项目名顶到 870.6，而左章的合集名在 832——同一行的
   标题错开近 40px，两列并排时读起来像两条对不齐的账。箭头仍贴右沿，
   年份是四位等宽，行与行之间自己对齐。 */
.proj .year {
  margin-left: auto;
}

.proj .row-go {
  margin-left: 0;
}

.name {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(18px, 2.2vw, 22px);
  font-weight: var(--fw-bold);
  letter-spacing: -0.01em;
  line-height: var(--lh-tight);
  transition:
    color var(--dur-fast),
    transform var(--dur) cubic-bezier(0.2, 0.8, 0.2, 1);
}

.row:hover .name {
  color: var(--cold);
  transform: translateX(var(--nudge));
}

.desc {
  margin: 0;
  color: var(--text-1);
  font-size: var(--fs-sm);
  line-height: var(--lh-normal);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 卡脚那一行留给技术栈：它是"值不值得点进去"的线索，进去之后还有整段。
   .en-mono 会把拉丁字母转大写（仪器读数的口径），而这里装的是产品名，
   VUE ROUTER 4 / CANVAS 2D 读起来是打坏的字面量，所以照 §6 里 .en-btn 那条先例显式复位。 */
.stack {
  color: var(--cold);
  font-size: var(--fs-3xs);
  text-transform: none;
}

@media (max-width: 900px) {
  .picks {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .duo {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .drawer {
    padding: var(--space-3) var(--space-2) var(--space-4);
  }

  .dateline {
    padding: var(--space-1) var(--space-2);
  }

  .dl-d {
    margin-left: 0;
  }

  .pane {
    padding: var(--space-2);
  }

  .picks {
    grid-template-columns: 1fr;
  }

  /* 手机上日期与正文并排只剩一行七八个字：日期另起一行，正文仍缩进到日期之下 */
  .pulse {
    grid-template-columns: auto 1fr;
    row-gap: calc(var(--space-1) / 2);
  }

  .what {
    grid-column: 2;
  }
}

@media (prefers-reduced-motion: reduce) {
  .drawer.open,
  .drawer.open .dateline,
  .drawer.open .pane {
    animation: none;
  }

  .pulse:hover .dot,
  .pick:hover .en-shot img,
  .pick:hover .pick-ttl,
  .row:hover .coll-ttl,
  .row:hover .name,
  .row:hover .row-go,
  a.what:hover,
  a.what:hover .go {
    transform: none;
  }
}
</style>
