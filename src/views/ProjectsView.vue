<script setup>
// 新版项目页：卡片栅格（卡面走共用基元 .neo-card）+ 冷色光带
// 卡片点开的是玻璃介绍面板（Teleport 出 main，与两处灯箱同一套模态规矩）；仓库外链收进面板里那枚按钮
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { content } from '../lib/content.js'
import { onLens } from '../lib/lens.js'
import { trapFocus } from '../lib/focus.js'
import { N, navLabel } from '../config/narrative.js'

const cur = ref(null) // 面板里那一个项目，null = 关
const panelEl = ref(null)
let trap = null

const tally = computed(() => N.projects.count.replace('{n}', String(content.projects.length)))

function open(p) {
  cur.value = p
}
function close() {
  cur.value = null
}

// 面板是模态：打开时锁 Tab、锁页面滚动，关闭后焦点回到那张卡（focus.js 的释放函数负责还）
watch(cur, async (p) => {
  document.body.style.overflow = p ? 'hidden' : ''
  if (p) {
    await nextTick()
    trap = trapFocus(panelEl.value)
  } else {
    trap?.()
    trap = null
  }
})

function onKey(e) {
  if (cur.value && e.key === 'Escape') close()
}

onMounted(() => addEventListener('keydown', onKey))
onUnmounted(() => {
  removeEventListener('keydown', onKey)
  trap?.()
  document.body.style.overflow = '' // 面板还开着就换页：别让滚动锁死在别的页面上
})
</script>

<template>
  <section class="neo-shell">
    <p class="neo-eyebrow">{{ N.sections.projects }}</p>
    <h2 class="neo-h2">{{ navLabel('/projects') }}</h2>
    <p class="neo-lede">{{ N.hints.projects }}</p>
    <p class="tally neo-mono">{{ tally }} · {{ N.projects.open }}</p>

    <ul class="neo-cards">
      <li v-for="p in content.projects" :key="p.name">
        <button
          class="neo-card neo-lens open"
          type="button"
          :aria-label="p.name"
          aria-haspopup="dialog"
          :aria-expanded="cur === p"
          @pointermove="onLens"
          @click="open(p)"
        >
          <span class="bar" aria-hidden="true"></span>
          <span class="year neo-mono">{{ p.year }}</span>
          <span class="name">{{ p.name }}</span>
          <span class="desc">{{ p.desc }}</span>
          <span v-if="p.stack" class="stack neo-mono">{{ p.stack }}</span>
        </button>
      </li>
      <li v-if="!content.projects.length" class="empty neo-mono">{{ N.empty.projects }}</li>
    </ul>

    <!-- 面板必须 Teleport 出 main：main 是 z-index:2 的层叠上下文，框里的关闭按钮会被顶栏（z 60）
         压住、点不到——/gallery 那盏灯箱为同样的事踩过一次 -->
    <Teleport to="body">
      <div
        v-if="cur"
        ref="panelEl"
        class="pj"
        role="dialog"
        aria-modal="true"
        :aria-label="cur.name"
        tabindex="-1"
      >
        <span class="pj-bg" aria-hidden="true" @click="close"></span>
        <article class="pj-panel">
          <button class="pj-x" type="button" :aria-label="N.lightbox.close" @click="close">
            <span class="neo-ico" aria-hidden="true">✕</span>
          </button>
          <p class="neo-eyebrow">{{ cur.year }}</p>
          <h3 class="neo-h2">{{ cur.name }}</h3>
          <p class="neo-lede">{{ cur.desc }}</p>

          <div v-if="cur.detail" class="neo-prose">
            <p v-for="(d, i) in cur.detail" :key="i">{{ d }}</p>
          </div>

          <template v-if="cur.points && cur.points.length">
            <p class="pj-eyebrow neo-eyebrow">{{ N.projects.points }}</p>
            <div class="neo-prose">
              <ul>
                <li v-for="(pt, i) in cur.points" :key="i">{{ pt }}</li>
              </ul>
            </div>
          </template>

          <template v-if="cur.stack">
            <p class="pj-eyebrow neo-eyebrow">{{ N.projects.stack }}</p>
            <p class="pj-stack">{{ cur.stack }}</p>
          </template>

          <a
            class="neo-btn neo-btn-ghost pj-repo"
            :href="cur.url"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ N.projects.repo }}<span class="arrow" aria-hidden="true">↗</span>
          </a>
        </article>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.neo-shell {
  padding-top: 120px;
}

.tally {
  margin: calc(-1 * var(--space-2)) 0 var(--space-3);
  color: var(--text-1);
  font-size: var(--fs-2xs);
  letter-spacing: 0.16em;
}

/* 卡面（边/角/底/hover/内边距）全在 .neo-card 里，这里只留卡内排版。
   卡从 <a> 换成 <button> 之后要扳回三件事：按钮不继承字体、不自带左对齐、不撑满 li。 */
.open {
  width: 100%;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}

.open:focus-visible {
  outline: 2px solid var(--cold);
  outline-offset: 4px;
}

.year {
  color: var(--hot);
  font-size: var(--fs-3xs);
  transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.neo-card:hover .year {
  transform: scale(1.08);
}

.name {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(20px, 2.8vw, 26px);
  font-weight: var(--fw-bold);
  letter-spacing: -0.01em;
  line-height: var(--lh-tight);
  transition:
    color 0.24s,
    transform 0.32s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.neo-card:hover .name {
  color: var(--cold);
  transform: translateX(var(--space-1));
}

.desc {
  margin: 0;
  color: var(--text-1);
  font-size: var(--fs-sm);
  line-height: var(--lh-normal);
}

/* 卡脚那一行留给技术栈：它是"值不值得点开"的线索，点开之后面板里还有整段 */
.stack {
  margin-top: auto;
  padding-top: var(--space-1);
  color: var(--cold);
  font-size: var(--fs-3xs);
}

/* ---------- 介绍面板 ----------
   皮三处全取自站内既有的东西，一处不新造：
     遮罩 = 顶栏抽屉那套（--ink-0 88% + blur 24）
     板面 = .neo-card 的边与底（--card-brd / --card-bg）+ §6c 阅读底板那枚阴影
     正文 = 直接挂 .neo-eyebrow / .neo-h2 / .neo-lede / .neo-prose，栏宽沿用 §6c 的 --measure 算法
   原先这里套的是 /gallery 灯箱那套（78% 糊底 + 55% 玻璃板 + 框底一行按键提示），那是看照片的皮：
   浅色主题下 --ink-0 是近白，糊底成了奶白雾、板子与它同色到读不出边；而面板自己是内滚容器，
   会被 neo.css 那条不限容器的 ::-webkit-scrollbar-thumb 套上第二条朱砂滚动条，正贴在卡的右边缘。
   所以滚动交给浮层本身——满屏只有视口右缘那一条热色滚动条，与平时浏览时看到的是同一根。 */
.pj {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: var(--space-4) var(--space-3);
}

.pj-bg {
  position: fixed;
  inset: 0;
  background: color-mix(in srgb, var(--ink-0) 88%, transparent);
  -webkit-backdrop-filter: blur(24px);
  backdrop-filter: blur(24px);
}

.pj-panel {
  --measure: calc(var(--prose-size) * 44); /* 与 §6c 同一条：字号与栏宽一起长，一行恒 44 个汉字 */
  position: relative;
  z-index: 1;
  margin: auto; /* 浮层滚动时把板子顶到中间，比 align-items: center 安全：内容超高不会被裁掉上沿 */
  width: calc(var(--measure) + var(--space-3) * 2); /* 正文栏 + 左右内边距，卡内那一栏正好铺满 */
  max-width: 100%;
  padding: var(--space-4) var(--space-3) var(--space-3);
  border: 1px solid var(--card-brd);
  border-radius: var(--r-md);
  background: var(--card-bg);
  box-shadow: 0 22px 60px -34px var(--shadow, rgba(0, 0, 0, 0.6));
  animation: pj-in 0.34s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

@keyframes pj-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

/* 关闭件：顶栏抽屉那枚 .drawer-close 的形态（32px 圆胶囊、发丝描边、单字符 ✕），
   挂在板子里而不是屏幕角——抽屉也是这么办的 */
.pj-x {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: var(--r-pill);
  background: transparent;
  color: var(--text-0);
  font-size: var(--fs-sm);
  line-height: 1;
  cursor: pointer;
  transition:
    color 0.2s,
    border-color 0.2s;
}

.pj-x:hover {
  color: var(--cold);
  border-color: var(--card-brd-hover);
}

.pj-x:focus-visible {
  outline: 2px solid var(--cold);
  outline-offset: 2px;
}

/* 面板里的两块眉标：站在 .neo-prose 外面，才不用与它的 `p { margin }` 抢层叠
   （那条规则带皮肤前缀，是 (0,3,1)，页面 scoped 抢不过） */
.pj-eyebrow {
  margin: var(--space-4) 0 0;
}

.pj-stack {
  margin: var(--space-2) 0 0;
  color: var(--text-0);
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  line-height: var(--lh-snug);
}

.pj-repo {
  margin-top: var(--space-4);
}

.pj-repo .arrow {
  transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.pj-repo:hover .arrow {
  transform: translate(3px, -3px);
}

@media (max-width: 720px) {
  .pj {
    padding: var(--space-2) var(--space-2);
  }
}

@media (prefers-reduced-motion: reduce) {
  .neo-card:hover .year,
  .neo-card:hover .name,
  .pj-repo:hover .arrow {
    transform: none;
  }
  .pj-panel {
    animation: none;
  }
}
</style>
