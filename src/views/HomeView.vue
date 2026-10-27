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

/* 折线声波的高度与相位：哈希噪声经邻域平滑（不规则但相邻相近，仍舒缓），
   再叠一层慢涨落给出整体起伏；相位加抖动，去掉整齐行波的机械感。
   全部由下标确定，同一屏永远同一排，不随刷新跳变。
   粗细是设计值，不是视口宽除出来的商：一节 = 竖条 BAR_W + 间隙 BAR_GAP，根数按容器可视宽取整，
   于是每根在任何屏上都是同样的 5px。旧口径是 ≤1679px 恒 240 根、宽度靠 flex 拉伸，实测
   （DPR 1）1123px 上只有 3.672/3.688 两种宽交替、整排都压在半列栅格上，390px 上顶到
   min-width 地板成 1px 且整排 479px 被 html 的 overflow-x 裁掉 45 根。
   BAR_W/BAR_GAP 由模板写成 CSS 变量交给样式，一处真值。
   平滑核从 3 抽扩到 5 抽（1-2-3-2-1）：相邻竖条的高度差再收一档，整排读作缓坡而不是锯齿。 */
const frac = (x) => x - Math.floor(x)
const noise = (i) => frac(Math.sin(i * 127.1 + 311.7) * 43758.5453)
const smooth = (i) => (noise(i - 2) + 2 * noise(i - 1) + 3 * noise(i) + 2 * noise(i + 1) + noise(i + 2)) / 9
const BAR_W = 5
const BAR_GAP = 2
const WAVE_PITCH = BAR_W + BAR_GAP
/* 波高只取旧对称版的上半段：整根 h 的上半 h/2 + 原先接在上面的 ::before 0.2h = 0.7h。
   竖条现在整体立在折线上，0.7 就是"上半段轮廓"本身，桌面那一眼的高度一字不动。 */
const WAVE_H_SCALE = 0.7
/* 慢涨落的波长按视口收口：clamp(260px, 37vw, 530px)。≥1433px 仍是旧值 530px（2π·7/530
   ≈ 0.083 rad/根）；窄屏最短 260px。旧口径波长恒定，390px 上只装得下 0.74 个涨落——
   左边一堵高墙、右边一片平，读不成"波"；现在 390px 是 1.5 个，720px 与桌面都在 2.7 个附近。
   两档之间连续，没有 720px 的断点跳变。 */
const WAVE_LEN_MIN = 260
const WAVE_LEN_MAX = 530
const WAVE_LEN_VW = 0.37
const wavePhase = () =>
  (2 * Math.PI * WAVE_PITCH) / Math.max(WAVE_LEN_MIN, Math.min(WAVE_LEN_MAX, innerWidth * WAVE_LEN_VW))
/* 根数取"整根放得下"的最大值：n 根共 pitch·n − gap px，floor 后末根不再越出容器。
   宽度量抽屉自己的 clientWidth（绝对定位的 left/right:0 落在它的 padding box 上），
   不用 innerWidth——后者含竖向滚动条。根数还要跟着容器宽变：滚动条出现/消失只改
   clientWidth、不触发 window resize，所以另挂 ResizeObserver（见 onMounted）。
   旧口径按 innerWidth 用 ceil 补根：1590px 视口、1582px 容器里整排 1594px，页面一直
   多出 12px 横向滚动；clip-path 只裁画面、不改滚动溢出，收不住这一截。 */
const barCount = (width) =>
  Math.floor(((width || document.documentElement.clientWidth) + BAR_GAP) / WAVE_PITCH)
const waveTune = ref({ count: barCount(), phase: wavePhase() })
const syncWave = () => {
  const width = drawerEl.value?.clientWidth || document.documentElement.clientWidth
  const next = { count: barCount(width), phase: wavePhase() }
  if (next.count !== waveTune.value.count || next.phase !== waveTune.value.phase) waveTune.value = next
}
const onWaveResize = debounce(syncWave)
const wave = computed(() => {
  const { count, phase } = waveTune.value
  return Array.from({ length: count }, (_, i) => {
    const swell = 0.5 + 0.5 * Math.sin(i * phase + 0.9)
    return {
      h: Math.round((24 + 96 * Math.pow(smooth(i), 0.8) * (0.5 + 0.5 * swell)) * WAVE_H_SCALE),
      d: `${-(i * 0.06 + noise(i + 41) * 0.9).toFixed(2)}s`,
    }
  })
})

function tick() {
  const now = new Date()
  clock.value = now.toLocaleTimeString('zh-CN', { hour12: false })
  day.value = `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日 · 星期${WEEK[now.getDay()]}`
}

let io = null
let waveRo = null
onMounted(async () => {
  tick()
  clk = setInterval(tick, 1000)
  // 挂在早退分支之前：下面那条「隐藏页」路径会 return，声波补根不该只服务于可见页
  addEventListener('resize', onWaveResize)
  // setup 时 DOM 还没渲染，根数只能拿 clientWidth 的初值；挂载后读一次抽屉的实宽，
  // 把竖向滚动条出现前后那几像素收回来（读 clientWidth 会强制一次布局）
  syncWave()
  // 滚动条出现/消失只改容器宽、不发 resize：根数跟容器走，末根才不会留在界外
  if (drawerEl.value && 'ResizeObserver' in window) {
    waveRo = new ResizeObserver(syncWave)
    waveRo.observe(drawerEl.value)
  }
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
  if (waveRo) waveRo.disconnect()
  if (io) io.disconnect()
})
</script>

<template>
  <div class="home">
    <HorizonHero />

    <!-- 折线以下的风景底片层已上移到 App.vue（fixed 层不能放在带 filter 的页根子树里），
         这里只留章节区。 -->
    <section ref="drawerEl" class="drawer" :class="{ open }">
      <!-- 折线声波：整排立在首屏/章节区接缝之上，只向上长，折线以下不留任何一段；装饰层 -->
      <div
        class="wave"
        aria-hidden="true"
        :style="{ '--wave-w': BAR_W + 'px', '--wave-gap': BAR_GAP + 'px' }"
      >
        <i v-for="(w, i) in wave" :key="i" :style="{ '--h': w.h, '--d': w.d }"></i>
      </div>

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

/* 折线声波：整排立在接缝上、只向上。容器把底边钉在 .drawer 的顶边（bottom:100%），
   竖条走 align-items:flex-end 从这条线往上长——没有 ::before，也没有任何一段落到折线以下。
   底座贴着线，呼吸的 transform-origin 就换成 bottom：收缩时底座不离线，读作从地平线长出来，
   而不是一根浮在接缝上缩小。
   clip-path 只裁底边：辉光外扩 4px，不裁会有一圈淡光漏进抽屉，与"只有折线上的"相抵；
   顶端/两侧各放 8px，让辉光其余方向照旧。
   每根恒为 var(--wave-w)、间隙 var(--wave-gap)，两个值由 script 经模板写成 CSS 变量（真值只有一处）；
   铺满整屏宽靠的是**根数**跟着容器可视宽走，不再靠拉伸竖条。所以粗细与节距在任何屏上一致，
   最后一根整根落在容器里，不会越出右沿把页面撑出横向滚动。 */
.wave {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 100%;
  z-index: 3;
  display: flex;
  align-items: flex-end;
  gap: var(--wave-gap);
  pointer-events: none;
  clip-path: inset(-8px 0 0 0);
}

.wave i {
  position: relative;
  flex: 0 0 var(--wave-w);
  height: calc(var(--h) * 1px);
  /* 顶端圆、底端平：底座直接坐在折线上，不给自己留一个"探到线下"的圆角 */
  border-radius: 2px 2px 0 0;
  /* 顶端提亮，落到折线回到接缝色（--h 已经是"线上高度"，不再有下半截） */
  background: linear-gradient(to bottom, var(--wave-ink-top), var(--wave-ink));
  box-shadow: 0 0 4px var(--wave-glow);
  transform-origin: center bottom;
  animation: wave-breathe 3.4s ease-in-out infinite;
  animation-delay: var(--d);
}

@keyframes wave-breathe {
  0%,
  100% {
    transform: scaleY(0.55);
    opacity: 0.78;
  }
  50% {
    transform: scaleY(1);
    opacity: 1;
  }
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

  .wave i {
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
