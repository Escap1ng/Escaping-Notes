<script setup>
import { content } from '../lib/content.js'
</script>

<template>
  <section class="page">
    <p class="readout page-code">// MODULE_02 · UPDATES</p>
    <h2 class="page-title">动态</h2>
    <ol class="update-list">
      <li v-for="u in content.updates" :key="u.date + u.text" class="update-item">
        <span class="readout update-date">{{ u.date }}</span>
        <p class="update-text">{{ u.text }}</p>
      </li>
      <li v-if="!content.updates.length" class="readout empty">// 暂无动态</li>
    </ol>
  </section>
</template>

<style scoped>
.update-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.update-item {
  display: grid;
  grid-template-columns: 12ch 1fr;
  gap: var(--space-2);
  padding: var(--space-2) 0;
  border-top: 1px solid var(--line);
}

.update-date {
  color: var(--signal);
  padding-top: 4px;
}

.update-text {
  margin: 0;
  max-width: var(--measure);
}

.empty {
  padding: var(--space-2) 0;
  border-top: 1px solid var(--line);
}

@media (max-width: 720px) {
  .update-item {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}
</style>
