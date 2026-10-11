<script setup>
// 项目详情：与文章页同一条路——点卡片走 fall 转场进一页，正文坐在 §6c 那块 .en-glass 上。
// 站内原本已有七种"点开来看看"的容器（文章页 / 映像灯箱 / 插图灯箱 / 曲目表折叠 / 播放器卡 /
// 设置卡 / 抽屉），项目原先是自己又造了一层模态面板；并成文章这一种，容器少一个。
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { content } from '../lib/content.js'
import { findProject } from '../lib/projects.js'
import { useDetailExit } from '../lib/exit.js'
import { N, navLabel } from '../config/narrative.js'

const route = useRoute()
const p = computed(() => findProject(content.projects, route.params.slug))
// 没连上服务器之前不下"没有这个项目"的结论：种子那份先撑着，等 content.ready 说话
const missing = computed(() => content.ready && !p.value)

useDetailExit('/projects')

watch(
  p,
  (v) => {
    // 站名走 content.site.name，不再抄第三份字面量：项目里恰好有一个与站同名的 Escaping Notes，
    // 硬写 "Escaping Notes · Escaping Notes" 读起来像模板坏了
    if (v) document.title = `${v.name} · ${content.site.name}`
  },
  { immediate: true }
)
</script>

<template>
  <section class="en-shell project">
    <div v-if="missing" class="lost">
      <p class="en-eyebrow">{{ N.sections.projects }}</p>
      <h2 class="en-h2">{{ N.projects.lost }}</h2>
      <RouterLink class="en-btn en-btn-ghost" to="/projects">{{ N.projects.back }}</RouterLink>
    </div>

    <article v-else-if="p" class="en-glass">
      <header class="head">
        <p class="en-eyebrow">{{ navLabel('/projects') }} · {{ p.year }}</p>
        <h1 class="en-h2">{{ p.name }}</h1>
        <p class="en-lede">{{ p.desc }}</p>
      </header>

      <div v-if="p.detail" class="en-prose">
        <p v-for="(d, i) in p.detail" :key="i">{{ d }}</p>
      </div>

      <!-- 眉标站在 .en-prose 外面：那条正文规则挂着 html:root 锚点（(0,2,2)），
           页面 scoped 抢不过它的 margin，所以不去抢——与 /projects 面板当初同一处理 -->
      <template v-if="p.points && p.points.length">
        <p class="block-eyebrow en-eyebrow">{{ N.projects.points }}</p>
        <div class="en-prose">
          <ul>
            <li v-for="(pt, i) in p.points" :key="i">{{ pt }}</li>
          </ul>
        </div>
      </template>

      <template v-if="p.stack">
        <p class="block-eyebrow en-eyebrow">{{ N.projects.stack }}</p>
        <p class="stack-line">{{ p.stack }}</p>
      </template>

      <div class="exit">
        <a
          class="en-btn en-btn-ghost"
          :href="p.url"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ N.projects.repo }}<span class="arrow" aria-hidden="true">↗</span>
        </a>
        <RouterLink class="en-btn en-btn-primary" to="/projects">{{ N.projects.back }}</RouterLink>
      </div>
    </article>
  </section>
</template>

<style scoped>
.project {
  /* 与 .post 同一条：页根 1120px 会把 §6c 那块 1280px 的底板夹回 1056px */
  max-width: 1344px;
  padding-top: var(--page-top);
}

.head {
  max-width: var(--measure);
  margin: 0 auto;
}

.lost {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
}

.block-eyebrow {
  max-width: var(--measure);
  margin: var(--space-4) auto 0;
}

.stack-line {
  max-width: var(--measure);
  margin: var(--space-2) auto 0;
  color: var(--text-0);
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  line-height: var(--lh-snug);
}

.exit {
  display: flex;
  justify-content: center;
  gap: var(--space-2);
  margin: var(--space-4) 0 var(--space-2);
}

.arrow {
  transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.exit a:hover .arrow {
  transform: translate(3px, -3px);
}

@media (max-width: 720px) {
  .exit {
    flex-direction: column;
  }
}

@media (prefers-reduced-motion: reduce) {
  .exit a:hover .arrow {
    transform: none;
  }
}
</style>
