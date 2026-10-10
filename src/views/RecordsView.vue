<script setup>
// 新版共振：歌单快照（运行时零外部请求）+ 谱线扫光曲目行
import { computed, onMounted, ref } from 'vue'
import { records, loadRecords, syncRecords } from '../lib/records.js'
import { music, tracks, playIndex, toggleMusic } from '../lib/music.js'
import { onLens } from '../lib/lens.js'
import { isOwner } from '../lib/auth.js'
import { N, navLabel } from '../config/narrative.js'

const syncing = ref(false)
const syncMsg = ref('')
const syncErr = ref(false)
async function onSync() {
  syncing.value = true
  syncMsg.value = ''
  const r = await syncRecords()
  if (r && Array.isArray(r.songs)) {
    Object.assign(records, r)
    syncErr.value = false
    syncMsg.value = `已同步 ${r.songs.length} 首`
  } else {
    syncErr.value = true
    syncMsg.value = '同步失败'
  }
  syncing.value = false
}
onMounted(loadRecords)

// 再点当前曲 = 暂停/继续，点别的行 = 换曲；与顶栏那张卡走同一条通道
function onSong(i) {
  if (isCur(i)) toggleMusic()
  else playIndex(i)
}
// 没按下过之前没有"当前曲"：否则第一行会一直红着，看着像已经在播
function isCur(i) {
  return music.started && i === music.idx
}

/* QQ 曲目表默认折到前 PREVIEW 首：这一张是档案不是播放列表，
   几十首时它会把整页拖长，压住上面真正能播的那一张 */
const PREVIEW = 8
const listOpen = ref(false)
const foldable = computed(() => records.songs.length > PREVIEW)
const shownSongs = computed(() =>
  listOpen.value || !foldable.value ? records.songs : records.songs.slice(0, PREVIEW)
)
</script>

<template>
  <section class="neo-shell">
    <p class="neo-eyebrow">{{ N.sections.records }}</p>
    <h2 class="neo-h2">{{ navLabel('/records') }}</h2>
    <p class="neo-lede">{{ N.hints.records }}</p>

    <!-- 在线听歌：站内自托管的 mp3，整页唯一能播的那一张，所以不折。
         进度与音量收在顶栏「音乐」点开的卡里，两处共用 lib/music.js 那台引擎，当前曲同时亮 -->
    <div v-if="tracks.length" class="neo-card local">
      <p class="neo-eyebrow">// LISTEN · 在线听歌</p>
      <ol class="songs">
        <li v-for="(t, i) in tracks" :key="t.file">
          <button
            class="song"
            :class="{ on: isCur(i) }"
            type="button"
            :aria-current="isCur(i) ? 'true' : undefined"
            @click="onSong(i)"
          >
            <span class="s-no neo-mono" aria-hidden="true">{{ String(i + 1).padStart(2, '0') }}</span>
            <span class="s-st neo-ico" aria-hidden="true">{{ isCur(i) && music.playing ? '❚' : '▶' }}</span>
            <span class="s-tt">{{ t.title }}</span>
            <span class="s-ar neo-mono">{{ t.artist }}</span>
          </button>
        </li>
      </ol>
    </div>

    <!-- 曲目是长列表：整张表进一张卡，而不是 200 首歌各占一张 210px 的卡 -->
    <div class="neo-card tracklist">
      <div class="fold-head">
        <div class="fh-label">
          <p class="neo-eyebrow">// SOURCE · QQ 音乐</p>
          <p class="neo-mono meta">{{ records.songs.length }} 首 · SYNC {{ records.updated }}</p>
        </div>
        <div class="fh-acts">
          <template v-if="isOwner()">
            <button class="neo-btn neo-btn-sm neo-btn-ghost" type="button" :disabled="syncing" @click="onSync">
              {{ syncing ? '同步中…' : '同步歌单' }}
            </button>
          </template>
          <a class="neo-btn neo-btn-sm neo-btn-ghost" :href="records.url" target="_blank" rel="noopener noreferrer">
            在 QQ 音乐打开<span aria-hidden="true">↗</span>
          </a>
          <button
            v-if="foldable"
            class="neo-btn neo-btn-sm neo-btn-quiet"
            type="button"
            :aria-expanded="listOpen"
            aria-controls="qq-tracks"
            @click="listOpen = !listOpen"
          >
            {{ listOpen ? '收起 ↑' : `展开其余 ${records.songs.length - PREVIEW} 首 ↓` }}
          </button>
          <span v-if="syncMsg" :class="syncErr ? 'neo-note-err' : 'neo-note-ok'">{{ syncMsg }}</span>
        </div>
      </div>
      <ol id="qq-tracks" class="tracks">
        <li v-for="(s, i) in shownSongs" :key="s.url">
          <a class="track neo-lens" :href="s.url" target="_blank" rel="noopener noreferrer" @pointermove="onLens">
            <span class="bar" aria-hidden="true"></span>
            <span class="no neo-mono" aria-hidden="true">{{ String(i + 1).padStart(2, '0') }}</span>
            <span class="tt">{{ s.title }}</span>
            <span class="ar neo-mono">{{ s.artist }}</span>
          </a>
        </li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
.neo-shell {
  padding-top: 120px;
}

/* 曲目表整张进一张卡：卡内只留列表自己的分隔线。
   表头一行负责说清"这是哪份表、多少首、什么时候同步的"，
   右边三个动作（同步 / 去 QQ / 折叠）全部是对这张表的操作，所以不放头卡 */
.tracklist {
  min-height: 0;
  gap: var(--space-1);
  padding: var(--card-pad) var(--card-pad) var(--space-1);
}

.fold-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.fh-label {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.fh-acts {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  flex-wrap: wrap;
}

.meta {
  margin: 0;
}

/* ---- 在线听歌卡（满宽，页内唯一能播的那一张）----
   行语法与下面那张 QQ 表同构（发丝分隔 + 序号 + 曲名 + 艺术家），两列并排；
   差别只在它是按钮、播的是站内文件，且艺术家紧跟曲名不顶到右边缘。
   左右内边距与 .tracklist 取同一个值，两张表的发丝线与序号列因此对得齐 */
.local {
  min-height: 0;
  padding: var(--card-pad) var(--card-pad) var(--space-1);
  margin-bottom: var(--space-2);
}

.songs {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-0) var(--space-3);
}

.song {
  display: flex;
  align-items: baseline;
  gap: var(--space-1);
  width: 100%;
  padding: var(--space-1) var(--space-0);
  border: 0;
  border-top: 1px solid var(--line);
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.25s ease;
}

.song:hover {
  background: color-mix(in srgb, var(--cold) 5%, transparent);
}

.s-no,
.s-st {
  flex-shrink: 0;
  font-size: var(--fs-3xs);
  color: var(--text-1);
}

.s-tt {
  min-width: 0;
  font-family: var(--font-display);
  font-size: var(--fs-base);
  font-weight: var(--fw-bold);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.s-ar {
  flex-shrink: 0;
  font-size: var(--fs-3xs);
}

.s-ar::before {
  content: '·';
  margin-right: var(--space-1);
  color: var(--text-1);
}

/* 当前曲红移——与顶栏按钮播放中（.music-btn.on）同一个记号 */
.song.on .s-tt,
.song.on .s-st {
  color: var(--hot);
}

.tracks {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-0) var(--space-3);
}

.track {
  position: relative;
  display: grid;
  grid-template-columns: 3ch 1fr auto;
  align-items: baseline;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-0);
  border-top: 1px solid var(--line);
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: background-color 0.25s ease;
}

.track:hover {
  background: color-mix(in srgb, var(--cold) 5%, transparent);
}

.track::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--cold);
  transform: scaleY(0);
  transform-origin: top;
  transition: transform 0.32s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.track:hover::before {
  transform: scaleY(1);
}

.no {
  color: var(--hot);
  font-size: var(--fs-3xs);
  transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.track:hover .no {
  transform: scale(1.15);
}

.tt {
  font-family: var(--font-display);
  font-size: var(--fs-base);
  font-weight: var(--fw-bold);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.24s, transform 0.32s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.track:hover .tt {
  color: var(--cold);
  transform: translateX(var(--space-0));
}

.ar {
  font-size: var(--fs-3xs);
}

@media (max-width: 900px) {
  .tracks,
  .songs {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .track:hover .tt,
  .track:hover .no {
    transform: none;
  }
}
</style>
