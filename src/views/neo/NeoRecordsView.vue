<script setup>
// 新版共振：歌单快照（运行时零外部请求）+ 谱线扫光曲目行
import { onMounted, ref } from 'vue'
import { records, loadRecords, syncRecords } from '../../lib/records.js'
import { onLens } from '../../lib/lens.js'
import { isOwner } from '../../lib/auth.js'
import { N } from '../../config/narrative.js'

const syncing = ref(false)
const syncMsg = ref('')
async function onSync() {
  syncing.value = true
  syncMsg.value = ''
  const r = await syncRecords()
  if (r && Array.isArray(r.songs)) {
    Object.assign(records, r)
    syncMsg.value = `已同步 ${r.songs.length} 首`
  } else {
    syncMsg.value = '同步失败'
  }
  syncing.value = false
}
onMounted(loadRecords)
</script>

<template>
  <section class="neo-shell">
    <span class="neo-glyph glyph" aria-hidden="true">{{ N.glyph.records }}</span>

    <p class="neo-eyebrow">{{ N.sections.records }}</p>
    <h2 class="neo-h2">歌单</h2>
    <p class="neo-lede">{{ N.hints.records }}</p>

    <div class="head">
      <img v-if="records.cover" class="cover" :src="records.cover" :alt="records.name" loading="lazy" />
      <div class="info">
        <h3 class="name">{{ records.name }}</h3>
        <p v-if="records.desc" class="desc">{{ records.desc }}</p>
        <p class="neo-mono meta">{{ records.songs.length }} 首 · SYNC {{ records.updated }}</p>
        <div class="info-actions">
          <template v-if="isOwner()">
            <button class="neo-btn neo-btn-ghost open" type="button" :disabled="syncing" @click="onSync">
              {{ syncing ? '同步中…' : '同步歌单' }}
            </button>
          </template>
          <a class="neo-btn neo-btn-ghost open" :href="records.url" target="_blank" rel="noopener noreferrer">
            在 QQ 音乐打开<span aria-hidden="true">↗</span>
          </a>
          <span v-if="syncMsg" class="neo-mono meta">{{ syncMsg }}</span>
        </div>
      </div>
    </div>

    <ol class="tracks">
      <li v-for="(s, i) in records.songs" :key="s.url">
        <a class="track neo-lens" :href="s.url" target="_blank" rel="noopener noreferrer" @pointermove="onLens">
          <span class="bar" aria-hidden="true"></span>
          <span class="no neo-mono" aria-hidden="true">{{ String(i + 1).padStart(2, '0') }}</span>
          <span class="tt">{{ s.title }}</span>
          <span class="ar neo-mono">{{ s.artist }}</span>
        </a>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.neo-shell {
  padding-top: 120px;
}

.glyph {
  top: 40px;
  left: -8vw;
}

.head {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  margin-bottom: var(--space-3);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--line);
}

.cover {
  width: 132px;
  height: 132px;
  flex-shrink: 0;
  object-fit: cover;
  border: 1px solid var(--line);
  transition: transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.head:hover .cover {
  transform: rotate(2deg) scale(1.02);
}

.info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
}

.name {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(24px, 3.4vw, 34px);
  font-weight: 700;
  letter-spacing: -0.015em;
}

.desc {
  margin: 0;
  color: var(--text-1);
  font-size: 14.5px;
}

.meta {
  margin: 0;
}

.open {
  margin-top: 4px;
}

/* 头部操作行：同步（左）· 在 QQ 打开（右），同一套按钮语言 */
.info-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin-top: 4px;
}

.info-actions .open {
  margin-top: 0;
}

.tracks {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2px var(--space-3);
}

.track {
  position: relative;
  display: grid;
  grid-template-columns: 3ch 1fr auto;
  align-items: baseline;
  gap: 12px;
  padding: 11px 6px;
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
  font-size: 11px;
  transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.track:hover .no {
  transform: scale(1.15);
}

.tt {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.24s, transform 0.32s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.track:hover .tt {
  color: var(--cold);
  transform: translateX(6px);
}

.ar {
  font-size: 11px;
}

@media (max-width: 900px) {
  .tracks {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .head {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-2);
  }
  .cover {
    width: 104px;
    height: 104px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .head:hover .cover {
    transform: none;
  }
  .track:hover .tt,
  .track:hover .no {
    transform: none;
  }
}
</style>
