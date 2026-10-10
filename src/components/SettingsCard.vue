<script setup>
// 设置卡：顶栏「设置」图标点开的那一张。目前只有底片模糊一枚滑杆。
// 与 MusicCard 同一模子——Escape 关、点卡外关、焦点陷阱、贴在顶栏下沿右对齐。
// 值本身不住在这里：读写都在 src/lib/plate.js，这张卡只是个门面。
import { onMounted, onUnmounted, ref } from 'vue'
import { trapFocus } from '../lib/focus.js'
import { plate, applyBlur, BLUR_MIN, BLUR_MAX } from '../lib/plate.js'

const emit = defineEmits(['close'])
const cardEl = ref(null)

function onSlide(e) {
  applyBlur(e.target.value)
}
function onKey(e) {
  if (e.key === 'Escape') emit('close')
}
// 点卡外即收；那枚开合按钮归它自己管，否则 toggle 会紧接着再开一次，卡永远关不上
function onDoc(e) {
  if (!cardEl.value || cardEl.value.contains(e.target)) return
  if (e.target.closest && e.target.closest('.settings-btn')) return
  emit('close')
}

let trap = null
onMounted(async () => {
  addEventListener('keydown', onKey)
  addEventListener('pointerdown', onDoc, true)
  trap = trapFocus(cardEl.value)
})
onUnmounted(() => {
  removeEventListener('keydown', onKey)
  removeEventListener('pointerdown', onDoc, true)
  trap?.()
})
</script>

<template>
  <div ref="cardEl" id="neo-settings" class="card" role="dialog" aria-label="设置">
    <div class="head">
      <h2 class="ttl">设置</h2>
      <button class="close" type="button" aria-label="关闭设置" @click="emit('close')">
        <span class="neo-ico" aria-hidden="true">✕</span>
      </button>
    </div>

    <div class="row">
      <label class="lab" for="plate-blur">底片模糊</label>
      <output class="val neo-mono" for="plate-blur">{{ plate.blur }}px</output>
    </div>

    <input
      id="plate-blur"
      class="slider"
      type="range"
      :min="BLUR_MIN"
      :max="BLUR_MAX"
      step="1"
      :value="plate.blur"
      :aria-valuetext="`模糊 ${plate.blur} 像素`"
      @input="onSlide"
    />

    <p class="hint">0 即清晰。只作用于折线以下的风景底片，首屏不受影响。</p>
  </div>
</template>

<style scoped>
/* 与 MusicCard 同一条定位：贴在顶栏下沿、右对齐于那排图标之下。
   顶栏本身 fixed，所以这张卡跟着视口走，不受 fall 转场给页根加的包含块影响。 */
.card {
  position: absolute;
  top: calc(100% + 2px);
  right: var(--space-3);
  z-index: 70;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  width: 320px;
  max-width: calc(100vw - var(--space-3) * 2);
  padding: var(--space-3);
  border: 1px solid var(--card-brd);
  border-radius: var(--r-md);
  background: var(--ink-0);
  box-shadow: 0 22px 60px -34px var(--shadow, rgba(0, 0, 0, 0.6));
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.ttl {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--fs-md);
  font-weight: var(--fw-bold);
  letter-spacing: 0.04em;
}

.close {
  display: inline-grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--r-sm);
  background: none;
  color: var(--text-1);
  cursor: pointer;
}

.close:hover {
  color: var(--text-0);
  border-color: var(--card-brd-hover);
}

.row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
}

.lab {
  font-size: var(--fs-sm);
  color: var(--text-0);
}

.val {
  font-size: var(--fs-sm);
  color: var(--cold); /* 读数属交互反馈，只准用冷色 */
  font-variant-numeric: tabular-nums;
}

/* 原生 range + accent-color：不自造 thumb，跨浏览器一致，键盘方向键天然可用 */
.slider {
  width: 100%;
  accent-color: var(--cold);
}

.hint {
  margin: 0;
  font-size: var(--fs-xs);
  line-height: 1.6;
  color: var(--text-1);
}
</style>
