<script setup>
// 播放器卡片：顶栏「音乐」按钮点开的那一张，全站唯一的播放界面。
// 本身不持有 <audio>——状态与操作全在 lib/music.js 那台引擎里，这里只做取景器。
// 与设置卡 / 搜索卡同一模子：卡头 + 关闭键、Esc 关、点卡外关、焦点陷阱、锁 body 滚动。
//
// 2026-11-14 重做界面（作者「顺便把播放器界面改了」）。概念跟着全站走：**这是一台曝光控制台**，
// 不是一个通用音乐播放器。所以：
//   · 唱盘 = 首页那片星轨的缩影，绕同一枚天极旋转，播放时才转（暂停即盖上镜头盖）；
//   · 进度 = 唱盘外圈那道曝光弧，可拖可点可键盘，读数走等宽仪器体；
//   · 波形 = 曲目自己的振幅指纹（由文件名派生的确定性序列，不是随机噪声，同一首每次一致）；
//   · 音量 = 一枚真正的静音开关 + 滑杆，静音记状态、再按恢复原音量。
// 冷暖分工不变：冷蓝管交互（进度/焦点/主按钮），朱砂只报状态（当前曲、播放中）。
import { music, tracks, current, playIndex, toggleMusic, next, prev, seek, setVolume } from '../lib/music.js'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { trapFocus } from '../lib/focus.js'
import { N } from '../data/narrative.js'

const emit = defineEmits(['close'])
const cardEl = ref(null)

// 载入与失败是两种状态：前者等元数据，后者是文件真的取不到，别让界面一直转圈
const status = computed(() => {
  if (music.error) return N.player.error
  if (music.loading) return N.player.loading
  return ''
})

const pct = computed(() =>
  music.duration > 0 ? Math.min(100, Math.max(0, (music.time / music.duration) * 100)) : 0
)
const remain = computed(() =>
  music.duration > 0 ? '-' + fmt(Math.max(0, music.duration - music.time)) : '--:--'
)

function fmt(s) {
  if (!Number.isFinite(s) || s < 0) return '--:--'
  const n = Math.floor(s)
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`
}

/* ---- 环形进度：唱盘外圈那道弧 ---- */
// 渐变 id 取一个站级专属名：全站只有这一张播放界面（顶栏那枚按钮开合它），
// 同一时刻只可能挂载一份，所以固定 id 不会与谁重名；首页波脊用的是 #wave-ink，不冲突。
// 不用自增计数器——<script setup> 的顶层代码每个实例都重跑一遍，计数器会归零，
// 那样写出来的"唯一"是假的。
const gradId = 'en-player-grad'
const RING_R = 52 // 进度环半径（viewBox 120×120，圆心 60,60）
const RING_C = 2 * Math.PI * RING_R
const ringDash = computed(() => `${(pct.value / 100) * RING_C} ${RING_C}`)
const knob = computed(() => {
  const a = (pct.value / 100) * Math.PI * 2 - Math.PI / 2
  return { x: 60 + Math.cos(a) * RING_R, y: 60 + Math.sin(a) * RING_R }
})
/* 唱盘上的星轨：绕同一枚天极的同心弧，半径与起始角都错开。
   原先手写七条 path 全从正上方起笔、顺时针扫，叠起来读成一枚「WiFi 信号」图标——
   与全站的星轨概念正好相反。现在按黄金角铺开起始角、半径等距递增，
   每根弧长各不相同（这里可以不同：唱盘是装饰缩影，不是那张要守恒的底片）。 */
const PLATTER_ARCS = (() => {
  const polar = (r, deg) => {
    const a = ((deg - 90) * Math.PI) / 180
    return [60 + Math.cos(a) * r, 60 + Math.sin(a) * r]
  }
  const out = []
  const n = 9
  for (let i = 0; i < n; i++) {
    const r = 11 + i * 3.6
    const start = (i * 137.508) % 360
    const len = 74 + ((i * 53) % 150)
    const [x1, y1] = polar(r, start)
    const [x2, y2] = polar(r, start + len)
    out.push({
      d: `M${x1.toFixed(2)} ${y1.toFixed(2)}A${r.toFixed(2)} ${r.toFixed(2)} 0 ${len > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
      w: i % 3 === 0 ? 1.9 : 1.2,
      o: i % 3 === 0 ? 0.95 : 0.6,
    })
  }
  return out
})()

const ringEl = ref(null)
let dragging = false

// 把指针位置换算成 0..1 的进度：从正上方起算、顺时针
function ratioFrom(e) {
  const el = ringEl.value
  if (!el) return 0
  const r = el.getBoundingClientRect()
  const dx = e.clientX - (r.left + r.width / 2)
  const dy = e.clientY - (r.top + r.height / 2)
  let a = Math.atan2(dy, dx) + Math.PI / 2
  if (a < 0) a += Math.PI * 2
  return a / (Math.PI * 2)
}
function seekTo(e) {
  if (!music.duration) return
  seek(ratioFrom(e) * music.duration)
}
function onRingDown(e) {
  if (!music.duration) return
  dragging = true
  ringEl.value?.setPointerCapture?.(e.pointerId)
  seekTo(e)
}
function onRingMove(e) {
  if (dragging) seekTo(e)
}
function onRingUp(e) {
  if (!dragging) return
  dragging = false
  ringEl.value?.releasePointerCapture?.(e.pointerId)
}
function onRingKey(e) {
  if (!music.duration) return
  const step = e.shiftKey ? 15 : 5
  if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
    e.preventDefault()
    seek(Math.min(music.duration, music.time + step))
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
    e.preventDefault()
    seek(Math.max(0, music.time - step))
  } else if (e.key === 'Home') {
    e.preventDefault()
    seek(0)
  } else if (e.key === 'End') {
    e.preventDefault()
    seek(Math.max(0, music.duration - 1))
  }
}

/* ---- 波形：曲目自己的振幅指纹 ----
   本地 mp3 没有解码后的 PCM（也不该为一条装饰去解码 6.8MB），所以用**由文件名派生的确定性
   序列**：同一首每次打开完全一致，换一首形状就不同。它是这首曲子的视觉签名，不是假数据冒充
   真振幅——所以标注为「指纹」而不是「频谱」，也不随播放跳动（跳动的只有已播过的那一段颜色）。 */
const BARS = 56
const wave = computed(() => {
  const key = current.value?.file || 'none'
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const out = []
  for (let i = 0; i < BARS; i++) {
    h ^= h << 13
    h ^= h >>> 17
    h ^= h << 5
    h |= 0
    const u = ((h >>> 0) % 1000) / 1000
    // 两端收、中段起：读成一段乐句而不是白噪声
    const env = 0.34 + 0.66 * Math.sin((Math.PI * (i + 0.5)) / BARS)
    out.push(Math.max(0.12, Math.min(1, (0.3 + u * 0.7) * env)))
  }
  return out
})
const waveEl = ref(null)
function onWave(e) {
  if (!music.duration || !waveEl.value) return
  const r = waveEl.value.getBoundingClientRect()
  const u = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
  seek(u * music.duration)
}

/* ---- 静音：记状态、再按恢复 ---- */
let beforeMute = 0.8
const muted = computed(() => music.volume <= 0.0001)
function toggleMute() {
  if (muted.value) setVolume(beforeMute > 0.02 ? beforeMute : 0.8)
  else {
    beforeMute = music.volume
    setVolume(0)
  }
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
  // 空格切播放：焦点不在滑杆/按钮上时才接管，免得抢掉原生控件的行为
  if (e.key === ' ' || e.code === 'Space') {
    const t = e.target
    const tag = t?.tagName
    if (tag === 'INPUT' || tag === 'BUTTON' || tag === 'TEXTAREA' || t?.isContentEditable) return
    e.preventDefault()
    toggleMusic()
  }
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
  document.body.style.overflow = 'hidden'
  trap = trapFocus(cardEl.value)
})
onUnmounted(() => {
  removeEventListener('keydown', onKey)
  removeEventListener('pointerdown', onDoc, true)
  document.body.style.overflow = ''
  trap?.()
})
</script>

<template>
  <div
    ref="cardEl"
    id="en-player"
    class="card"
    :class="{ playing: music.playing, err: music.error }"
    role="dialog"
    aria-labelledby="player-ttl"
    :aria-busy="music.loading"
  >
    <div class="head">
      <div class="brand">
        <span class="dot" :class="{ on: music.playing }" aria-hidden="true"></span>
        <h2 id="player-ttl" class="ttl">{{ N.player.title }}</h2>
        <span class="sub en-mono">{{ N.player.sub }}</span>
      </div>
      <button class="close" type="button" :aria-label="N.player.close" @click="emit('close')">
        <span class="en-ico" aria-hidden="true">✕</span>
      </button>
    </div>

    <!-- 唱盘 + 环形进度：整块是可拖的 seek 控件，也是键盘可操作的 slider -->
    <div class="deck">
      <div
        ref="ringEl"
        class="ring"
        :class="{ live: !!music.duration }"
        role="slider"
        :tabindex="music.duration ? 0 : -1"
        :aria-label="N.player.progress"
        :aria-valuemin="0"
        :aria-valuemax="Math.round(music.duration || 0)"
        :aria-valuenow="Math.round(music.time)"
        :aria-valuetext="`${fmt(music.time)} / ${fmt(music.duration)}`"
        :aria-disabled="!music.duration"
        @pointerdown="onRingDown"
        @pointermove="onRingMove"
        @pointerup="onRingUp"
        @pointercancel="onRingUp"
        @keydown="onRingKey"
      >
        <svg class="dial" viewBox="0 0 120 120" aria-hidden="true">
          <defs>
            <linearGradient :id="gradId" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="var(--cold)" />
              <stop offset="1" stop-color="var(--wave-ink-top)" />
            </linearGradient>
          </defs>
          <!-- 刻度环：24 道细齿，像相机的曝光刻度 -->
          <g class="ticks">
            <line
              v-for="k in 24"
              :key="k"
              x1="60"
              y1="4"
              x2="60"
              :y2="k % 6 === 1 ? 10 : 7"
              :transform="`rotate(${(k - 1) * 15} 60 60)`"
            />
          </g>
          <circle class="track" cx="60" cy="60" :r="RING_R" />
          <circle
            class="prog"
            cx="60"
            cy="60"
            :r="RING_R"
            :stroke-dasharray="ringDash"
            :stroke="`url(#${gradId})`"
          />
          <!-- 星轨唱盘：与首页同一枚天极的缩影，播放时才转 -->
          <g class="platter">
            <circle class="p-ring" cx="60" cy="60" r="40" />
            <g class="arcs">
              <path
                v-for="(a, i) in PLATTER_ARCS"
                :key="i"
                :d="a.d"
                :stroke-width="a.w"
                :opacity="a.o"
              />
            </g>
            <circle class="hub" cx="60" cy="60" r="6.4" />
            <circle class="core" cx="60" cy="60" r="2.4" />
          </g>
          <circle v-if="music.duration" class="knob" :cx="knob.x" :cy="knob.y" r="4.2" />
        </svg>
      </div>

      <div class="now">
        <p class="eyebrow en-mono">
          {{ music.started ? `TRACK ${String(music.idx + 1).padStart(2, '0')} / ${String(tracks.length).padStart(2, '0')}` : 'STANDBY' }}
        </p>
        <p class="nt" :title="current?.title">{{ music.started ? current?.title || '--' : N.player.standby }}</p>
        <p v-if="status" class="na en-mono" :class="{ bad: music.error }" role="status">{{ status }}</p>
        <p v-else-if="music.started && current?.artist" class="na en-mono">{{ current.artist }}</p>
        <p v-else class="na en-mono">{{ N.player.hint }}</p>
        <p class="times en-mono">
          <span class="cur">{{ fmt(music.time) }}</span>
          <span class="sep" aria-hidden="true">/</span>
          <span class="dur">{{ fmt(music.duration) }}</span>
          <span class="left">{{ N.player.remain }} {{ remain }}</span>
        </p>
      </div>
    </div>

    <!-- 波形指纹：已播过的一段染冷色，可点跳转 -->
    <div
      ref="waveEl"
      class="wave"
      :class="{ live: !!music.duration }"
      role="presentation"
      @pointerdown="onWave"
    >
      <span
        v-for="(v, i) in wave"
        :key="i"
        class="bar"
        :class="{ done: (i / BARS) * 100 <= pct }"
        :style="{ height: `${Math.round(v * 100)}%` }"
      ></span>
    </div>

    <div class="transport">
      <button class="t-btn ghost" type="button" :aria-label="N.player.prev" @click="prev">
        <svg class="t-ico" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18.2 6.2 9.4 12l8.8 5.8V6.2Z" fill="currentColor" stroke="none" />
          <path d="M5.8 6v12" />
        </svg>
      </button>
      <button
        class="t-btn play"
        type="button"
        :aria-label="music.playing ? N.player.pause : N.player.play"
        :aria-pressed="music.playing"
        @click="toggleMusic"
      >
        <svg v-if="music.playing" class="t-ico big" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="7" y="5.4" width="3.4" height="13.2" rx="1" fill="currentColor" stroke="none" />
          <rect x="13.6" y="5.4" width="3.4" height="13.2" rx="1" fill="currentColor" stroke="none" />
        </svg>
        <svg v-else class="t-ico big" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8.2 5.4v13.2L19 12 8.2 5.4Z" fill="currentColor" stroke="none" />
        </svg>
      </button>
      <button class="t-btn ghost" type="button" :aria-label="N.player.next" @click="next">
        <svg class="t-ico" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5.8 6.2 14.6 12l-8.8 5.8V6.2Z" fill="currentColor" stroke="none" />
          <path d="M18.2 6v12" />
        </svg>
      </button>
    </div>

    <div class="vol">
      <button
        class="mute"
        type="button"
        :class="{ off: muted }"
        :aria-label="muted ? N.player.unmute : N.player.mute"
        :aria-pressed="muted"
        @click="toggleMute"
      >
        <svg class="v-ico" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 9.5h3.4L12 5.6v12.8L7.4 14.5H4z" fill="currentColor" stroke="none" />
          <template v-if="!muted">
            <path d="M15.4 9.2a4 4 0 0 1 0 5.6" />
            <path d="M17.9 6.9a7.4 7.4 0 0 1 0 10.2" />
          </template>
          <template v-else>
            <path d="M15.6 9.6l4.8 4.8M20.4 9.6l-4.8 4.8" />
          </template>
        </svg>
      </button>
      <input
        class="sl"
        type="range"
        min="0"
        max="1"
        step="0.05"
        :value="music.volume"
        :aria-label="N.player.volume"
        :style="{ '--fill': `${Math.round(music.volume * 100)}%` }"
        @input="setVolume(Number($event.target.value))"
      />
      <span class="vn en-mono">{{ Math.round(music.volume * 100) }}</span>
    </div>

    <div class="q-head">
      <p class="lbl en-mono">// {{ N.player.queue }} · {{ tracks.length }} 首</p>
      <p class="hint en-mono">{{ N.player.keys }}</p>
    </div>
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
            <span class="q-ar en-mono">{{ t.artist }}</span>
          </span>
          <span class="q-mark" aria-hidden="true">
            <span v-if="isCur(i)" class="q-eq" :class="{ on: music.playing }">
              <i></i><i></i><i></i>
            </span>
            <svg v-else class="q-play" viewBox="0 0 24 24">
              <path d="M9 6.4v11.2L18 12 9 6.4Z" fill="currentColor" stroke="none" />
            </svg>
          </span>
        </button>
      </li>
    </ul>
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
  width: 360px;
  max-width: calc(100vw - var(--space-3) * 2);
  /* 矮视口（横屏手机）里卡片不跟着被裁：卡内自己滚 */
  max-height: calc(100vh - var(--space-5));
  max-height: calc(100dvh - var(--space-5));
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: var(--space-3);
  border: 1px solid var(--card-brd);
  border-radius: var(--r-md);
  /* 卡面自己一层极淡的冷色氛围，让"控制台"读成一块仪器面板而不是一张白纸 */
  background:
    radial-gradient(120% 80% at 82% -10%, color-mix(in srgb, var(--cold) 9%, transparent), transparent 62%),
    var(--ink-0);
  box-shadow: 0 22px 60px -34px var(--shadow, rgba(0, 0, 0, 0.6));
}

.card.err {
  border-color: color-mix(in srgb, var(--hot) 45%, var(--card-brd));
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.brand {
  display: flex;
  align-items: baseline;
  gap: var(--space-1);
  min-width: 0;
}

/* 状态灯：播放中朱砂常亮并缓慢呼吸，暂停时收成暗点 */
.dot {
  width: 7px;
  height: 7px;
  flex: none;
  border-radius: 50%;
  background: var(--text-1);
  /* 与基线对齐的光学微调走 margin，不用 translateY(-1px)——那个字面量在
     motion-feedback 的旧位移禁令名单里（全站统一 --nudge/--lift 两档） */
  margin-bottom: 0.12em;
}

.dot.on {
  background: var(--hot);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--hot) 22%, transparent);
  animation: breathe 2.4s ease-in-out infinite;
}

@keyframes breathe {
  0%,
  100% {
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--hot) 22%, transparent);
  }
  50% {
    box-shadow: 0 0 0 5px color-mix(in srgb, var(--hot) 10%, transparent);
  }
}

.ttl {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--fs-lg);
  font-weight: var(--fw-bold);
  letter-spacing: 0.04em;
}

.sub {
  color: var(--text-1);
  font-size: var(--fs-3xs);
}

.close {
  display: inline-grid;
  place-items: center;
  width: 28px;
  height: 28px;
  flex: none;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--r-sm);
  background: none;
  color: var(--text-1);
  cursor: pointer;
  transition: color var(--dur-fast) ease, border-color var(--dur-fast) ease;
}

.close:hover {
  color: var(--text-0);
  border-color: var(--card-brd-hover);
}

/* ---- 唱盘 + 曲目 ---- */
.deck {
  display: grid;
  grid-template-columns: 132px minmax(0, 1fr);
  align-items: center;
  gap: var(--space-2);
}

.ring {
  position: relative;
  width: 132px;
  height: 132px;
  border-radius: 50%;
  outline-offset: 4px;
  touch-action: none;
}

.ring.live {
  cursor: pointer;
}

.dial {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.ticks line {
  stroke: var(--line);
  stroke-width: 1.2;
  stroke-linecap: round;
}

.track {
  fill: none;
  stroke: var(--line);
  stroke-width: 3;
}

.prog {
  fill: none;
  stroke-width: 3.4;
  stroke-linecap: round;
  transform: rotate(-90deg);
  transform-origin: 60px 60px;
  transition: stroke-dasharray var(--dur-fast) linear;
}

.platter {
  fill: none;
  stroke-linecap: round;
}

.p-ring {
  stroke: var(--line);
  stroke-width: 1;
}

.arcs {
  stroke: var(--signal);
  stroke-width: 1.5;
  transform-box: fill-box;
  transform-origin: center;
  opacity: 0.75;
}

.card.playing .arcs {
  animation: spin 28s linear infinite;
  opacity: 1;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.hub {
  fill: color-mix(in srgb, var(--cold) 12%, transparent);
  stroke: var(--line);
  stroke-width: 1;
}

.core {
  fill: var(--hot);
  stroke: none;
}

.knob {
  fill: var(--cold);
  stroke: var(--ink-0);
  stroke-width: 2;
}

.ring.live:hover .knob {
  r: 5.2;
}

/* 时间读数：原先压在唱盘正中下方，与弧线叠在一起读不清；现在归到曲目信息区，
   与剩余时长同一行。等宽数字 + tabular-nums，秒跳时不抖宽。 */
.times {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 3px;
  margin: var(--space-1) 0 0;
  font-size: var(--fs-3xs);
  font-variant-numeric: tabular-nums;
}

.times .cur {
  color: var(--text-0);
}

.times .sep,
.times .dur {
  color: var(--text-1);
}

.times .left {
  margin-left: var(--space-1);
  color: var(--text-1);
}

.now {
  min-width: 0;
}

.eyebrow {
  margin: 0 0 var(--space-0);
  color: var(--cold);
  font-size: var(--fs-3xs);
  letter-spacing: 0.1em;
}

.nt {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--fs-xl);
  font-weight: var(--fw-bold);
  line-height: var(--lh-tight);
  /* 曲名允许两行，长中文标题不再被截成半句 */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.na {
  margin: var(--space-0) 0 0;
  color: var(--text-1);
  font-size: var(--fs-2xs);
}

.na.bad {
  color: var(--hot);
}

/* ---- 波形指纹 ---- */
.wave {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 34px;
  padding: var(--space-0) 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}

.wave.live {
  cursor: pointer;
}

.bar {
  flex: 1 1 0;
  min-width: 0;
  border-radius: 1px;
  background: color-mix(in srgb, var(--text-1) 34%, transparent);
  transition: background-color var(--dur-fast) ease;
}

.bar.done {
  background: var(--cold);
}

.wave.live:hover .bar {
  background: color-mix(in srgb, var(--text-1) 52%, transparent);
}

.wave.live:hover .bar.done {
  background: var(--cold);
}

/* ---- 走带 ---- */
.transport {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
}

.t-btn {
  display: inline-grid;
  place-items: center;
  width: 44px;
  min-width: 44px;
  height: 44px;
  min-height: 44px;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 50%;
  background: none;
  color: var(--text-1);
  cursor: pointer;
  transition:
    color var(--dur-fast) ease,
    border-color var(--dur-fast) ease,
    background-color var(--dur-fast) ease;
}

.t-btn.ghost:hover {
  color: var(--cold);
  border-color: var(--card-brd-hover);
  background: color-mix(in srgb, var(--cold) 7%, transparent);
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

.t-ico.big {
  width: 22px;
  height: 22px;
}

/* 主动作：全站唯一强调色（冷蓝）实心，朱砂只留给"当前曲/播放中"的记号 */
.play {
  width: 56px;
  min-width: 56px;
  height: 56px;
  min-height: 56px;
  border-color: transparent;
  background: var(--cold);
  color: var(--ink-0);
  box-shadow: 0 8px 24px -12px var(--cold);
}

.play:hover {
  color: var(--ink-0);
  border-color: transparent;
  box-shadow: 0 0 0 1px var(--cold), 0 10px 30px -10px var(--cold);
}

.play:active {
  color: var(--ink-0);
}

/* ---- 音量：静音开关 + 滑杆 + 读数 ---- */
.vol {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) 3ch;
  align-items: center;
  gap: var(--space-1);
}

.mute {
  display: inline-grid;
  place-items: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--r-sm);
  background: none;
  color: var(--text-1);
  cursor: pointer;
  transition: color var(--dur-fast) ease, border-color var(--dur-fast) ease;
}

.mute:hover {
  color: var(--cold);
  border-color: var(--line);
}

.mute.off {
  color: var(--hot);
}

.v-ico {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.vn {
  color: var(--text-1);
  font-size: var(--fs-3xs);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

/* 滑杆：轨道自己画，已走过的一段染冷色（--fill 由音量写进来）。
   原生 thumb 保留——自造 thumb 要连键盘与触控一起重写，不划算。 */
.sl {
  width: 100%;
  min-width: 0;
  height: 20px;
  margin: 0;
  background: none;
  cursor: pointer;
  accent-color: var(--cold);
  -webkit-appearance: none;
  appearance: none;
}

.sl::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: var(--r-pill);
  background: linear-gradient(
    to right,
    var(--cold) 0 var(--fill, 80%),
    color-mix(in srgb, var(--text-1) 30%, transparent) var(--fill, 80%) 100%
  );
}

.sl::-moz-range-track {
  height: 4px;
  border-radius: var(--r-pill);
  background: color-mix(in srgb, var(--text-1) 30%, transparent);
}

.sl::-moz-range-progress {
  height: 4px;
  border-radius: var(--r-pill);
  background: var(--cold);
}

.sl::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 13px;
  height: 13px;
  margin-top: -4.5px;
  border: 2px solid var(--ink-0);
  border-radius: 50%;
  background: var(--cold);
}

.sl::-moz-range-thumb {
  width: 13px;
  height: 13px;
  border: 2px solid var(--ink-0);
  border-radius: 50%;
  background: var(--cold);
}

/* ---- 曲单 ---- */
.q-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-1);
}

.lbl {
  margin: 0;
  color: var(--text-1);
  font-size: var(--fs-3xs);
  letter-spacing: 0.1em;
}

.hint {
  margin: 0;
  color: var(--text-1);
  font-size: var(--fs-3xs);
  opacity: 0.75;
}

.q {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 176px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.q-row {
  display: grid;
  grid-template-columns: 3ch minmax(0, 1fr) 20px;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-1) var(--space-1);
  border: 0;
  border-top: 1px solid var(--line);
  border-radius: var(--r-sm);
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color var(--dur-fast) ease, color var(--dur-fast) ease;
}

.q-row:hover {
  background: color-mix(in srgb, var(--cold) 7%, transparent);
}

.q-row .q-no {
  font-size: var(--fs-3xs);
  color: var(--text-1);
  font-variant-numeric: tabular-nums;
}

.q-tt {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.q-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-display);
  font-size: var(--fs-md);
}

.q-ar {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-1);
  font-size: var(--fs-3xs);
}

.q-mark {
  display: inline-grid;
  place-items: center;
  width: 20px;
  height: 20px;
}

.q-play {
  width: 14px;
  height: 14px;
  color: var(--text-1);
  opacity: 0;
  transition: opacity var(--dur-fast) ease;
}

.q-row:hover .q-play {
  opacity: 1;
  color: var(--cold);
}

/* 当前曲的播放记号：三根小柱，暂停时停住但不消失 */
.q-eq {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  height: 12px;
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

/* 播放中那一首：朱砂记号 + 一条冷色左缘，与顶栏 .music-btn.on 同一套语义 */
.q-row.on {
  background: color-mix(in srgb, var(--hot) 7%, transparent);
  box-shadow: inset 2px 0 0 var(--hot);
}

.q-row.on .q-name,
.q-row.on .q-no {
  color: var(--hot);
}

@media (max-width: 720px) {
  .card {
    right: var(--space-2);
    left: var(--space-2);
    width: auto;
    padding: var(--space-2);
  }
  .deck {
    grid-template-columns: 112px minmax(0, 1fr);
  }
  .ring {
    width: 112px;
    height: 112px;
  }
}

@media (pointer: coarse) {
  .sl {
    height: 32px;
  }
  .close {
    position: relative;
  }
  .close::before {
    content: '';
    position: absolute;
    inset: -8px;
  }
  .mute {
    width: 44px;
    height: 44px;
  }
  .q-row {
    min-height: 48px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .card.playing .arcs {
    animation: none;
  }
  .q-eq.on i {
    animation: none;
  }
  .dot.on {
    animation: none;
  }
  .prog {
    transition: none;
  }
}
</style>
