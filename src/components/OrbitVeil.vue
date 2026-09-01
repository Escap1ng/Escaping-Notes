<script setup>
// 入轨环：路由切换瞬间扩散消隐的琥珀环，与页面 clip-path 展开合成“收环→展开”
import { onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const on = ref(false)
let timer = 0
let raf = 0

watch(
  () => route.fullPath,
  () => {
    on.value = false
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => (on.value = true))
    clearTimeout(timer)
    timer = setTimeout(() => (on.value = false), 650)
  }
)

onUnmounted(() => {
  clearTimeout(timer)
  cancelAnimationFrame(raf)
})
</script>

<template>
  <div v-if="on" class="veil" aria-hidden="true"><i></i></div>
</template>

<style scoped>
.veil {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  pointer-events: none;
  z-index: 60;
}

.veil i {
  width: 42vmin;
  height: 42vmin;
  border: 1px solid var(--signal);
  border-radius: 50%;
  opacity: 0;
  animation: veil-ring 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}

@keyframes veil-ring {
  0% { transform: scale(0.1); opacity: 0.8; }
  100% { transform: scale(1); opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .veil i {
    animation: none;
  }
}
</style>
