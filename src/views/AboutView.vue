<script setup>
// 新版观测者：第一人称自述 + 三枚读数 + 事实发丝表 + 技术栈 + 社交/友链
import { computed, onMounted, ref } from 'vue'
import { content } from '../data/index.js'
import { loadPosts } from '../lib/posts.js'
import { onLens } from '../lib/lens.js'
import { N, navLabel } from '../data/narrative.js'

// 头像与友链都从 content 这道门取（头像地址在 site.avatar，换图只改 src/data/site.js）
const { friends } = content

const facts = [
  { k: 'OBSERVER', v: () => content.site.author },
  { k: 'LOC', v: () => content.site.location },
  { k: 'COORDS', v: () => content.site.coords },
]

/* 三枚读数全部从文章表现算，不另开接口。
   还没算出来时显示 --：把"没算到"说成"一个都没有"，是本站明令要分开的那两件事 */
const posts = ref([])
const counted = ref(false)
onMounted(async () => {
  posts.value = await loadPosts()
  counted.value = true
})

const stats = computed(() => {
  const tags = new Set()
  let words = 0
  for (const p of posts.value) {
    for (const t of p.tags || []) tags.add(t)
    words += Number(p.words) || 0
  }
  const show = (n) => (counted.value ? n : '--')
  return [
    { k: '文章 · POSTS', v: show(posts.value.length) },
    { k: '标签 · TAGS', v: show(tags.size) },
    { k: '总字数 · WORDS', v: show(words.toLocaleString('en-US')) },
  ]
})
</script>

<template>
  <section class="en-shell">
    <header class="en-head">
      <h2 class="en-h2">{{ navLabel('/about') }}</h2>
    </header>

    <!-- 自述：头像 + 长段第一人称，满宽一张 -->
    <div class="en-card wide en-lens" @pointermove="onLens">
      <p class="en-eyebrow">自述</p>
      <div class="bio-row">
        <!-- 头像地址在 site.avatar：显式声明宽高，图到达前就占好位 -->
        <img
          v-if="content.site.avatar"
          class="avatar"
          :src="content.site.avatar"
          :alt="`${content.site.author} 的头像`"
          width="132"
          height="132"
          loading="lazy"
          decoding="async"
        />
        <p class="bio">{{ N.aboutBio }}</p>
      </div>
    </div>

    <!-- 三枚读数：文章表现算，没有新接口 -->
    <ul class="stats">
      <li v-for="s in stats" :key="s.k" class="en-card stat en-lens" @pointermove="onLens">
        <span class="sv">{{ s.v }}</span>
        <span class="sk en-mono">{{ s.k }}</span>
      </li>
    </ul>

    <div class="en-cards">
      <div class="en-card en-lens" @pointermove="onLens">
        <p class="en-eyebrow">档案</p>
        <dl class="facts">
          <div v-for="f in facts" :key="f.k" class="fact">
            <dt class="en-mono">{{ f.k }}</dt>
            <dd>{{ f.v() }}</dd>
          </div>
        </dl>
      </div>

      <div class="en-card en-lens" @pointermove="onLens">
        <p class="en-eyebrow">社交</p>
        <ul class="links">
          <li v-for="s in content.site.socials" :key="s.label">
            <a class="link" :href="s.url" target="_blank" rel="noopener noreferrer">
              {{ s.label }}<span class="arrow" aria-hidden="true">↗</span>
            </a>
          </li>
          <li>
            <a class="link" :href="`mailto:${content.site.email}`">
              Mail · {{ content.site.email }}<span class="arrow" aria-hidden="true">↗</span>
            </a>
          </li>
        </ul>
      </div>

      <div class="en-card wide en-lens" @pointermove="onLens">
        <p class="en-eyebrow">友链</p>
        <ul class="links">
          <li v-for="f in friends" :key="f.url">
            <a class="link" :href="f.url" target="_blank" rel="noopener noreferrer">
              {{ f.label }}<span class="arrow" aria-hidden="true">↗</span>
            </a>
          </li>
        </ul>
      </div>
    </div>

    <!-- 技术栈：每项一枚卡，名字 + 它在这一站里干什么。
         一行放多枚（auto-fill 按 190px 起排），不锁两列——5 条锁两列就会落单 -->
    <p class="en-eyebrow sec">技术栈</p>
    <div class="gears">
      <div v-for="g in content.site.gear" :key="g.name" class="en-card gear en-lens" @pointermove="onLens">
        <h3 class="gn">{{ g.name }}</h3>
        <p v-if="g.note" class="gno">{{ g.note }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.en-shell {
  padding-top: var(--page-top);
}

/* 满宽那张（友链）横跨两列：链接会一条条加，单列摆不满反而显得空 */
.wide {
  grid-column: 1 / -1;
}

.en-card > .en-eyebrow {
  margin-bottom: var(--space-1);
}

.bio-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}

.avatar {
  width: 132px;
  height: 132px;
  aspect-ratio: 1; /* 与 HTML 的 width/height 一致：任何取值下都保持正方形 */
  flex-shrink: 0;
  object-fit: cover;
  border: 1px solid var(--line);
  border-radius: var(--r-md); /* 全站图片同一个圆角，不吃 hover 动效 */
}

.bio {
  max-width: var(--measure);
  margin: 0;
  font-family: var(--font-serif);
  font-size: var(--fs-xl);
  line-height: var(--lh-relaxed);
}

.facts {
  margin: 0;
}

.fact {
  display: grid;
  grid-template-columns: 12ch 1fr;
  gap: var(--space-2);
  padding: var(--space-1) 0;
  border-top: 1px solid var(--line);
}

.fact:last-child {
  border-bottom: 1px solid var(--line);
}

.fact dt {
  padding-top: var(--space-0);
}

.fact dd {
  margin: 0;
  font-size: var(--fs-md);
  overflow-wrap: anywhere;
}

/* 读数一排三枚：与首页精选同一条 900px 断点，不新造一档。
   上下各留一档 16：自述卡是满宽的独立卡，不在栅格里，拿不到 .en-cards 的 gap */
.stats {
  list-style: none;
  margin: var(--space-2) 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-2);
}

.stat {
  min-height: 0;
  align-items: center;
  gap: var(--space-0);
  padding: var(--space-2);
  text-align: center;
}

.sv {
  font-family: var(--font-display);
  font-size: clamp(30px, 4vw, 44px);
  font-weight: var(--fw-bold);
  line-height: 1.1;
  color: var(--text-0);
}

.sk {
  font-size: var(--fs-3xs);
}

/* 栅格外的小节标（技术栈那一栏的题头）：与卡内 eyebrow 同一形状，只多上下边。
   上边取一档 32——64 会把这一栏从页面上"摘"出去 */
.sec {
  margin: var(--space-3) 0 var(--space-2);
}

.gears {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: var(--space-2);
}

/* 190px 的卡再吃默认 32px 侧边距，正文只剩 134px，一句说明要折四行；收到一档 16 */
.gear {
  min-height: 0;
  gap: var(--space-0);
  padding: var(--space-2);
}

.gn {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--fs-xl);
  font-weight: var(--fw-bold);
  letter-spacing: -0.01em;
}

.gno {
  margin: 0;
  color: var(--text-1);
  font-size: var(--fs-sm);
  line-height: var(--lh-relaxed);
}

.links {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-0);
}

.link {
  position: relative;
  display: inline-flex;
  align-items: baseline;
  gap: var(--space-1);
  width: fit-content;
  font-family: var(--font-display);
  font-size: var(--fs-lg);
  font-weight: var(--fw-bold);
  color: var(--text-0);
  text-decoration: none;
  transition: color var(--dur-fast);
}

/* 下划线由左向右画出 */
.link::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -3px;
  height: 1px;
  background: currentColor;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform var(--dur) cubic-bezier(0.2, 0.8, 0.2, 1);
}

.link:hover::after {
  transform: scaleX(1);
}

.link:hover {
  color: var(--cold);
}

.arrow {
  font-size: var(--fs-xs);
  color: var(--text-1);
  transition: transform var(--dur) cubic-bezier(0.2, 0.8, 0.2, 1), color var(--dur-fast);
}

.link:hover .arrow {
  transform: translate(var(--nudge), var(--lift));
  color: var(--cold);
}

@media (max-width: 900px) {
  .stats {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .fact {
    grid-template-columns: 1fr;
    gap: var(--space-0);
  }
  .bio-row {
    flex-direction: column;
    gap: var(--space-2);
  }
  .bio {
    font-size: var(--fs-lg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .link:hover .arrow {
    transform: none;
  }
}
</style>
