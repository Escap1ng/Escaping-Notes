<script setup>
// 新版项目页：卡片栅格（卡面走共用基元 .en-card）+ 冷色光带
// 卡片点进去是 /projects/:slug 那一页（与 /blog 的卡片同一个动作），站内不为这一页另造浮层
import { content } from '../lib/content.js'
import { onLens } from '../lib/lens.js'
import { projectSlug } from '../lib/projects.js'
import { N, navLabel } from '../config/narrative.js'
</script>

<template>
  <section class="en-shell">
    <p class="en-eyebrow">{{ N.sections.projects }}</p>
    <h2 class="en-h2">{{ navLabel('/projects') }}</h2>
    <p class="en-lede">{{ N.hints.projects }}</p>

    <ul class="en-cards">
      <li v-for="p in content.projects" :key="p.name">
        <RouterLink class="en-card en-lens" :to="`/projects/${projectSlug(p.name)}`" @pointermove="onLens">
          <span class="bar" aria-hidden="true"></span>
          <span class="year en-mono">{{ p.year }}</span>
          <h3 class="name">{{ p.name }}</h3>
          <p class="desc">{{ p.desc }}</p>
          <span v-if="p.stack" class="stack en-mono">{{ p.stack }}</span>
        </RouterLink>
      </li>
      <li v-if="!content.projects.length" class="empty en-mono">{{ N.empty.projects }}</li>
    </ul>
  </section>
</template>

<style scoped>
.en-shell {
  padding-top: 120px;
}

/* 卡面（边/角/底/hover/内边距）全在 .en-card 里，这里只留卡内排版 */
.year {
  color: var(--hot);
  font-size: var(--fs-3xs);
  transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.en-card:hover .year {
  transform: scale(1.08);
}

.name {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(20px, 2.8vw, 26px);
  font-weight: var(--fw-bold);
  letter-spacing: -0.01em;
  line-height: var(--lh-tight);
  transition:
    color 0.24s,
    transform 0.32s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.en-card:hover .name {
  color: var(--cold);
  transform: translateX(var(--space-1));
}

.desc {
  margin: 0;
  color: var(--text-1);
  font-size: var(--fs-sm);
  line-height: var(--lh-normal);
}

/* 卡脚那一行留给技术栈：它是"值不值得点进去"的线索，进去之后还有整段。
   .en-mono 会把拉丁字母转大写（仪器读数的口径），而这里装的是产品名，
   VUE ROUTER 4 / CANVAS 2D 读起来是打坏的字面量，所以照 §6 里 .en-btn 那条先例显式复位。 */
.stack {
  margin-top: auto;
  padding-top: var(--space-1);
  color: var(--cold);
  font-size: var(--fs-3xs);
  text-transform: none;
}

.empty {
  grid-column: 1 / -1;
  padding: var(--space-3);
  border: 1px solid var(--card-brd);
  border-radius: var(--r-md);
  color: var(--text-1);
}

@media (prefers-reduced-motion: reduce) {
  .en-card:hover .year,
  .en-card:hover .name {
    transform: none;
  }
}
</style>
