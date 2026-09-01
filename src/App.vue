<script setup>
import { onMounted } from 'vue'
import SiteHeader from './components/SiteHeader.vue'
import SiteFooter from './components/SiteFooter.vue'
import MusicPlayer from './components/MusicPlayer.vue'
import OrbitVeil from './components/OrbitVeil.vue'
import { loadContent } from './lib/content.js'
import { loadMe } from './lib/auth.js'

onMounted(() => {
  loadContent()
  loadMe()
})
</script>

<template>
  <SiteHeader />
  <main id="main">
    <RouterView v-slot="{ Component, route }">
      <!-- 不用 out-in：Vue 3.5 下离开方在 leave 期间重渲染（如 RouterLink active 翻转）
           会丢失挂起的 enter；并行模式 + leave 绝对定位叠层规避 -->
      <Transition name="orbit">
        <component :is="Component" :key="route.path" />
      </Transition>
    </RouterView>
  </main>
  <SiteFooter />
  <MusicPlayer />
  <OrbitVeil />
</template>

<style>
/* 入轨转场：全站唯一转场——环心展开 */
.orbit-enter-active {
  animation: orbit-in 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
}

/* 并行模式：离开方绝对定位叠在新页之上淡出，避免布局堆叠 */
.orbit-leave-active {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  pointer-events: none;
  animation: orbit-out 0.18s ease-in;
}

@keyframes orbit-in {
  from { clip-path: circle(0% at 50% 42%); }
  to { clip-path: circle(140% at 50% 42%); }
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
