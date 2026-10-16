<script setup>
// 首页：星轨首屏 + 风景底片 + 下滑拉出的抽屉（读数 / 精选 / 最近动态）
import { computed, onMounted, onUnmounted, ref } from 'vue'
import HorizonHero from '../components/HorizonHero.vue'
import { loadPosts } from '../lib/posts.js'
import { updates } from '../config/updates.js'
import { onLens } from '../lib/lens.js'
import { debounce } from '../lib/debounce.js'
import { N } from '../config/narrative.js'

const posts = ref([])
const drawerEl = ref(null)
const open = ref(false)

const featured = computed(() => posts.value.slice(0, 3))
// 最近动态卡：updates 是 newest-first 的静态时间线（config/updates.js，§2.3 约定新条目加在最前），
// 取前 5 条；整卡链向 /updates。首页不再有页内目录，页面导航只留顶栏。
const recent = updates.slice(0, 5)

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
   粗细是设计值，不是视口宽除出来的商：一节 = 竖条 BAR_W + 间隙 BAR_GAP，根数按视口宽补，
   于是每根在任何屏上都是同样的 4px。旧口径是 ≤1679px 恒 240 根、宽度靠 flex 拉伸，实测
   （DPR 1）1123px 上只有 3.672/3.688 两种宽交替、整排都压在半列栅格上，390px 上顶到
   min-width 地板成 1px 且整排 479px 被 html 的 overflow-x 裁掉 45 根。节距恒定还顺带把
   涨落与相位的物理尺度钉住：swell 那层慢波一轮 = 2π/0.083 ≈ 75.7 根 = 378px，各视口一致
   （旧口径在同一屏上是 352~355px，随容器宽漂）。BAR_W/BAR_GAP 由模板写成 CSS 变量交给样式，一处真值。 */
const frac = (x) => x - Math.floor(x)
const noise = (i) => frac(Math.sin(i * 127.1 + 311.7) * 43758.5453)
const smooth = (i) => (noise(i - 1) + 2 * noise(i) + noise(i + 1)) / 4
const BAR_W = 4
const BAR_GAP = 1
const barCount = () => Math.ceil((innerWidth + 1) / (BAR_W + BAR_GAP)) // n 根占 (BAR_W+BAR_GAP)·n−1 px，+1 才刚好不留余量
const waveCount = ref(barCount())
const onWaveResize = debounce(() => {
  waveCount.value = barCount()
})
const wave = computed(() =>
  Array.from({ length: waveCount.value }, (_, i) => {
    const swell = 0.5 + 0.5 * Math.sin(i * 0.083 + 0.9)
    return {
      h: Math.round(24 + 96 * Math.pow(smooth(i), 0.8) * (0.5 + 0.5 * swell)),
      d: `${-(i * 0.06 + noise(i + 41) * 0.9).toFixed(2)}s`,
    }
  })
)

function tick() {
  const now = new Date()
  clock.value = now.toLocaleTimeString('zh-CN', { hour12: false })
  day.value = `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日 · 星期${WEEK[now.getDay()]}`
}

let io = null
onMounted(async () => {
  tick()
  clk = setInterval(tick, 1000)
  // 挂在早退分支之前：下面那条「隐藏页」路径会 return，声波补根不该只服务于可见页
  addEventListener('resize', onWaveResize)
  posts.value = await loadPosts()
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
  if (io) io.disconnect()
})
</script>

<template>
  <div class="home">
    <HorizonHero />

    <!-- 折线以下的风景底片层已上移到 App.vue（fixed 层不能放在带 filter 的页根子树里），
         这里只留抽屉。 -->

    <section ref="drawerEl" class="drawer" :class="{ open }">
      <!-- 折线声波：骑在首屏/抽屉接缝上上下对称、排密到相接，读成一条穿过地平线的不断波形；装饰层 -->
      <div class="wave" aria-hidden="true" :style="{ '--wave-w': BAR_W + 'px', '--wave-gap': BAR_GAP + 'px' }">
        <i v-for="(w, i) in wave" :key="i" :style="{ '--h': w.h, '--d': w.d }"></i>
      </div>

      <div class="sheet">
        <span class="lip" aria-hidden="true"></span>

        <div class="dials">
          <div class="dial">
            <span class="dial-k en-mono">{{ N.drawer.clock }}</span>
            <span class="dial-v en-mono">{{ clock }}</span>
            <span class="dial-s">{{ day }}</span>
          </div>
        </div>

        <h2 class="en-eyebrow sec">{{ N.drawer.featured }}</h2>
        <div class="picks">
          <RouterLink
            v-for="p in featured"
            :key="p.slug"
            :to="`/blog/${p.slug}`"
            class="en-card en-flush pick en-lens"
            @pointermove="onLens"
          >
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

        <h2 class="en-eyebrow sec">{{ N.drawer.recent }}</h2>
        <RouterLink to="/updates" class="en-card feed en-lens" aria-label="最近动态 · 查看全部" @pointermove="onLens">
          <span v-for="u in recent" :key="u.date + u.text" class="feed-row">
            <span class="feed-date en-mono">{{ u.date }}</span>
            <span class="feed-text">{{ u.text }}</span>
          </span>
        </RouterLink>
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

/* 抽屉：整块在首次进入视口时从下方拉出一次。
   表面是玻璃态（见下面的 .sheet），但不复用 .en-glass——那是模态抽屉专属的定宽浮层，
   自带 max-width / padding / 定位，套在常驻面板上会打架。
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

/* 卡片错峰"显影"：整块抽屉拉出后，卡逐张从糊到清、从暗到亮升起，
   读作底片在显影而不是列表在滑入。backwards 让延迟期内保持起点态。 */
.drawer.open .pick,
.drawer.open .feed {
  animation: card-develop 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) backwards;
}
.drawer.open .pick:nth-child(1) {
  animation-delay: 0.12s;
}
.drawer.open .pick:nth-child(2) {
  animation-delay: 0.22s;
}
.drawer.open .pick:nth-child(3) {
  animation-delay: 0.32s;
}
.drawer.open .feed {
  animation-delay: 0.42s;
}

@keyframes card-develop {
  from {
    opacity: 0;
    transform: translateY(18px);
    filter: blur(6px);
  }
}

/* 折线声波：整排以接缝为中线上下对称（transform-origin center），上半压进首屏山脊、
   下半落进抽屉留白，读成一道穿过地平线的波。每根恒为 var(--wave-w)、间隙 var(--wave-gap)，
   两个值由 script 经模板写成 CSS 变量（真值只有一处）；铺满整屏宽靠的是**根数**跟着视口走，
   不再靠拉伸竖条。所以粗细与节距在任何屏上一致，最后一根会随容器边缘裁掉几 px。 */
.wave {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  transform: translateY(-50%);
  z-index: 3;
  display: flex;
  align-items: center;
  gap: var(--wave-gap);
  height: 140px;
  pointer-events: none;
}

.wave i {
  flex: 0 0 var(--wave-w);
  height: calc(var(--h) * 1px);
  border-radius: 2px;
  background: var(--wave-ink);
  box-shadow: 0 0 4px var(--wave-glow);
  transform-origin: center;
  animation: wave-breathe 2.6s ease-in-out infinite;
  animation-delay: var(--d);
}

@keyframes wave-breathe {
  0%,
  100% {
    transform: scaleY(0.4);
    opacity: 0.7;
  }
  50% {
    transform: scaleY(1);
    opacity: 1;
  }
}

/* 抽屉面板：玻璃态。底下那层 .sub-plate 是 fixed 的风景底片，backdrop-filter 糊的正是它——
   这才是"抽屉压在一张不动的底图上"的观感。
   原先这里用 --panel-frost-bg 的旧值（米黄 rgba(245,242,234,.78)），就是那个米黄框。
   那枚令牌现在也改成跟随 --ink-0 了，兜底也不再回落到米黄：不支持 backdrop-filter 时
   用高不透明的冷色 ink-0。
   注意这块面**不吃**设置卡「卡片颜色」那档开关：文章页 .en-glass 的填充 2026-10-13 起并给了
   --card-bg，首页抽屉还留着它自己这一档（ink-0 42%）——站内最后一处分叉的表面，改哪一处都要先看另一处。 */
.sheet {
  max-width: 1120px;
  margin: 0 auto;
  padding: var(--space-2) var(--card-pad-lg) var(--card-pad-lg);
  border: 1px solid color-mix(in srgb, var(--text-0) 12%, transparent);
  border-radius: var(--r-md);
  background: color-mix(in srgb, var(--ink-0) 42%, transparent);
  -webkit-backdrop-filter: blur(22px) saturate(1.35);
  backdrop-filter: blur(22px) saturate(1.35);
}

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .sheet {
    background: color-mix(in srgb, var(--ink-0) 88%, transparent);
  }
}

/* 抽屉把手：一条圆角细杠，读作"这一块是可以拉出来的" */
.lip {
  display: block;
  width: 44px;
  height: 4px;
  margin: 0 auto var(--space-3);
  border-radius: 2px;
  background: var(--line);
}

.dials {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-2);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--line);
}

.dial {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.dial-k {
  font-size: var(--fs-3xs);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-1);
}

.dial-v {
  font-size: var(--fs-xl);
  color: var(--text-0);
  font-variant-numeric: tabular-nums;
}

.dial-s {
  font-size: var(--fs-xs);
  color: var(--text-1);
}

.sec {
  margin: var(--space-3) 0 var(--space-2);
}

.picks {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  /* 与 /blog 的 .cards 同一条：单列时每张卡各占一行，否则长短卡会在窄屏错落 */
  grid-auto-rows: 1fr;
  gap: var(--space-2);
}

/* 卡面、封面格、以及"封面贴边"（class 上的 en-flush）都在 site.css §6d；
   这里只补一条：栅格里的 min-width，让长标题截断而不是把列撑破 */
.pick {
  min-width: 0;
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
  color: var(--hot); /* §4.1：日期属"当前/深度"，只准热色 */
}

.pick-ttl {
  font-family: var(--font-display);
  font-size: var(--fs-lg);
  font-weight: var(--fw-bold);
  line-height: var(--lh-tight);
  color: var(--text-0);
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

/* 最近动态卡：updates 前 5 条，整卡链向 /updates。日期走热色（§4.1：日期属"当前/深度"） */
.feed {
  display: block;
  padding: var(--card-pad) var(--card-pad-lg);
}

.feed-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--space-2);
  align-items: baseline;
  padding: var(--space-1) 0;
}

.feed-row + .feed-row {
  border-top: 1px solid var(--line);
}

.feed-date {
  font-size: var(--fs-3xs);
  letter-spacing: 0.1em;
  color: var(--hot);
  font-variant-numeric: tabular-nums;
}

.feed-text {
  font-size: var(--fs-sm);
  line-height: var(--lh-normal);
  color: var(--text-1);
}

@media (max-width: 900px) {
  .picks {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .drawer {
    padding: var(--space-3) var(--space-2) var(--space-4);
  }
}

@media (prefers-reduced-motion: reduce) {
  .drawer.open {
    animation: none;
  }
  .drawer.open .pick,
  .drawer.open .feed {
    animation: none;
  }
  .wave i {
    animation: none;
  }
}
</style>
