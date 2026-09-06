<script setup>
// HorizonHero · 首页首屏排版层：幽灵汉字 + 宣言 + 「现在」三栏
// 长曝光星轨装置由 StarTrails(interactive) 提供，本组件只负责叙事排版与读数
import { onMounted, onUnmounted, ref } from 'vue'
import StarTrails from './StarTrails.vue'
import { onLens } from '../../lib/lens.js'
import { N } from '../../config/narrative.js'

const props = defineProps({
  posts: { type: Array, default: () => [] },
  now: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['select'])

const hov = ref(-1)
const textEl = ref(null)

/* 首屏视差：文字随滚动下沉并淡出 */
let raf = 0
function onScroll() {
  if (raf) return
  raf = requestAnimationFrame(() => {
    raf = 0
    const y = scrollY
    if (textEl.value) {
      textEl.value.style.transform = `translateY(${(y * 0.25).toFixed(1)}px)`
      textEl.value.style.opacity = Math.max(0, 1 - y / 520).toFixed(3)
    }
  })
}

onMounted(() => addEventListener('scroll', onScroll, { passive: true }))
onUnmounted(() => {
  if (raf) cancelAnimationFrame(raf)
  removeEventListener('scroll', onScroll)
})
</script>

<template>
  <section class="hero">
    <span class="neo-glyph glyph" aria-hidden="true">{{ N.glyph.home }}</span>

    <StarTrails interactive :posts="posts" @hover="hov = $event" @select="emit('select', $event)" />

    <div ref="textEl" class="hero-text">
      <p class="neo-eyebrow">{{ N.heroEyebrow }}</p>
      <h1 class="manifesto">
        <span class="ln ln1">{{ N.manifesto[0] }}</span>
        <span class="ln ln2">{{ N.manifesto[1] }}</span>
      </h1>
      <p class="sub">{{ N.manifestoSub }}</p>
    </div>

    <div class="now">
      <div class="now-cell neo-lens" @pointermove="onLens">
        <span class="k neo-mono">{{ N.now.writing }}</span>
        <RouterLink v-if="now.writing" class="v" :to="`/blog/${now.writing.slug}`">
          {{ now.writing.title }}
        </RouterLink>
        <span v-else class="v dim">--</span>
      </div>
      <div class="now-cell neo-lens" @pointermove="onLens">
        <span class="k neo-mono">{{ N.now.listening }}</span>
        <RouterLink v-if="now.listening" class="v" to="/records">
          {{ now.listening.title }}<template v-if="now.listening.artist"> · {{ now.listening.artist }}</template>
        </RouterLink>
        <span v-else class="v dim">--</span>
      </div>
      <div class="now-cell neo-lens" @pointermove="onLens">
        <span class="k neo-mono">{{ N.now.building }}</span>
        <a v-if="now.building" class="v" :href="now.building.url" target="_blank" rel="noopener noreferrer">
          {{ now.building.name }}<span aria-hidden="true">↗</span>
        </a>
        <span v-else class="v dim">--</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  height: 100vh;
  height: 100svh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

@supports not (height: 100svh) {
  .hero {
    height: 100vh;
  }
}

/* 幽灵汉字置于天极附近：中段被星轨掩过 */
.glyph {
  top: 42%;
  left: 68%;
  transform: translate(-50%, -50%);
  font-size: clamp(240px, 40vw, 620px);
  z-index: 0;
}

/* 文字底衬：左下渐隐柔光，压在盘面上仍可读（z 同 canvas，DOM 在其后 → 盖盘不盖字） */
.hero::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: 0;
  width: 68%;
  height: 78%;
  z-index: 1;
  pointer-events: none;
  background: radial-gradient(130% 115% at 0% 100%, var(--scrim), transparent 66%);
}

.hero-text {
  position: relative;
  z-index: 2;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 10px;
  padding: 0 var(--space-3) 40px;
  pointer-events: none;
  will-change: transform, opacity;
}

.hero-text > * {
  pointer-events: auto;
}

.manifesto {
  margin: 6px 0 0;
  font-family: var(--font-display);
  font-size: clamp(26px, 5.6vw, 80px);
  font-weight: 700;
  line-height: 1.18;
  /* 字距随下潜被潮汐拉长 */
  letter-spacing: calc(-0.02em + var(--shift, 0) * 0.04em);
  text-shadow: 0 2px 26px color-mix(in srgb, var(--ink-0) 55%, transparent);
}

/* 联句不断行：每半句恒为一行，字号随视口连续缩放 */
.ln {
  display: block;
  white-space: nowrap;
  clip-path: inset(0 0 100% 0);
  animation: ln-reveal 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}

.ln2 {
  animation-delay: 0.18s;
}

@keyframes ln-reveal {
  to {
    clip-path: inset(0 0 -12% 0);
  }
}

.sub {
  margin: 0;
  max-width: 38ch;
  color: var(--text-1);
  font-size: clamp(13px, 1.6vw, 17px);
  line-height: 1.8;
  animation: fade 0.8s 0.5s ease both;
}

.note {
  margin-top: 4px;
  animation: fade 0.8s 0.72s ease both;
}

@keyframes fade {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

/* 「现在」三栏：竖排读数条，长文列占宽（流内贴底，任何比例下都不与宣言重叠） */
.now {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 1fr);
  border-top: 1px solid var(--line);
  background: linear-gradient(
    to top,
    color-mix(in srgb, var(--ink-0) 92%, transparent),
    color-mix(in srgb, var(--ink-0) 42%, transparent)
  );
}

.now-cell {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 13px var(--space-3) 15px;
  border-left: 1px solid var(--line);
  min-width: 0;
}

.now-cell:first-child {
  border-left: 0;
}

.now-cell .k {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 10.5px;
  color: var(--text-1);
  letter-spacing: 0.14em;
}

/* 红移信号点：此栏为「正在发生」 */
.now-cell .k::before {
  content: '';
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--hot);
  box-shadow: 0 0 9px var(--hot);
  animation: now-pulse 2.6s ease-in-out infinite;
}

@keyframes now-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}

.now-cell .v {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-serif);
  font-size: 15.5px;
  color: var(--text-0);
  text-decoration: none;
  transition: color 0.22s, transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.now-cell:hover .v {
  transform: translateX(5px);
}

.now-cell a.v:hover {
  color: var(--cold);
}

.now-cell .v.dim {
  color: var(--text-1);
}

@media (max-width: 720px) {
  .hero-text {
    padding: 0 var(--space-2) 32px;
  }
  .hero::after {
    width: 100%;
    height: 72%;
  }
  .glyph {
    left: 50%;
    top: 38%;
  }
  .now {
    grid-template-columns: 1fr;
  }
  .now-cell {
    border-left: 0;
    border-top: 1px solid var(--line);
    padding: 9px var(--space-2);
  }
  .now-cell:first-child {
    border-top: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ln {
    clip-path: none;
    animation: none;
  }
  .sub,
  .note {
    animation: none;
    opacity: 1;
    transform: none;
  }
  .now-cell .k::before {
    animation: none;
  }
}
</style>
