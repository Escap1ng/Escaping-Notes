<script setup>
// 归档页：大框体卡片列表，窗口足够时两列、不够时一列，带搜索与标签筛选
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { loadPosts } from '../../lib/posts.js'
import { onLens } from '../../lib/lens.js'
import { N } from '../../config/narrative.js'

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
// URL → 状态（浏览器前进/后退、外部链接进入）
watch(
  () => route.query,
  (qs) => {
    const t = typeof qs.tag === 'string' ? qs.tag : ''
    const k = typeof qs.q === 'string' ? qs.q : ''
    if (t !== tag.value) tag.value = t
    if (k !== q.value) q.value = k
  }
)

const tags = computed(() => {
  const s = new Set()
  posts.value.forEach((p) => (p.tags || []).forEach((t) => s.add(t)))
  return [...s]
})

const filtered = computed(() =>
  posts.value.filter((p) => {
    if (tag.value && !(p.tags || []).includes(tag.value)) return false
    const k = q.value.trim().toLowerCase()
    if (!k) return true
    return [p.title, p.summary, ...(p.tags || [])].join(' ').toLowerCase().includes(k)
  })
)
</script>

<template>
  <section class="neo-shell">
    <span class="neo-glyph glyph" aria-hidden="true">{{ N.glyph.blog }}</span>

    <p class="neo-eyebrow">{{ N.sections.blog }}</p>
    <h2 class="neo-h2">文章</h2>
    <p class="neo-lede">{{ N.notes.archive }}</p>

    <div class="tools">
      <input
        v-model="q"
        class="neo-field search"
        type="search"
        placeholder="搜索标题 / 摘要 / 标签"
        aria-label="搜索文章"
      />
      <div class="chips">
        <button class="neo-chip" :class="{ on: !tag }" type="button" @click="tag = ''">全部</button>
        <button
          v-for="t in tags"
          :key="t"
          class="neo-chip"
          :class="{ on: tag === t }"
          type="button"
          @click="tag = tag === t ? '' : t"
        >
          {{ t }}
        </button>
      </div>
    </div>

    <ul class="cards" :aria-busy="loading">
      <template v-if="loading">
        <!-- 骨架屏：列表从服务器拉取，空等一片黑会让人以为「没有文章」 -->
        <li v-for="i in 4" :key="`skel-${i}`" class="skeleton" aria-hidden="true"></li>
      </template>
      <template v-else>
        <li v-for="p in filtered" :key="p.slug">
          <RouterLink :to="`/blog/${p.slug}`" class="card neo-lens" @pointermove="onLens">
            <span class="bar" aria-hidden="true"></span>
            <span class="date neo-mono">{{ p.date }}</span>
            <h3 class="title">{{ p.title }}</h3>
            <p v-if="p.summary" class="summary">{{ p.summary }}</p>
            <span class="foot">
              <span class="meta neo-mono">{{ p.words }} 字 · {{ p.minutes }} 分钟</span>
              <span v-if="p.tags && p.tags.length" class="tags neo-mono">{{ p.tags.join('/') }}</span>
            </span>
          </RouterLink>
        </li>
      </template>
      <!-- 空态分流：「本来就没有文章」与「筛选后没有结果」是两件事 -->
      <li v-if="!loading && !filtered.length" class="empty neo-mono">
        {{ posts.length ? N.empty.search : N.empty.posts }}
      </li>
    </ul>
  </section>
</template>

<style scoped>
.neo-shell {
  padding-top: var(--page-top);
}

.glyph {
  top: var(--space-3);
  right: -6vw;
}

.tools {
  display: flex;
  align-items: flex-end;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-bottom: var(--space-3);
}

.search {
  width: min(100%, 320px);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  padding-bottom: var(--space-0);
}

/* 大框体卡片：窗口足够时两列，不够时一列 */
.cards {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
}

@media (max-width: 880px) {
  .cards {
    grid-template-columns: 1fr;
  }
}

/* li 为栅格项：撑满行高，卡片随之等高 */
.cards > li {
  display: flex;
}

/* 卡片规格全部取自 --card-*（与留言卡、图片格同源），只额外声明内容型卡片的密度 */
.card {
  flex: 1;
  position: relative;
  z-index: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-height: 210px;
  padding: var(--card-pad-lg) var(--card-pad-lg) var(--card-pad);
  border: 1px solid var(--card-brd);
  border-radius: var(--r-md);
  background: var(--card-bg);
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.28s, background 0.28s;
}

.card:hover {
  border-color: var(--card-brd-hover);
  background: var(--card-bg-hover);
}

.date {
  position: relative;
  z-index: 1;
  color: var(--hot);
  font-size: var(--fs-3xs);
}

.title {
  position: relative;
  z-index: 1;
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(var(--fs-lg), 2.2vw, var(--fs-xl));
  font-weight: var(--fw-bold);
  line-height: var(--lh-tight);
  letter-spacing: -0.01em;
  transition: color 0.24s, transform 0.32s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.card:hover .title {
  color: var(--cold);
  transform: translateX(5px);
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

/* 骨架卡：尺寸与真实卡片一致（min-height 210px），内容到位时不产生位移 */
.skeleton {
  min-height: 210px;
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
