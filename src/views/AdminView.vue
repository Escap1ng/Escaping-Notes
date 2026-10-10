<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, tryApi, uploadFile } from '../lib/api.js'
import { auth, isOwner } from '../lib/auth.js'
import { content, loadContent } from '../lib/content.js'
import { loadPosts } from '../lib/posts.js'

const router = useRouter()
const tab = ref('users')
const users = ref([])
const posts = ref([])
const notice = ref('')
const noticeErr = ref(false)

// 文章编辑器
const ed = ref({ slug: '', title: '', date: '', tags: '', summary: '', image: '', imagePos: '', body: '' })
const bodyRef = ref(null)
const imgInputRef = ref(null)
const images = ref([])

// 设置页签（行式编辑，格式见各占位提示）
const updatesForm = ref('')
const projectsForm = ref('')
const gearForm = ref('')
const playlistForm = ref('')
const uploadUrl = ref('')

const tabs = computed(() => {
  const t = [{ id: 'users', label: '用户' }]
  if (isOwner()) t.push({ id: 'posts', label: '文章' }, { id: 'settings', label: '设置' })
  return t
})

function flash(s, err = false) {
  notice.value = s
  noticeErr.value = err
  setTimeout(() => (notice.value = ''), 1800)
}

function fillForms() {
  updatesForm.value = content.updates.map((u) => `${u.date} | ${u.text}`).join('\n')
  projectsForm.value = content.projects.map((p) => `${p.name}|${p.desc}|${p.year}|${p.url}`).join('\n')
  gearForm.value = content.gear.map((g) => (g.note ? `${g.name}|${g.note}` : g.name)).join('\n')
  playlistForm.value = content.playlist.map((p) => `${p.title}|${p.artist}|${p.file}`).join('\n')
}

async function refresh() {
  users.value = (await api('/api/users')) || []
  posts.value = await loadPosts()
  fillForms()
  if (isOwner()) loadImages()
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

// ---------- 文章 ----------
function newPost() {
  ed.value = {
    slug: '',
    title: '',
    date: new Date().toISOString().slice(0, 10),
    tags: '',
    summary: '',
    image: '',
    imagePos: '',
    body: '',
  }
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
      image: r.meta.image || '',
      imagePos: r.meta.imagePos || '',
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
    image: ed.value.image.trim(),
    imagePos: ed.value.imagePos.trim(),
    content: ed.value.body,
  }
  const r = ed.value.slug
    ? await tryApi(`/api/posts/${ed.value.slug}`, { method: 'POST', body })
    : await tryApi('/api/posts', { method: 'POST', body })
  // 后端在这里会分「内容不能为空」「标识符不合法」「已有同名文章」，全说成"保存失败"
  // 就等于让站长自己猜（尤其改了 slug 之后撞上 409）
  if (r.ok) {
    flash('文章已保存')
    newPost()
    refresh()
  } else flash(r.reason || '保存失败', true)
}
async function delPost(slug) {
  await api(`/api/posts/${slug}`, { method: 'DELETE' })
  refresh()
}

// ---------- 设置 ----------
const lines = (s) => s.split('\n').map((l) => l.trim()).filter(Boolean)

function newUpdate() {
  const d = new Date().toISOString().slice(0, 10)
  updatesForm.value = `${d} | \n` + updatesForm.value
}

function newProject() {
  const y = new Date().getFullYear()
  projectsForm.value = `新项目 | 项目描述 | ${y} | #\n` + projectsForm.value
}

// 四个内容保存走同一条路：成了就重取内容并回填表单，败了把后端那句话说出来。
// 原来写成 `if (await api(...)) { … }` 且没有 else——保存失败时界面完全没反应，
// 是 T2 那类"塌成 null 就没人报告"的另一面。
async function saveContent(key, arr, label) {
  const r = await tryApi(`/api/content/${key}`, { method: 'PUT', body: arr })
  if (!r.ok) return flash(r.reason || '保存失败', true)
  await loadContent()
  fillForms()
  flash(label)
}

async function saveUpdates() {
  // 按日期倒序（新→旧），保证时间线有序，便于管理
  const arr = lines(updatesForm.value)
    .map((l) => {
      const [date, ...rest] = l.split('|')
      return { date: (date || '').trim(), text: rest.join('|').trim() }
    })
    .sort((a, b) => b.date.localeCompare(a.date))
  await saveContent('updates', arr, '动态已保存')
}
// ---------- 图片管理 ----------
const imgName = (x) => x.name.replace(/\.[a-z0-9]+$/i, '')

function insertAtCursor(md) {
  const el = bodyRef.value
  const s = el?.selectionStart ?? ed.value.body.length
  const e = el?.selectionEnd ?? s
  ed.value.body = ed.value.body.slice(0, s) + md + ed.value.body.slice(e)
  nextTick(() => {
    if (!el) return
    el.focus()
    el.selectionStart = el.selectionEnd = s + md.length
  })
}

function insertImage(x) {
  insertAtCursor(`![${imgName(x)}](${x.url})`)
  flash('已插入正文光标处')
}

function setCover(x) {
  ed.value.image = x.url
  flash('已设为封面，保存后生效')
}

async function loadImages() {
  const list = (await api('/api/uploads')) || []
  images.value = list.filter((x) => x.kind === 'image')
}

// 两处上传（正文插图、附件）走同一条通道：令牌、超时、失败原因都由 lib/api.js 负责。
// 此前这里是裸 fetch 手拼 Bearer——全站唯一不受取数层契约保护的调用点（缺陷 T4）。
async function uploadFrom(e, after) {
  const f = e.target.files[0]
  e.target.value = '' // 先清空：否则连续选同一个文件不再触发 change
  if (!f) return
  const r = await uploadFile('/api/upload', f)
  if (r.ok && r.data?.url) after(r.data.url, f)
  else flash(r.reason || '上传失败', true)
}

async function onImgFile(e) {
  await uploadFrom(e, (url, f) => {
    insertAtCursor(`![${f.name.replace(/\.[a-z0-9]+$/i, '')}](${url})`)
    flash('图片已上传并插入')
    loadImages()
  })
}

async function delImage(x) {
  await api(`/api/uploads/${x.name}`, { method: 'DELETE' })
  loadImages()
}
async function saveProjects() {
  const arr = lines(projectsForm.value).map((l) => {
    const [name, desc, year, url] = l.split('|')
    return { name: name || '', desc: desc || '', year: year || '', url: url || '#' }
  })
  await saveContent('projects', arr, '项目已保存')
}
async function saveGear() {
  const arr = lines(gearForm.value).map((l) => {
    const [name, note] = l.split('|')
    return { name: name || '', note: note || '' }
  })
  await saveContent('gear', arr, '装备已保存')
}
async function savePlaylist() {
  const arr = lines(playlistForm.value).map((l) => {
    const [title, artist, file] = l.split('|')
    return { title: title || '', artist: artist || '', file: file || '' }
  })
  await saveContent('playlist', arr, '歌单已保存')
}

// ---------- 上传 ----------
async function onFile(e) {
  await uploadFrom(e, (url) => {
    uploadUrl.value = url
    flash('上传成功，URL 已填出')
  })
}
</script>

<template>
  <section class="page admin-page">
    <p class="readout page-code">// ADMIN · {{ auth.user?.role }}</p>
    <h2 class="page-title">管理界面</h2>

    <nav class="tabs" aria-label="管理页签">
      <button
        v-for="t in tabs"
        :key="t.id"
        class="neo-chip"
        :class="{ on: tab === t.id }"
        :aria-pressed="tab === t.id"
        @click="tab = t.id"
      >
        {{ t.label }}
      </button>
      <span v-if="notice" :class="noticeErr ? 'neo-note-err' : 'neo-note-ok'">// {{ notice }}</span>
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
              <template v-if="isOwner() && u.role !== 'owner' && u.role !== 'admin'">
                <button class="neo-btn neo-btn-sm neo-btn-ghost" @click="setRole(u, 'admin')">任为管理</button>
              </template>
              <button v-if="u.role !== 'owner'" class="neo-btn neo-btn-sm neo-btn-ghost" @click="setBan(u, !u.ban)">
                {{ u.ban ? '解禁' : '禁用' }}
              </button>
              <button v-if="u.role !== 'owner'" class="neo-btn neo-btn-sm neo-btn-danger" @click="delUser(u)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>

    <!-- 文章（站长） -->
    <div v-if="tab === 'posts' && isOwner()">
      <ul class="mini-list posts-list">
        <li v-for="p in posts" :key="p.slug" class="mini-row">
          <span class="readout">{{ p.date }}</span>
          <span class="mini-text">{{ p.title }}</span>
          <button class="neo-btn neo-btn-sm neo-btn-ghost" @click="editPost(p)">编辑</button>
          <button class="neo-btn neo-btn-sm neo-btn-danger" @click="delPost(p.slug)">删除</button>
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
        <div class="ed-row">
          <input v-model="ed.image" class="field mono" placeholder="封面 /uploads/… 或 https://…" />
          <input v-model="ed.imagePos" class="field mono" placeholder="焦点 object-position，如 50% 30%" />
        </div>
        <textarea ref="bodyRef" v-model="ed.body" class="field mono" rows="14" placeholder="Markdown 正文 *" required></textarea>
        <div class="ed-row">
          <input ref="imgInputRef" type="file" accept="image/*" hidden @change="onImgFile" />
          <button class="neo-btn neo-btn-ghost" type="button" @click="imgInputRef?.click()">上传图片并插入</button>
        </div>
        <button class="neo-btn neo-btn-primary" type="submit">保存文章</button>
      </form>

      <h3 class="readout ed-head">// IMAGES · 已上传图片</h3>
      <ul v-if="images.length" class="img-grid">
        <li v-for="x in images" :key="x.name" class="img-cell">
          <img :src="x.url" :alt="x.name" loading="lazy" />
          <span class="readout img-name">{{ x.name }}</span>
          <span class="acts">
            <button class="neo-btn neo-btn-sm neo-btn-ghost" type="button" @click="insertImage(x)">插入</button>
            <button class="neo-btn neo-btn-sm neo-btn-ghost" type="button" @click="setCover(x)">设为封面</button>
            <button class="neo-btn neo-btn-sm neo-btn-danger" type="button" @click="delImage(x)">删除</button>
          </span>
        </li>
      </ul>
      <p v-else class="readout">// 暂无图片</p>
    </div>

    <!-- 设置（站长） -->
    <div v-if="tab === 'settings' && isOwner()">
      <div class="set-block">
        <h3 class="readout">// UPDATES · 每行 date | text</h3>
        <textarea v-model="updatesForm" class="field mono" rows="6"></textarea>
        <div class="ed-row">
          <button class="neo-btn neo-btn-primary" type="button" @click="saveUpdates">保存动态</button>
          <button class="neo-btn neo-btn-ghost" type="button" @click="newUpdate">＋ 新增动态</button>
        </div>
      </div>
      <div class="set-block">
        <h3 class="readout">// PROJECTS · 每行 name|desc|year|url</h3>
        <textarea v-model="projectsForm" class="field mono" rows="6"></textarea>
        <div class="ed-row">
          <button class="neo-btn neo-btn-primary" type="button" @click="saveProjects">保存项目</button>
          <button class="neo-btn neo-btn-ghost" type="button" @click="newProject">＋ 新增项目</button>
        </div>
      </div>
      <div class="set-block">
        <h3 class="readout">// GEAR · 每行 name|说明</h3>
        <textarea v-model="gearForm" class="field mono" rows="5"></textarea>
        <button class="neo-btn neo-btn-primary" @click="saveGear">保存装备</button>
      </div>
      <div class="set-block">
        <h3 class="readout">// PLAYLIST · 每行 title|artist|file(/uploads/…)</h3>
        <textarea v-model="playlistForm" class="field mono" rows="4"></textarea>
        <button class="neo-btn neo-btn-primary" @click="savePlaylist">保存歌单</button>
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
  gap: var(--space-1);
  align-items: center;
  margin-bottom: var(--space-3);
  flex-wrap: wrap;
  border-bottom: 1px solid var(--line);
  padding-bottom: var(--space-2);
}

/* 页签用 .neo-chip（等宽仪器文字）；通知贴右，颜色由 .neo-note-ok/err 承担 */
.tabs .neo-note-ok,
.tabs .neo-note-err {
  margin-left: auto;
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
  padding: var(--space-1) var(--space-2);
  border-top: 1px solid var(--line);
}

.grid th {
  border-bottom: 1px solid var(--line);
  font-size: var(--fs-2xs);
  letter-spacing: 0.1em;
  color: var(--text-1);
}

.grid tbody tr {
  transition: background-color 0.18s ease;
}

.grid tbody tr:hover {
  background: color-mix(in srgb, var(--cold) 6%, transparent);
}

.acts {
  display: flex;
  gap: var(--space-1);
  align-items: center;
}

.mini-list {
  list-style: none;
  margin: 0 0 var(--space-3);
  padding: 0;
}

.mini-row {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-1) 0;
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
  align-items: center;
}

.ed-row .field:first-child {
  flex: 2;
  min-width: 200px;
}

.img-grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: var(--space-2);
}

/* 图片格：卡片规范（--card-*），与文章卡同一套令牌 */
.img-cell {
  display: flex;
  flex-direction: column;
  gap: var(--space-0);
  padding: var(--space-1);
  border: 1px solid var(--card-brd);
  border-radius: var(--r-sm);
  background: var(--card-bg);
  transition: border-color 0.2s, background 0.2s, transform 0.2s;
}

.img-cell:hover {
  border-color: var(--card-brd-hover);
  background: var(--card-bg-hover);
  transform: translateY(-2px);
}

.img-cell img {
  width: 100%;
  height: 90px;
  object-fit: cover;
  display: block;
}

.img-name {
  font-size: var(--fs-3xs);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
