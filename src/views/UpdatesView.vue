<script setup>
// 新版脉冲：一条一枚满宽卡，只有最新一条用热色
import { computed, onMounted, ref } from 'vue'
import { content } from '../data/index.js'
import { loadPosts } from '../lib/posts.js'
import { mergeFeed } from '../lib/feed.js'
import { onLens } from '../lib/lens.js'
import { N, navLabel } from '../data/narrative.js'

// 文章自动进动态：手写条目只记文章之外的事，合并与排序在 lib/feed.js 一处
const posts = ref([])
const feed = computed(() => mergeFeed(content.updates, posts.value))
onMounted(async () => {
  posts.value = await loadPosts()
})
</script>

<template>
  <section class="en-shell">
    <header class="en-head">
      <h2 class="en-h2">{{ navLabel('/updates') }}</h2>
      <p class="en-lede">{{ N.hints.updates }}</p>
    </header>

    <ol class="feed">
      <li
        v-for="(u, i) in feed"
        :key="u.key"
        class="en-card pulse en-lens"
        @pointermove="onLens"
      >
        <span class="dot" :class="i === 0 ? 'hot' : 'cold'" aria-hidden="true"></span>
        <span class="when en-mono">{{ u.date }}</span>
        <RouterLink v-if="u.to" :to="u.to" class="what">
          {{ u.text }}<span class="go" aria-hidden="true">→</span>
        </RouterLink>
        <p v-else class="what">{{ u.text }}</p>
      </li>
      <li v-if="!feed.length" class="empty en-mono">{{ N.empty.updates }}</li>
    </ol>
  </section>
</template>

<style scoped>
.en-shell {
  padding-top: 120px;
}

/* 动态是一句话，两列栅格把它读成两栏报纸——这里一条一枚满宽卡，
   卡面仍是 §6d 那一张，只是形态各自定：不撑 210px、内部横排 */
.feed {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--space-2);
}

.pulse {
  min-height: 0;
  gap: var(--space-2);
  padding: var(--card-pad) var(--card-pad-lg);
  display: grid;
  grid-template-columns: auto max-content minmax(0, 1fr);
  align-items: baseline;
}

/* 日期列取 max-content 而不是 10ch：ch 在栅格列上按容器字体度量算（这里是 body 的 sans），
   换一台机器 mono 就不是那个宽度。所有日期都是十个字符，所以各行正文对齐在同一条竖线上 */
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  transition: transform var(--dur) cubic-bezier(0.2, 0.8, 0.2, 1);
}

.pulse:hover .dot {
  transform: scale(1.8);
}

.dot.cold {
  background: var(--cold);
}

.dot.hot {
  background: var(--hot);
}

.when {
  color: var(--text-1);
  font-size: var(--fs-sm);
  line-height: var(--lh-tight);
  white-space: nowrap;
  transition: color var(--dur-fast);
}

.pulse:hover .when {
  color: var(--cold);
}

.what {
  margin: 0;
  font-family: var(--font-serif);
  font-size: var(--fs-md);
  line-height: var(--lh-relaxed);
  transition: transform var(--dur) cubic-bezier(0.2, 0.8, 0.2, 1);
}

/* 文章条目是链接：正文同色，hover 冷移；箭头只做"能点进去"的提示 */
a.what {
  color: inherit;
  text-decoration: none;
}

a.what:hover {
  color: var(--cold);
}

.go {
  display: inline-block;
  margin-left: var(--space-1);
  color: var(--cold);
  font-family: var(--font-sans);
  font-size: var(--fs-sm);
  transition: transform var(--dur) cubic-bezier(0.2, 0.8, 0.2, 1);
}

a.what:hover .go {
  transform: translateX(var(--nudge));
}

.pulse:hover .what {
  transform: translateX(var(--nudge));
}

.empty {
  padding: var(--card-pad) var(--card-pad-lg);
  border: 1px solid var(--card-brd);
  border-radius: var(--r-md);
  color: var(--text-1);
}

/* 手机上日期与正文并排只剩一行七八个字：日期另起一行，正文仍缩进到日期之下 */
@media (max-width: 720px) {
  .pulse {
    grid-template-columns: auto 1fr;
    row-gap: var(--space-1);
  }

  .what {
    grid-column: 2;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pulse:hover .dot,
  .pulse:hover .what,
  a.what:hover .go {
    transform: none;
  }
}
</style>
