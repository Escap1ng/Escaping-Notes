<script setup>
// DepthRail · 深度导航：滚动 = 向事件视界下潜
// 语义：刻度 = 七个栏目（悬停显示名称、可点击跳转）；发光头标 = 当前下潜位置。
// 深度读数已移除（只保留可交互导航）。
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { N } from '../../config/narrative.js'

const route = useRoute()
const router = useRouter()

const p = ref(0)
let raf = 0

const pct = computed(() => (p.value * 100).toFixed(2) + '%')

const activeIdx = computed(() =>
  N.nav.findIndex((n) => (n.to === '/' ? route.path === '/' : route.path.startsWith(n.to)))
)

function tickTop(i) {
  return (i / (N.nav.length - 1)) * 100 + '%'
}

function go(to) {
  router.push(to)
}

function apply() {
  raf = 0
  const max = document.documentElement.scrollHeight - innerHeight
  p.value = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0
  document.documentElement.style.setProperty('--shift', p.value.toFixed(4))
}

function onScroll() {
  if (!raf) raf = requestAnimationFrame(apply)
}

onMounted(() => {
  addEventListener('scroll', onScroll, { passive: true })
  addEventListener('resize', onScroll)
  apply()
})

onUnmounted(() => {
  if (raf) cancelAnimationFrame(raf)
  removeEventListener('scroll', onScroll)
  removeEventListener('resize', onScroll)
  document.documentElement.style.removeProperty('--shift')
})
</script>

<template>
  <nav class="rail" aria-label="深度导航">
    <div class="rail-line">
      <i class="rail-fill" :style="{ height: pct }"></i>
      <span class="rail-head" :style="{ top: pct }" aria-hidden="true"></span>

      <button
        v-for="(n, i) in N.nav"
        :key="n.to"
        class="tick"
        :class="{ on: i === activeIdx }"
        :style="{ top: tickTop(i) }"
        type="button"
        :aria-label="`跳转到${n.label}（r/rs ${n.depth}）`"
        :title="`${n.label} · r/rs ${n.depth}`"
        @click="go(n.to)"
      >
        <span class="t-label">{{ n.label }}</span>
        <span class="t-mark" aria-hidden="true"></span>
      </button>
    </div>
  </nav>
</template>

<style scoped>
.rail {
  position: fixed;
  right: 18px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 55;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
}

.rail-line {
  position: relative;
  width: 1px;
  height: 38vh;
  background: var(--line);
}

/* 下潜填充：蓝移 → 红移 */
.rail-fill {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  background: linear-gradient(to bottom, var(--cold), var(--hot));
}

/* 发光头标：当前下潜位置 */
.rail-head {
  position: absolute;
  left: -3px;
  width: 7px;
  height: 7px;
  margin-top: -3px;
  border-radius: 50%;
  background: var(--hot);
  box-shadow: 0 0 12px 2px color-mix(in srgb, var(--hot) 65%, transparent);
  transition: top 0.12s linear;
}

/* 刻度 = 栏目，可点击 */
.tick {
  position: absolute;
  right: -14px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px 6px 6px;
  margin-top: -12px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-1);
}

.t-mark {
  width: 9px;
  height: 1px;
  background: currentColor;
  transition: width 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), background-color 0.24s;
}

.t-label {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.1em;
  white-space: nowrap;
  opacity: 0;
  transform: translateX(6px);
  transition: opacity 0.26s ease, transform 0.26s cubic-bezier(0.2, 0.8, 0.2, 1), color 0.24s;
}

/* 悬停整条轨 → 展开所有名称；悬停单刻度 → 高亮该名称 */
.rail:hover .t-label {
  opacity: 0.85;
  transform: none;
}

.tick:hover .t-label,
.tick.on .t-label {
  opacity: 1;
  transform: none;
}

.tick:hover .t-mark {
  width: 15px;
  background: var(--cold);
}

.tick:hover {
  color: var(--cold);
}

.tick.on {
  color: var(--hot);
}

.tick.on .t-mark {
  width: 15px;
  background: var(--hot);
  box-shadow: 0 0 8px 1px color-mix(in srgb, var(--hot) 55%, transparent);
}

@media (max-width: 900px) {
  .rail {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .rail-head {
    transition: none;
  }
  .t-label,
  .t-mark {
    transition: none;
  }
}
</style>
