<script setup>
// 新版载荷：单列宽行 + 冷色光带
import { content } from '../../lib/content.js'
import { onLens } from '../../lib/lens.js'
import { N } from '../../config/narrative.js'
</script>

<template>
  <section class="neo-shell">
    <span class="neo-glyph glyph" aria-hidden="true">{{ N.glyph.projects }}</span>

    <p class="neo-eyebrow">{{ N.sections.projects }}</p>
    <h2 class="neo-h2">项目</h2>
    <p class="neo-lede">{{ N.hints.projects }}</p>

    <ul class="rows">
      <li v-for="p in content.projects" :key="p.name">
        <a class="row neo-lens" :href="p.url" target="_blank" rel="noopener noreferrer" @pointermove="onLens">
          <span class="bar" aria-hidden="true"></span>
          <span class="year neo-mono">{{ p.year }}</span>
          <span class="name">{{ p.name }}</span>
          <span class="desc">{{ p.desc }}</span>
          <span class="link neo-mono">LINK<span class="arrow" aria-hidden="true">↗</span></span>
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

.glyph {
  top: 30px;
  right: -7vw;
}

.rows {
  list-style: none;
  margin: 0;
  padding: 0;
}

.row {
  position: relative;
  display: grid;
  grid-template-columns: 6ch minmax(0, auto) 1fr auto;
  align-items: baseline;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-1);
  border-top: 1px solid var(--line);
  overflow: hidden;
  text-decoration: none;
  color: inherit;
}

.rows li:last-child .row {
  border-bottom: 1px solid var(--line);
}

.year {
  color: var(--hot);
  font-size: 11px;
  transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.row:hover .year {
  transform: scale(1.08);
}

.name {
  font-family: var(--font-display);
  font-size: clamp(20px, 2.8vw, 26px);
  font-weight: 700;
  letter-spacing: -0.01em;
  transition: color 0.24s, transform 0.32s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.row:hover .name {
  color: var(--cold);
  transform: translateX(7px);
}

.desc {
  color: var(--text-1);
  font-size: 14px;
}

.link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--cold);
  font-size: 11px;
}

.arrow {
  transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.row:hover .arrow {
  transform: translate(3px, -3px);
}

.empty {
  padding: var(--space-3) 0;
  border-top: 1px solid var(--line);
}

@media (max-width: 720px) {
  .row {
    grid-template-columns: 6ch 1fr auto;
    gap: 4px var(--space-2);
  }
  .desc {
    grid-column: 2 / -1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .row:hover .arrow {
    transform: none;
  }
}
</style>
