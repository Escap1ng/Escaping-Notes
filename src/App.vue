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
import { shift } from './lib/shift.js'

const route = useRoute()
// 次级页（非首页）：main 加空白滚动余量，把页脚压出首屏
const isSub = computed(() => route.path !== '/')

// 路由切换后向读屏播报新页面（SPA 不会自行触发）
const announced = ref('')
// 快门：每换一次页加一，用它给 .neo-shutter 重新 key 才能重放动画。
// 首帧不触发——setup 跑起来时 route.path 已是解析完的目标页，第一次变更就是真导航。
// 减弱动效下 neo.css §11 把整层设成 display:none，动画不跑也就不会有 animationend
// 来收尾摘节点，所以这里直接不起快门。
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)')
const shot = ref(0)
watch(
  () => route.path,
  () => {
    announced.value = route.meta.t || ''
    if (!reduceMotion.matches) shot.value++
  }
)

// 滚动深度：写入 --shift（0..1）与 lib/shift.js，驱动首页标题字距、全站晕影，
// 以及次级页星轨的曝光响应（canvas 读 JS 值，不读 DOM）。
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
  shift.v = p
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
  <!-- 快门：一次导航 = 一次曝光。key 变更即重放两片帘幕，动画结束就摘掉这一层 -->
  <div v-if="shot" :key="shot" class="neo-shutter" aria-hidden="true" @animationend="shot = 0"></div>
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
