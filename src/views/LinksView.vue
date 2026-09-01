<script setup>
import { content } from '../lib/content.js'
</script>

<template>
  <section class="page">
    <p class="readout page-code">// MODULE_03 · LINKS</p>
    <h2 class="page-title">收藏</h2>
    <div v-for="group in content.linkGroups" :key="group.group" class="link-group">
      <p class="readout group-title">// {{ group.group }} · {{ group.label }}</p>
      <ul class="link-list">
        <li v-for="item in group.items" :key="item.name">
          <a class="link-item" :href="item.url" target="_blank" rel="noopener noreferrer">
            {{ item.name }}<span aria-hidden="true">↗</span>
          </a>
        </li>
        <li v-if="!group.items.length" class="readout empty">// 虚位以待</li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.link-group {
  margin-bottom: var(--space-3);
}

.group-title {
  margin: 0 0 var(--space-2);
}

.empty {
  list-style: none;
  color: var(--text-1);
}
</style>
