<script setup>
// 新版页脚：单行式，发丝顶线
import { N } from '../../config/narrative.js'

function toTop() {
  scrollTo({
    top: 0,
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
  })
}
</script>

<template>
  <footer class="neo-footer">
    <span class="neo-mono line">{{ N.footer.line }}</span>
    <span class="thanks">{{ N.footer.thanks }}</span>
    <button class="neo-btn neo-btn-sm neo-btn-quiet" type="button" @click="toTop">{{ N.footer.top }}</button>
  </footer>
</template>

<style scoped>
.neo-footer {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  flex-wrap: wrap;
  padding: var(--space-2) var(--space-3);
  border-top: 1px solid var(--line);
}

.thanks {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: var(--fs-xs);
  color: var(--text-1);
}

@media (max-width: 720px) {
  .neo-footer {
    padding: var(--space-2);
    justify-content: center;
    text-align: center;
  }
}
</style>
