<script setup>
// 新版坠入阅读：顶部进度线 + 单栏衬线正文
// 文章页：上报/降级/灯箱/Esc 成对监听/复制/上下篇
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { loadPost, loadPosts } from '../../lib/posts.js'
import { renderMarkdown } from '../../lib/markdown.js'
import { api } from '../../lib/api.js'
import { trapFocus } from '../../lib/focus.js'
import { N } from '../../config/narrative.js'

const route = useRoute()
const post = ref(null)
const missing = ref(false)
const htmlBody = ref('')
const all = ref([])
const views = ref(null)
const viewsLocal = ref(false)
const copied = ref(false)
const lightbox = ref('')
const lightboxEl = ref(null)
let trap = null

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

// 灯箱是模态：打开时把 Tab 锁在框内，关闭后焦点回到原处
watch(lightbox, async (open) => {
  if (open) {
    await nextTick()
    trap = trapFocus(lightboxEl.value)
  } else {
    trap?.()
    trap = null
  }
})

/* 顶部曝光进度线不在这里算：直接消费 App.vue 写入的 --shift，
   省掉一套重复的滚动监听与 scrollHeight 强制布局（见 design-neo.md §9.4） */

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

  addEventListener('keydown', onKey)
})

onUnmounted(() => {
  removeEventListener('keydown', onKey)
  trap?.()
  document.title = 'Escaping Notes · 逃逸笔记'
})
</script>

<template>
  <section class="neo-shell post">
    <span class="neo-glyph glyph" aria-hidden="true">{{ N.glyph.post }}</span>
    <div class="progress" aria-hidden="true"></div>

    <div v-if="missing" class="lost">
      <p class="neo-eyebrow">// SIGNAL_LOST</p>
      <h2 class="neo-h2">{{ N.nf.title }}</h2>
      <RouterLink class="neo-btn neo-btn-ghost" to="/blog">{{ N.nf.blog }}</RouterLink>
    </div>

    <template v-else-if="post">
      <article class="neo-glass">
        <header class="head">
          <p class="neo-eyebrow">{{ N.sections.post }} · {{ post.date }}</p>
          <h1 class="title">{{ post.title }}</h1>
          <p class="meta neo-mono">
            {{ post.words }} 字 · {{ post.minutes }} 分钟 ·
            <i v-if="viewsLocal" class="neo-tag neo-tag-quiet">本地读数</i>
            VIEWS {{ views ?? '--' }}
            <button class="neo-btn neo-btn-sm neo-btn-quiet" type="button" @click="copyLink">{{ copied ? '已复制 ✓' : '复制链接' }}</button>
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
      </article>
    </template>

    <div
      v-if="lightbox"
      ref="lightboxEl"
      class="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="图片预览"
      tabindex="-1"
      @click="lightbox = ''"
    >
      <img :src="lightbox" alt="文章插图，点按关闭预览" />
    </div>
  </section>
</template>

<style scoped>
.post {
  padding-top: var(--page-top);
}

/* 正文玻璃底板：隔离星轨背景 + 提升前景对比（磨砂 Gaussian blur）。
   背景为半透明页面色（`--panel-bg`，深浅两套各自定义，落在 60%–80% 区间）；
   配合 blur 弱化星轨纹理。 */
.neo-glass {
  position: relative;
  z-index: 1;
  --fx: 120px; /* 左右羽化：磨砂/底色向两侧渐隐 */
  --fy: 40px; /* 上下羽化：与内容留白配合，标题不落在渐隐区（保对比） */
  --measure: 78ch; /* 放宽文章阅读栏，提高文字占屏比例 */
  /* 底板贴近屏幕（≤1240px 或 94vw），大屏下占据更多宽度；正文栏居中于 --measure */
  max-width: min(1240px, 94vw);
  margin: var(--space-3) auto;
  padding: var(--space-4) var(--space-3) var(--space-3);
  border-radius: var(--r-lg);
  border: 1px solid color-mix(in srgb, var(--line) 55%, transparent);
  background: var(--panel-bg, rgba(2, 2, 4, 0.64));
  -webkit-backdrop-filter: blur(22px) saturate(1.08);
  backdrop-filter: blur(22px) saturate(1.08);
  /* 抬升阴影走 --shadow：纸面下用浅色 --ink-2 会晕出一圈浅色光斑，而非阴影 */
  box-shadow: 0 22px 60px -34px var(--shadow, rgba(0, 0, 0, 0.6));
  /* 四边 mask 羽化（水平+垂直 intersect）：让磨砂从边缘平滑褪去，不产生任何硬截断面 */
  -webkit-mask:
    linear-gradient(to right, transparent 0, #000 var(--fx), #000 calc(100% - var(--fx)), transparent 100%),
    linear-gradient(to bottom, transparent 0, #000 var(--fy), #000 calc(100% - var(--fy)), transparent 100%);
  -webkit-mask-composite: source-in;
  mask:
    linear-gradient(to right, transparent 0, #000 var(--fx), #000 calc(100% - var(--fx)), transparent 100%),
    linear-gradient(to bottom, transparent 0, #000 var(--fy), #000 calc(100% - var(--fy)), transparent 100%);
  mask-composite: intersect;
  animation: neo-glass-in 0.42s cubic-bezier(0.2, 0.8, 0.2, 1) both; /* 300–500ms 从无到有 */
}

/* 无 backdrop-filter 的旧浏览器：抬高底板不透明度（≤80%），仍能隔离背景与保证对比 */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .neo-glass {
    background: var(--panel-frost-bg, var(--panel-bg, rgba(2, 2, 4, 0.8)));
  }
}

@keyframes neo-glass-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (max-width: 720px) {
  .neo-glass {
    --fx: 24px;
    --fy: 16px;
    max-width: 100%;
    padding: var(--space-3) var(--space-2);
    border-radius: var(--r-md);
  }
}

@media (prefers-reduced-motion: reduce) {
  .neo-glass {
    animation: none;
  }
}

.glyph {
  top: var(--space-4);
  left: -8vw;
}

/* 顶部进度线（冷 → 热）：宽度直接由 --shift 驱动，零 JS、零滚动监听 */
.progress {
  position: fixed;
  top: 0;
  left: 0;
  width: calc(var(--shift, 0) * 100%);
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
  font-weight: var(--fw-bold);
  letter-spacing: -0.02em;
  line-height: 1.16; /* 展示级标题：行高刻意脱离四档刻度（同 .neo-title/.neo-h2） */
  margin: var(--space-2) 0;
}

.meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.tags {
  display: flex;
  gap: var(--space-1);
  flex-wrap: wrap;
  margin-top: var(--space-1);
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
  gap: var(--space-0);
  text-decoration: none;
  color: inherit;
}

.end.next {
  text-align: right;
  align-items: flex-end;
}

.end .neo-mono {
  color: var(--hot);
  font-size: var(--fs-3xs);
}

.end-title {
  font-family: var(--font-display);
  font-size: var(--fs-base);
  font-weight: var(--fw-bold);
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
