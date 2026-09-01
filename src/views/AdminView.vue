<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, getToken } from '../lib/api.js'
import { auth, isOwner } from '../lib/auth.js'
import { content, loadContent } from '../lib/content.js'
import { loadPosts } from '../lib/posts.js'

const router = useRouter()
const tab = ref('users')
const users = ref([])
const msgs = ref([])
const posts = ref([])
const notice = ref('')

// 文章编辑器
const ed = ref({ slug: '', title: '', date: '', tags: '', summary: '', body: '' })

// 设置页签（行式编辑，格式见各占位提示）
const siteForm = ref('')
const updatesForm = ref('')
const linksForm = ref('')
const projectsForm = ref('')
const gearForm = ref('')
const playlistForm = ref('')
const uploadUrl = ref('')

const tabs = computed(() => {
  const t = [
    { id: 'users', label: '用户' },
    { id: 'wall', label: '留言墙' },
  ]
  if (isOwner()) t.push({ id: 'posts', label: '文章' }, { id: 'settings', label: '设置' })
  return t
})

function flash(s) {
  notice.value = s
  setTimeout(() => (notice.value = ''), 1800)
}

function fillForms() {
  const s = content.site
  siteForm.value =
    [s.name, s.subtitle, s.author, s.bio, s.location, s.coords, s.email, s.url].join('\n') +
    '\n' +
    (s.socials || []).map((x) => `${x.label}|${x.url}`).join('\n')
  updatesForm.value = content.updates.map((u) => `${u.date} | ${u.text}`).join('\n')
  linksForm.value = content.linkGroups
    .map((g) => g.items.map((i) => `${g.group}|${g.label}|${i.name}|${i.url}`).join('\n'))
    .join('\n')
  projectsForm.value = content.projects.map((p) => `${p.name}|${p.desc}|${p.year}|${p.url}`).join('\n')
  gearForm.value = content.gear.join('\n')
  playlistForm.value = content.playlist.map((p) => `${p.title}|${p.artist}|${p.file}`).join('\n')
}

async function refresh() {
  users.value = (await api('/api/users')) || []
  msgs.value = ((await api('/api/messages')) || []).slice().reverse()
  posts.value = await loadPosts()
  fillForms()
}

onMounted(async () => {
  if (auth.ready && !auth.user) return router.push('/login')
  if (!auth.ready) {
    // 等待 App 的 loadMe 完成
    const t = setInterval(() => {
      if (auth.ready) {
        clearInterval(t)
        if (!auth.user) router.push('/login')
        else refresh()
      }
    }, 100)
    return
  }
  refresh()
})

// ---------- 用户管理 ----------
async function setRole(u, role) {
  await api(`/api/users/${u.id}/role`, { method: 'POST', body: { role } })
  refresh()
}
async function setBan(u, ban) {
  await api(`/api/users/${u.id}/ban`, { method: 'POST', body: { ban } })
  refresh()
}
async function delUser(u) {
  await api(`/api/users/${u.id}`, { method: 'DELETE' })
  refresh()
}
async function delMsg(ts) {
  await api(`/api/messages/${ts}`, { method: 'DELETE' })
  refresh()
}

// ---------- 文章 ----------
function newPost() {
  ed.value = { slug: '', title: '', date: new Date().toISOString().slice(0, 10), tags: '', summary: '', body: '' }
}
async function editPost(p) {
  const r = await api(`/api/posts/${p.slug}`)
  if (r) {
    ed.value = {
      slug: p.slug,
      title: r.meta.title,
      date: r.meta.date,
      tags: (r.meta.tags || []).join(', '),
      summary: r.meta.summary,
      body: r.body,
    }
  }
}
async function savePost() {
  const body = {
    title: ed.value.title,
    date: ed.value.date,
    tags: ed.value.tags.split(/[,，]/).map((s) => s.trim()).filter(Boolean),
    summary: ed.value.summary,
    content: ed.value.body,
  }
  const res = ed.value.slug
    ? await api(`/api/posts/${ed.value.slug}`, { method: 'POST', body })
    : await api('/api/posts', { method: 'POST', body })
  if (res) {
    flash('文章已保存')
    newPost()
    refresh()
  } else flash('保存失败')
}
async function delPost(slug) {
  await api(`/api/posts/${slug}`, { method: 'DELETE' })
  refresh()
}

// ---------- 设置 ----------
const lines = (s) => s.split('\n').map((l) => l.trim()).filter(Boolean)

async function saveSite() {
  const ls = siteForm.value.split('\n').map((l) => l.trim())
  const [name, subtitle, author, bio, location, coords, email, url] = ls.slice(0, 8)
  const socials = ls.slice(8).filter(Boolean).map((l) => {
    const [label, u] = l.split('|')
    return { label: label || '', url: u || '#' }
  })
  const res = await api('/api/content/site', {
    method: 'PUT',
    body: { name, subtitle, author, bio, location, coords, email, url, socials, gear: content.gear },
  })
  if (res) {
    await loadContent()
    flash('站点信息已保存')
  }
}
async function saveUpdates() {
  const arr = lines(updatesForm.value).map((l) => {
    const [date, ...rest] = l.split('|')
    return { date: (date || '').trim(), text: rest.join('|').trim() }
  })
  if (await api('/api/content/updates', { method: 'PUT', body: arr })) {
    await loadContent(); fillForms(); flash('动态已保存')
  }
}
async function saveLinks() {
  const groups = []
  for (const l of lines(linksForm.value)) {
    const [group, label, name, url] = l.split('|')
    let g = groups.find((x) => x.group === group)
    if (!g) {
      g = { group, label: label || group, items: [] }
      groups.push(g)
    }
    g.items.push({ name: name || '', url: url || '#' })
  }
  if (await api('/api/content/links', { method: 'PUT', body: groups })) {
    await loadContent(); fillForms(); flash('链接已保存')
  }
}
async function saveProjects() {
  const arr = lines(projectsForm.value).map((l) => {
    const [name, desc, year, url] = l.split('|')
    return { name: name || '', desc: desc || '', year: year || '', url: url || '#' }
  })
  if (await api('/api/content/projects', { method: 'PUT', body: arr })) {
    await loadContent(); fillForms(); flash('项目已保存')
  }
}
async function saveGear() {
  if (await api('/api/content/gear', { method: 'PUT', body: lines(gearForm.value) })) {
    await loadContent(); fillForms(); flash('装备已保存')
  }
}
async function savePlaylist() {
  const arr = lines(playlistForm.value).map((l) => {
    const [title, artist, file] = l.split('|')
    return { title: title || '', artist: artist || '', file: file || '' }
  })
  if (await api('/api/content/playlist', { method: 'PUT', body: arr })) {
    await loadContent(); fillForms(); flash('歌单已保存')
  }
}

// ---------- 上传 ----------
async function onFile(e) {
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
    if (j.url) {
      uploadUrl.value = j.url
      flash('上传成功，URL 已填出')
    } else flash('上传失败')
  } catch {
    flash('上传失败')
  }
  e.target.value = ''
}
</script>

<template>
  <section class="page admin-page">
    <p class="readout page-code">// ADMIN · {{ auth.user?.role }}</p>
    <h2 class="page-title">管理界面</h2>

    <nav class="tabs readout" aria-label="管理页签">
      <button
        v-for="t in tabs"
        :key="t.id"
        class="tab"
        :class="{ on: tab === t.id }"
        :aria-pressed="tab === t.id"
        @click="tab = t.id"
      >
        {{ t.label }}
      </button>
      <span v-if="notice" class="notice">// {{ notice }}</span>
    </nav>

    <!-- 用户 -->
    <div v-if="tab === 'users'">
      <div class="table-wrap">
      <table class="grid">
        <thead>
          <tr class="readout"><th>USERNAME</th><th>NICKNAME</th><th>ROLE</th><th>STATE</th><th>ACTIONS</th></tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td class="readout">{{ u.username }}</td>
            <td>{{ u.nickname }}</td>
            <td class="readout">{{ u.role }}</td>
            <td class="readout">{{ u.ban ? '已禁用' : '正常' }}</td>
            <td class="acts">
              <template v-if="isOwner() && u.role !== 'owner'">
                <button class="act readout" @click="setRole(u, u.role === 'admin' ? 'visitor' : 'admin')">
                  {{ u.role === 'admin' ? '降为访客' : '任为管理' }}
                </button>
              </template>
              <button v-if="u.role !== 'owner'" class="act readout" @click="setBan(u, !u.ban)">
                {{ u.ban ? '解禁' : '禁用' }}
              </button>
              <button v-if="u.role !== 'owner'" class="act readout" @click="delUser(u)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>

    <!-- 留言墙 -->
    <div v-if="tab === 'wall'">
      <ul class="mini-list">
        <li v-for="m in msgs" :key="m.ts" class="mini-row">
          <span class="readout">{{ m.name }} · {{ new Date(m.ts * 1000).toLocaleDateString('zh-CN') }}</span>
          <span class="mini-text">{{ m.text }}</span>
          <button class="act readout" @click="delMsg(m.ts)">删除</button>
        </li>
        <li v-if="!msgs.length" class="readout">// 无留言</li>
      </ul>
    </div>

    <!-- 文章（站长） -->
    <div v-if="tab === 'posts' && isOwner()">
      <ul class="mini-list posts-list">
        <li v-for="p in posts" :key="p.slug" class="mini-row">
          <span class="readout">{{ p.date }}</span>
          <span class="mini-text">{{ p.title }}</span>
          <button class="act readout" @click="editPost(p)">编辑</button>
          <button class="act readout" @click="delPost(p.slug)">删除</button>
        </li>
      </ul>

      <h3 class="readout ed-head">// EDITOR · {{ ed.slug ? `PUT ${ed.slug}` : 'POST 新文章' }}</h3>
      <form class="ed-form" @submit.prevent="savePost">
        <div class="ed-row">
          <input v-model="ed.title" class="field" placeholder="标题 *" required />
          <input v-model="ed.date" class="field" type="date" />
          <input v-model="ed.tags" class="field" placeholder="标签, 逗号分隔" />
        </div>
        <input v-model="ed.summary" class="field" placeholder="摘要（列表与分享卡用）" />
        <textarea v-model="ed.body" class="field mono" rows="14" placeholder="Markdown 正文 *" required></textarea>
        <button class="submit readout" type="submit">保存文章</button>
      </form>
    </div>

    <!-- 设置（站长） -->
    <div v-if="tab === 'settings' && isOwner()">
      <div class="set-block">
        <h3 class="readout">// SITE · 8 行字段 + 社交行 label|url</h3>
        <textarea v-model="siteForm" class="field mono" rows="12"></textarea>
        <button class="submit readout" @click="saveSite">保存站点信息</button>
      </div>
      <div class="set-block">
        <h3 class="readout">// UPDATES · 每行 date | text</h3>
        <textarea v-model="updatesForm" class="field mono" rows="6"></textarea>
        <button class="submit readout" @click="saveUpdates">保存动态</button>
      </div>
      <div class="set-block">
        <h3 class="readout">// LINKS · 每行 group|label|name|url</h3>
        <textarea v-model="linksForm" class="field mono" rows="8"></textarea>
        <button class="submit readout" @click="saveLinks">保存链接</button>
      </div>
      <div class="set-block">
        <h3 class="readout">// PROJECTS · 每行 name|desc|year|url</h3>
        <textarea v-model="projectsForm" class="field mono" rows="6"></textarea>
        <button class="submit readout" @click="saveProjects">保存项目</button>
      </div>
      <div class="set-block">
        <h3 class="readout">// GEAR · 每行一项</h3>
        <textarea v-model="gearForm" class="field mono" rows="5"></textarea>
        <button class="submit readout" @click="saveGear">保存装备</button>
      </div>
      <div class="set-block">
        <h3 class="readout">// PLAYLIST · 每行 title|artist|file(/uploads/…)</h3>
        <textarea v-model="playlistForm" class="field mono" rows="4"></textarea>
        <button class="submit readout" @click="savePlaylist">保存歌单</button>
      </div>
      <div class="set-block">
        <h3 class="readout">// UPLOAD · 图片/音乐 ≤8MB</h3>
        <input type="file" class="readout" @change="onFile" />
        <p v-if="uploadUrl" class="readout upload-url">{{ uploadUrl }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.tabs {
  display: flex;
  gap: var(--space-2);
  align-items: baseline;
  margin-bottom: var(--space-3);
  flex-wrap: wrap;
}

.tab {
  background: none;
  border: 1px solid var(--line);
  color: var(--text-1);
  padding: 4px 12px;
  cursor: pointer;
  font: inherit;
  letter-spacing: inherit;
}

.tab.on,
.tab:hover {
  border-color: var(--signal);
  color: var(--signal);
}

.notice {
  color: var(--signal);
}

.table-wrap {
  overflow-x: auto;
}

.grid {
  width: 100%;
  min-width: 560px;
  border-collapse: collapse;
}

.grid th,
.grid td {
  text-align: left;
  padding: 8px 10px;
  border-top: 1px solid var(--line);
}

.grid th {
  border-bottom: 1px solid var(--line);
}

.acts {
  display: flex;
  gap: var(--space-2);
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

.mini-list {
  list-style: none;
  margin: 0 0 var(--space-3);
  padding: 0;
}

.mini-row {
  display: flex;
  gap: var(--space-2);
  align-items: baseline;
  padding: 8px 0;
  border-top: 1px solid var(--line);
  flex-wrap: wrap;
}

.mini-text {
  flex: 1;
  min-width: 200px;
}

.ed-head {
  margin: var(--space-3) 0 var(--space-2);
}

.ed-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.ed-row {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.ed-row .field:first-child {
  flex: 2;
  min-width: 200px;
}

.field {
  background: none;
  border: 1px solid var(--line);
  color: var(--text-0);
  padding: 8px 12px;
  font-size: 14px;
  font-family: inherit;
  width: 100%;
}

.field.mono {
  font-family: var(--font-mono);
  font-size: 12.5px;
  line-height: 1.7;
}

.field:focus-visible {
  outline: 2px solid var(--signal);
  outline-offset: 2px;
}

.submit {
  align-self: flex-start;
  background: none;
  border: 1px solid var(--signal);
  color: var(--signal);
  padding: 6px 16px;
  cursor: pointer;
  font: inherit;
  letter-spacing: inherit;
}

.submit:hover {
  background: var(--signal);
  color: var(--ink-0);
}

.set-block {
  margin-bottom: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  align-items: flex-start;
}

.set-block h3 {
  margin: 0;
}

.upload-url {
  color: var(--signal);
}
</style>
