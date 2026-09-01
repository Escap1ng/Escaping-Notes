<script setup>
import { content } from '../lib/content.js'
</script>

<template>
  <footer class="site-footer readout">
    <span>// escape_log · 继续逃逸</span>
    <span>{{ content.site.name }} · 手工建造 · 无追踪</span>
  </footer>
</template>

<style scoped>
.site-footer {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-top: 1px solid var(--line);
}
</style>
