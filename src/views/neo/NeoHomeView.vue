<script setup>
// 首页：星轨首屏 + 「星图」目录
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import HorizonHero from '../../components/neo/HorizonHero.vue'
import { loadPosts } from '../../lib/posts.js'
import { records } from '../../config/records.js'
import { content } from '../../lib/content.js'
import { onLens } from '../../lib/lens.js'
import { N } from '../../config/narrative.js'

const router = useRouter()
const posts = ref([])

const DESC = {
  '/blog': '技术、设计与记录',
  '/updates': '随手记下的近况',
  '/records': '一路听过的歌',
  '/projects': '做出并仍在运行的东西',
  '/wall': '访客留下的留言',
  '/about': '关于我的一些事',
}

const descent = computed(() => N.nav.slice(1).map((n) => ({ ...n, desc: DESC[n.to] || '' })))

const now = computed(() => ({
  writing: posts.value[0] || null,
  listening: (records.songs || [])[0] || null,
  building: content.projects[0] || null,
}))

function onSelect(p) {
  if (p?.slug) router.push(`/blog/${p.slug}`)
}

onMounted(async () => {
  posts.value = await loadPosts()
})
</script>

<template>
  <div>
    <HorizonHero :posts="posts" :now="now" @select="onSelect" />

    <section class="neo-shell descent">
      <p class="neo-eyebrow head">{{ N.descentHead }}</p>

      <nav class="list" aria-label="星图目录">
        <RouterLink v-for="item in descent" :key="item.to" :to="item.to" class="row neo-lens" @pointermove="onLens">
          <span class="bar" aria-hidden="true"></span>
          <span class="code neo-mono" aria-hidden="true">{{ item.code }}</span>
          <span class="label">{{ item.label }}</span>
          <span class="desc">{{ item.desc }}</span>
          <span class="arrow" aria-hidden="true">→</span>
        </RouterLink>
      </nav>
    </section>
  </div>
</template>

<style scoped>
.descent {
  position: relative;
  z-index: 2;
  padding-top: var(--space-4);
}

.head {
  margin-bottom: var(--space-2);
}

.list {
  display: flex;
  flex-direction: column;
}

.row {
  display: grid;
  grid-template-columns: 4ch minmax(0, auto) 1fr auto;
  align-items: baseline;
  gap: var(--space-2);
  padding: var(--space-2) 0;
  border-top: 1px solid var(--line);
  text-decoration: none;
  color: inherit;
}

.row:last-child {
  border-bottom: 1px solid var(--line);
}

.code {
  font-size: 11px;
  opacity: 0.6;
}

.label {
  font-family: var(--font-display);
  font-size: clamp(24px, 3.4vw, 34px);
  font-weight: 700;
  letter-spacing: -0.01em;
  transition: color 0.24s, transform 0.34s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.row:hover .label {
  color: var(--cold);
  transform: translateX(10px);
}

.desc {
  color: var(--text-1);
  font-size: 14px;
}

.arrow {
  color: var(--text-1);
  transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), color 0.2s;
}

.row:hover .arrow {
  transform: translateX(6px);
  color: var(--cold);
}

@media (max-width: 720px) {
  .row {
    grid-template-columns: 4ch 1fr auto;
    gap: 10px;
  }
  .desc {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .row:hover .label,
  .row:hover .arrow {
    transform: none;
  }
}
</style>
