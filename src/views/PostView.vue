<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { loadPost, loadPosts } from '../lib/posts.js'
import { renderMarkdown } from '../lib/markdown.js'
import { api } from '../lib/api.js'

const route = useRoute()
const post = ref(null)
const missing = ref(false)
const htmlBody = ref('')
const toc = ref([])
const all = ref([])
const views = ref(null)
const viewsLocal = ref(false)
const copied = ref(false)
const altPct = ref(0)
const lightbox = ref('')

// 灯箱：点击正文图片放大，Esc/点击关闭
function onProseClick(e) {
  if (e.target.tagName === 'IMG') lightbox.value = e.target.currentSrc || e.target.src
}
function onKey(e) {
  if (e.key === 'Escape') lightbox.value = ''
}

// all 按日期降序：prev=更旧(i+1)，next=更新(i-1)
const neighbors = computed(() => {
  const i = all.value.findIndex((p) => p.slug === route.params.slug)
  if (i < 0) return { prev: null, next: null }
  return { prev: all.value[i + 1] || null, next: all.value[i - 1] || null }
})

function onScroll() {
  const max = document.documentElement.scrollHeight - innerHeight
  altPct.value = max > 0 ? Math.min(100, Math.round((scrollY / max) * 100)) : 0
}

function jump(id) {
  const el = document.getElementById(id)
  const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches
  el?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' })
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
  const r = renderMarkdown(p.body)
  htmlBody.value = r.html
  toc.value = r.toc
  document.title = `${p.title} · Escaping Notes`

  // 计数：每会话每文一次；API 不可达 → 本地读数并如实标注
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
  onScroll()
})

onUnmounted(() => {
  removeEventListener('scroll', onScroll)
  document.title = 'Escaping Notes · 逃逸笔记'
})
</script>

<template>
  <section class="page post-page">
    <template v-if="missing">
      <p class="readout">// SIGNAL_LOST · 该信号未捕获或已离轨</p>
      <RouterLink class="link-item" to="/blog">返回文章列表</RouterLink>
    </template>

    <template v-else-if="post">
      <header class="post-head">
        <p class="readout">// POST · {{ post.date }}</p>
        <h1 class="post-title">{{ post.title }}</h1>
        <p class="readout post-meta">
          {{ post.words }} 字 · {{ post.minutes }} 分钟 ·
          <span v-if="viewsLocal">本地读数</span> VIEWS {{ views ?? '--' }} ·
          <button class="copy readout" type="button" @click="copyLink">
            {{ copied ? '已复制' : '复制链接' }}
          </button>
        </p>
        <p v-if="post.tags && post.tags.length" class="readout post-tags">
          {{ post.tags.join(' / ') }}
        </p>
      </header>

      <div class="prose" v-html="htmlBody" @click="onProseClick"></div>

      <nav class="post-nav readout" aria-label="上下篇">
        <RouterLink v-if="neighbors.prev" :to="`/blog/${neighbors.prev.slug}`">
          ← PREV {{ neighbors.prev.title }}
        </RouterLink>
        <span v-else></span>
        <RouterLink v-if="neighbors.next" :to="`/blog/${neighbors.next.slug}`">
          NEXT {{ neighbors.next.title }} →
        </RouterLink>
      </nav>

      <aside class="post-aside" aria-label="目录与爬升进度">
        <p class="readout">ALT {{ String(altPct).padStart(3, '0') }}%</p>
        <ol v-if="toc.length" class="toc readout">
          <li v-for="t in toc" :key="t.id" :class="`lv${t.level}`">
            <a :href="`#${t.id}`" @click.prevent="jump(t.id)">{{ t.text }}</a>
          </li>
        </ol>
      </aside>
      <div class="alt-bar" aria-hidden="true"><i :style="{ height: altPct + '%' }"></i></div>
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
.post-page {
  max-width: 760px;
}

.post-head {
  border-bottom: 1px solid var(--line);
  padding-bottom: var(--space-2);
}

.post-title {
  font-family: var(--font-serif);
  font-size: clamp(28px, 5vw, 44px);
  font-weight: 700;
  line-height: 1.25;
  margin: var(--space-1) 0 var(--space-2);
}

.post-meta .copy {
  background: none;
  border: none;
  color: var(--signal);
  cursor: pointer;
  font: inherit;
  letter-spacing: inherit;
  padding: 0;
}

.post-tags {
  color: var(--signal);
}

.prose :deep(img) {
  cursor: zoom-in;
}

.lightbox {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: color-mix(in srgb, var(--ink-0) 94%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: zoom-out;
}

.lightbox img {
  max-width: 92vw;
  max-height: 92vh;
  border: 1px solid var(--line);
}

.post-nav {
  display: flex;
  justify-content: space-between;
  gap: var(--space-2);
  margin-top: var(--space-4);
  padding-top: var(--space-2);
  border-top: 1px solid var(--line);
}

.post-nav a:hover {
  color: var(--signal);
}

.post-aside {
  display: none;
}

.alt-bar {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 2px;
  background: var(--line);
}

.alt-bar i {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  background: var(--signal);
}

@media (min-width: 1200px) {
  .post-aside {
    display: block;
    position: fixed;
    top: 96px;
    right: 28px;
    width: 200px;
  }

  .toc {
    list-style: none;
    margin: var(--space-2) 0 0;
    padding: 0;
    border-left: 1px solid var(--line);
  }

  .toc li {
    padding: 3px 0 3px 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .toc li.lv3 {
    padding-left: 24px;
  }

  .toc a:hover {
    color: var(--signal);
  }
}
</style>
