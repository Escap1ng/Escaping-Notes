<script setup>
// 新版项目页：卡片栅格（卡面走共用基元 .neo-card）+ 冷色光带
import { content } from '../lib/content.js'
import { onLens } from '../lib/lens.js'
import { N, navLabel } from '../config/narrative.js'
</script>

<template>
  <section class="neo-shell">
    <p class="neo-eyebrow">{{ N.sections.projects }}</p>
    <h2 class="neo-h2">{{ navLabel('/projects') }}</h2>
    <p class="neo-lede">{{ N.hints.projects }}</p>

    <ul class="neo-cards">
      <li v-for="p in content.projects" :key="p.name">
        <a class="neo-card neo-lens" :href="p.url" target="_blank" rel="noopener noreferrer" @pointermove="onLens">
          <span class="bar" aria-hidden="true"></span>
          <span class="year neo-mono">{{ p.year }}</span>
          <h3 class="name">{{ p.name }}</h3>
          <p class="desc">{{ p.desc }}</p>
          <span class="link neo-mono">
            LINK<span class="arrow" aria-hidden="true">↗</span>
          </span>
        </a>
      </li>
      <li v-if="!content.projects.length" class="empty neo-mono">{{ N.empty.projects }}</li>
    </ul>
  </section>
</template>

<style scoped>
.neo-shell {
  padding-top: 120px;
}

/* 卡面（边/角/底/hover/内边距）全在 .neo-card 里，这里只留卡内排版 */
.year {
  color: var(--hot);
  font-size: var(--fs-3xs);
  transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.neo-card:hover .year {
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

.neo-card:hover .name {
  color: var(--cold);
  transform: translateX(var(--space-1));
}

.desc {
  margin: 0;
  color: var(--text-1);
  font-size: var(--fs-sm);
  line-height: var(--lh-normal);
}

.link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-0);
  margin-top: auto;
  padding-top: var(--space-1);
  color: var(--cold);
  font-size: var(--fs-3xs);
}

.arrow {
  transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.neo-card:hover .arrow {
  transform: translate(3px, -3px);
}

.empty {
  grid-column: 1 / -1;
  padding: var(--space-3);
  border: 1px solid var(--card-brd);
  border-radius: var(--r-md);
  color: var(--text-1);
}

@media (prefers-reduced-motion: reduce) {
  .neo-card:hover .year,
  .neo-card:hover .name,
  .neo-card:hover .arrow {
    transform: none;
  }
}
</style>
