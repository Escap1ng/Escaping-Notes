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

    <div class="about-stack">
      <!-- 自述与读数：一张满宽卡。头像在左，右侧是自述与一条三列读数 -->
      <div class="en-card profile en-lens" @pointermove="onLens">
        <p class="en-eyebrow">自述</p>
        <div class="profile-row">
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
          <div class="profile-main">
            <p class="bio">{{ N.aboutBio }}</p>
            <!-- 三枚读数全部从文章表现算，没有新接口 -->
            <ul class="stats">
              <li v-for="s in stats" :key="s.k" class="stat">
                <span class="sv">{{ s.v }}</span>
                <span class="sk en-mono">{{ s.k }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- 档案 / 社交 / 友链：一张卡三组，桌面三列、窄屏叠成一列 -->
      <div class="en-card info en-lens" @pointermove="onLens">
        <div class="info-col">
          <p class="en-eyebrow">档案</p>
          <dl class="facts">
            <div v-for="f in facts" :key="f.k" class="fact">
              <dt class="en-mono">{{ f.k }}</dt>
              <dd>{{ f.v() }}</dd>
            </div>
          </dl>
        </div>

        <div class="info-col">
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

        <div class="info-col">
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

      <!-- 技术栈：一张卡内 2×2，不再一项一张卡 -->
      <div class="en-card tech en-lens" @pointermove="onLens">
        <p class="en-eyebrow">技术栈</p>
        <div class="gears">
          <div v-for="g in content.site.gear" :key="g.name" class="gear">
            <h3 class="gn">{{ g.name }}</h3>
            <p v-if="g.note" class="gno">{{ g.note }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.en-shell {
  padding-top: var(--page-top);
}

/* 关于页没有导语，页头卡与内容之间不必留全站那档 64；收一档让整页成一摞 */
.en-head {
  margin-bottom: var(--space-3);
}

/* 三张满宽卡：自述+读数 / 档案·社交·友链 / 技术栈 */
.about-stack {
  display: grid;
  gap: var(--space-2);
}

.en-card > .en-eyebrow {
  margin-bottom: var(--space-1);
}

/* ---------- 自述 + 读数 ---------- */
.profile {
  min-height: 0;
}

.profile-row {
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

.profile-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.bio {
  max-width: var(--measure);
  margin: 0;
  font-family: var(--font-serif);
  font-size: var(--fs-xl);
  line-height: var(--lh-relaxed);
}

/* 读数不再各占一张卡：卡内一条三列读数，与自述同卡 */
.stats {
  list-style: none;
  margin: 0;
  padding: var(--space-2) 0 0;
  border-top: 1px solid var(--line);
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-2);
}

.stat {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sv {
  font-family: var(--font-display);
  font-size: clamp(30px, 4vw, 44px);
  font-weight: var(--fw-bold);
  line-height: 1.1;
  color: var(--text-0);
  font-variant-numeric: tabular-nums;
}

.sk {
  font-size: var(--fs-3xs);
}

/* ---------- 档案 / 社交 / 友链：一张卡三列 ---------- */
.info {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-2);
  align-items: start;
  min-height: 0;
}

.info-col {
  min-width: 0;
}

.info-col > .en-eyebrow {
  margin-bottom: var(--space-1);
}

.info-col + .info-col {
  border-left: 1px solid var(--line);
  padding-left: var(--space-2);
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

/* ---------- 技术栈：一张卡内 2×2 ---------- */
.tech {
  min-height: 0;
}

.gears {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: var(--space-3);
  row-gap: var(--space-2);
}

.gear {
  min-width: 0;
}

.gear:nth-child(n + 3) {
  padding-top: var(--space-2);
  border-top: 1px solid var(--line);
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
  .info {
    grid-template-columns: 1fr;
  }
  .info-col + .info-col {
    border-left: 0;
    padding-left: 0;
    border-top: 1px solid var(--line);
    padding-top: var(--space-2);
  }
}

@media (max-width: 720px) {
  .profile-row {
    flex-direction: column;
    gap: var(--space-2);
  }
  .bio {
    font-size: var(--fs-lg);
  }
  /* 窄屏读数改三行横排：数字与标签同一行，避免 11,682 在 69px 列里溢出 */
  .stats {
    grid-template-columns: 1fr;
    gap: var(--space-1);
  }
  .stat {
    flex-direction: row;
    align-items: baseline;
    gap: var(--space-1);
  }
  .sv {
    font-size: var(--fs-2xl);
  }
  .fact {
    grid-template-columns: 1fr;
    gap: var(--space-0);
  }
  .gears {
    grid-template-columns: 1fr;
  }
  .gear + .gear {
    padding-top: var(--space-2);
    border-top: 1px solid var(--line);
  }
}

@media (prefers-reduced-motion: reduce) {
  .link:hover .arrow {
    transform: none;
  }
}
</style>
