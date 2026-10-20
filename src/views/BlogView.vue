<script setup>
// 归档页：四枚全站读数 + 带计数的标签胶囊 + 三列封面卡。
// 搜索只有右上角那一张卡：这里不再放第二格输入框，但**仍然认 ?q=**——
// 卡里的 Enter 与「看全部 N 篇」把词交回本页，落地后由下面那条筛选回显说清"现在在看什么"。
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { loadPosts } from '../lib/posts.js'
import { onLens } from '../lib/lens.js'
import { N, navLabel } from '../data/narrative.js'

const route = useRoute()
const router = useRouter()

const posts = ref([])
const loading = ref(true)
// 筛选状态从 URL 读入：链接可分享、刷新后不丢
const tag = ref(typeof route.query.tag === 'string' ? route.query.tag : '')
const q = ref(typeof route.query.q === 'string' ? route.query.q : '')

onMounted(async () => {
  posts.value = await loadPosts()
  loading.value = false
})

// 状态 → URL（replace：筛选不该往历史里塞记录）。值与 URL 完全一致才能保证往返不打架
watch([tag, q], () => {
  const query = {}
  if (tag.value) query.tag = tag.value
  if (q.value) query.q = q.value
  router.replace({ query })
})
// URL → 状态（浏览器前进/后退、外部链接进入、搜索卡交回词）
watch(
  () => route.query,
  (qs) => {
    const t = typeof qs.tag === 'string' ? qs.tag : ''
    const k = typeof qs.q === 'string' ? qs.q : ''
    if (t !== tag.value) tag.value = t
    if (k !== q.value) q.value = k
  }
)

// 标签按命中数倒序（并列按名字）：胶囊是这一页唯一的筛选入口，常用的排前面
const tags = computed(() => {
  const m = new Map()
  posts.value.forEach((p) => (p.tags || []).forEach((t) => m.set(t, (m.get(t) || 0) + 1)))
  return [...m]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-Hans-CN'))
})

/* 四枚读数算的是**全站**的账，不跟着筛选变：筛选后的篇数已经写在下面那条回显里，
   两处都变会让人读不出"是站点变小了还是筛过了"。没算到时给 --，与关于页同一档口径。 */
const stats = computed(() => {
  let words = 0
  let latest = ''
  for (const p of posts.value) {
    words += Number(p.words) || 0
    if (p.date > latest) latest = p.date
  }
  const show = (v) => (loading.value ? '--' : v)
  return [
    { k: '文章 · POSTS', v: show(posts.value.length) },
    { k: '标签 · TAGS', v: show(tags.value.length) },
    { k: '总字数 · WORDS', v: show(words.toLocaleString('en-US')) },
    { k: '最近更新 · LATEST', v: show(latest), wide: true },
  ]
})

const filtered = computed(() =>
  posts.value.filter((p) => {
    if (tag.value && !(p.tags || []).includes(tag.value)) return false
    const k = q.value.trim().toLowerCase()
    if (!k) return true
    return [p.title, p.summary, ...(p.tags || [])].join(' ').toLowerCase().includes(k)
  })
)

// 回显那一句按激活了哪几样拼：只有搜索 / 只有标签 / 两样都有
const filterText = computed(() => {
  const parts = []
  if (q.value.trim()) parts.push(`搜索「${q.value.trim()}」`)
  if (tag.value) parts.push(`标签「${tag.value}」`)
  return `${parts.join(' · ')} · ${filtered.value.length} 篇`
})

function clearFilters() {
  tag.value = ''
  q.value = ''
}

</script>

<template>
  <section class="en-shell">
    <h2 class="en-h2">{{ navLabel('/blog') }}</h2>
    <p class="en-lede">{{ N.notes.archive }}</p>

    <!-- 四枚读数：与关于页那三枚同一张卡面、同一套字号（.stat / .sv / .sk 的写法照它） -->
    <ul class="stats" :aria-busy="loading">
      <li v-for="s in stats" :key="s.k" class="en-card stat en-lens" @pointermove="onLens">
        <span class="sv" :class="{ wide: s.wide }">{{ s.v }}</span>
        <span class="sk en-mono">{{ s.k }}</span>
      </li>
    </ul>

    <p v-if="q.trim() || tag" class="filter en-mono">
      <span class="said">{{ filterText }}</span>
      <button class="clear" type="button" @click="clearFilters">清除筛选 ✕</button>
    </p>

    <div class="chips" role="group" aria-label="按标签筛">
      <button class="en-chip" :class="{ on: !tag }" type="button" @click="tag = ''">
        全部<span class="n">{{ loading ? '--' : posts.length }}</span>
      </button>
      <button
        v-for="t in tags"
        :key="t.name"
        class="en-chip"
        :class="{ on: tag === t.name }"
        type="button"
        @click="tag = tag === t.name ? '' : t.name"
      >
        {{ t.name }}<span class="n">{{ t.count }}</span>
      </button>
    </div>

    <ul class="cards" :aria-busy="loading">
      <template v-if="loading">
        <!-- 骨架屏：列表从服务器拉取，空等一片黑会让人以为「没有文章」 -->
        <li v-for="i in 3" :key="`skel-${i}`" class="skeleton" aria-hidden="true">
          <span class="en-shot"></span>
          <span class="body"></span>
        </li>
      </template>
      <template v-else>
        <li v-for="p in filtered" :key="p.slug">
          <RouterLink :to="`/blog/${p.slug}`" class="en-card en-flush card en-lens" @pointermove="onLens">
            <span class="bar" aria-hidden="true"></span>
            <span class="en-spike" aria-hidden="true"></span>
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
            <div class="body">
              <span class="date en-mono">{{ p.date }}</span>
              <h3 class="title">{{ p.title }}</h3>
              <p v-if="p.summary" class="summary">{{ p.summary }}</p>
              <span class="foot">
                <span class="meta en-mono">{{ p.words }} 字 · {{ p.minutes }} 分钟</span>
                <span v-if="p.tags && p.tags.length" class="tags en-mono">{{ p.tags.join('/') }}</span>
              </span>
            </div>
          </RouterLink>
        </li>
      </template>
      <!-- 空态分流：「本来就没有文章」与「筛选后没有结果」是两件事 -->
      <li v-if="!loading && !filtered.length" class="empty en-mono">
        {{ posts.length ? N.empty.search : N.empty.posts }}
      </li>
    </ul>
  </section>
</template>

<style scoped>
.en-shell {
  padding-top: var(--page-top);
}

/* 读数一排四枚：卡面走 .en-card，这里只改形态（关于页那三枚同一套路）。
   断点只加一档 900px 折两列，往下不再折一列——实测 320px 上两列各 114px、
   卡内可用 98px，最宽那枚读数（日期）见下面 .sv.wide 的字号。 */
.stats {
  list-style: none;
  margin: 0 0 var(--space-2);
  padding: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-2);
}

@media (max-width: 900px) {
  .stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.stat {
  min-height: 0;
  align-items: center;
  gap: var(--space-0);
  padding: var(--space-2);
  text-align: center;
  /* 读数按**卡自己的宽**收字号（见 .sv.wide）：四列只在壳里分宽，视口再宽也不加宽卡，
     cqi 比 vw 更接近"这一枚放不放得下"。 */
  container-type: inline-size;
}

.sv {
  font-family: var(--font-display);
  font-size: clamp(30px, 4vw, 44px);
  font-weight: var(--fw-bold);
  line-height: 1.1;
  color: var(--text-0);
  font-variant-numeric: tabular-nums;
  /* 标签的竖位由这一行撑住：日期缩了字号，少了它那枚的标签会独自往上提 */
  min-height: calc(clamp(30px, 4vw, 44px) * 1.1);
}

/* 「2026-10-10」是 10 个字符，不是 1–4 个。字体、字重与另三枚相同（都是展示衬线），
   只按卡宽封顶：一行排下它约需 5.2em，17.5cqi 留出约 8% 余量。卡够宽时它与邻座
   同字号（≤900px 折两列后就是），窄到放不下才降。卡宽固定，读数换了也不推挤标签。 */
.sv.wide {
  font-size: min(17.5cqi, clamp(30px, 4vw, 44px));
}

.sk {
  font-size: var(--fs-3xs);
}

/* 筛选回显：页内没有搜索框了，这一行是"为什么列表只剩这些"的唯一交代。
   只在真筛了的时候出现，不占常驻位 */
.filter {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin: 0 0 var(--space-2);
  font-size: var(--fs-2xs);
  color: var(--text-1);
}

.filter .said {
  color: var(--text-0);
}

.clear {
  border: 1px solid var(--line);
  border-radius: var(--r-pill);
  padding: 2px var(--space-1);
  background: none;
  color: var(--text-1);
  font: inherit;
  cursor: pointer;
  transition: color var(--dur-fast), border-color var(--dur-fast);
}

.clear:hover {
  color: var(--cold);
  border-color: var(--cold);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin-bottom: var(--space-3);
}

/* 胶囊里的计数：与标签名同一枚胶囊，靠字号与色分主次（间距吃 .en-chip 自己的 gap）。
   等宽数字，筛与不筛之间宽度不跳 */
.en-chip .n {
  font-size: var(--fs-3xs);
  opacity: 0.72;
  font-variant-numeric: tabular-nums;
}

/* 三列封面卡：宽屏一行三篇，≤900px 两篇，≤720px 一篇 */
.cards {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  /* 行高取最高那一行，跨行一致：单列时每张卡各占一行，不写这条，长短不一的卡
     （以及取数期间那三格骨架）会在窄屏错落成锯齿。
     卡内标题两行截断、摘要三行截断，行间本来就差不了几十像素。 */
  grid-auto-rows: 1fr;
  gap: var(--space-2);
}

@media (max-width: 900px) {
  .cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .cards {
    grid-template-columns: 1fr;
  }
}

/* li 为栅格项：撑满行高，卡片随之等高 */
.cards > li {
  display: flex;
}

/* 卡面（边/角/底/hover/最小高）、封面格（.en-shot）与"贴边"（.en-flush）都在 site.css §6d；
   这里只留栅格内的撑满与卡内排版 */
.card {
  flex: 1;
  min-width: 0;
}

.body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--card-pad);
}

/* 衍射芒落在封面右上角：hover 时"这颗星被点亮"。形态与绽放在 site.css §6b，这里只管位置 */
.card .en-spike {
  top: var(--space-2);
  right: var(--space-2);
  z-index: 2;
}

.date {
  position: relative;
  z-index: 1;
  color: var(--text-1);
  font-size: var(--fs-3xs);
}

.title {
  position: relative;
  z-index: 1;
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(var(--fs-lg), 1.5vw, var(--fs-xl));
  font-weight: var(--fw-bold);
  line-height: var(--lh-tight);
  letter-spacing: -0.01em;
  transition: color var(--dur-fast), transform var(--dur) cubic-bezier(0.2, 0.8, 0.2, 1);
}

.card:hover .title {
  color: var(--cold);
  transform: translateX(var(--nudge));
}

.summary {
  position: relative;
  z-index: 1;
  margin: 0;
  flex: 1;
  font-family: var(--font-serif);
  font-size: var(--fs-sm);
  line-height: var(--lh-relaxed);
  color: var(--text-1);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.foot {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
  border-top: 1px solid var(--line);
  padding-top: 10px;
}

.meta {
  font-size: var(--fs-3xs);
}

.tags {
  font-size: var(--fs-3xs);
  color: var(--cold);
}

/* 骨架卡：与真卡同一套格子（封面格 + 信息体），扫光走 li 自己的背景、两格透明，
   所以列宽一变高度就跟着变，内容到位时不会产生位移 */
.skeleton {
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--card-brd);
  border-radius: var(--r-md);
  background: linear-gradient(
    100deg,
    color-mix(in srgb, var(--ink-1) 34%, transparent) 32%,
    color-mix(in srgb, var(--ink-1) 68%, transparent) 50%,
    color-mix(in srgb, var(--ink-1) 34%, transparent) 68%
  );
  background-size: 220% 100%;
  animation: skel 1.5s ease-in-out infinite;
}

/* 229px = 真卡信息体在桌面三列下的实测高（日期行 + 两行标题 + 三行摘要 + 脚线 + 上下 16px）。
   窄屏列更宽、折行更少，骨架会比真卡高几十像素——加载态不值得为此复刻一套文字。 */
.skeleton .body {
  min-height: 229px;
}

@keyframes skel {
  from {
    background-position: 130% 0;
  }
  to {
    background-position: -30% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton {
    animation: none;
  }
}

.empty {
  grid-column: 1 / -1;
  padding: var(--space-3) 0;
  border-top: 1px solid var(--line);
}
</style>
