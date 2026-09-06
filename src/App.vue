<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import SiteHeader from './components/SiteHeader.vue'
import SiteFooter from './components/SiteFooter.vue'
import MusicPlayer from './components/MusicPlayer.vue'
import NeoSiteHeader from './components/neo/NeoSiteHeader.vue'
import NeoSiteFooter from './components/neo/NeoSiteFooter.vue'
import NeoCursor from './components/neo/NeoCursor.vue'
import StarTrails from './components/neo/StarTrails.vue'
import { skin, applySkin } from './lib/skin.js'
import { loadContent } from './lib/content.js'
import { loadMe } from './lib/auth.js'

// 双皮肤壳层：neo/legacy 各自一套头尾，页面级切换见 router/index.js 的 skinned()
const route = useRoute()
const isNeo = computed(() => skin.mode === 'neo')
// 次级页（neo 非首页）：main 加空白滚动余量，把页脚压出首屏
const isSub = computed(() => isNeo.value && route.path !== '/')
const Header = computed(() => (isNeo.value ? NeoSiteHeader : SiteHeader))
const Footer = computed(() => (isNeo.value ? NeoSiteFooter : SiteFooter))

// 滚动深度：写入 --shift（0..1），驱动首页标题字距与全站晕影随下潜加深
let shiftRaf = 0
function applyShift() {
  shiftRaf = 0
  const max = document.documentElement.scrollHeight - innerHeight
  const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0
  document.documentElement.style.setProperty('--shift', p.toFixed(4))
}
function onScroll() {
  if (!shiftRaf) shiftRaf = requestAnimationFrame(applyShift)
}

onMounted(() => {
  applySkin(skin.mode)
  loadContent()
  loadMe()
  addEventListener('scroll', onScroll, { passive: true })
  addEventListener('resize', onScroll)
  applyShift()
})

onUnmounted(() => {
  if (shiftRaf) cancelAnimationFrame(shiftRaf)
  removeEventListener('scroll', onScroll)
  removeEventListener('resize', onScroll)
  document.documentElement.style.removeProperty('--shift')
})
</script>

<template>
  <StarTrails v-if="isSub" />
  <div v-if="isNeo" class="neo-vignette" aria-hidden="true"></div>
  <component :is="Header" />
  <main id="main" :class="{ 'neo-sub': isSub }">
    <RouterView v-slot="{ Component, route }">
      <!-- 不用 out-in：Vue 3.5 下离开方在 leave 期间重渲染（如 RouterLink active 翻转）
           会丢失挂起的 enter；并行模式 + leave 绝对定位叠层规避 -->
      <Transition :name="isNeo ? 'fall' : 'orbit'">
        <component :is="Component" :key="route.path" />
      </Transition>
    </RouterView>
  </main>
  <component :is="Footer" />
  <MusicPlayer />
  <NeoCursor v-if="isNeo" />
</template>

<style>
/* 入轨转场：同心圆已移除，进入方轻量淡入，与坐标碎裂衔接 */
.orbit-enter-active {
  animation: orbit-in 0.3s ease-out;
}

/* 并行模式：离开方绝对定位叠在新页之上淡出，避免布局堆叠
   left/right 同时置 0：保留 .page 的 margin:auto 居中，避免左跳 */
.orbit-leave-active {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  pointer-events: none;
  animation: orbit-out 0.18s ease-in;
}

@keyframes orbit-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes orbit-out {
  from { opacity: 1; }
  to { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .orbit-enter-active,
  .orbit-leave-active {
    animation: none;
  }
}

main {
  position: relative;
  min-height: calc(100vh - 128px);
}
</style>
