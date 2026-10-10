<script setup>
// 新版脉冲：卡片栅格（卡面走共用基元 .neo-card），脉冲点冷/热交替
import { content } from '../lib/content.js'
import { N, navLabel } from '../config/narrative.js'
</script>

<template>
  <section class="neo-shell">
    <p class="neo-eyebrow">{{ N.sections.updates }}</p>
    <h2 class="neo-h2">{{ navLabel('/updates') }}</h2>
    <p class="neo-lede">{{ N.hints.updates }}</p>

    <ol class="neo-cards">
      <li v-for="(u, i) in content.updates" :key="u.date + u.text">
        <div class="neo-card pulse">
          <span class="head">
            <span class="dot" :class="i % 2 ? 'hot' : 'cold'" aria-hidden="true"></span>
            <span class="when neo-mono">{{ u.date }}</span>
          </span>
          <p class="what">{{ u.text }}</p>
        </div>
      </li>
      <li v-if="!content.updates.length" class="empty neo-mono">{{ N.empty.updates }}</li>
    </ol>
  </section>
</template>

<style scoped>
.neo-shell {
  padding-top: 120px;
}

/* 动态是一句话，撑到基元那个 210px 只会露空——卡面共用，高度各自定 */
.pulse {
  min-height: 0;
  gap: var(--space-1);
}

.head {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.dot {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
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
  transition: color 0.24s;
}

.pulse:hover .when {
  color: var(--cold);
}

.what {
  margin: 0;
  font-family: var(--font-serif);
  font-size: var(--fs-md);
  line-height: var(--lh-relaxed);
  transition: transform 0.32s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.pulse:hover .what {
  transform: translateX(var(--space-0));
}

.empty {
  grid-column: 1 / -1;
  padding: var(--space-3);
  border: 1px solid var(--card-brd);
  border-radius: var(--r-md);
  color: var(--text-1);
}

@media (prefers-reduced-motion: reduce) {
  .pulse:hover .dot,
  .pulse:hover .what {
    transform: none;
  }
}
</style>
