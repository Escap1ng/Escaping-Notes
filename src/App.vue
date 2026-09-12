<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import MusicPlayer from './components/MusicPlayer.vue'
import NeoSiteHeader from './components/neo/NeoSiteHeader.vue'
import NeoSiteFooter from './components/neo/NeoSiteFooter.vue'
import NeoCursor from './components/neo/NeoCursor.vue'
import StarTrails from './components/neo/StarTrails.vue'
import { loadContent } from './lib/content.js'
import { loadMe } from './lib/auth.js'
import { debounce } from './lib/debounce.js'

const route = useRoute()
// 次级页（非首页）：main 加空白滚动余量，把页脚压出首屏
const isSub = computed(() => route.path !== '/')

// 路由切换后向读屏播报新页面（SPA 不会自行触发）
const announced = ref('')
watch(
  () => route.path,
  () => {
    announced.value = route.meta.t || ''
  }
)

// 滚动深度：写入 --shift（0..1），驱动首页标题字距与全站晕影随下潜加深。
// maxScroll 只缓存、不每帧读取：scrollHeight 会强制同步布局，60fps 下等于每帧一次重排。
let shiftRaf = 0
let maxScroll = 0
let lastShift = -1
function measure() {
  maxScroll = document.documentElement.scrollHeight - innerHeight
}
function applyShift() {
  shiftRaf = 0
  const p = maxScroll > 0 ? Math.min(1, Math.max(0, scrollY / maxScroll)) : 0
  if (p === lastShift) return // 值没变就不写样式，省掉一次无关的重算
  lastShift = p
  document.documentElement.style.setProperty('--shift', p.toFixed(4))
}
function onScroll() {
  if (!shiftRaf) shiftRaf = requestAnimationFrame(applyShift)
}
const onResize = debounce(() => {
  measure()
  onScroll()
}, 150)

let ro = null

onMounted(() => {
  loadContent()
  loadMe()
  measure()
  // body 尺寸变化 = 页面变高了（内容/图片加载、路由切换、字体换入）：重测缓存
  ro = new ResizeObserver(() => {
    measure()
    onScroll()
  })
  ro.observe(document.body)
  addEventListener('scroll', onScroll, { passive: true })
  addEventListener('resize', onResize)
  applyShift()
})

onUnmounted(() => {
  if (shiftRaf) cancelAnimationFrame(shiftRaf)
  ro?.disconnect()
  removeEventListener('scroll', onScroll)
  removeEventListener('resize', onResize)
  onResize.cancel()
  document.documentElement.style.removeProperty('--shift')
})
</script>

<template>
  <StarTrails v-if="isSub" />
  <div class="neo-vignette" aria-hidden="true"></div>
  <NeoSiteHeader />
  <main id="main" tabindex="-1" :class="{ 'neo-sub': isSub }">
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
  <!-- 路由播报：SPA 换页不刷新文档，读屏用户需要被告知当前页面 -->
  <p class="sr-only" role="status" aria-live="polite">{{ announced }}</p>
</template>

<style>
main {
  position: relative;
  min-height: calc(100vh - 128px);
}
</style>
