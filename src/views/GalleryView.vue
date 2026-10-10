<script setup>
// 映像柜：全站用过的图摊成一墙拍立得，点开进看片灯箱
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { loadGallery } from '../lib/gallery.js'
import { trapFocus } from '../lib/focus.js'
import { N, navLabel } from '../config/narrative.js'

const shots = ref([])
const ready = ref(false)
const idx = ref(-1) // 灯箱：当前那张的下标，-1 = 关
const lbEl = ref(null)
let trap = null

const cur = computed(() => (idx.value >= 0 ? shots.value[idx.value] : null))
const tally = computed(() => N.gallery.count.replace('{n}', String(shots.value.length)))

// 进场错峰 60ms 一枚，但最多排到 12 枚——图一多，第 30 张要等 1.8s 才出现，
// 读起来像卡住了而不是"一张张摊开"
const enterDelay = (i) => Math.min(i, 12) * 60

onMounted(async () => {
  shots.value = await loadGallery()
  ready.value = true
})

function step(d) {
  const n = shots.value.length
  if (n) idx.value = (idx.value + d + n) % n
}
function hide() {
  idx.value = -1
}
// 只有落在遮罩或那层糊底上才关：点到照片、按钮、说明文字都不该丢框
function onBackdrop(e) {
  if (e.target === e.currentTarget) hide()
}

// 灯箱是模态：打开时锁 Tab、锁页面滚动，关闭后焦点回到那张卡（focus.js 的释放函数负责还）
watch(idx, async (i) => {
  document.body.style.overflow = i >= 0 ? 'hidden' : ''
  if (i >= 0) {
    await nextTick()
    trap = trapFocus(lbEl.value)
  } else {
    trap?.()
    trap = null
  }
})

function onKey(e) {
  if (idx.value < 0) return
  if (e.key === 'Escape') hide()
  else if (e.key === 'ArrowLeft') step(-1)
  else if (e.key === 'ArrowRight') step(1)
}

/* 触屏左右滑动翻页（横向位移 >50px 才算，竖向滚动手势不吃） */
let touchX = 0
function onTouchStart(e) {
  touchX = e.touches[0]?.clientX ?? 0
}
function onTouchEnd(e) {
  const dx = (e.changedTouches[0]?.clientX ?? touchX) - touchX
  if (Math.abs(dx) > 50) step(dx > 0 ? -1 : 1)
}

onMounted(() => addEventListener('keydown', onKey))
onUnmounted(() => {
  removeEventListener('keydown', onKey)
  trap?.()
  document.body.style.overflow = '' // 框还开着就换页：别让滚动锁死在别的页面上
})
</script>

<template>
  <section class="neo-shell gallery">
    <p class="neo-eyebrow">{{ N.sections.gallery }}</p>
    <h2 class="neo-h2">{{ navLabel('/gallery') }}</h2>
    <p class="neo-lede">{{ N.hints.gallery }}</p>
    <p class="tally neo-mono">{{ tally }} · {{ N.gallery.open }}</p>

    <ul v-if="shots.length" class="wall">
      <li v-for="(s, i) in shots" :key="s.src" :style="{ '--tilt': `${s.tilt}deg`, '--d': `${enterDelay(i)}ms` }">
        <button class="shot" type="button" @click="idx = i">
          <span class="tape" aria-hidden="true"></span>
          <span class="frame">
            <span class="inner">
              <!-- 整张原图按自身比例上墙，不裁 3:2：这面墙要的是"这张图本来长什么样"，
                   列表页那格封面才是选焦点裁一格的活 -->
              <img :src="s.src" :alt="s.title" loading="lazy" decoding="async" />
            </span>
          </span>
          <span class="cap">{{ s.title }}</span>
        </button>
      </li>
    </ul>
    <!-- 取数期间占三格：整页空着会读成"这站没有图"，而不是"还在拿" -->
    <ul v-else-if="!ready" class="wall" aria-hidden="true">
      <li v-for="k in 3" :key="k">
        <span class="shot">
          <span class="frame">
            <span class="inner neo-shot blank"></span>
          </span>
        </span>
      </li>
    </ul>
    <p v-else class="empty neo-mono">{{ N.empty.gallery }}</p>

    <!-- 灯箱必须 Teleport 出 main：main 是 z-index:2 的层叠上下文，框里的关闭/翻页按钮
         会被顶栏（z 60）压在下面点不到。PostView 那盏只有一张图、四角无按钮，才躲得过这件事 -->
    <Teleport to="body">
      <div
        v-if="cur"
        ref="lbEl"
        class="lb"
        role="dialog"
        aria-modal="true"
        :aria-label="N.lightbox.aria"
        tabindex="-1"
        @click="onBackdrop"
        @touchstart="onTouchStart"
        @touchend="onTouchEnd"
      >
        <span class="lb-bg" aria-hidden="true" @click="hide"></span>
        <button class="lb-x" type="button" :aria-label="N.lightbox.close" @click.stop="hide">✕</button>
        <button class="lb-arrow prev" type="button" :aria-label="N.lightbox.prev" @click.stop="step(-1)">«</button>
        <button class="lb-arrow next" type="button" :aria-label="N.lightbox.next" @click.stop="step(1)">»</button>
        <figure class="lb-stage" @click.stop>
          <img :src="cur.src" :alt="cur.title" />
          <figcaption class="lb-cap">{{ cur.title }}</figcaption>
        </figure>
        <p class="lb-count neo-mono">{{ idx + 1 }} / {{ shots.length }}</p>
        <p class="lb-hint neo-mono">{{ N.lightbox.keys }}</p>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.gallery {
  padding-top: var(--page-top);
}

.tally {
  margin: calc(-1 * var(--space-2)) 0 var(--space-3);
  color: var(--text-1);
  font-size: var(--fs-2xs);
  letter-spacing: 0.16em;
}

/* ---------- 墙：三列瀑布，照片各自按原比例落地 ---------- */
.wall {
  column-count: 3;
  column-gap: var(--space-2);
  list-style: none;
  margin: 0;
  padding: 0;
}

.wall > li {
  break-inside: avoid;
  margin: 0 0 var(--space-3);
  /* 错峰进场挂在 li 上、不挂在 .shot 上：animation 的 fill 值在层叠里高于普通声明，
     压在同一个元素上就会把 :hover 的 transform 吃掉——参照站那处正是这么失效的。
     li 自己没有 hover 变换，所以两不相犯。 */
  animation: shot-in 0.5s ease-out var(--d, 0ms) both;
}

@keyframes shot-in {
  from {
    opacity: 0;
    transform: translateY(24px) scale(0.92);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.shot {
  position: relative;
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
  transform: rotate(var(--tilt, 0deg));
  transform-origin: center;
  transition: transform 0.3s cubic-bezier(0.34, 0.6, 0.64, 1);
}

/* 悬停把照片摆正、抬一点，像伸手去揭那张片子 */
.shot:hover,
.shot:focus-visible {
  z-index: 5;
  transform: rotate(0deg) scale(1.02);
}

.shot:focus-visible {
  outline: 2px solid var(--cold);
  outline-offset: 4px;
}

.frame {
  display: block;
  padding: 8px 8px 20px;
  border-radius: 2px;
  background: var(--polar);
  box-shadow:
    0 1px 3px var(--shadow),
    0 6px 22px color-mix(in srgb, var(--shadow) 55%, transparent);
  transition: box-shadow 0.3s ease;
}

.shot:hover .frame,
.shot:focus-visible .frame {
  box-shadow:
    0 2px 6px var(--shadow),
    0 16px 40px color-mix(in srgb, var(--shadow) 70%, transparent);
}

.inner {
  display: block;
  overflow: hidden;
  border-radius: 1px;
}

.inner img {
  display: block;
  width: 100%;
  height: auto;
  transition: transform 0.5s ease;
}

.shot:hover .inner img,
.shot:focus-visible .inner img {
  transform: scale(1.05);
}

/* 左上那一条胶带：半透、压着框边斜 6°，模糊 2px 让它吃到底色里去 */
.tape {
  position: absolute;
  top: -6px;
  left: 10px;
  z-index: 2;
  width: 36px;
  height: 14px;
  border-radius: 2px;
  background: var(--tape);
  transform: rotate(-6deg);
  pointer-events: none;
  -webkit-backdrop-filter: blur(2px);
  backdrop-filter: blur(2px);
}

.cap {
  display: block;
  margin-top: var(--space-1);
  padding: 0 2px;
  color: var(--text-1);
  font-family: var(--font-serif);
  font-style: italic;
  font-size: var(--fs-xs);
  line-height: var(--lh-snug);
  letter-spacing: 0.02em;
  text-align: center;
  transition: color 0.2s ease;
}

.shot:hover .cap,
.shot:focus-visible .cap {
  color: var(--cold);
}

@media (max-width: 900px) {
  .wall {
    column-count: 2;
  }
}

@media (max-width: 720px) {
  .wall {
    column-count: 1;
  }
}

.empty {
  padding: var(--space-3);
  border: 1px dashed var(--card-brd);
  border-radius: var(--r-md);
  color: var(--text-1);
}

/* ---------- 看片灯箱 ---------- */
.lb {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lb-bg {
  position: absolute;
  inset: 8px;
  border-radius: var(--r-md);
  background: color-mix(in srgb, var(--ink-0) 78%, transparent);
  -webkit-backdrop-filter: blur(16px) saturate(1.2);
  backdrop-filter: blur(16px) saturate(1.2);
}

.lb-x,
.lb-arrow {
  position: absolute;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  width: 40px;
  height: 40px;
  border: 1px solid var(--line);
  border-radius: var(--r-pill);
  background: color-mix(in srgb, var(--ink-1) 60%, transparent);
  color: var(--text-0);
  font-size: var(--fs-md);
  line-height: 1;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
}

.lb-x:hover,
.lb-arrow:hover {
  color: var(--cold);
  border-color: var(--card-brd-hover);
}

.lb-x:focus-visible,
.lb-arrow:focus-visible {
  outline: 2px solid var(--cold);
  outline-offset: 2px;
}

.lb-x {
  top: 24px;
  right: 24px;
}

.lb-arrow {
  top: 50%;
  transform: translateY(-50%);
}

.lb-arrow.prev {
  left: 24px;
}

.lb-arrow.next {
  right: 24px;
}

.lb-stage {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 0;
  padding: 0 var(--space-4);
  max-width: 92vw;
}

.lb-stage img {
  max-width: 100%;
  max-height: 76vh;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  box-shadow: 0 8px 32px var(--shadow);
}

.lb-cap {
  margin-top: var(--space-2);
  color: var(--text-1);
  font-family: var(--font-serif);
  font-style: italic;
  font-size: var(--fs-sm);
  text-align: center;
}

.lb-count {
  position: absolute;
  bottom: 20px;
  left: 0;
  right: 0;
  z-index: 2;
  color: var(--text-1);
  font-size: var(--fs-2xs);
  letter-spacing: 0.16em;
  text-align: center;
  pointer-events: none;
}

.lb-hint {
  position: absolute;
  bottom: 44px;
  left: 0;
  right: 0;
  z-index: 2;
  color: var(--text-1);
  font-size: var(--fs-3xs);
  letter-spacing: 0.16em;
  text-align: center;
  pointer-events: none;
  opacity: 0.7;
}

@media (max-width: 720px) {
  .lb-arrow {
    display: none; /* 手机上让位给滑动，箭头会压住照片两侧 */
  }
  .lb-x {
    top: 12px;
    right: 12px;
  }
  .lb-hint {
    display: none;
  }
  .lb-stage {
    padding: 0 var(--space-1);
  }
}

/* 减弱动效：墙上的照片全部摆正站好，只留 opacity 的淡入；灯箱的糊底照旧（它不晕） */
@media (prefers-reduced-motion: reduce) {
  .wall > li {
    animation: none;
    opacity: 1;
  }
  .shot,
  .shot:hover,
  .shot:focus-visible {
    transform: none;
  }
  .inner img,
  .shot:hover .inner img {
    transform: none;
  }
}
</style>
