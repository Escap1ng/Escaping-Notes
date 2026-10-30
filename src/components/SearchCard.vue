<script>
// 取数缓存必须落在模块作用域：<script setup> 顶层的 let 是**每实例**局部的，
// 而这张卡每开一次就重挂一个新实例——放那儿等于每次开卡重解析一遍全部文章
let cache = null
</script>

<script setup>
// 搜索卡：顶栏「搜索」图标点开的那一张。与 MusicCard / SettingsCard 同一模子——
// Escape 关、点卡外关、焦点陷阱、贴在顶栏下沿右对齐（trapFocus 会把焦点交给卡内第一枚
// 可聚焦元素，也就是那格输入框，所以这里不再写 autofocus）。
// 判据不另起一套：与 /blog 那一格同一个 filter（标题 + 摘要 + 标签，小写包含）。
// 卡内只列前 MAX 条，全量交给底部那枚链接——它把词交给 /blog?q=，
// 于是「搜索词在 URL 里」这件事仍然只有归档页一处，浮层不留第二套状态。
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { loadPosts } from '../lib/posts.js'
import { trapFocus } from '../lib/focus.js'
import { N } from '../data/narrative.js'

const MAX = 6 // 320px 的卡不是归档页：列到第 7 条就该把人交给 /blog

const emit = defineEmits(['close'])
const route = useRoute()
const router = useRouter()
const cardEl = ref(null)
// 在 /blog 打开时接着 URL 那个词（只有归档页带 ?q=）：否则卡里是空的、底下列表却已被筛过，
// 同一屏读出两个答案
const q = ref(typeof route.query.q === 'string' ? route.query.q : '')

const posts = ref([])
const loading = ref(true)

const hits = computed(() => {
  const k = q.value.trim().toLowerCase()
  if (!k) return []
  return posts.value.filter((p) => [p.title, p.summary, ...(p.tags || [])].join(' ').toLowerCase().includes(k))
})
const shown = computed(() => hits.value.slice(0, MAX))

const status = computed(() => {
  if (loading.value) return '// 取数中'
  // 空输入那一格把三条出口都写出来：这张卡没有别的提示位，Esc 与 Enter 不写就没人知道
  if (!q.value.trim()) return '// 输入词即筛 · Enter 去列表 · Esc 关闭'
  return hits.value.length ? `// ${hits.value.length} 篇相符 · Enter 去列表` : N.empty.search
})

function onKey(e) {
  if (e.key === 'Escape') emit('close')
}
// Enter 不猜"第一条是不是你要的那篇"：带着词进归档页，那里有封面、标签与整条筛选链
function onEnter() {
  const k = q.value.trim()
  if (k) router.push({ path: '/blog', query: { q: k } })
}
// 点卡外即收；那枚开合按钮归它自己管，否则 toggle 会紧接着再开一次，卡永远关不上
function onDoc(e) {
  if (!cardEl.value || cardEl.value.contains(e.target)) return
  if (e.target.closest && e.target.closest('.search-btn')) return
  emit('close')
}

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
  <div ref="cardEl" id="en-search" class="card" role="dialog" aria-label="搜索文章">
    <div class="head">
      <input
        v-model="q"
        class="en-field"
        type="search"
        placeholder="标题 / 摘要 / 标签"
        aria-label="搜索文章"
        autocomplete="off"
        @keydown.enter="onEnter"
      />
      <button class="close" type="button" aria-label="关闭搜索" @click="emit('close')">
        <span class="en-ico" aria-hidden="true">✕</span>
      </button>
    </div>

    <p class="lbl en-mono" aria-live="polite">{{ status }}</p>

    <ul v-if="shown.length" class="rs">
      <li v-for="p in shown" :key="p.slug">
        <RouterLink :to="`/blog/${p.slug}`" class="r-row">
          <span class="r-tt">{{ p.title }}</span>
          <span class="r-mt en-mono">{{ p.date }}</span>
        </RouterLink>
      </li>
    </ul>

    <RouterLink v-if="hits.length > MAX" :to="{ path: '/blog', query: { q: q.trim() } }" class="more en-btn en-btn-sm en-btn-ghost">
      在文章列表看全部 {{ hits.length }} 篇
    </RouterLink>
  </div>
</template>

<style scoped>
/* 与 MusicCard / SettingsCard 同一条定位与同一张卡面：贴在顶栏下沿、右对齐于那排图标之下。
   顶栏本身 position: fixed，所以这张卡跟着视口走，不受 fall 转场给页根加的包含块影响 */
.card {
  position: absolute;
  top: calc(100% + 2px);
  right: var(--space-3);
  z-index: 70;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  width: 320px;
  max-width: calc(100vw - var(--space-3) * 2);
  padding: var(--space-3);
  border: 1px solid var(--card-brd);
  border-radius: var(--r-md);
  background: var(--ink-0);
  box-shadow: 0 22px 60px -34px var(--shadow, rgba(0, 0, 0, 0.6));
}

.head {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.head .en-field {
  min-width: 0;
  flex: 1;
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
}

.close:hover {
  color: var(--text-0);
  border-color: var(--card-brd-hover);
}

.close {
  transition: color var(--dur-fast) ease, border-color var(--dur-fast) ease;
}

.lbl {
  margin: 0;
  color: var(--text-1);
  font-size: var(--fs-3xs);
  letter-spacing: 0.1em;
}

/* 卡内行：与播放器那张的队列行同一套（发丝分隔 + 序号位换成日期 + 6% 冷底），
   页内曲目表那套左缘标记不在这里复现——那是满宽行的记号 */
.rs {
  list-style: none;
  margin: 0;
  padding: 0;
}

.r-row {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: baseline;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-0);
  border-top: 1px solid var(--line);
  color: inherit;
  text-decoration: none;
  transition: background-color var(--dur-fast) ease;
}

.r-row:hover {
  background: color-mix(in srgb, var(--cold) 6%, transparent);
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

.r-row:hover .r-tt {
  color: var(--cold);
}

.r-mt {
  flex-shrink: 0;
  font-size: var(--fs-3xs);
  color: var(--text-1);
}

.more {
  align-self: flex-start;
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
