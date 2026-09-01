<script setup>
// 读数式播放器：播放 content.playlist（/uploads/ 或 /audio/ 文件），不自动播放
import { computed, onMounted, ref, watch } from 'vue'
import { content } from '../lib/content.js'

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

onMounted(() => {
  if (audio.value) audio.value.volume = vol.value
})
watch(idx, () => {
  if (audio.value) audio.value.volume = vol.value
})
</script>

<template>
  <div v-if="list.length" class="player readout">
    <audio
      ref="audio"
      :src="cur?.file"
      @play="playing = true"
      @pause="playing = false"
      @ended="next"
    ></audio>
    <span class="p-title" :title="`${cur?.title || ''} ${cur?.artist || ''}`">
      {{ cur?.title || '--' }}<template v-if="cur?.artist"> · {{ cur.artist }}</template>
    </span>
    <button class="p-btn" type="button" :aria-label="playing ? '暂停' : '播放'" @click="toggle">
      {{ playing ? '❚' : '▶' }}
    </button>
    <button class="p-btn" type="button" aria-label="下一首" @click="next">»</button>
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
  gap: 10px;
  padding: 6px 12px;
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

.p-btn {
  background: none;
  border: none;
  color: var(--signal);
  cursor: pointer;
  font: inherit;
  letter-spacing: inherit;
  padding: 0 2px;
}

.p-vol {
  width: 64px;
  accent-color: var(--signal);
}
</style>
