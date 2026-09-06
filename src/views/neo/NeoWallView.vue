<script setup>
// 新版回声：单列刻痕 + 下划线表单（读写逻辑与旧版一致，含本地降级与 admin 删除）
import { computed, onMounted, ref } from 'vue'
import { api } from '../../lib/api.js'
import { auth, isAdmin } from '../../lib/auth.js'
import { onLens } from '../../lib/lens.js'
import { N } from '../../config/narrative.js'

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

function day(ts) {
  return new Date(ts * 1000).toLocaleDateString('zh-CN')
}

onMounted(refresh)
</script>

<template>
  <section class="neo-shell">
    <span class="neo-glyph glyph" aria-hidden="true">{{ N.glyph.wall }}</span>

    <p class="neo-eyebrow">{{ N.sections.wall }}</p>
    <h2 class="neo-h2">留言</h2>
    <p class="neo-lede">{{ N.hints.wall }}</p>
    <p class="neo-note note">{{ N.notes.wall }}</p>

    <p v-if="local" class="warn neo-mono">// 本地模式：后端不可达，回声仅存于本浏览器</p>

    <ul class="echoes">
      <li v-for="m in msgs" :key="m.ts" class="echo neo-lens" @pointermove="onLens">
        <span class="bar" aria-hidden="true"></span>
        <p class="who neo-mono">
          {{ m.name || '匿名逃逸者' }} · {{ day(m.ts) }}
          <button v-if="canManage" class="del" type="button" @click="del(m.ts)">删除</button>
        </p>
        <p class="say">{{ m.text }}</p>
      </li>
      <li v-if="!msgs.length" class="empty neo-mono">{{ N.empty.wall }}</li>
    </ul>

    <form class="form" @submit.prevent="submit">
      <input
        v-if="!auth.user"
        v-model="name"
        class="neo-field"
        placeholder="昵称（可留空 = 匿名）"
        maxlength="24"
        aria-label="昵称"
      />
      <textarea
        v-model="text"
        class="neo-field"
        rows="3"
        maxlength="200"
        placeholder="留一句回声…"
        aria-label="留言内容"
        required
      ></textarea>
      <div class="foot">
        <span class="neo-mono count">{{ text.length }}/200</span>
        <button class="neo-btn neo-btn-primary" type="submit">{{ sent ? '已留下 ✓' : '留下回声' }}</button>
      </div>
    </form>
  </section>
</template>

<style scoped>
.neo-shell {
  padding-top: 120px;
}

.glyph {
  top: 30px;
  right: -7vw;
}

.note {
  margin-bottom: var(--space-3);
}

.warn {
  color: var(--hot);
  margin: 0 0 var(--space-2);
}

.echoes {
  list-style: none;
  margin: 0 0 var(--space-4);
  padding: 0;
}

.echo {
  padding: var(--space-2) 0;
  border-top: 1px solid var(--line);
}

.echo:last-child {
  border-bottom: 1px solid var(--line);
}

.who {
  display: flex;
  align-items: baseline;
  gap: 10px;
  color: var(--cold);
  font-size: 11.5px;
}

.del {
  margin-left: auto;
  background: none;
  border: none;
  padding: 0;
  color: var(--text-1);
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  cursor: pointer;
  transition: color 0.22s;
}

.del:hover {
  color: var(--hot);
}

.say {
  margin: 6px 0 0;
  max-width: var(--measure);
  font-family: var(--font-serif);
  font-size: 16px;
  line-height: 1.9;
  overflow-wrap: anywhere;
  transition: transform 0.32s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.echo:hover .say {
  transform: translateX(6px);
}

.empty {
  padding: var(--space-3) 0;
  border-top: 1px solid var(--line);
}

.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  max-width: 560px;
}

.foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.count {
  font-size: 11px;
}
</style>
