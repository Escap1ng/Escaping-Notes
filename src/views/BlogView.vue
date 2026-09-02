<script setup>
import { computed, onMounted, ref } from 'vue'
import { loadPosts } from '../lib/posts.js'

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

// 标签过滤 + SCAN 本地搜索
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
  <section class="page">
    <p class="readout page-code">// MODULE_01 · POSTS</p>
    <h2 class="page-title">文章</h2>

    <div class="blog-tools">
      <input
        v-model="q"
        class="scan readout"
        type="search"
        placeholder="SCAN_ 标题 / 摘要 / 标签"
        aria-label="搜索文章"
      />
      <div class="tag-row">
        <button class="tag readout" :class="{ on: !tag }" @click="tag = ''">全部</button>
        <button
          v-for="t in tags"
          :key="t"
          class="tag readout"
          :class="{ on: tag === t }"
          @click="tag = tag === t ? '' : t"
        >
          {{ t }}
        </button>
      </div>
    </div>

    <ul class="post-list">
      <li v-for="p in filtered" :key="p.slug">
        <RouterLink :to="`/blog/${p.slug}`" class="post-row">
          <span class="readout post-date">{{ p.date }}</span>
          <span class="post-main">
            <span class="post-title">{{ p.title }}</span>
            <span class="post-summary">{{ p.summary }}</span>
            <span class="readout post-meta">
              {{ p.words }} 字 · {{ p.minutes }} 分钟<span v-if="p.tags && p.tags.length"> · {{ p.tags.join(' / ') }}</span>
            </span>
          </span>
        </RouterLink>
      </li>
      <li v-if="!filtered.length" class="readout empty">// 无匹配信号</li>
    </ul>
  </section>
</template>

<style scoped>
.blog-tools {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.scan {
  width: min(100%, 420px);
  background: none;
  border: 1px solid var(--line);
  color: var(--text-0);
  padding: 8px 12px;
}

.scan::placeholder {
  color: var(--text-1);
}

.scan:focus-visible {
  outline: 2px solid var(--signal);
  outline-offset: 2px;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.tag {
  background: none;
  border: 1px solid var(--line);
  color: var(--text-1);
  padding: 3px 10px;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}

.tag:hover,
.tag.on {
  border-color: var(--signal);
  color: var(--signal);
}

/* 卡片网格：桌面三列 / 中屏两列 / 小屏一列 */
.post-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2);
}

.post-list li {
  display: flex;
}

.post-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  padding: var(--space-2);
  border: 1px solid var(--line);
  transition: border-color 0.2s;
}

.post-row:hover {
  border-color: var(--signal);
}

.post-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

/* 元信息行（字数/时长/标签）钉在卡片底部，同行卡片对齐 */
.post-meta {
  margin-top: auto;
}

.post-title {
  font-family: var(--font-serif);
  font-size: 20px;
  font-weight: 700;
  transition: color 0.2s;
}

.post-row:hover .post-title {
  color: var(--signal);
}

.post-summary {
  color: var(--text-1);
  font-size: 14px;
}

.empty {
  grid-column: 1 / -1;
  padding: var(--space-2) 0;
  border-top: 1px solid var(--line);
}

@media (max-width: 1024px) {
  .post-list {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .post-list {
    grid-template-columns: 1fr;
  }
}
</style>
