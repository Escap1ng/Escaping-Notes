<script setup>
// 新版坠入阅读：顶部进度线 + 单栏衬线正文
// 功能与旧版 PostView 完全等价：上报/降级/灯箱/Esc 成对监听/复制/上下篇
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { loadPost, loadPosts } from '../../lib/posts.js'
import { renderMarkdown } from '../../lib/markdown.js'
import { api } from '../../lib/api.js'
import { N } from '../../config/narrative.js'

const route = useRoute()
const post = ref(null)
const missing = ref(false)
const htmlBody = ref('')
const all = ref([])
const views = ref(null)
const viewsLocal = ref(false)
const copied = ref(false)
const altPct = ref(0)
const lightbox = ref('')

const neighbors = computed(() => {
  const i = all.value.findIndex((p) => p.slug === route.params.slug)
  if (i < 0) return { prev: null, next: null }
  return { prev: all.value[i + 1] || null, next: all.value[i - 1] || null }
})

/* 灯箱 */
function onProseClick(e) {
  if (e.target.tagName === 'IMG') lightbox.value = e.target.currentSrc || e.target.src
}
function onKey(e) {
  if (e.key === 'Escape') lightbox.value = ''
}

/* 滚动 = 下潜：顶部进度线 */
function onScroll() {
  const max = document.documentElement.scrollHeight - innerHeight
  const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0
  altPct.value = Math.round(p * 100)
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
    missing.value = true
    return
  }
  post.value = p
  htmlBody.value = renderMarkdown(p.body).html
  document.title = `${p.title} · Escaping Notes`

  const key = `en-viewed-${slug}`
  if (!sessionStorage.getItem(key)) {
    sessionStorage.setItem(key, '1')
    await api('/api/view', { method: 'POST', body: { slug } })
  }
  const stats = await api('/api/stats')
  if (stats && typeof stats[slug] === 'number') {
    views.value = stats[slug]
  } else {
    viewsLocal.value = true
    const local = (Number(localStorage.getItem(`en-views-${slug}`)) || 0) + 1
    localStorage.setItem(`en-views-${slug}`, local)
    views.value = local
  }

  addEventListener('scroll', onScroll, { passive: true })
  addEventListener('keydown', onKey)
  onScroll()
})

onUnmounted(() => {
  removeEventListener('scroll', onScroll)
  removeEventListener('keydown', onKey)
  document.title = 'Escaping Notes · 逃逸笔记'
})
</script>

<template>
  <section class="neo-shell post">
    <span class="neo-glyph glyph" aria-hidden="true">{{ N.glyph.post }}</span>
    <div class="progress" :style="{ width: altPct + '%' }" aria-hidden="true"></div>

    <div v-if="missing" class="lost">
      <p class="neo-eyebrow">// SIGNAL_LOST</p>
      <h2 class="neo-h2">{{ N.nf.title }}</h2>
      <RouterLink class="neo-btn neo-btn-ghost" to="/blog">{{ N.nf.blog }}</RouterLink>
    </div>

    <template v-else-if="post">
      <header class="head">
        <p class="neo-eyebrow">{{ N.sections.post }} · {{ post.date }}</p>
        <h1 class="title">{{ post.title }}</h1>
        <p class="meta neo-mono">
          {{ post.words }} 字 · {{ post.minutes }} 分钟 ·
          <i v-if="viewsLocal" class="warn">本地读数</i>
          VIEWS {{ views ?? '--' }}
          <button class="copy" type="button" @click="copyLink">{{ copied ? '已复制 ✓' : '复制链接' }}</button>
        </p>
        <p v-if="post.tags && post.tags.length" class="tags">
          <span v-for="t in post.tags" :key="t" class="neo-tag">{{ t }}</span>
        </p>
      </header>

      <div class="neo-prose" v-html="htmlBody" @click="onProseClick"></div>

      <p class="neo-note dilation">{{ N.dilation }}</p>

      <nav class="ends" aria-label="上下篇与出口">
        <RouterLink v-if="neighbors.prev" :to="`/blog/${neighbors.prev.slug}`" class="end">
          <span class="neo-mono">{{ N.postPrev }}</span>
          <span class="end-title">{{ neighbors.prev.title }}</span>
        </RouterLink>
        <span v-else></span>
        <RouterLink v-if="neighbors.next" :to="`/blog/${neighbors.next.slug}`" class="end next">
          <span class="neo-mono">{{ N.postNext }}</span>
          <span class="end-title">{{ neighbors.next.title }}</span>
        </RouterLink>
      </nav>

      <div class="exit">
        <RouterLink class="neo-btn neo-btn-primary" to="/blog">{{ N.postEnd.escape }}</RouterLink>
      </div>
    </template>

    <div
      v-if="lightbox"
      class="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="图片预览"
      @click="lightbox = ''"
    >
      <img :src="lightbox" alt="" />
    </div>
  </section>
</template>

<style scoped>
.post {
  padding-top: 120px;
}

.glyph {
  top: 60px;
  left: -8vw;
}

/* 顶部进度线：冷 → 热 */
.progress {
  position: fixed;
  top: 0;
  left: 0;
  height: 2px;
  z-index: 65;
  background: linear-gradient(90deg, var(--cold), var(--hot));
}

.lost {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
}

.head {
  max-width: var(--measure);
  margin: 0 auto;
}

.title {
  font-family: var(--font-display);
  font-size: clamp(32px, 5.6vw, 58px);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.16;
  margin: var(--space-2) 0;
}

.meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.copy {
  background: none;
  border: none;
  padding: 0;
  margin-left: 8px;
  color: var(--cold);
  cursor: pointer;
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  transition: filter 0.2s;
}

.copy:hover {
  filter: brightness(1.3);
}

.warn {
  font-style: normal;
  color: var(--hot);
  margin-right: 4px;
}

.tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 10px;
}

.dilation {
  max-width: var(--measure);
  margin: var(--space-3) auto 0;
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
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-decoration: none;
  color: inherit;
}

.end.next {
  text-align: right;
  align-items: flex-end;
}

.end .neo-mono {
  color: var(--hot);
  font-size: 11px;
}

.end-title {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  transition: color 0.24s;
}

.end:hover .end-title {
  color: var(--cold);
}

.exit {
  display: flex;
  justify-content: center;
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

@media (max-width: 720px) {
  .ends {
    grid-template-columns: 1fr;
    gap: var(--space-2);
  }
  .end.next {
    text-align: left;
    align-items: flex-start;
  }
}
</style>
