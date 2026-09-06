<script setup>
// 新版脉冲：等宽时间戳 + 文本双列，脉冲点冷/热交替
import { content } from '../../lib/content.js'
import { N } from '../../config/narrative.js'
</script>

<template>
  <section class="neo-shell">
    <span class="neo-glyph glyph" aria-hidden="true">{{ N.glyph.updates }}</span>

    <p class="neo-eyebrow">{{ N.sections.updates }}</p>
    <h2 class="neo-h2">动态</h2>
    <p class="neo-lede">{{ N.hints.updates }}</p>

    <ol class="pulses">
      <li v-for="(u, i) in content.updates" :key="u.date + u.text" class="pulse">
        <span class="dot" :class="i % 2 ? 'hot' : 'cold'" aria-hidden="true"></span>
        <span class="when neo-mono">{{ u.date }}</span>
        <p class="what">{{ u.text }}</p>
      </li>
      <li v-if="!content.updates.length" class="empty neo-mono">{{ N.empty.updates }}</li>
    </ol>
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

.pulses {
  list-style: none;
  margin: 0;
  padding: 0;
}

.pulse {
  position: relative;
  display: grid;
  grid-template-columns: 12ch 1fr;
  gap: var(--space-2);
  padding: var(--space-2) 0 var(--space-2) 22px;
  border-top: 1px solid var(--line);
}

.pulse:last-child {
  border-bottom: 1px solid var(--line);
}

.dot {
  position: absolute;
  left: 0;
  top: calc(var(--space-2) + 7px);
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
  box-shadow: 0 0 10px 1px color-mix(in srgb, var(--cold) 55%, transparent);
}

.dot.hot {
  background: var(--hot);
  box-shadow: 0 0 10px 1px color-mix(in srgb, var(--hot) 55%, transparent);
}

.when {
  color: var(--text-1);
  font-size: 11.5px;
  padding-top: 4px;
  transition: color 0.24s;
}

.pulse:hover .when {
  color: var(--cold);
}

.what {
  margin: 0;
  max-width: var(--measure);
  font-size: 15.5px;
  line-height: 1.85;
  transition: transform 0.32s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.pulse:hover .what {
  transform: translateX(6px);
}

.empty {
  padding: var(--space-3) 0;
  border-top: 1px solid var(--line);
}

@media (max-width: 720px) {
  .pulse {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}
</style>
