<script setup>
// 读数式播放器：播放 content.playlist（/uploads/ 或 /audio/ 文件），不自动播放
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { content } from '../lib/content.js'
import { music } from '../lib/music.js'

const audio = ref(null)
const idx = ref(0)
const playing = ref(false)
const vol = ref(Number(localStorage.getItem('en-vol') ?? 0.8))

const list = computed(() => content.playlist || [])
const cur = computed(() => list.value[idx.value])

function toggle() {
  if (!cur.value || !audio.value) return
  if (playing.value) audio.value.pause()
  else audio.value.play()
}

function next() {
  if (!list.value.length) return
  idx.value = (idx.value + 1) % list.value.length
  if (playing.value && audio.value) audio.value.play()
}

function onVol(e) {
  vol.value = Number(e.target.value)
  localStorage.setItem('en-vol', String(vol.value))
  if (audio.value) audio.value.volume = vol.value
}

/* 与顶栏「音乐」按钮同步：接收外部开关请求，回播状态 */
function onExternalToggle() {
  toggle()
}

onMounted(() => {
  if (audio.value) audio.value.volume = vol.value
  addEventListener('en-music-toggle', onExternalToggle)
})
onUnmounted(() => {
  removeEventListener('en-music-toggle', onExternalToggle)
})
watch(playing, (v) => {
  music.playing = v
})
watch(list, (v) => {
  music.available = v.length > 0
}, { immediate: true })
watch(idx, () => {
  if (audio.value) audio.value.volume = vol.value
})
</script>

<template>
  <div v-if="list.length" class="player readout">
    <audio
      ref="audio"
      :src="cur?.file"
      preload="none"
      @play="playing = true"
      @pause="playing = false"
      @ended="next"
    ></audio>
    <span class="p-title" :title="`${cur?.title || ''} ${cur?.artist || ''}`">
      {{ cur?.title || '--' }}<template v-if="cur?.artist"> · {{ cur.artist }}</template>
    </span>
    <button
      class="neo-btn neo-btn-sm neo-btn-quiet p-btn"
      type="button"
      :aria-label="playing ? '暂停' : '播放'"
      @click="toggle"
    >
      <span class="neo-ico" aria-hidden="true">{{ playing ? '❚' : '▶' }}</span>
    </button>
    <button class="neo-btn neo-btn-sm neo-btn-quiet p-btn" type="button" aria-label="下一首" @click="next">
      <span class="neo-ico" aria-hidden="true">»</span>
    </button>
    <input
      class="p-vol"
      type="range"
      min="0"
      max="1"
      step="0.05"
      :value="vol"
      aria-label="音量"
      @input="onVol"
    />
  </div>
</template>

<style scoped>
.player {
  position: fixed;
  right: var(--space-3);
  bottom: var(--space-2);
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--line);
  background: var(--ink-0);
  z-index: 50;
  max-width: min(92vw, 420px);
}

.p-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 180px;
}

.p-vol {
  width: 64px;
  accent-color: var(--signal);
}

/* 版面钩子：播放/下一首是单字符按钮，仅触控设备需要加宽点击区；
   按钮外观（含 44px 高度）全部来自 .neo-btn 与 neo.css 的 coarse 规则 */
@media (pointer: coarse) {
  .p-btn {
    min-width: 44px;
  }
}
</style>
