<script setup>
// 归档页：大框体卡片列表，窗口足够时两列、不够时一列，带搜索与标签筛选
import { computed, onMounted, ref } from 'vue'
import { loadPosts } from '../../lib/posts.js'
import { onLens } from '../../lib/lens.js'
import { N } from '../../config/narrative.js'

const posts = ref([])
const tag = ref('')
const q = ref('')

onMounted(async () => {
  posts.value = await loadPosts()
})

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

    <ul class="cards">
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
      <li v-if="!filtered.length" class="empty neo-mono">{{ N.empty.posts }}</li>
    </ul>
  </section>
</template>

<style scoped>
.neo-shell {
  padding-top: 120px;
}

.glyph {
  top: 40px;
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
  gap: 8px;
  padding-bottom: 6px;
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

.card {
  flex: 1;
  position: relative;
  z-index: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 210px;
  padding: var(--space-3) var(--space-3) var(--space-2);
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: color-mix(in srgb, var(--ink-1) 52%, transparent);
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.28s, background 0.28s;
}

.card:hover {
  border-color: color-mix(in srgb, var(--cold) 55%, transparent);
  background: color-mix(in srgb, var(--ink-1) 78%, transparent);
}

.date {
  position: relative;
  z-index: 1;
  color: var(--hot);
  font-size: 11.5px;
}

.title {
  position: relative;
  z-index: 1;
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(19px, 2.2vw, 25px);
  font-weight: 700;
  line-height: 1.35;
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
  font-size: 14.5px;
  line-height: 1.8;
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
  font-size: 11px;
}

.tags {
  font-size: 10.5px;
  color: var(--cold);
}

.empty {
  grid-column: 1 / -1;
  padding: var(--space-3) 0;
  border-top: 1px solid var(--line);
}
</style>
