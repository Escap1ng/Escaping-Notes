<script setup>
// 合集详情：面包屑 → 子合集 → 按阅读顺序排的文章目录。
// 上级合集自动汇总所有后代的文章，每一组标题链回那个子合集；
// 篇文章的顺序由 frontmatter 的 `order` 决定（见 src/lib/collections.js 的 sortChapter）。
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { content } from '../data/index.js'
import { loadPosts } from '../lib/posts.js'
import {
  chainOf,
  childrenOf,
  collectionHref,
  findCollection,
  postsOf,
  sectionize,
} from '../lib/collections.js'
import { onLens } from '../lib/lens.js'
import { N, pageTitle } from '../data/narrative.js'

const route = useRoute()
const posts = ref([])
const loading = ref(true)
const slug = computed(() => String(route.params.slug || ''))
const collection = computed(() => findCollection(content.collections, slug.value))
const chain = computed(() => chainOf(content.collections, slug.value))
const kids = computed(() => childrenOf(content.collections, slug.value))
const sections = computed(() => sectionize(content.collections, slug.value, posts.value))
const total = computed(() => postsOf(content.collections, slug.value, posts.value).length)
const countOf = (s) => postsOf(content.collections, s, posts.value).length
const pad = (n) => String(n).padStart(2, '0')
const totalLabel = computed(() => (loading.value ? '—' : N.collection.posts.replace('{n}', total.value)))
const countLabel = (s) => (loading.value ? '—' : N.collection.posts.replace('{n}', countOf(s)))

watch(collection, (c) => {
  if (c) document.title = pageTitle(c.title)
})

onMounted(async () => {
  posts.value = await loadPosts()
  loading.value = false
  // 合集数据是静态的，挂载时就认得出名字；这行与 PostView 同一做法——
  // afterEach 先把兜底标题写上，这里再换成这一页自己的那句
  if (collection.value) document.title = pageTitle(collection.value.title)
})
</script>

<template>
  <section class="en-shell">
    <nav class="crumbs en-mono" aria-label="合集路径">
      <RouterLink to="/collections">{{ N.collection.crumb }}</RouterLink>
      <template v-for="c in chain" :key="c.slug">
        <span class="sep" aria-hidden="true">/</span>
        <RouterLink v-if="c.slug !== slug" :to="collectionHref(c.slug)">{{ c.title }}</RouterLink>
        <span v-else aria-current="page">{{ c.title }}</span>
      </template>
    </nav>

    <div v-if="!collection" class="lost">
      <h2 class="en-h2">{{ N.collection.lost }}</h2>
      <RouterLink class="en-btn en-btn-ghost" to="/collections">{{ N.collection.crumb }}</RouterLink>
    </div>

    <template v-else>
      <h2 class="en-h2">{{ collection.title }}</h2>
      <p class="en-lede">{{ collection.summary }}</p>
      <p class="tally en-mono">
        {{ totalLabel }}
        <span v-if="kids.length"> · {{ N.collection.kids.replace('{n}', kids.length) }}</span>
      </p>

      <section v-if="kids.length" class="block">
        <h3 class="block-head en-mono">{{ N.collection.children }}</h3>
        <ul class="en-cards">
          <li v-for="k in kids" :key="k.slug">
            <RouterLink class="en-card en-lens child" :to="collectionHref(k.slug)" @pointermove="onLens">
              <span class="bar" aria-hidden="true"></span>
              <span class="child-k en-mono">{{ countLabel(k.slug) }}</span>
              <span class="child-ttl">{{ k.title }}</span>
              <span class="child-sum">{{ k.summary }}</span>
            </RouterLink>
          </li>
        </ul>
      </section>

      <section class="block" :aria-busy="loading">
        <h3 class="block-head en-mono">{{ N.collection.articles }}</h3>

        <div v-if="sections.length" class="groups">          <div
            v-for="s in sections"
            :key="s.collection.slug"
            class="group"
            :class="{ nested: s.depth > 0 }"
          >
            <header v-if="s.collection.slug !== slug" class="group-head">
              <RouterLink :to="collectionHref(s.collection.slug)">{{ s.collection.title }}</RouterLink>
              <span class="en-mono">{{ N.collection.posts.replace('{n}', s.posts.length) }}</span>
            </header>

            <ol class="toc">
              <li v-for="(p, i) in s.posts" :key="p.slug">
                <RouterLink class="en-card en-lens row" :to="p.url" @pointermove="onLens">
                  <span class="bar" aria-hidden="true"></span>
                  <span class="row-no en-mono" aria-hidden="true">{{ pad(i + 1) }}</span>
                  <span class="row-body">
                    <span class="row-k en-mono">{{ p.date }} · {{ p.minutes }} 分钟</span>
                    <span class="row-ttl">{{ p.title }}</span>
                    <span class="row-sum">{{ p.summary }}</span>
                  </span>
                  <span class="row-go" aria-hidden="true">→</span>
                </RouterLink>
              </li>
            </ol>
          </div>
        </div>

        <p v-else-if="loading" class="empty en-mono">{{ N.collection.loading }}</p>
        <p v-else class="empty en-mono">{{ N.empty.collectionPosts }}</p>
      </section>
    </template>
  </section>
</template>

<style scoped>
/* 与文章列表、动态页同一档页顶留白：绕过固定顶栏 */
.en-shell {
  padding-top: var(--page-top);
}

.crumbs {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-0);
  margin-bottom: var(--space-2);
}

.crumbs a {
  color: var(--text-1);
  text-decoration: none;
  transition: color var(--dur-fast);
}

.crumbs a:hover {
  color: var(--cold);
}

.crumbs [aria-current='page'] {
  color: var(--text-0);
}

.sep {
  color: var(--text-1);
}

.crumbs a,
.crumbs .sep,
.crumbs [aria-current='page'] {
  margin-right: var(--space-0);
}

.tally {
  margin: calc(var(--space-2) * -1) 0 var(--space-4);
  font-size: var(--fs-3xs);
}

.block {
  margin-top: var(--space-4);
}

.block-head {
  margin: 0 0 var(--space-2);
  padding-bottom: var(--space-1);
  border-bottom: 1px solid var(--line);
  font-size: var(--fs-3xs);
  letter-spacing: 0.16em;
}

/* 子合集卡：与总览页的卡片同一套内部语言，只是更矮 */
.child {
  min-height: 152px;
}

.child-k {
  font-size: var(--fs-3xs);
}

.child-ttl {
  position: relative;
  z-index: 1;
  font-family: var(--font-display);
  font-size: clamp(20px, 2.4vw, 24px);
  font-weight: var(--fw-bold);
  line-height: var(--lh-tight);
  transition: color var(--dur-fast), transform var(--dur) cubic-bezier(0.2, 0.8, 0.2, 1);
}

.child:hover .child-ttl {
  color: var(--cold);
  transform: translateX(var(--nudge));
}

.child-sum {
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

.groups {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

/* 上级合集里的后代分组向左让出一点，层级靠缩进而不是第二套颜色 */
.group.nested {
  padding-left: var(--space-2);
  border-left: 1px solid var(--line);
}

.group-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
  margin-bottom: var(--space-1);
}

.group-head a {
  font-family: var(--font-display);
  font-size: var(--fs-lg);
  font-weight: var(--fw-bold);
  color: var(--text-0);
  text-decoration: none;
  transition: color var(--dur-fast);
}

.group-head a:hover {
  color: var(--cold);
}

.group-head .en-mono {
  font-size: var(--fs-3xs);
  white-space: nowrap;
}

.toc {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--space-1);
}

/* 目录行：一条一枚满宽卡（不发丝分隔），左序号、中信息、右箭头 */
.row {
  min-height: 0;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: start;
  gap: var(--space-2);
  padding: var(--card-pad) var(--card-pad-lg);
}

.row-no {
  padding-top: 2px;
  font-size: var(--fs-xs);
  letter-spacing: 0.12em;
  color: var(--text-1);
  transition: color var(--dur-fast);
}

.row-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-0);
  min-width: 0;
}

.row-k {
  font-size: var(--fs-3xs);
  color: var(--text-1);
}

.row-ttl {
  font-family: var(--font-display);
  font-size: clamp(19px, 2.2vw, 24px);
  font-weight: var(--fw-bold);
  line-height: var(--lh-tight);
  letter-spacing: -0.01em;
  transition: color var(--dur-fast), transform var(--dur) cubic-bezier(0.2, 0.8, 0.2, 1);
}

.row:hover .row-ttl {
  color: var(--cold);
  transform: translateX(var(--nudge));
}

.row:hover .row-no {
  color: var(--cold);
}

.row-sum {
  margin-top: var(--space-0);
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

.row-go {
  padding-top: 2px;
  color: var(--cold);
  transition: transform var(--dur) cubic-bezier(0.2, 0.8, 0.2, 1);
}

.row:hover .row-go {
  transform: translateX(var(--nudge));
}

.lost {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
}

.empty {
  margin: 0;
  padding: var(--card-pad-lg);
  border: 1px solid var(--card-brd);
  border-radius: var(--r-md);
}

@media (max-width: 720px) {
  .group.nested {
    padding-left: var(--space-1);
  }

  .row {
    grid-template-columns: auto minmax(0, 1fr);
    gap: var(--space-1) var(--space-2);
  }

  .row-go {
    display: none;
  }

  .tally {
    margin-top: calc(var(--space-1) * -1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .child:hover .child-ttl,
  .row:hover .row-ttl,
  .row:hover .row-go {
    transform: none;
  }
}
</style>
