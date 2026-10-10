<script setup>
// 播放器卡片：顶栏「音乐」按钮点开的那一张，全站唯一的播放控制面
//（右下悬浮读数条已撤）。本身不持有 <audio>——状态与操作全在 lib/music.js 那台引擎里，
// 所以 /records 页的曲目表与这张卡同时高亮同一首。
import { music, tracks, current, playIndex, toggleMusic, next, prev, seek, setVolume } from '../lib/music.js'
import { onMounted, onUnmounted, ref } from 'vue'
import { trapFocus } from '../lib/focus.js'

const emit = defineEmits(['close'])
const cardEl = ref(null)

function fmt(s) {
  if (!Number.isFinite(s) || s < 0) return '--:--'
  const n = Math.floor(s)
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`
}

function onRow(i) {
  if (isCur(i)) toggleMusic()
  else playIndex(i)
}
// 与页内曲目表同一个判据：没按下过就没有"当前曲"
function isCur(i) {
  return music.started && i === music.idx
}

function onKey(e) {
  if (e.key === 'Escape') emit('close')
}
// 点卡外即收：首个点击照常落在那儿（菜单式），不做二次拦截。
// 顶栏那枚按钮归它自己管——这里若在捕获阶段把开合按钮的点击也算成"卡外"，
// 按钮的 toggle 会紧接着再开一次，卡片就永远关不上
function onDoc(e) {
  if (!cardEl.value || cardEl.value.contains(e.target)) return
  if (e.target.closest && e.target.closest('.music-btn')) return
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
  <div ref="cardEl" class="card" :class="{ playing: music.playing }" role="dialog" aria-label="播放器">
    <div class="now">
      <!-- 星轨符号占位：本地曲目没有封面数据，这枚绕极旋转的弧就是本站的封面 -->
      <svg class="disc" viewBox="0 0 48 48" aria-hidden="true">
        <g class="arcs">
          <circle cx="24" cy="24" r="21.2" />
          <path d="M4.2 24A19.8 19.8 0 0 1 24 4.2" />
          <path d="M10.4 24A13.6 13.6 0 0 1 24 10.4" />
          <path d="M16.6 24A7.4 7.4 0 0 1 24 16.6" />
        </g>
        <circle class="core" cx="24" cy="24" r="2.6" />
      </svg>
      <div class="meta">
        <p class="nt" :title="current?.title">{{ music.started ? current?.title || '--' : '待播' }}</p>
        <p v-if="music.started && current?.artist" class="na neo-mono">{{ current.artist }}</p>
      </div>
    </div>

    <div class="transport">
      <button class="neo-btn neo-btn-sm neo-btn-quiet t-btn" type="button" aria-label="上一首" @click="prev">
        <span class="neo-ico" aria-hidden="true">«</span>
      </button>
      <button
        class="neo-btn neo-btn-sm neo-btn-primary t-btn play"
        type="button"
        :aria-label="music.playing ? '暂停' : '播放'"
        @click="toggleMusic"
      >
        <span class="neo-ico" aria-hidden="true">{{ music.playing ? '❚' : '▶' }}</span>
      </button>
      <button class="neo-btn neo-btn-sm neo-btn-quiet t-btn" type="button" aria-label="下一首" @click="next">
        <span class="neo-ico" aria-hidden="true">»</span>
      </button>
    </div>

    <div class="scrub">
      <span class="tm neo-mono">{{ fmt(music.time) }}</span>
      <input
        class="sl"
        type="range"
        min="0"
        step="0.1"
        :max="music.duration || 0"
        :value="music.time"
        :disabled="!music.duration"
        aria-label="播放进度"
        @input="seek(Number($event.target.value))"
      />
      <span class="tm neo-mono">{{ fmt(music.duration) }}</span>
    </div>

    <p class="lbl neo-mono">// LISTEN · {{ tracks.length }} 首</p>
    <ul class="q">
      <li v-for="(t, i) in tracks" :key="t.file">
        <button
          class="q-row"
          :class="{ on: isCur(i) }"
          type="button"
          :aria-current="isCur(i) ? 'true' : undefined"
          @click="onRow(i)"
        >
          <span class="q-no neo-mono" aria-hidden="true">{{ String(i + 1).padStart(2, '0') }}</span>
          <span class="q-tt">{{ t.title }}</span>
          <span class="q-ar neo-mono">{{ t.artist }}</span>
        </button>
      </li>
    </ul>

    <div class="vol">
      <span class="tm neo-mono">VOL</span>
      <input
        class="sl"
        type="range"
        min="0"
        max="1"
        step="0.05"
        :value="music.volume"
        aria-label="音量"
        @input="setVolume(Number($event.target.value))"
      />
    </div>
  </div>
</template>

<style scoped>
/* 贴在顶栏下沿、右对齐于那三枚图标之下。顶栏本身 position: fixed，
   所以这张卡跟着视口走，不受 fall 转场的包含块影响 */
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

/* ---- 当前曲 + 星轨符号 ---- */
.now {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.disc {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  fill: none;
  stroke: var(--signal);
  stroke-width: 1.4;
  stroke-linecap: round;
}

.disc .arcs {
  transform-box: fill-box;
  transform-origin: center;
}

.card.playing .disc .arcs {
  animation: spin 24s linear infinite;
}

.disc .core {
  fill: var(--hot);
  stroke: none;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.meta {
  min-width: 0;
}

.nt {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--fs-lg);
  font-weight: var(--fw-bold);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.na {
  margin: 0;
  color: var(--text-1);
  font-size: var(--fs-2xs);
}

/* ---- 走带 ---- */
.transport {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
}

.t-btn {
  min-width: 36px;
  padding: 0;
  justify-content: center;
}

.play {
  min-width: 44px;
}

/* ---- 进度 / 音量 ---- */
.scrub,
.vol {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.tm {
  flex-shrink: 0;
  font-size: var(--fs-3xs);
  color: var(--text-1);
}

.sl {
  flex: 1;
  min-width: 0;
  accent-color: var(--signal);
}

.sl:disabled {
  opacity: 0.4;
}

/* ---- 队列 ---- */
.lbl {
  margin: 0;
  color: var(--text-1);
  font-size: var(--fs-3xs);
  letter-spacing: 0.1em;
}

.q {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 168px;
  overflow-y: auto;
}

.q-row {
  display: grid;
  grid-template-columns: 3ch 1fr auto;
  align-items: baseline;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-1) var(--space-0);
  border: 0;
  border-top: 1px solid var(--line);
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.24s ease, color 0.24s;
}

.q-row:hover {
  background: color-mix(in srgb, var(--cold) 6%, transparent);
}

.q-row .q-no {
  font-size: var(--fs-3xs);
  color: var(--text-1);
}

.q-row .q-tt {
  font-family: var(--font-display);
  font-size: var(--fs-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.q-row .q-ar {
  font-size: var(--fs-3xs);
  color: var(--text-1);
}

/* 播放中那一首：红移，与顶栏按钮的 .music-btn.on 同一个记号 */
.q-row.on .q-tt,
.q-row.on .q-no {
  color: var(--hot);
}

@media (prefers-reduced-motion: reduce) {
  .card.playing .disc .arcs {
    animation: none;
  }
}
</style>
