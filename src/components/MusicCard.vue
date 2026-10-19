<script setup>
// 播放器卡片：顶栏「音乐」按钮点开的那一张，全站唯一的播放界面
//（右下悬浮读数条已撤）。本身不持有 <audio>——状态与操作全在 lib/music.js 那台引擎里。
// 与设置卡 / 搜索卡同一模子：卡头 + 关闭键、Esc 关、点卡外关、焦点陷阱、贴在顶栏下沿右对齐。
import { music, tracks, current, playIndex, toggleMusic, next, prev, seek, setVolume } from '../lib/music.js'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { trapFocus } from '../lib/focus.js'

const emit = defineEmits(['close'])
const cardEl = ref(null)

// 载入与失败是两种状态：前者等元数据，后者是文件真的取不到，别让界面一直转圈
const status = computed(() => {
  if (music.error) return '无法播放 · 检查音频文件'
  if (music.loading) return '载入中…'
  return ''
})

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
  <div
    ref="cardEl"
    id="en-player"
    class="card"
    :class="{ playing: music.playing }"
    role="dialog"
    aria-labelledby="player-ttl"
    :aria-busy="music.loading"
  >
    <div class="head">
      <h2 id="player-ttl" class="ttl">播放器</h2>
      <button class="close" type="button" aria-label="关闭播放器" @click="emit('close')">
        <span class="en-ico" aria-hidden="true">✕</span>
      </button>
    </div>

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
        <p v-if="status" class="na en-mono" :class="{ err: music.error }" role="status">{{ status }}</p>
        <p v-else-if="music.started && current?.artist" class="na en-mono">{{ current.artist }}</p>
      </div>
    </div>

    <div class="transport">
      <button class="en-btn t-btn" type="button" aria-label="上一首" @click="prev">
        <svg class="t-ico" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18.2 6.2 9.4 12l8.8 5.8V6.2Z" fill="currentColor" stroke="none" />
          <path d="M5.8 6v12" />
        </svg>
      </button>
      <button
        class="en-btn t-btn play"
        type="button"
        :aria-label="music.playing ? '暂停' : '播放'"
        @click="toggleMusic"
      >
        <svg v-if="music.playing" class="t-ico" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="7" y="5.4" width="3.4" height="13.2" rx="1" fill="currentColor" stroke="none" />
          <rect x="13.6" y="5.4" width="3.4" height="13.2" rx="1" fill="currentColor" stroke="none" />
        </svg>
        <svg v-else class="t-ico" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8.2 5.4v13.2L19 12 8.2 5.4Z" fill="currentColor" stroke="none" />
        </svg>
      </button>
      <button class="en-btn t-btn" type="button" aria-label="下一首" @click="next">
        <svg class="t-ico" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5.8 6.2 14.6 12l-8.8 5.8V6.2Z" fill="currentColor" stroke="none" />
          <path d="M18.2 6v12" />
        </svg>
      </button>
    </div>

    <div class="scrub">
      <span class="tm en-mono">{{ fmt(music.time) }}</span>
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
      <span class="tm en-mono">{{ fmt(music.duration) }}</span>
    </div>

    <p class="lbl en-mono">// LISTEN · {{ tracks.length }} 首</p>
    <ul class="q">
      <li v-for="(t, i) in tracks" :key="t.file">
        <button
          class="q-row"
          :class="{ on: isCur(i) }"
          type="button"
          :aria-current="isCur(i) ? 'true' : undefined"
          @click="onRow(i)"
        >
          <span class="q-no en-mono" aria-hidden="true">{{ String(i + 1).padStart(2, '0') }}</span>
          <span class="q-tt">
            <span class="q-name">{{ t.title }}</span>
            <span v-if="isCur(i)" class="q-eq" :class="{ on: music.playing }" aria-hidden="true">
              <i></i><i></i><i></i>
            </span>
          </span>
          <span class="q-ar en-mono">{{ t.artist }}</span>
        </button>
      </li>
    </ul>

    <div class="vol">
      <span class="tm en-mono">VOL</span>
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
      <span class="tm" aria-hidden="true"></span>
    </div>
  </div>
</template>

<style scoped>
/* 贴在顶栏下沿、右对齐于那四枚图标之下。顶栏本身 position: fixed，
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
  /* 矮视口（横屏手机）里卡片不跟着被裁：卡内自己滚，队列仍保留自己的滚动区 */
  max-height: calc(100vh - var(--space-5));
  max-height: calc(100dvh - var(--space-5));
  overflow-y: auto;
  overscroll-behavior: contain;
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

.na.err {
  color: var(--hot);
}

/* ---- 走带：三枚等大热区，图标与顶栏同一套 1.6px 描边 ---- */
.transport {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
}

.t-btn {
  width: 44px;
  min-width: 44px;
  height: 44px;
  min-height: 44px;
  padding: 0;
  border: 1px solid transparent;
  color: var(--text-1);
}

.t-btn:hover {
  color: var(--cold);
  border-color: var(--line);
}

.t-ico {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* 主动作回到全站唯一强调色（冷蓝）；红色只留作"当前曲"的小记号 */
.play {
  width: 48px;
  min-width: 48px;
  height: 48px;
  min-height: 48px;
  border-color: transparent;
  background: var(--cold);
  color: var(--ink-0);
}

.play:hover,
.play:active {
  color: var(--ink-0);
}

.play:hover {
  border-color: transparent;
  box-shadow: 0 0 0 1px var(--cold), 0 8px 26px -10px var(--cold);
}

/* ---- 进度 / 音量：两行同一张栅格，滑杆起止点对齐 ---- */
.scrub,
.vol {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-1);
}

.tm {
  min-width: 4.5ch;
  font-size: var(--fs-3xs);
  color: var(--text-1);
  font-variant-numeric: tabular-nums;
}

.scrub .tm:last-child {
  text-align: right;
}

.sl {
  width: 100%;
  min-width: 0;
  height: 20px;
  accent-color: var(--cold);
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
  transition: background-color var(--dur-fast) ease, color var(--dur-fast);
}

.q-row:hover {
  background: color-mix(in srgb, var(--cold) 6%, transparent);
}

.q-row .q-no {
  font-size: var(--fs-3xs);
  color: var(--text-1);
}

.q-tt {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  min-width: 0;
  font-family: var(--font-display);
  font-size: var(--fs-sm);
}

.q-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 当前曲的播放记号：三根小柱，暂停时停住但不消失 */
.q-eq {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  height: 11px;
  flex: none;
}

.q-eq i {
  width: 2px;
  height: 100%;
  border-radius: 1px;
  background: var(--hot);
  transform-origin: bottom;
}

.q-eq i:nth-child(1) {
  transform: scaleY(0.45);
}

.q-eq i:nth-child(2) {
  transform: scaleY(0.8);
}

.q-eq i:nth-child(3) {
  transform: scaleY(0.6);
}

.q-eq.on i {
  animation: eq 0.9s ease-in-out infinite;
}

.q-eq.on i:nth-child(2) {
  animation-delay: -0.45s;
  animation-duration: 1.1s;
}

.q-eq.on i:nth-child(3) {
  animation-delay: -0.2s;
  animation-duration: 0.75s;
}

@keyframes eq {
  0%,
  100% {
    transform: scaleY(0.4);
  }
  50% {
    transform: scaleY(1);
  }
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

@media (pointer: coarse) {
  .sl {
    height: 32px;
  }
  /* 28px 的关闭键保持原样，热区用不可见的 ::before 撑到 44×44 */
  .close {
    position: relative;
  }
  .close::before {
    content: '';
    position: absolute;
    inset: -8px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .card.playing .disc .arcs {
    animation: none;
  }
  .q-eq.on i {
    animation: none;
  }
}
</style>
