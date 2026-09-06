<script setup>
// HorizonHero · 首页首屏排版层：幽灵汉字 + 宣言 + 轨道读数 + 「现在」三栏
// 黑洞装置由 BlackHole(interactive) 提供，本组件只负责叙事排版与读数
import { onMounted, onUnmounted, ref } from 'vue'
import BlackHole from './BlackHole.vue'
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

    <BlackHole interactive :posts="posts" @hover="hov = $event" @select="emit('select', $event)" />

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
}

@supports not (height: 100svh) {
  .hero {
    height: 100vh;
  }
}

/* 幽灵汉字置于黑洞正后方：被阴影吞没中段 */
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
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 10px;
  padding: 0 var(--space-3) 132px;
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

/* 「现在」三栏 */
.now {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border-top: 1px solid var(--line);
  background: color-mix(in srgb, var(--ink-0) 55%, transparent);
}

.now-cell {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 12px var(--space-3);
  border-left: 1px solid var(--line);
  min-width: 0;
}

.now-cell:first-child {
  border-left: 0;
}

.now-cell .k {
  flex-shrink: 0;
  font-size: 10.5px;
}

.now-cell .v {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
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
    padding: 0 var(--space-2) 168px;
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
}
</style>
