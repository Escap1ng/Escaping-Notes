<script setup>
// 新版坠入阅读：顶部进度线 + 单栏衬线正文
// 文章页：上报/降级/灯箱/Esc 成对监听/复制/上下篇
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { loadPost, loadPosts } from '../lib/posts.js'
import { renderMarkdown } from '../lib/markdown.js'
import { trapFocus } from '../lib/focus.js'
import { useDetailExit } from '../lib/exit.js'
import { N } from '../config/narrative.js'

const route = useRoute()
const post = ref(null)
const missing = ref(false)
const htmlBody = ref('')
const all = ref([])
const copied = ref(false)
const lightbox = ref('')
const lightboxEl = ref(null)
let trap = null

// Esc / 点空白退回 /blog；灯箱开着时先让位给灯箱（它自己吃这两下）
useDetailExit('/blog', () => !lightbox.value)

const neighbors = computed(() => {
  const i = all.value.findIndex((p) => p.slug === route.params.slug)
  if (i < 0) return { prev: null, next: null }
  return { prev: all.value[i + 1] || null, next: all.value[i - 1] || null }
})

/* 灯箱 */
function onProseClick(e) {
  if (e.target.tagName === 'IMG') lightbox.value = e.target.currentSrc || e.target.src
}
// Esc 关灯箱是这盏灯自己的事；「退回列表」不在这里写，走 lib/exit.js（与项目详情页同一处实现）
function onLightboxKey(e) {
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
   省掉一套重复的滚动监听与 scrollHeight 强制布局（见 design.md §3.2） */

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

  addEventListener('keydown', onLightboxKey)
})

onUnmounted(() => {
  removeEventListener('keydown', onLightboxKey)
  trap?.()
  // 这里不复位 document.title：afterEach 与新页的挂载都排在本次卸载之后，
  // 写上兜底值反而把「文章 · Escaping Notes」覆成站名（实测：从文章 Esc 退回列表，标签页说两句话）
})
</script>

<template>
  <section class="en-shell post">
    <div class="progress" aria-hidden="true"></div>

    <div v-if="missing" class="lost">
      <h2 class="en-h2">{{ N.nf.title }}</h2>
      <RouterLink class="en-btn en-btn-ghost" to="/blog">{{ N.nf.blog }}</RouterLink>
    </div>

    <template v-else-if="post">
      <article class="en-glass">
        <header class="head">
          <p class="en-eyebrow">{{ post.date }}</p>
          <h1 class="title">{{ post.title }}</h1>
          <p class="meta en-mono">
            {{ post.words }} 字 · {{ post.minutes }} 分钟
            <button class="en-btn en-btn-sm en-btn-quiet" type="button" @click="copyLink">
              {{ copied ? N.reader.copied : N.reader.copy }}
            </button>
          </p>
          <p v-if="post.tags && post.tags.length" class="tags">
            <span v-for="t in post.tags" :key="t" class="en-tag">{{ t }}</span>
          </p>
        </header>

        <div class="en-prose" v-html="htmlBody" @click="onProseClick"></div>

        <nav class="ends" :aria-label="N.reader.endsAria">
          <RouterLink v-if="neighbors.prev" :to="`/blog/${neighbors.prev.slug}`" class="end">
            <span class="en-spike" aria-hidden="true"></span>
            <span class="en-mono">{{ N.postPrev }}</span>
            <span class="end-title">{{ neighbors.prev.title }}</span>
          </RouterLink>
          <span v-else></span>
          <RouterLink v-if="neighbors.next" :to="`/blog/${neighbors.next.slug}`" class="end next">
            <span class="en-spike" aria-hidden="true"></span>
            <span class="en-mono">{{ N.postNext }}</span>
            <span class="end-title">{{ neighbors.next.title }}</span>
          </RouterLink>
        </nav>

        <div class="exit">
          <RouterLink class="en-btn en-btn-primary" to="/blog">{{ N.postEnd.back }}</RouterLink>
        </div>
      </article>
    </template>

    <div
      v-if="lightbox"
      ref="lightboxEl"
      class="lightbox"
      role="dialog"
      aria-modal="true"
      :aria-label="N.lightbox.aria"
      tabindex="-1"
      @click="lightbox = ''"
    >
      <img :src="lightbox" :alt="N.reader.imgAlt" />
    </div>
  </section>
</template>

<style scoped>
.post {
  /* 骨架默认 1120px，会把 §6c 那块 1280px 的阅读底板夹回 1056px。
     只有文章页需要比骨架更宽：1344 = 底板 1280 + .en-shell 左右各 32 的内边距。 */
  max-width: 1344px;
  padding-top: var(--page-top);
}

/* .en-glass（阅读底板）已上移到 site.css §6c：它是 docs/design.md §6.4 列出的全站基元，不该锁在本页 scoped 里 */

/* 顶部进度线（冷 → 热）：--shift 直接喂给 scaleX，零 JS、零滚动监听。
   必须是 transform 而非 width：--shift 每个滚动帧都在变，改宽度等于每帧一次布局。
   渐变随 scaleX 一起被压缩，观感与原先按宽度绘制时一致。 */
.progress {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  z-index: 65;
  transform-origin: left;
  transform: scaleX(var(--shift, 0));
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
  line-height: 1.16; /* 展示级标题：行高刻意脱离四档刻度（同 .en-title/.en-h2） */
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
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-0);
  /* 左出让 28px 给衍射芒，指针移过来时"这颗星"在文字外侧亮起 */
  padding-left: 28px;
  text-decoration: none;
  color: inherit;
}

.end.next {
  text-align: right;
  align-items: flex-end;
  padding-left: 0;
  padding-right: 28px;
}

/* 形态与绽放在 site.css §6b；这里只给位置。上下用 inset + auto 外边距居中，
   不碰 transform——那是基元用来做缓绽的。 */
.end .en-spike {
  top: 0;
  bottom: 0;
  left: 0;
  margin: auto 0;
}

.end.next .en-spike {
  left: auto;
  right: 0;
}

.end .en-mono {
  color: var(--hot);
  font-size: var(--fs-3xs);
}

.end-title {
  font-family: var(--font-display);
  font-size: var(--fs-base);
  font-weight: var(--fw-bold);
  transition: color var(--dur-fast);
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
