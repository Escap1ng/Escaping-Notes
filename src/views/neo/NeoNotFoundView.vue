<template>
  <section class="neo-shell nf">
    <span class="neo-glyph glyph" aria-hidden="true">{{ N.glyph.nf }}</span>

    <div class="hole" aria-hidden="true">
      <span class="ring"></span>
      <span class="shadow"></span>
    </div>

    <h2 class="neo-h2 title">{{ N.nf.title }}</h2>
    <p class="lede">{{ N.nf.text }}</p>

    <div class="cta">
      <RouterLink class="neo-btn neo-btn-primary" to="/">{{ N.nf.home }}</RouterLink>
      <RouterLink class="neo-btn neo-btn-ghost" to="/blog">{{ N.nf.blog }}</RouterLink>
    </div>
  </section>
</template>

<script setup>
import { N } from '../../config/narrative.js'
</script>

<style scoped>
.nf {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 78vh;
  padding-top: 120px;
}

.glyph {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -58%);
}

/* 纯 CSS 黑洞：旋转吸积环 + 阴影 */
.hole {
  position: relative;
  width: 150px;
  height: 150px;
  margin-bottom: var(--space-3);
}

.ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: conic-gradient(from 0deg, var(--hot), var(--white) 18%, var(--cold) 46%, transparent 62%, var(--hot));
  animation: spin 9s linear infinite;
  filter: blur(1px);
}

.shadow {
  position: absolute;
  inset: 16px;
  border-radius: 50%;
  background: var(--hole);
  box-shadow: 0 0 0 1.5px var(--white);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.title {
  margin-bottom: 6px;
}

.lede {
  margin: 0 0 var(--space-3);
  color: var(--text-1);
  font-size: 15px;
}

.cta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

@media (prefers-reduced-motion: reduce) {
  .ring {
    animation: none;
  }
}
</style>
