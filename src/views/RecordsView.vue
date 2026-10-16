<script setup>
// 新版共振：歌单快照（运行时零外部请求）+ 卡面聚光、曲目行左缘标记
import { computed, ref } from 'vue'
import { records } from '../lib/records.js'
import { music, tracks, playIndex, toggleMusic } from '../lib/music.js'
import { onLens } from '../lib/lens.js'
import { N, navLabel } from '../config/narrative.js'

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
  <section class="en-shell">
    <h2 class="en-h2">{{ navLabel('/records') }}</h2>
    <p class="en-lede">{{ N.hints.records }}</p>

    <!-- 在线听歌：站内自托管的 mp3，整页唯一能播的那一张，所以不折。
         进度与音量收在顶栏「音乐」点开的卡里，两处共用 lib/music.js 那台引擎，当前曲同时亮 -->
    <div v-if="tracks.length" class="en-card local en-lens" @pointermove="onLens">
      <p class="en-eyebrow">在线听歌</p>
      <ol class="songs">
        <li v-for="(t, i) in tracks" :key="t.file">
          <button
            class="song"
            :class="{ on: isCur(i) }"
            type="button"
            :aria-current="isCur(i) ? 'true' : undefined"
            @click="onSong(i)"
          >
            <span class="s-no en-mono" aria-hidden="true">{{ String(i + 1).padStart(2, '0') }}</span>
            <span class="s-st en-ico" aria-hidden="true">{{ isCur(i) && music.playing ? '❚' : '▶' }}</span>
            <span class="s-tt">{{ t.title }}</span>
            <span class="s-ar en-mono">{{ t.artist }}</span>
          </button>
        </li>
      </ol>
    </div>

    <!-- 曲目是长列表：整张表进一张卡，而不是 200 首歌各占一张 210px 的卡 -->
    <div class="en-card tracklist en-lens" @pointermove="onLens">
      <div class="fold-head">
        <div class="fh-label">
          <p class="en-eyebrow">音源 · QQ 音乐</p>
          <p class="en-mono meta">{{ records.songs.length }} 首 · SYNC {{ records.updated }}</p>
        </div>
        <div class="fh-acts">
          <a class="en-btn en-btn-sm en-btn-ghost" :href="records.url" target="_blank" rel="noopener noreferrer">
            在 QQ 音乐打开<span aria-hidden="true">↗</span>
          </a>
          <button
            v-if="foldable"
            class="en-btn en-btn-sm en-btn-quiet"
            type="button"
            :aria-expanded="listOpen"
            aria-controls="qq-tracks"
            @click="listOpen = !listOpen"
          >
            {{ listOpen ? '收起 ↑' : `展开其余 ${records.songs.length - PREVIEW} 首 ↓` }}
          </button>
        </div>
      </div>
      <ol id="qq-tracks" class="tracks">
        <li v-for="(s, i) in shownSongs" :key="s.url">
          <a class="track" :href="s.url" target="_blank" rel="noopener noreferrer">
            <span class="no en-mono" aria-hidden="true">{{ String(i + 1).padStart(2, '0') }}</span>
            <span class="tt">{{ s.title }}</span>
            <span class="ar en-mono">{{ s.artist }}</span>
          </a>
        </li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
.en-shell {
  padding-top: 120px;
}

/* 曲目表整张进一张卡：卡内只留列表自己的分隔线。
   表头一行负责说清"这是哪份表、多少首、什么时候同步的"，
   右边两个动作（去 QQ / 折叠）全部是对这张表的操作，所以不放头卡 */
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

/* ---- 曲目行：两张卡共用一套指针语言，一份规则 ----
   聚光归卡不归行：en-lens 只挂在卡上，一枚光斑在卡里跟着指针走。原先每行各挂一枚，
   指针处叠了两层（卡那层 + 行那层），被指到的那一行洗得比别处重。
   左缘标记走 ::before 而不是 <span class="bar">：那枚 span 属卡面配方（site.css §6b），
   触发器是 .en-lens:hover .bar——父卡自己也带 en-lens，于是鼠标一进卡，
   整列标记一起立起来，读作一排竖线。
   行被指到只有三个动作，上下两张卡完全一样：标记从顶上长满、序号放大、曲名冷移并让出一枚 --nudge。 */
.song,
.track {
  position: relative;
  padding: var(--space-1) var(--space-0);
  border: 0;
  border-top: 1px solid var(--line);
  overflow: hidden;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  transition: background-color var(--dur-fast) ease;
}

.song::before,
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
  transition: transform var(--dur) cubic-bezier(0.2, 0.8, 0.2, 1);
}

.song:hover,
.track:hover {
  background: color-mix(in srgb, var(--cold) 5%, transparent);
}

.song:hover::before,
.track:hover::before {
  transform: scaleY(1);
}

.s-no,
.no {
  transition: transform var(--dur) cubic-bezier(0.2, 0.8, 0.2, 1);
}

.song:hover .s-no,
.track:hover .no {
  transform: scale(1.15);
}

.s-tt,
.tt {
  min-width: 0;
  font-family: var(--font-display);
  font-size: var(--fs-base);
  font-weight: var(--fw-bold);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition:
    color var(--dur-fast),
    transform var(--dur) cubic-bezier(0.2, 0.8, 0.2, 1);
}

.song:hover .s-tt,
.track:hover .tt {
  color: var(--cold);
  transform: translateX(var(--nudge));
}

/* 听歌卡那一行是 <button>：UA 那套边、底、字体在上面那份共用规则里已经清掉了，
   这里只补它作为一列 flex 的形态——艺术家紧跟曲名，所以不占满剩余宽度 */
.song {
  display: flex;
  align-items: baseline;
  gap: var(--space-1);
  width: 100%;
}

.s-no,
.s-st {
  flex-shrink: 0;
  font-size: var(--fs-3xs);
  color: var(--text-1);
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

/* QQ 表那一行是 <a>：三列栅格，艺术家顶到右边缘 */
.track {
  display: grid;
  grid-template-columns: 3ch 1fr auto;
  align-items: baseline;
  gap: var(--space-2);
}

.no {
  color: var(--hot);
  font-size: var(--fs-3xs);
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
  .song:hover .s-tt,
  .track:hover .tt,
  .song:hover .s-no,
  .track:hover .no {
    transform: none;
  }
}
</style>
