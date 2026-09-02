<script setup>
import { computed, onMounted, ref } from 'vue'
import { api, getToken } from '../lib/api.js'
import { isOwner } from '../lib/auth.js'

const frags = ref([])
const offline = ref(false)
const text = ref('')
const image = ref('')
const imgInput = ref(null)
const sent = ref(false)

const owner = computed(() => isOwner())

async function refresh() {
  const remote = await api('/api/fragments')
  if (Array.isArray(remote)) {
    frags.value = remote.slice().reverse()
    offline.value = false
  } else {
    frags.value = []
    offline.value = true
  }
}

async function onImg(e) {
  const f = e.target.files[0]
  if (!f) return
  const fd = new FormData()
  fd.append('file', f)
  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: fd,
    })
    const j = await res.json()
    if (j.url) image.value = j.url
  } catch {
    // 上传失败则不附图
  }
  e.target.value = ''
}

async function submit() {
  const t = text.value.trim()
  if (!t) return
  const ok = await api('/api/fragments', { method: 'POST', body: { text: t, image: image.value } })
  if (ok) {
    text.value = ''
    image.value = ''
    sent.value = true
    setTimeout(() => (sent.value = false), 1500)
    refresh()
  }
}

async function del(ts) {
  await api(`/api/fragments/${ts}`, { method: 'DELETE' })
  refresh()
}

onMounted(refresh)
</script>

<template>
  <section class="page">
    <p class="readout page-code">// MODULE_03 · FRAGMENTS</p>
    <h2 class="page-title">碎片</h2>
    <p class="readout hint">
      {{ offline ? '// 信号不可达 · 碎片需后端支持' : '// 逃逸碎屑 · 瞬时记录' }}
    </p>

    <form v-if="owner && !offline" class="frag-form" @submit.prevent="submit">
      <textarea
        v-model="text"
        class="field textarea"
        rows="3"
        maxlength="500"
        placeholder="记一片逃逸碎屑…"
        required
      ></textarea>
      <div class="frag-attach">
        <input ref="imgInput" type="file" accept="image/*" hidden @change="onImg" />
        <button class="act readout" type="button" @click="imgInput?.click()">附图</button>
        <img v-if="image" :src="image" alt="附图预览" class="attach-thumb" />
        <button v-if="image" class="act readout" type="button" @click="image = ''">移除附图</button>
      </div>
      <button class="submit readout" type="submit">{{ sent ? '已发布 ✓' : '发布碎片' }}</button>
    </form>

    <ul class="frag-list">
      <li v-for="f in frags" :key="f.ts" class="frag-item">
        <span class="readout frag-meta">
          {{ new Date(f.ts * 1000).toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }) }}
          <button v-if="owner" class="del readout" type="button" @click="del(f.ts)">删除</button>
        </span>
        <p class="frag-text">{{ f.text }}</p>
        <img v-if="f.image" :src="f.image" alt="碎片附图" loading="lazy" class="frag-img" />
      </li>
      <li v-if="!frags.length && !offline" class="readout empty">// 暂无碎片</li>
    </ul>
  </section>
</template>

<style scoped>
.hint {
  margin: 0 0 var(--space-3);
}

.frag-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  max-width: 560px;
  margin-bottom: var(--space-4);
}

.frag-attach {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

.act {
  background: none;
  border: none;
  color: var(--text-1);
  cursor: pointer;
  font: inherit;
  letter-spacing: inherit;
  padding: 0;
}

.act:hover {
  color: var(--signal);
}

.attach-thumb {
  height: 48px;
  border: 1px solid var(--line);
}

.frag-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.frag-item {
  padding: var(--space-2) 0;
  border-top: 1px solid var(--line);
}

.frag-meta {
  display: flex;
  gap: var(--space-2);
  align-items: baseline;
}

.del {
  background: none;
  border: none;
  color: var(--text-1);
  cursor: pointer;
  font: inherit;
  padding: 0;
}

.del:hover {
  color: var(--signal);
}

.frag-text {
  margin: 6px 0 0;
  max-width: var(--measure);
  white-space: pre-wrap;
}

.frag-img {
  display: block;
  margin-top: var(--space-2);
  max-width: 100%;
  border: 1px solid var(--line);
}

.empty {
  padding: var(--space-2) 0;
  border-top: 1px solid var(--line);
}
</style>
