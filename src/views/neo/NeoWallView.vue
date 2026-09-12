<script setup>
// 回声墙：单列刻痕 + 下划线表单（含本地降级与 admin 删除）
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
    arr.push({ name: name.value || '匿名观测者', text: t, ts: Math.floor(Date.now() / 1000) })
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

    <p v-if="local" class="neo-note-info">// 本地模式：后端不可达，回声仅存于本浏览器</p>

    <ul class="echoes">
      <li v-for="m in msgs" :key="m.ts" class="echo neo-lens" @pointermove="onLens">
        <span class="bar" aria-hidden="true"></span>
        <p class="who neo-mono">
          <span class="name">{{ m.name || '匿名观测者' }}</span>
          <span class="day">{{ day(m.ts) }}</span>
          <button v-if="canManage" class="neo-btn neo-btn-sm neo-btn-danger" type="button" @click="del(m.ts)">删除</button>
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
        placeholder="昵称（留空则匿名）"
        maxlength="24"
        aria-label="昵称"
      />
      <textarea
        v-model="text"
        class="neo-field"
        rows="3"
        maxlength="200"
        placeholder="写一句回声…"
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
  padding-top: var(--page-top);
}

.glyph {
  top: var(--space-3);
  right: -7vw;
}

.note {
  margin-bottom: var(--space-3);
}

/* 回声卡片：与归档卡片同语言（宽屏两列、圆角发丝框），规格取 --card-* 令牌 */
.echoes {
  list-style: none;
  margin: 0 0 var(--space-4);
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
}

@media (max-width: 880px) {
  .echoes {
    grid-template-columns: 1fr;
  }
}

.echoes > li {
  display: flex;
}

.echo {
  position: relative;
  z-index: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--card-pad);
  border: 1px solid var(--card-brd);
  border-radius: var(--r-md);
  background: var(--card-bg);
  overflow: hidden;
  transition: border-color 0.28s, background 0.28s;
}

.echo:hover {
  border-color: var(--card-brd-hover);
  background: var(--card-bg-hover);
}

.who {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--fs-3xs);
}

.who .name {
  color: var(--cold);
}

.who .day {
  color: var(--hot);
}

/* 版式规则：删除按钮靠右。按钮外观全部来自 .neo-btn，这里只管位置 */
.who .neo-btn {
  margin-left: auto;
}

.say {
  position: relative;
  z-index: 1;
  margin: 0;
  font-family: var(--font-serif);
  font-size: var(--fs-md);
  line-height: var(--lh-relaxed);
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  transition: transform 0.32s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.echo:hover .say {
  transform: translateX(var(--space-0));
}

.empty {
  grid-column: 1 / -1;
  padding: var(--space-3) 0;
  border-top: 1px solid var(--line);
}

/* 留言面板：轻量发丝框体，与卡片同语言 */
.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  max-width: 640px;
  padding: var(--card-pad);
  border: 1px solid var(--card-brd);
  border-radius: var(--r-md);
  background: var(--card-bg);
}

.foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.count {
  font-size: var(--fs-3xs);
}
</style>
