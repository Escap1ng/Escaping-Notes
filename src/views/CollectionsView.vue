<script setup>
// 合集总览：顶层合集各占一段，段内摊开它的子合集与直接收录的文章。
// 层级只由 src/data/collections.js 的 parent 决定；这里不判断深度，只渲染顶层。
import { computed, onMounted, ref } from 'vue'
import { content } from '../data/index.js'
import { loadPosts } from '../lib/posts.js'
import { childrenOf, collectionHref, directPostsOf, postsOf, rootsOf, subtreeOf } from '../lib/collections.js'
import { onLens } from '../lib/lens.js'
import { N, navLabel } from '../data/narrative.js'

const posts = ref([])
const loading = ref(true)
onMounted(async () => {
  posts.value = await loadPosts()
  loading.value = false
})

const roots = computed(() => rootsOf(content.collections))
const kidsOf = (c) => childrenOf(content.collections, c.slug)
const directOf = (c) => directPostsOf(posts.value, c.slug)
const countOf = (slug) => postsOf(content.collections, slug, posts.value).length
const pad = (n) => String(n).padStart(2, '0')

// 取数期间写「—」而不是 0：还没算到与一个都没有是两件事（design.md §2 原则 5）
const postLabel = (slug) => (loading.value ? '—' : N.collection.posts.replace('{n}', countOf(slug)))

// 「2 个子合集 · 3 篇文章」；没有子合集时只说文章数，不摆一个 0
function tally(c) {
  if (loading.value) return '—'
  const kids = subtreeOf(content.collections, c.slug).length - 1
  const n = countOf(c.slug)
  return kids
    ? `${N.collection.kids.replace('{n}', kids)} · ${N.collection.posts.replace('{n}', n)}`
    : N.collection.posts.replace('{n}', n)
}
</script>

<template>
  <section class="en-shell">
    <header class="en-head">
      <h2 class="en-h2">{{ navLabel('/collections') }}</h2>
      <p class="en-lede">{{ N.hints.collections }}</p>
    </header>

    <div class="volumes">
      <article v-for="(c, i) in roots" :key="c.slug" class="volume">
        <header class="vol-head">
          <span class="vol-no en-mono" aria-hidden="true">{{ pad(i + 1) }}</span>
          <div class="vol-main">
            <h3 class="vol-title">
              <RouterLink :to="collectionHref(c.slug)" class="vol-link">{{ c.title }}</RouterLink>
            </h3>
            <p class="vol-sum">{{ c.summary }}</p>
          </div>
          <span class="vol-tally en-mono">{{ tally(c) }}</span>
        </header>

        <ul v-if="kidsOf(c).length || directOf(c).length" class="branches">
          <li v-for="k in kidsOf(c)" :key="k.slug">
            <RouterLink class="en-card en-lens branch" :to="collectionHref(k.slug)" @pointermove="onLens">
              <span class="bar" aria-hidden="true"></span>
              <span class="branch-k en-mono">{{ postLabel(k.slug) }}</span>
              <span class="branch-ttl">{{ k.title }}</span>
              <span class="branch-sum">{{ k.summary }}</span>
              <span class="branch-go" aria-hidden="true">→</span>
            </RouterLink>
          </li>
          <li v-for="p in directOf(c)" :key="p.slug">
            <RouterLink class="en-card en-lens branch" :to="p.url" @pointermove="onLens">
              <span class="bar" aria-hidden="true"></span>
              <span class="branch-k en-mono">{{ p.date }} · {{ p.minutes }} 分钟</span>
              <span class="branch-ttl">{{ p.title }}</span>
              <span class="branch-sum">{{ p.summary }}</span>
              <span class="branch-go" aria-hidden="true">→</span>
            </RouterLink>
          </li>
        </ul>
        <p v-else class="empty en-mono">{{ N.empty.collectionPosts }}</p>
      </article>

      <p v-if="!roots.length" class="empty en-mono">{{ N.empty.collections }}</p>
    </div>
  </section>
</template>

<style scoped>
/* 与 /blog、/updates 同一档页顶留白：绕过固定顶栏 */
.en-shell {
  padding-top: var(--page-top);
}

.volumes {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

/* 顶层合集是一段，不套外卡：段头负责"这是谁"，下面的卡片负责"往哪走" */
.vol-head {
  display: grid;
  grid-template-columns: 3.2rem minmax(0, 1fr) auto;
  gap: var(--space-2);
  align-items: start;
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--line);
}

.vol-no {
  padding-top: 10px;
  font-size: var(--fs-sm);
  letter-spacing: 0.16em;
  color: var(--text-1);
}

.vol-main {
  min-width: 0;
}

.vol-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(28px, 4.2vw, 42px);
  font-weight: var(--fw-bold);
  line-height: var(--lh-tight);
  letter-spacing: -0.01em;
}

.vol-link {
  color: inherit;
  text-decoration: none;
  transition: color var(--dur-fast);
}

.vol-link:hover {
  color: var(--cold);
}

.vol-sum {
  max-width: 62ch;
  margin: var(--space-1) 0 0;
  font-family: var(--font-serif);
  font-size: var(--fs-sm);
  line-height: var(--lh-relaxed);
  color: var(--text-1);
}

.vol-tally {
  padding-top: 12px;
  font-size: var(--fs-3xs);
  white-space: nowrap;
}

.branches {
  list-style: none;
  margin: var(--space-2) 0 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  /* 与 /blog 的卡片墙同一条：单列时各占一行，长短卡不在窄屏错落 */
  grid-auto-rows: 1fr;
  gap: var(--space-2);
}

.branches > li {
  display: flex;
}

/* 卡面（边/角/底/hover/内边距）走 .en-card，这里只定内部排版与高度 */
.branch {
  flex: 1;
  min-width: 0;
  min-height: 176px;
  padding-right: calc(var(--card-pad-lg) + 20px);
}

.branch-k {
  font-size: var(--fs-3xs);
  color: var(--text-1);
}

.branch-ttl {
  position: relative;
  z-index: 1;
  font-family: var(--font-display);
  font-size: clamp(20px, 2.6vw, 26px);
  font-weight: var(--fw-bold);
  line-height: var(--lh-tight);
  letter-spacing: -0.01em;
  transition: color var(--dur-fast), transform var(--dur) cubic-bezier(0.2, 0.8, 0.2, 1);
}

.branch:hover .branch-ttl {
  color: var(--cold);
  transform: translateX(var(--nudge));
}

.branch-sum {
  position: relative;
  z-index: 1;
  margin-top: auto;
  font-family: var(--font-serif);
  font-size: var(--fs-sm);
  line-height: var(--lh-normal);
  color: var(--text-1);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.branch-go {
  position: absolute;
  right: var(--card-pad-lg);
  bottom: var(--card-pad);
  color: var(--cold);
  transition: transform var(--dur) cubic-bezier(0.2, 0.8, 0.2, 1);
}

.branch:hover .branch-go {
  transform: translateX(var(--nudge));
}

.empty {
  margin: var(--space-2) 0 0;
  padding: var(--card-pad-lg);
  border: 1px solid var(--card-brd);
  border-radius: var(--r-md);
}

@media (max-width: 880px) {
  .branches {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .vol-head {
    grid-template-columns: 2.4rem minmax(0, 1fr);
  }
  .vol-tally {
    grid-column: 2;
    padding-top: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .branch:hover .branch-ttl,
  .branch:hover .branch-go {
    transform: none;
  }
}
</style>
