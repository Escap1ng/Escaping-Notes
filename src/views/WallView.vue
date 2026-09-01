<script setup>
import { computed, onMounted, ref } from 'vue'
import { api } from '../lib/api.js'
import { auth, isAdmin } from '../lib/auth.js'

const msgs = ref([])
const local = ref(false)
const name = ref('')
const text = ref('')
const sent = ref(false)

const canManage = computed(() => isAdmin())

async function refresh() {
  const remote = await api('/api/messages')
  if (Array.isArray(remote)) {
    msgs.value = remote.slice().reverse()
    local.value = false
  } else {
    msgs.value = JSON.parse(localStorage.getItem('en-wall') || '[]').reverse()
    local.value = true
  }
}

async function submit() {
  const t = text.value.trim()
  if (!t) return
  const ok = await api('/api/messages', { method: 'POST', body: { name: name.value, text: t } })
  if (ok) {
    text.value = ''
    sent.value = true
    setTimeout(() => (sent.value = false), 1500)
    refresh()
  } else {
    // 降级：本地模式
    const arr = JSON.parse(localStorage.getItem('en-wall') || '[]')
    arr.push({ name: name.value || '匿名逃逸者', text: t, ts: Math.floor(Date.now() / 1000) })
    localStorage.setItem('en-wall', JSON.stringify(arr))
    text.value = ''
    refresh()
  }
}

async function del(ts) {
  await api(`/api/messages/${ts}`, { method: 'DELETE' })
  refresh()
}

onMounted(refresh)
</script>

<template>
  <section class="page">
    <p class="readout page-code">// MODULE_04 · WALL</p>
    <h2 class="page-title">留言墙</h2>
    <p class="readout hint">
      {{ local ? '// 本地模式：后端不可达，留言仅存于本浏览器' : '// 访客投进井里的信号' }}
    </p>

    <ul class="wall-list">
      <li v-for="m in msgs" :key="m.ts" class="wall-item">
        <span class="readout wall-meta">
          {{ m.name }} · {{ new Date(m.ts * 1000).toLocaleDateString('zh-CN') }}
          <button v-if="canManage" class="del readout" type="button" @click="del(m.ts)">删除</button>
        </span>
        <p class="wall-text">{{ m.text }}</p>
      </li>
      <li v-if="!msgs.length" class="readout empty">// 井里还没有信号</li>
    </ul>

    <form class="wall-form" @submit.prevent="submit">
      <input
        v-if="!auth.user"
        v-model="name"
        class="field readout"
        placeholder="昵称（可留空=匿名逃逸者）"
        maxlength="24"
      />
      <textarea v-model="text" class="field textarea" rows="3" maxlength="200" placeholder="写一句投进井里的话…" required></textarea>
      <button class="submit readout" type="submit">{{ sent ? '已投井 ✓' : '投井' }}</button>
    </form>
  </section>
</template>

<style scoped>
.hint {
  margin: 0 0 var(--space-3);
}

.wall-list {
  list-style: none;
  margin: 0 0 var(--space-4);
  padding: 0;
}

.wall-item {
  padding: var(--space-2) 0;
  border-top: 1px solid var(--line);
}

.wall-meta {
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

.wall-text {
  margin: 6px 0 0;
  max-width: var(--measure);
}

.empty {
  padding: var(--space-2) 0;
  border-top: 1px solid var(--line);
}

.wall-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  max-width: 560px;
}


</style>
