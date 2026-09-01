<script setup>
import { content } from '../lib/content.js'
</script>

<template>
  <section class="page">
    <p class="readout page-code">// MODULE_06 · PAYLOADS</p>
    <h2 class="page-title">载荷舱</h2>
    <p class="readout hint">// 已部署的载荷：逃出井外、仍在运行的东西</p>

    <ul class="payload-list">
      <li v-for="p in content.projects" :key="p.name" class="payload-row">
        <span class="readout payload-year">{{ p.year }}</span>
        <span class="payload-name">{{ p.name }}</span>
        <span class="readout payload-desc">{{ p.desc }}</span>
        <a class="readout payload-link" :href="p.url" target="_blank" rel="noopener noreferrer">LINK ↗</a>
      </li>
      <li v-if="!content.projects.length" class="readout empty">// 载荷舱空</li>
    </ul>
  </section>
</template>

<style scoped>
.hint {
  margin: 0 0 var(--space-3);
}

.payload-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.payload-row {
  display: grid;
  grid-template-columns: 6ch 1fr auto;
  gap: 4px var(--space-2);
  padding: var(--space-2) 0;
  border-top: 1px solid var(--line);
}

.payload-list li:last-child .payload-row {
  border-bottom: 1px solid var(--line);
}

.payload-name {
  font-family: var(--font-serif);
  font-size: 20px;
  font-weight: 700;
}

.payload-desc {
  grid-column: 2;
}

.payload-link {
  grid-row: span 2;
  align-self: center;
}

.payload-link:hover {
  color: var(--signal);
}

.empty {
  padding: var(--space-2) 0;
  border-top: 1px solid var(--line);
}

@media (max-width: 720px) {
  .payload-row {
    grid-template-columns: 6ch 1fr;
  }
  .payload-link {
    grid-row: auto;
  }
}
</style>
