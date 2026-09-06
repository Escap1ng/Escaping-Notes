<script setup>
// NeoCursor · 沉浸光标：白热光子核（精确跟手）+ 蓝移滞后环（引力拖尾）
// 仅 neo 皮肤 + 精细指针 + 非 reduced-motion 启用；输入区隐去、交还原生文本光标
import { onMounted, onUnmounted, ref } from 'vue'

const root = ref(null)
const core = ref(null)
const ring = ref(null)

const HOVER_SEL = 'a[href], button, summary, label, [role="button"]'
const TEXT_SEL = 'input, textarea, [contenteditable="true"]'

let enabled = false
let raf = 0
let x = -100
let y = -100
let rx = -100
let ry = -100
let on = false

function frame() {
  rx += (x - rx) * 0.16
  ry += (y - ry) * 0.16
  if (core.value) core.value.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`
  if (ring.value) ring.value.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`
  raf = requestAnimationFrame(frame)
}

function onMove(e) {
  x = e.clientX
  y = e.clientY
  if (!on) {
    on = true
    rx = x
    ry = y
    root.value.classList.add('is-on')
  }
  const t = e.target.closest ? e.target.closest(HOVER_SEL) : null
  const f = e.target.closest ? e.target.closest(TEXT_SEL) : null
  root.value.classList.toggle('is-hover', !!t)
  root.value.classList.toggle('is-text', !!f)
}

function onDown() {
  root.value.classList.add('is-down')
}
function onUp() {
  root.value.classList.remove('is-down')
}
function onLeave(e) {
  if (e.relatedTarget) return
  on = false
  root.value.classList.remove('is-on')
}
function onVisibility() {
  if (document.hidden) {
    if (raf) cancelAnimationFrame(raf)
    raf = 0
  } else if (enabled && !raf) {
    raf = requestAnimationFrame(frame)
  }
}

onMounted(() => {
  const fine = matchMedia('(pointer: fine)').matches
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  enabled = fine && !reduced
  if (!enabled) return
  document.documentElement.dataset.cursor = 'on'
  addEventListener('pointermove', onMove, { passive: true })
  addEventListener('pointerdown', onDown, { passive: true })
  addEventListener('pointerup', onUp, { passive: true })
  document.addEventListener('pointerout', onLeave, { passive: true })
  document.addEventListener('visibilitychange', onVisibility)
  raf = requestAnimationFrame(frame)
})

onUnmounted(() => {
  if (!enabled) return
  removeEventListener('pointermove', onMove)
  removeEventListener('pointerdown', onDown)
  removeEventListener('pointerup', onUp)
  document.removeEventListener('pointerout', onLeave)
  document.removeEventListener('visibilitychange', onVisibility)
  if (raf) cancelAnimationFrame(raf)
  delete document.documentElement.dataset.cursor
})
</script>

<template>
  <div ref="root" class="neo-cursor" aria-hidden="true">
    <i ref="ring" class="ring"></i>
    <i ref="core" class="core"></i>
  </div>
</template>

<style scoped>
.neo-cursor {
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.25s ease;
}

.neo-cursor.is-on {
  opacity: 1;
}

/* 输入区：隐去自定义光标，交还原生文本光标 */
.neo-cursor.is-text {
  opacity: 0;
}

.core,
.ring {
  position: absolute;
  left: 0;
  top: 0;
  border-radius: 50%;
  will-change: transform;
}

/* 光子核：白热，仅高光色 */
.core {
  width: 5px;
  height: 5px;
  background: var(--white);
  box-shadow: 0 0 10px 1px color-mix(in srgb, var(--white) 55%, transparent);
  transition: background-color 0.2s, box-shadow 0.2s;
}

/* 滞后环：蓝移描边 */
.ring {
  width: 48px;
  height: 48px;
  border: 1px solid color-mix(in srgb, var(--cold) 55%, transparent);
  transition: width 0.22s cubic-bezier(0.2, 0.8, 0.2, 1), height 0.22s cubic-bezier(0.2, 0.8, 0.2, 1),
    border-color 0.2s;
}

/* 悬停可交互：环扩张、核转蓝移 */
.is-hover .ring {
  width: 72px;
  height: 72px;
  border-color: var(--cold);
}

.is-hover .core {
  background: var(--cold);
  box-shadow: 0 0 12px 2px color-mix(in srgb, var(--cold) 55%, transparent);
}

/* 按下：收束、转红移 */
.is-down .ring {
  width: 32px;
  height: 32px;
  border-color: var(--hot);
}

.is-down .core {
  background: var(--hot);
  box-shadow: 0 0 10px 1px color-mix(in srgb, var(--hot) 55%, transparent);
}
</style>
