<script setup>
import { records } from '../config/records.js'
</script>

<template>
  <section class="page">
    <p class="readout page-code">// MODULE_03 · RECORDS</p>
    <h2 class="page-title">歌单</h2>

    <div class="rec-head">
      <img v-if="records.cover" class="rec-cover" :src="records.cover" :alt="records.name" loading="lazy" />
      <div class="rec-info">
        <h3 class="rec-name">{{ records.name }}</h3>
        <p v-if="records.desc" class="rec-desc">{{ records.desc }}</p>
        <p class="readout rec-meta">
          {{ records.songs.length }} 首 · SYNC {{ records.updated }}
        </p>
        <a class="link-item rec-open" :href="records.url" target="_blank" rel="noopener noreferrer">
          在 QQ 音乐打开歌单<span aria-hidden="true">↗</span>
        </a>
      </div>
    </div>

    <ol class="rec-list">
      <li v-for="(s, i) in records.songs" :key="s.url">
        <a class="rec-row" :href="s.url" target="_blank" rel="noopener noreferrer">
          <span class="readout rec-no">{{ String(i + 1).padStart(2, '0') }}</span>
          <span class="rec-title">{{ s.title }}</span>
          <span class="readout rec-artist">{{ s.artist }}</span>
          <span class="rec-arrow" aria-hidden="true">↗</span>
        </a>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.rec-head {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
  margin-bottom: var(--space-3);
}

.rec-cover {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border: 1px solid var(--line);
  flex-shrink: 0;
}

.rec-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  align-items: flex-start;
}

.rec-name {
  font-family: var(--font-serif);
  font-size: 24px;
  font-weight: 700;
  margin: 0;
}

.rec-desc {
  margin: 0;
  color: var(--text-1);
}

.rec-meta {
  margin: 0;
}

.rec-open {
  margin-top: var(--space-1);
}

.rec-list {
  list-style: none;
  margin: 0 0 var(--space-3);
  padding: 0;
}

.rec-row {
  display: grid;
  grid-template-columns: 4ch 1fr auto auto;
  gap: var(--space-2);
  align-items: baseline;
  padding: var(--space-1) 0;
  border-top: 1px solid var(--line);
}

.rec-list li:last-child .rec-row {
  border-bottom: 1px solid var(--line);
}

.rec-title {
  font-family: var(--font-serif);
  font-size: 17px;
  font-weight: 700;
  transition: color 0.2s;
}

.rec-artist {
  color: var(--text-1);
}

.rec-arrow {
  color: var(--text-1);
  transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), color 0.2s;
}

.rec-row:hover .rec-title,
.rec-row:hover .rec-arrow {
  color: var(--signal);
}

.rec-row:hover .rec-arrow {
  transform: translate(3px, -3px);
}

@media (max-width: 720px) {
  .rec-head {
    flex-direction: column;
  }
  .rec-artist {
    display: none;
  }
  .rec-row {
    grid-template-columns: 4ch 1fr auto;
  }
}
</style>
