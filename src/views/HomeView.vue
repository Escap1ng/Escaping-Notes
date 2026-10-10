<script setup>
// 首页：星轨首屏 + 风景底片 + 下滑拉出的抽屉（读数 / 精选 / 最近动态）
import { computed, onMounted, onUnmounted, ref } from 'vue'
import HorizonHero from '../components/neo/HorizonHero.vue'
import { loadPosts, coverPos } from '../lib/posts.js'
import { updates } from '../config/updates.js'
import { onLens } from '../lib/lens.js'
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

function tick() {
  const now = new Date()
  clock.value = now.toLocaleTimeString('zh-CN', { hour12: false })
  day.value = `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日 · 星期${WEEK[now.getDay()]}`
}

let io = null
onMounted(async () => {
  tick()
  clk = setInterval(tick, 1000)
  posts.value = await loadPosts()
  // 抽屉第一次进入视口时拉出一次，之后断开——它不是滚动监听，§9.5 那条禁令不适用。
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
  if (io) io.disconnect()
})
</script>

<template>
  <div class="home">
    <HorizonHero />

    <!-- 折线以下的风景底片层已上移到 App.vue（fixed 层不能放在带 filter 的页根子树里），
         这里只留抽屉。 -->

    <section ref="drawerEl" class="drawer" :class="{ open }">
      <div class="sheet">
        <span class="lip" aria-hidden="true"></span>

        <div class="dials">
          <div class="dial">
            <span class="dial-k neo-mono">{{ N.drawer.clock }}</span>
            <span class="dial-v neo-mono">{{ clock }}</span>
            <span class="dial-s">{{ day }}</span>
          </div>
        </div>

        <h2 class="neo-eyebrow sec">{{ N.drawer.featured }}</h2>
        <div class="picks">
          <RouterLink
            v-for="p in featured"
            :key="p.slug"
            :to="`/blog/${p.slug}`"
            class="neo-card neo-flush pick neo-lens"
            @pointermove="onLens"
          >
            <span class="neo-shot" :class="{ blank: !p.image }">
              <img
                v-if="p.image"
                :src="p.image"
                :alt="p.title"
                :style="{ objectPosition: coverPos(p) }"
                loading="lazy"
                decoding="async"
              />
            </span>
            <span class="pick-body">
              <span class="pick-date neo-mono">{{ p.date }}</span>
              <span class="pick-ttl">{{ p.title }}</span>
              <span class="pick-sum">{{ p.summary }}</span>
            </span>
          </RouterLink>
        </div>

        <h2 class="neo-eyebrow sec">{{ N.drawer.recent }}</h2>
        <RouterLink to="/updates" class="neo-card feed neo-lens" aria-label="最近动态 · 查看全部" @pointermove="onLens">
          <span v-for="u in recent" :key="u.date + u.text" class="feed-row">
            <span class="feed-date neo-mono">{{ u.date }}</span>
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
  /* 必须 isolate：.plate 是 z-index:-1 的 fixed 层，而 .home 只 position:relative 不建层叠
     上下文——负 z 的子元素会掉到根元素背景**之下**，被 --ink-0 那层底色整个盖掉。
     图没丢，是画在纸背面了。isolate 让 -1 停在"本组件背景之上、内容之下"这一层。 */
  isolation: isolate;
}

/* 风景底片层：**fixed**，不随滚动——这才是"抽屉从一张不动的底图上拉出来"的那个观感。
   上一版是 absolute 贴在 .home 里，图跟着内容一起走，抽屉感就没了。
   z-index: -1 让它待在页面底色之上、所有内容之下；首屏自己的 .hero-plate 是不透明的，
   所以它不会从首屏背后透出来。
   模糊与调色都烘在素材里（scripts/build_plate_bg.ps1），这里不挂 filter/backdrop-filter。
   沉回 --ink-0 的那条渐变是承重的：照片下半是暗部，浅色墨字压上去实测只有 4.2:1。 */
.plate {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background: linear-gradient(to bottom, transparent 26%, var(--ink-0) 82%) no-repeat,
    var(--plate-img) no-repeat 50% 30% / cover;
  -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 160px, #000 100%);
  mask-image: linear-gradient(to bottom, transparent 0, #000 160px, #000 100%);
}

@supports (height: 100svh) {
  .plate {
    top: 100svh;
  }
}

/* 抽屉：整块在首次进入视口时从下方拉出一次。
   表面是玻璃态（见下面的 .sheet），但不复用 .neo-glass——那是模态抽屉专属的定宽浮层，
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

/* 抽屉面板：玻璃态。底下那层 .sub-plate 是 fixed 的风景底片，backdrop-filter 糊的正是它——
   这才是"抽屉压在一张不动的底图上"的观感。
   原先这里用 --panel-frost-bg 的旧值（米黄 rgba(245,242,234,.78)），就是那个米黄框。
   那枚令牌现在也改成跟随 --ink-0 了，文章页 .neo-glass 同源——两处表面不会再一处冷一处米。
   兜底也不再回落到米黄：不支持 backdrop-filter 时用高不透明的冷色 ink-0。 */
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

/* 卡面、封面格、以及"封面贴边"（class 上的 neo-flush）都在 neo.css §6d；
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
}
</style>
