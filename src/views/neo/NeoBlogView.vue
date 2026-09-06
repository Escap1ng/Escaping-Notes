<script setup>
// 新版归档：吸积盘式垂直长行列表（搜索/标签逻辑与旧版一致）
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

    <ul class="rows">
      <li v-for="p in filtered" :key="p.slug">
        <RouterLink :to="`/blog/${p.slug}`" class="row neo-lens" @pointermove="onLens">
          <span class="bar" aria-hidden="true"></span>
          <span class="date neo-mono">{{ p.date }}</span>
          <span class="title">{{ p.title }}</span>
          <span class="meta neo-mono">{{ p.words }} 字 · {{ p.minutes }} 分钟</span>
          <span v-if="p.tags && p.tags.length" class="tags neo-mono">{{ p.tags.join('/') }}</span>
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

.rows {
  list-style: none;
  margin: 0;
  padding: 0;
}

.row {
  position: relative;
  display: grid;
  grid-template-columns: 11ch minmax(0, 1fr) auto auto;
  align-items: baseline;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-1);
  border-top: 1px solid var(--line);
  overflow: hidden;
  text-decoration: none;
  color: inherit;
}

.rows li:last-child .row {
  border-bottom: 1px solid var(--line);
}

.date {
  color: var(--hot);
  font-size: 11px;
  transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.row:hover .date {
  transform: scale(1.08);
}

.title {
  font-family: var(--font-display);
  font-size: clamp(18px, 2.4vw, 24px);
  font-weight: 700;
  letter-spacing: -0.01em;
  transition: color 0.24s, transform 0.32s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.row:hover .title {
  color: var(--cold);
  transform: translateX(7px);
}

.meta {
  font-size: 11px;
}

.tags {
  font-size: 10.5px;
  color: var(--cold);
}

.empty {
  padding: var(--space-3) 0;
  border-top: 1px solid var(--line);
}

@media (max-width: 720px) {
  .row {
    grid-template-columns: 1fr auto;
    gap: 4px var(--space-2);
  }
  .date {
    grid-column: 1 / -1;
  }
  .tags {
    display: none;
  }
}
</style>
