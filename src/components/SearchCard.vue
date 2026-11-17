<script>
// 取数缓存必须落在模块作用域：<script setup> 顶层的 let 是**每实例**局部的，
// 而这张卡每开一次就重挂一个新实例——放那儿等于每次开卡重解析一遍全部文章
let cache = null
</script>

<script setup>
// 搜索卡（2026-11-17 重做）：顶栏「搜索」图标 / 裸按 / / Ctrl⌘+K 点开的那一张。
// 与 MusicCard / SettingsCard 同一模子——Escape 关、点卡外关、焦点陷阱、锁 body 滚动。
// 重做把 320px 单行小票升级成命令面板：宽卡、命中词高亮、摘要与标签、↑↓ 选择 + Enter
// 打开、空输入时给最近搜索。判据不另起一套：与 /blog 同一个 filter（标题+摘要+标签，
// 小写包含）；「搜索词在 URL 里」仍只有归档页一处，浮层不留第二套状态。
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { loadPosts } from '../lib/posts.js'
import { trapFocus } from '../lib/focus.js'
import { KEYS, read, write } from '../lib/storage.js'
import { N } from '../data/narrative.js'

const MAX = 6 // 卡不是归档页：列到第 7 条就该把人交给 /blog
const RECENT_MAX = 6

const emit = defineEmits(['close'])
const route = useRoute()
const router = useRouter()
const cardEl = ref(null)
const inputEl = ref(null)
const listEl = ref(null)
// 在 /blog 打开时接着 URL 那个词（只有归档页带 ?q=）：否则卡里是空的、底下列表却已被筛过
const q = ref(typeof route.query.q === 'string' ? route.query.q : '')

const posts = ref([])
const loading = ref(true)
const sel = ref(0) // 键盘/指针选中的行；输入一变就回 0

// 最近搜索：JSON 数组，读不出/解析不了就当没有（convenience，不炸站）
const recent = ref(readRecent())
function readRecent() {
  try {
    const v = JSON.parse(read(KEYS.recentSearch, '[]'))
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).slice(0, RECENT_MAX) : []
  } catch {
    return []
  }
}
function remember(k) {
  if (!k) return
  recent.value = [k, ...recent.value.filter((x) => x !== k)].slice(0, RECENT_MAX)
  write(KEYS.recentSearch, JSON.stringify(recent.value))
}
function clearRecent() {
  recent.value = []
  write(KEYS.recentSearch, null)
}

const hits = computed(() => {
  const k = q.value.trim().toLowerCase()
  if (!k) return []
  return posts.value.filter((p) => [p.title, p.summary, ...(p.tags || [])].join(' ').toLowerCase().includes(k))
})
const shown = computed(() => hits.value.slice(0, MAX))

// 命中词高亮：按词切段，命中段包 <mark>。用 v-for 渲染文本节点，不走 v-html——
// 文章标题来自内容层，注入 HTML 的路一律不开
const parts = (text) => {
  const k = q.value.trim()
  if (!k) return [{ t: text, hit: false }]
  const lower = text.toLowerCase()
  const kl = k.toLowerCase()
  const out = []
  let i = 0
  for (;;) {
    const j = lower.indexOf(kl, i)
    if (j < 0) {
      out.push({ t: text.slice(i), hit: false })
      break
    }
    if (j > i) out.push({ t: text.slice(i, j), hit: false })
    out.push({ t: text.slice(j, j + k.length), hit: true })
    i = j + k.length
  }
  return out.filter((p) => p.t)
}

const status = computed(() => {
  if (loading.value) return N.search.loading
  if (!q.value.trim()) return N.search.idle
  return hits.value.length ? N.search.hits.replace('{n}', hits.value.length) : N.empty.search
})

function openPost(p) {
  remember(q.value.trim())
  router.push(`/blog/${p.slug}`)
}
// Enter 不猜"第一条是不是你要的那篇"：没选中行时带着词进归档页；选中了行就开那篇
function onEnter() {
  const k = q.value.trim()
  if (!k) return
  if (shown.value[sel.value]) openPost(shown.value[sel.value])
  else router.push({ path: '/blog', query: { q: k } })
}
function goAll() {
  remember(q.value.trim())
  router.push({ path: '/blog', query: { q: q.trim() } })
}
function pickRecent(k) {
  q.value = k
  sel.value = 0
  inputEl.value?.focus()
}

function onKey(e) {
  if (e.key === 'Escape') return emit('close')
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    if (!shown.value.length) return
    e.preventDefault()
    const n = shown.value.length
    sel.value = (sel.value + (e.key === 'ArrowDown' ? 1 : -1) + n) % n
    nextTick(() => {
      listEl.value?.querySelectorAll('.r-row')[sel.value]?.scrollIntoView({ block: 'nearest' })
    })
  }
}
// 点卡外即收；那枚开合按钮归它自己管，否则 toggle 会紧接着再开一次，卡永远关不上
function onDoc(e) {
  if (!cardEl.value || cardEl.value.contains(e.target)) return
  if (e.target.closest && e.target.closest('.search-btn')) return
  emit('close')
}

watch(q, () => (sel.value = 0))

let trap = null
onMounted(async () => {
  addEventListener('keydown', onKey)
  addEventListener('pointerdown', onDoc, true)
  document.body.style.overflow = 'hidden'
  await nextTick() // 等真实节点挂上再设陷阱，与抽屉同一条
  trap = trapFocus(cardEl.value)
  cache = cache || loadPosts()
  posts.value = await cache
  loading.value = false
})
onUnmounted(() => {
  removeEventListener('keydown', onKey)
  removeEventListener('pointerdown', onDoc, true)
  document.body.style.overflow = ''
  trap?.()
})
// 顶栏不随路由换，卡是自己那一层：换了页它就该不在（点结果行、点底部链接、键盘走掉都算）
watch(() => route.fullPath, () => emit('close'))
</script>

<template>
  <div ref="cardEl" id="en-search" class="card" role="dialog" :aria-label="N.search.aria">
    <div class="head">
      <svg class="lead en-svg" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="10.8" cy="10.8" r="6.6" />
        <path d="m15.6 15.6 4.4 4.4" />
      </svg>
      <input
        ref="inputEl"
        v-model="q"
        class="field"
        type="search"
        :placeholder="N.search.placeholder"
        :aria-label="N.search.aria"
        role="combobox"
        aria-controls="en-search"
        :aria-activedescendant="shown.length ? `sr-${sel}` : undefined"
        autocomplete="off"
        @keydown.enter="onEnter"
      />
      <button class="close" type="button" :aria-label="N.search.close" @click="emit('close')">
        <span class="en-ico" aria-hidden="true">✕</span>
      </button>
    </div>

    <p class="lbl en-mono" aria-live="polite">{{ status }}</p>

    <!-- 空输入：最近搜索（没有历史时只留状态行与键位提示，不造假内容） -->
    <div v-if="!q.trim() && recent.length" class="recent">
      <div class="recent-head">
        <span class="en-mono recent-tt">{{ N.search.recent }}</span>
        <button class="clear en-mono" type="button" @click="clearRecent">{{ N.search.clear }}</button>
      </div>
      <div class="chips">
        <button v-for="k in recent" :key="k" class="chip en-mono" type="button" @click="pickRecent(k)">
          {{ k }}
        </button>
      </div>
    </div>

    <!-- 键盘选择走 combobox 语义：输入框持有 aria-activedescendant，列表是 listbox。
         行本身仍是真链接（指针/读屏直接激活），不改成假 option -->
    <ul v-if="shown.length" ref="listEl" class="rs" role="listbox" :aria-label="N.search.aria">
      <li v-for="(p, i) in shown" :key="p.slug" role="option" :aria-selected="i === sel">
        <RouterLink
          :id="`sr-${i}`"
          :to="`/blog/${p.slug}`"
          class="r-row"
          :class="{ sel: i === sel }"
          @mouseenter="sel = i"
          @click="remember(q.trim())"
        >
          <span class="r-tt">
            <template v-for="(s, j) in parts(p.title)" :key="j"><mark v-if="s.hit">{{ s.t }}</mark><template v-else>{{ s.t }}</template></template>
          </span>
          <span class="r-mt en-mono">{{ p.date }}</span>
          <span v-if="p.summary" class="r-sum">{{ p.summary }}</span>
          <span v-if="p.tags && p.tags.length" class="r-tags">
            <span v-for="t in p.tags.slice(0, 3)" :key="t" class="r-tag en-mono">{{ t }}</span>
          </span>
        </RouterLink>
      </li>
    </ul>

    <button v-if="hits.length > MAX" class="more en-btn en-btn-sm en-btn-ghost" type="button" @click="goAll">
      {{ N.search.all.replace('{n}', hits.length) }}
    </button>

    <div class="keys en-mono" aria-hidden="true">
      <span>{{ N.search.keys }}</span>
      <span v-if="q.trim()">{{ N.search.enter }}</span>
    </div>
  </div>
</template>

<style scoped>
/* 与 MusicCard / SettingsCard 同一条定位：贴在顶栏下沿、右对齐于那排图标之下。
   顶栏本身 position: fixed，所以这张卡跟着视口走，不受 fall 转场给页根加的包含块影响。
   重做后宽 480（命令面板档），窄屏收满页边；卡面取 --card-bg 随「卡片颜色」两档翻。 */
.card {
  position: absolute;
  top: calc(100% + 2px);
  right: var(--space-3);
  z-index: 70;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  width: 480px;
  max-width: calc(100vw - var(--space-3) * 2);
  max-height: min(72vh, 640px);
  padding: var(--space-2);
  border: 1px solid var(--card-brd);
  border-radius: var(--r-md);
  background: var(--card-bg);
  box-shadow: 0 22px 60px -34px var(--shadow, rgba(0, 0, 0, 0.6));
}

.head {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-0) var(--space-1);
  border: 1px solid var(--card-brd);
  border-radius: var(--r-sm);
  background: color-mix(in srgb, var(--ink-1) 55%, transparent);
  transition: border-color var(--dur-fast);
}

.head:focus-within {
  border-color: var(--cold);
}

/* 描边画法与顶栏 .en-svg 同族，但那条是 SiteHeader 的 scoped 样式、到不了这张卡——
   这里必须自带 fill:none + stroke，否则 circle 默认黑填充，放大镜读成一个黑点 */
.lead {
  width: 16px;
  height: 16px;
  color: var(--text-1);
  flex: none;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.field {
  min-width: 0;
  flex: 1;
  border: 0;
  background: none;
  color: var(--text-0);
  font-family: var(--font-sans);
  font-size: var(--fs-md);
  padding: var(--space-1) 0;
  outline: none;
}

.field::placeholder {
  color: var(--text-1);
}

/* 焦点反馈交给外框 :focus-within 的冷色边；输入框自己再套全局 :focus-visible 的
   蓝圈就是双重框。选择器带 .head 压过全局 :focus-visible 的特异度 */
.head .field:focus-visible {
  outline: none;
}

/* 去掉浏览器自带的搜索清除钮：卡里有关闭键，输入框再带一个叉读成两个出口 */
.field::-webkit-search-cancel-button {
  -webkit-appearance: none;
}

.close {
  display: inline-grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--r-sm);
  background: none;
  color: var(--text-1);
  cursor: pointer;
  transition: color var(--dur-fast), border-color var(--dur-fast);
}

.close:hover {
  color: var(--text-0);
  border-color: var(--card-brd-hover);
}

.lbl {
  margin: 0;
  color: var(--text-1);
  font-size: var(--fs-3xs);
  letter-spacing: 0.1em;
}

.recent-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-1);
}

.recent-tt {
  color: var(--text-1);
  font-size: var(--fs-3xs);
  letter-spacing: 0.1em;
}

.clear {
  border: 0;
  background: none;
  padding: 0;
  color: var(--text-1);
  font-size: var(--fs-3xs);
  cursor: pointer;
  transition: color var(--dur-fast);
}

.clear:hover {
  color: var(--hot);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.chip {
  border: 1px solid var(--card-brd);
  border-radius: var(--r-pill);
  background: none;
  color: var(--text-1);
  font-size: var(--fs-3xs);
  padding: 4px 10px;
  cursor: pointer;
  transition: color var(--dur-fast), border-color var(--dur-fast);
}

.chip:hover {
  color: var(--cold);
  border-color: var(--cold);
}

/* 结果列表：自己滚，卡不被长结果撑破 */
.rs {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  min-height: 0;
}

.r-row {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: baseline;
  gap: var(--space-0) var(--space-2);
  padding: var(--space-1);
  border-radius: var(--r-sm);
  color: inherit;
  text-decoration: none;
  transition: background-color var(--dur-fast);
}

.r-row.sel {
  background: color-mix(in srgb, var(--cold) 8%, transparent);
}

.r-tt {
  min-width: 0;
  font-family: var(--font-display);
  font-size: var(--fs-sm);
  font-weight: var(--fw-bold);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color var(--dur-fast);
}

.r-row.sel .r-tt {
  color: var(--cold);
}

/* 命中词：冷色淡底 + 同色字，不靠浏览器默认的黄底（那与全站双色语义打架） */
.r-tt mark {
  background: color-mix(in srgb, var(--cold) 16%, transparent);
  color: var(--cold);
  border-radius: 3px;
  padding: 0 2px;
}

.r-mt {
  flex-shrink: 0;
  font-size: var(--fs-3xs);
  color: var(--text-1);
}

.r-sum {
  grid-column: 1 / -1;
  color: var(--text-1);
  font-size: var(--fs-2xs);
  line-height: var(--lh-snug);
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.r-tags {
  grid-column: 1 / -1;
  display: flex;
  gap: var(--space-0);
}

.r-tag {
  color: var(--text-1);
  font-size: var(--fs-3xs);
  border: 1px solid var(--line);
  border-radius: var(--r-pill);
  padding: 1px 8px;
}

.more {
  align-self: flex-start;
}

.keys {
  display: flex;
  justify-content: space-between;
  gap: var(--space-1);
  border-top: 1px solid var(--line);
  padding-top: var(--space-1);
  color: var(--text-1);
  font-size: var(--fs-3xs);
  letter-spacing: 0.06em;
}

@media (max-width: 720px) {
  .card {
    right: var(--space-2);
    width: calc(100vw - var(--space-2) * 2);
  }
  .r-sum {
    display: none;
  }
}

@media (pointer: coarse) {
  /* 28px 的关闭键保持原样，热区用不可见的 ::before 撑到 44×44 */
  .close {
    position: relative;
  }
  .close::before {
    content: '';
    position: absolute;
    inset: -8px;
  }
}
</style>
