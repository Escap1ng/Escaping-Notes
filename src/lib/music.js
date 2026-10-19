// 播放器引擎：全站唯一的 <audio> 与它的状态，界面只有顶栏「音乐」按钮点开的那张播放器卡。
// 曲目来自 content.playlist（src/data/music.js）。
// 曲目与位置会存进 localStorage：刷新后第一次按播放从上次那一首、那个位置续上；
// 主动换曲一律从头。系统媒体键走 Media Session，浏览器的播放控件与本卡共用同一台引擎。
import { computed, reactive, watch } from 'vue'
import { content } from '../data/index.js'
import { KEYS, read, write } from './storage.js'

function storedVolume() {
  const v = Number(read(KEYS.volume, '0.8'))
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.8
}

export const music = reactive({
  playing: false,
  available: false,
  started: false, // 这一台还没被人按下过：没按下就没有"当前曲"，idx 只是下一次要播的下标
  idx: 0, // 当前曲目在 tracks 里的下标
  time: 0,
  duration: 0, // 0 = 元数据还没到（preload 只在装填 src 后才发生）
  volume: storedVolume(),
  loading: false, // 换曲后元数据未到；错误另有 error，别把两者混成一个"播不了"
  error: false,
})

export const tracks = computed(() => (Array.isArray(content.playlist) ? content.playlist : []))
export const current = computed(() => tracks.value[music.idx] || null)

function validIndex(i) {
  return Number.isInteger(i) && i >= 0 && i < tracks.value.length
}

// 上次听到哪儿：只在刷新后的第一次按播放时使用，任何一次主动换曲都会清掉
let resumeAt = 0

watch(
  tracks,
  (v) => {
    music.available = v.length > 0
    if (!validIndex(music.idx)) music.idx = 0
    if (!v.length) {
      music.loading = false
      music.error = false
    }
  },
  { immediate: true }
)

const savedIdx = Number(read(KEYS.track, '0'))
if (validIndex(savedIdx)) {
  music.idx = savedIdx
  const savedTime = Number(read(KEYS.progress, '0'))
  resumeAt = Number.isFinite(savedTime) && savedTime > 0 ? savedTime : 0
}

let el = null
let loaded = -1 // el.src 里装的是第几条；-1 = 从没装填过
let pendingSeek = 0 // 元数据到达后要跳到的位置（只服务刷新后的续播）
let lastSaved = 0

function saveProgress(force = false) {
  if (loaded < 0 || !el) return
  const t = Number.isFinite(el.currentTime) ? el.currentTime : music.time
  if (!force && Math.abs(t - lastSaved) < 4) return
  write(KEYS.track, loaded)
  write(KEYS.progress, Math.max(0, Math.floor(t)))
  lastSaved = t
}

const hasMediaSession = () =>
  typeof navigator !== 'undefined' && 'mediaSession' in navigator && typeof MediaMetadata === 'function'

function syncMetadata(t) {
  if (!hasMediaSession() || !t) return
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: t.title,
      artist: t.artist,
      album: content.site.name,
    })
  } catch {
    /* 系统控件只是增益，不吃权限/实现差异 */
  }
}

function syncPlaybackState() {
  if (!hasMediaSession()) return
  try {
    navigator.mediaSession.playbackState = music.playing ? 'playing' : 'paused'
  } catch {
    /* 同上 */
  }
}

let lastPositionSync = 0
function syncPosition(force = false) {
  if (!hasMediaSession() || !el || !music.duration) return
  const now = Date.now()
  if (!force && now - lastPositionSync < 1000) return
  lastPositionSync = now
  try {
    navigator.mediaSession.setPositionState({
      duration: music.duration,
      playbackRate: el.playbackRate || 1,
      position: Math.min(Math.max(0, el.currentTime || 0), music.duration),
    })
  } catch {
    /* 同上 */
  }
}

function bindMediaSession() {
  if (!hasMediaSession()) return
  const set = (action, fn) => {
    try {
      navigator.mediaSession.setActionHandler(action, fn)
    } catch {
      /* 浏览器不认某个动作就跳过，别让整台引擎起不来 */
    }
  }
  set('play', () => {
    if (music.playing) return
    if (loaded === music.idx) el.play().catch(() => {})
    else playIndex(music.idx)
  })
  set('pause', () => {
    if (music.playing) el.pause()
  })
  set('previoustrack', prev)
  set('nexttrack', next)
  set('seekto', (d) => {
    if (d && Number.isFinite(d.seekTime)) seek(d.seekTime)
  })
}

function ensure() {
  if (el || typeof Audio === 'undefined') return el
  el = new Audio()
  el.preload = 'metadata'
  el.volume = music.volume
  el.addEventListener('play', () => {
    music.playing = true
    music.loading = false
    music.error = false
    syncPlaybackState()
  })
  el.addEventListener('pause', () => {
    music.playing = false
    saveProgress(true)
    syncPlaybackState()
  })
  el.addEventListener('ended', () => {
    saveProgress(true)
    next()
  })
  el.addEventListener('timeupdate', () => {
    music.time = el.currentTime
    saveProgress()
    syncPosition()
  })
  el.addEventListener('loadedmetadata', () => {
    music.duration = Number.isFinite(el.duration) ? el.duration : 0
    music.loading = false
    music.error = false
    if (pendingSeek > 0) {
      // 离结尾不到 3 秒就当作听完了，下次从头开始
      const t = music.duration && pendingSeek < music.duration - 3 ? pendingSeek : 0
      el.currentTime = t
      music.time = t
    }
    pendingSeek = 0
    syncPosition(true)
  })
  // 文件取不到（404、镜像缺料）：状态收回未播放，让界面亮着而不是卡在播放中
  el.addEventListener('error', () => {
    music.playing = false
    music.loading = false
    music.error = true
    music.time = 0
    music.duration = 0
    loaded = -1
    pendingSeek = 0
    resumeAt = 0
    syncPlaybackState()
  })
  bindMediaSession()
  addEventListener('pagehide', () => saveProgress(true))
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) saveProgress(true)
  })
  return el
}

export function playIndex(i) {
  const a = ensure()
  const t = tracks.value[i]
  if (!a || !t || !t.file) return
  if (loaded !== i) {
    // 只有刷新后的第一次按播放沿用上次位置；主动点别的行、按上一首/下一首都从头
    pendingSeek = resumeAt > 0 && !music.started && i === music.idx ? resumeAt : 0
    resumeAt = 0
    a.src = t.file
    loaded = i
    music.idx = i
    music.time = 0
    music.duration = 0
    music.loading = true
    music.error = false
    lastSaved = 0
    write(KEYS.track, i)
    write(KEYS.progress, pendingSeek > 0 ? Math.floor(pendingSeek) : 0)
    syncMetadata(t)
  }
  music.started = true
  a.volume = music.volume
  a.play().catch(() => {
    music.playing = false
    syncPlaybackState()
  })
}

export function toggleMusic() {
  const a = ensure()
  if (!a) return
  if (music.playing) a.pause()
  else if (loaded === music.idx) {
    a.play().catch(() => {
      music.playing = false
      syncPlaybackState()
    })
  } else playIndex(music.idx)
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
  saveProgress(true)
  syncPosition(true)
}

export function setVolume(v) {
  const n = Number(v)
  music.volume = Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : music.volume
  write(KEYS.volume, music.volume)
  if (el) el.volume = music.volume
}
