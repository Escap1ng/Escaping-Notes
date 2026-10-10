// 播放器引擎：全站唯一的 <audio> 与它的状态。顶栏「音乐」按钮、右下悬浮读数条、
// /records 的在线听歌模块读写同一个 `music`——任一处按下播放，其余几处的高亮同时跟上。
// 曲目来自 content.playlist（/admin 的 PLAYLIST 块，或 src/config/music.js 种子）。
import { computed, reactive, watch } from 'vue'
import { content } from './content.js'
import { KEYS, read, write } from './storage.js'

export const music = reactive({
  playing: false,
  available: false,
  started: false, // 这一台还没被人按下过：没按下就没有"当前曲"，idx 只是下一次要播的下标
  idx: 0, // 当前曲目在 tracks 里的下标
  time: 0,
  duration: 0, // 0 = 元数据还没到（preload 只在装填 src 后才发生）
  volume: Number(read(KEYS.volume, '0.8')),
})

export const tracks = computed(() => (Array.isArray(content.playlist) ? content.playlist : []))
export const current = computed(() => tracks.value[music.idx] || null)

watch(
  tracks,
  (v) => {
    music.available = v.length > 0
  },
  { immediate: true }
)

let el = null
let loaded = -1 // el.src 里装的是第几条；-1 = 从没装填过

function ensure() {
  if (el || typeof Audio === 'undefined') return el
  el = new Audio()
  el.preload = 'metadata'
  el.volume = music.volume
  el.addEventListener('play', () => {
    music.playing = true
  })
  el.addEventListener('pause', () => {
    music.playing = false
  })
  el.addEventListener('ended', () => next())
  el.addEventListener('timeupdate', () => {
    music.time = el.currentTime
  })
  el.addEventListener('loadedmetadata', () => {
    music.duration = Number.isFinite(el.duration) ? el.duration : 0
  })
  // 文件取不到（404、镜像缺料）：状态收回未播放，让界面亮着而不是卡在播放中
  el.addEventListener('error', () => {
    music.playing = false
    music.time = 0
    music.duration = 0
    loaded = -1
  })
  return el
}

export function playIndex(i) {
  const a = ensure()
  const t = tracks.value[i]
  if (!a || !t || !t.file) return
  if (loaded !== i) {
    a.src = t.file
    loaded = i
    music.idx = i
    music.time = 0
    music.duration = 0
  }
  music.started = true
  a.volume = music.volume
  a.play().catch(() => {
    music.playing = false
  })
}

export function toggleMusic() {
  const a = ensure()
  if (!a) return
  if (music.playing) a.pause()
  else if (loaded === music.idx) a.play().catch(() => { music.playing = false })
  else playIndex(music.idx)
}

export function next() {
  const n = tracks.value.length
  if (n) playIndex((music.idx + 1) % n)
}

export function prev() {
  const n = tracks.value.length
  if (n) playIndex((music.idx - 1 + n) % n)
}

export function seek(t) {
  const a = ensure()
  if (!a || !music.duration) return
  const v = Math.min(Math.max(0, t), music.duration)
  a.currentTime = v
  music.time = v
}

export function setVolume(v) {
  music.volume = v
  write(KEYS.volume, v)
  if (el) el.volume = v
}
