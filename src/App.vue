<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import MusicPlayer from './components/MusicPlayer.vue'
import NeoSiteHeader from './components/neo/NeoSiteHeader.vue'
import NeoSiteFooter from './components/neo/NeoSiteFooter.vue'
import NeoCursor from './components/neo/NeoCursor.vue'
import StarTrails from './components/neo/StarTrails.vue'
import { loadContent } from './lib/content.js'
import { loadMe } from './lib/auth.js'

const route = useRoute()
// 次级页（非首页）：main 加空白滚动余量，把页脚压出首屏
const isSub = computed(() => route.path !== '/')

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
  <div class="neo-vignette" aria-hidden="true"></div>
  <NeoSiteHeader />
  <main id="main" :class="{ 'neo-sub': isSub }">
    <RouterView v-slot="{ Component, route }">
      <!-- 不用 out-in：Vue 3.5 下离开方在 leave 期间重渲染（如 RouterLink active 翻转）
           会丢失挂起的 enter；并行模式 + leave 绝对定位叠层规避 -->
      <Transition name="fall">
        <component :is="Component" :key="route.path" />
      </Transition>
    </RouterView>
  </main>
  <NeoSiteFooter />
  <MusicPlayer />
  <NeoCursor />
</template>

<style>
main {
  position: relative;
  min-height: calc(100vh - 128px);
}
</style>
