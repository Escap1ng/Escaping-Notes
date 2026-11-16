<script setup>
// 新版顶栏：无底色悬浮条 + 吸积环签名 + 等宽深度导航
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { content } from '../data/index.js'
import { theme, toggleTheme } from '../lib/theme.js'
import { music } from '../lib/music.js'
import { debounce } from '../lib/debounce.js'
import { trapFocus } from '../lib/focus.js'
import MusicCard from './MusicCard.vue'
import SettingsCard from './SettingsCard.vue'
import SearchCard from './SearchCard.vue'
import { N } from '../data/narrative.js'

const route = useRoute()

const activeIdx = computed(() =>
  N.nav.findIndex((n) => (n.to === '/' ? route.path === '/' : route.path.startsWith(n.to)))
)

/* 吸顶 */
const stuck = ref(false)
function onScroll() {
  stuck.value = scrollY > 40
}

/* 抽屉 */
const drawer = ref(false)
const drawerEl = ref(null)
let trap = null // 焦点陷阱的释放函数

/* 播放器卡片：顶栏「音乐」按钮点开的那一张（播放控制面全站只此一处） */
const player = ref(false)
/* 设置卡片：顶栏「设置」按钮点开的那一张（目前只有底片模糊滑杆与卡片颜色两档） */
const settings = ref(false)
/* 搜索卡片：顶栏「搜索」按钮点开的那一张（结果行点进文章，全量交给 /blog?q=）。
   这枚钮还接全局快捷键：`/` 或 Ctrl/⌘+K 在任意页面开卡，见 onHotkey */
const search = ref(false)
// 三张卡都挂在顶栏下沿同一条线上，与全屏抽屉一起，任何时刻只开一张
function togglePlayer() {
  drawer.value = false
  settings.value = false
  search.value = false
  player.value = !player.value
}
function toggleDrawer() {
  player.value = false // 三张卡都是右上角的下层，不叠着开
  settings.value = false
  search.value = false
  drawer.value = !drawer.value
}
function toggleSettings() {
  drawer.value = false
  player.value = false
  search.value = false
  settings.value = !settings.value
}
function toggleSearch() {
  drawer.value = false
  player.value = false
  settings.value = false
  search.value = !search.value
}

function closeDrawer() {
  drawer.value = false
}

/* 菜单里每条导航的一句说明：复用 N.hints，首页单独补一条。
   放在这里而不是往 N.nav 里塞字段——那一列同时供顶栏、路由 meta 与构建期静态壳读，
   加字段会让三处都跟着变，而这句话只有菜单用得到。 */
function menuHint(to) {
  if (to === '/') return N.menu.home
  return N.hints[to.slice(1)] || ''
}

/* 抽屉里的快捷操作：先收抽屉，等它退场后再开对应的卡。
   两层浮层同时在场会各自锁一次 body 滚动，后关的那个把 overflow 还成空串时，
   先关的那个还开着——页面就提前能滚了。等 220ms（抽屉退场 0.28s 的主体段）错开。 */
let menuTimer = 0
function fromMenu(which) {
  closeDrawer()
  clearTimeout(menuTimer)
  menuTimer = setTimeout(() => {
    if (which === 'search') search.value = true
    else if (which === 'player') player.value = true
    else if (which === 'settings') settings.value = true
  }, 220)
}
function onDrawerBackdrop(e) {
  // 点空白处即收，点内容区不收
  if (e.target === e.currentTarget) closeDrawer()
}
function onKey(e) {
  if (e.key === 'Escape') closeDrawer()
}

/* 搜索快捷键：`/` 或 Ctrl/⌘+K  anywhere。两条判据：
   ⑴ 输入框 / textarea / contenteditable 里的 `/` 是内容，不能吞——按 tagName 与
      isContentEditable 判，不按 e.target.value 猜；
   ⑵ 带修饰键的 `/`（Ctrl+/ 之类）留给浏览器与输入法，只认裸按。
   Ctrl/⌘+K 不受 ⑴ 限制：它即使在输入框里也不是打字，且"在别处敲过 K 把搜索打开"
   比"输不进 k"坏得多。 */
function onHotkey(e) {
  const t = e.target
  const typing =
    !!t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName || ''))
  const k = e.key.toLowerCase()
  if ((e.ctrlKey || e.metaKey) && !e.altKey && k === 'k') {
    e.preventDefault()
    toggleSearch()
    return
  }
  if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault()
    if (!search.value) toggleSearch()
  }
}
/* 换页即收抽屉。导航链接自己带 @click="closeDrawer"，但浏览器前进/后退、
   程序化跳转、以及"点的是当前页链接"这几种情况都不经过那个 click——
   少这一条的话新页面会盖着一层菜单，读者得再按一次 Esc。 */
watch(
  () => route.path,
  () => closeDrawer()
)

watch(drawer, async (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
  if (open) {
    await nextTick() // 抽屉在 <Transition> 里，等真实节点挂上再设陷阱
    trap = trapFocus(drawerEl.value)
  } else {
    trap?.() // 释放时把焦点还给汉堡按钮
    trap = null
  }
})
// 视口回到宽屏时收起抽屉。阈值与 CSS 的导航折叠断点（1280px）必须一致
const onResize = debounce(() => {
  if (innerWidth > 1280) closeDrawer()
}, 150)

onMounted(() => {
  // 此处不再 applyTheme：首帧已由 index.html 写入 data-theme，
  // 挂载时重复写入会把兜底值当成用户选择永久固化，访客再也改不回"没选过"。
  addEventListener('scroll', onScroll, { passive: true })
  addEventListener('resize', onResize)
  addEventListener('keydown', onKey)
  addEventListener('keydown', onHotkey)
  onScroll()
})

onUnmounted(() => {
  removeEventListener('scroll', onScroll)
  removeEventListener('resize', onResize)
  removeEventListener('keydown', onKey)
  removeEventListener('keydown', onHotkey)
  onResize.cancel()
  clearTimeout(menuTimer)
  trap?.()
  document.body.style.overflow = ''
})

const themeLabel = computed(() => (theme.mode === 'well' ? N.theme.dark : N.theme.light))
</script>

<template>
  <header class="en-header" :class="{ stuck, plate: route.path !== '/' }">
    <a class="skip-link" href="#main">跳到内容</a>

    <RouterLink to="/" class="brand" aria-label="返回首页">
      <!-- 星轨印记：三道同心弧 + 一枚星核，与右上角图标钮同一套 1.6 描边语言。
           弧的缺口是" trails 还没扫完"的暗示；旧版那枚 5.6px 实心环在浅色下读成黑点，
           且与一排细描边圆钮不是一族（2026-11-16 重做，见 docs/design.md §4.5）。 -->
      <svg class="mark" viewBox="0 0 28 28" aria-hidden="true">
        <g class="arcs">
          <circle cx="14" cy="14" r="11.5" stroke-dasharray="54 18.3" transform="rotate(-90 14 14)" />
          <circle cx="14" cy="14" r="8" stroke-dasharray="36 14.3" transform="rotate(30 14 14)" />
          <circle cx="14" cy="14" r="4.5" stroke-dasharray="19 9.3" transform="rotate(150 14 14)" />
        </g>
        <circle class="core" cx="14" cy="14" r="1.8" />
      </svg>
      <span class="brand-text">
        <span class="brand-name">{{ content.site.name }}</span>
        <span class="brand-sub en-mono">{{ N.brand.sub }}</span>
      </span>
    </RouterLink>

    <nav class="nav" aria-label="主导航">
      <RouterLink
        v-for="(item, i) in N.nav"
        :key="item.to"
        :to="item.to"
        class="nav-link en-mono"
        :class="{ active: i === activeIdx }"
      >
        <span class="code" aria-hidden="true">{{ item.code }}</span>{{ item.label }}
      </RouterLink>
    </nav>

    <div class="right">
      <!-- 右上角四枚：搜索 / 主题 / 音乐 / 设置。四枚都是开关，只有主题那枚不落下层卡 -->
      <button
        class="ico-btn search-btn"
        type="button"
        :aria-expanded="search"
        aria-controls="en-search"
        :aria-label="search ? '搜索：收起' : '搜索文章（按 / 或 Ctrl+K）'"
        :title="search ? '收起搜索（Esc）' : '搜索文章 · / 或 Ctrl/⌘+K'"
        @click="toggleSearch"
      >
        <svg class="en-svg" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="10.8" cy="10.8" r="6.6" />
          <path d="M15.7 15.7 20.4 20.4" />
        </svg>
      </button>

      <button
        class="ico-btn"
        type="button"
        :aria-pressed="theme.mode === 'out'"
        :aria-label="`主题：${themeLabel}`"
        :title="`主题：${themeLabel}`"
        @click="toggleTheme"
      >
        <svg v-if="theme.mode === 'well'" class="en-svg" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 14.2A8.4 8.4 0 1 1 9.8 4 6.8 6.8 0 0 0 20 14.2Z" />
        </svg>
        <svg v-else class="en-svg" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.8v2.1M12 19.1v2.1M2.8 12h2.1M19.1 12h2.1M5.4 5.4l1.5 1.5M17.1 17.1l1.5 1.5M18.6 5.4l-1.5 1.5M6.9 17.1l-1.5 1.5" />
        </svg>
      </button>

      <button
        class="ico-btn music-btn"
        :class="{ on: music.playing }"
        type="button"
        :disabled="!music.available"
        :aria-expanded="player"
        aria-controls="en-player"
        :aria-label="music.available ? (player ? '播放器：收起' : '播放器：展开') : '播放器：暂无曲目'"
        :title="music.available ? (player ? '收起播放器' : '打开播放器') : '暂无曲目可播'"
        @click="togglePlayer"
      >
        <svg class="en-svg" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 17.4V5.9l9-1.8v11.4" />
          <circle cx="6.6" cy="17.4" r="2.4" />
          <circle cx="15.6" cy="15.5" r="2.4" />
        </svg>
      </button>

      <button
        class="ico-btn settings-btn"
        type="button"
        :aria-expanded="settings"
        aria-controls="en-settings"
        :aria-label="settings ? '设置：收起' : '设置：展开'"
        :title="settings ? '收起设置' : '设置'"
        @click="toggleSettings"
      >
        <svg class="en-svg" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 8h8.8M17.2 8h2.8M4 16h2.8M11.2 16h8.8" />
          <circle cx="15" cy="8" r="2.2" />
          <circle cx="9" cy="16" r="2.2" />
        </svg>
      </button>

      <button
        class="burger ico-btn"
        :class="{ open: drawer }"
        type="button"
        :aria-expanded="drawer"
        aria-controls="en-drawer"
        :aria-label="drawer ? N.menu.close : N.menu.open"
        :title="drawer ? N.menu.close : N.menu.open"
        @click="toggleDrawer"
      >
        <!-- 三根线而不是「≡」字形：字形在不同字体里粗细与基线都不一样，且没法做形变。
             开合时上下两根收拢并旋成叉，中间那根淡出——按钮自己就说清了当前状态。 -->
        <span class="burger-box" aria-hidden="true">
          <i class="bar bar-1"></i>
          <i class="bar bar-2"></i>
          <i class="bar bar-3"></i>
        </span>
      </button>
    </div>

    <Transition name="pop">
      <MusicCard v-if="player" @close="player = false" />
    </Transition>

    <Transition name="pop">
      <SettingsCard v-if="settings" @close="settings = false" />
    </Transition>

    <Transition name="pop">
      <SearchCard v-if="search" @close="search = false" />
    </Transition>

    <Transition name="sheet">
      <div
        v-if="drawer"
        id="en-drawer"
        ref="drawerEl"
        class="drawer"
        role="dialog"
        aria-modal="true"
        aria-label="站点菜单"
        @click="onDrawerBackdrop"
      >
        <div class="drawer-inner" @click.stop>
          <div class="sheet-head">
            <span class="sheet-title en-mono">// {{ N.menu.title }}</span>
            <button
              class="sheet-close ico-btn"
              type="button"
              :aria-label="N.menu.close"
              @click="closeDrawer"
            >
              <svg class="en-svg" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6.4 6.4l11.2 11.2M17.6 6.4L6.4 17.6" />
              </svg>
            </button>
          </div>

          <nav class="sheet-nav" :aria-label="N.menu.nav">
            <RouterLink
              v-for="(item, i) in N.nav"
              :key="item.to"
              :to="item.to"
              class="sheet-link"
              :class="{ active: i === activeIdx }"
              :aria-current="i === activeIdx ? 'page' : undefined"
              :style="{ transitionDelay: `${60 + i * 45}ms` }"
              @click="closeDrawer"
            >
              <span class="sheet-code en-mono" aria-hidden="true">{{ item.code }}</span>
              <span class="sheet-txt">
                <span class="sheet-label">{{ item.label }}</span>
                <span class="sheet-hint">{{ menuHint(item.to) }}</span>
              </span>
              <!-- 当前页那一枚给一个静态记号，不靠颜色单独承担；其余是箭头 -->
              <span v-if="i === activeIdx" class="sheet-dot" aria-hidden="true"></span>
              <span v-else class="sheet-arrow" aria-hidden="true">→</span>
            </RouterLink>
          </nav>

          <!-- 快捷操作：窄屏下右上角那四枚图标挤在一行，这里给一次带文字的入口。
               搜索/播放器/设置点下去先收抽屉再开对应的卡，不叠着两层浮层。 -->
          <div class="sheet-quick">
            <p class="quick-lbl en-mono">// {{ N.menu.quick }}</p>
            <div class="quick-row">
              <button class="quick-btn" type="button" @click="fromMenu('search')">
                <svg class="en-svg" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="10.8" cy="10.8" r="6.6" />
                  <path d="M15.7 15.7 20.4 20.4" />
                </svg>
                <span>{{ N.menu.search }}</span>
              </button>
              <button class="quick-btn" type="button" @click="toggleTheme">
                <svg v-if="theme.mode === 'well'" class="en-svg" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20 14.2A8.4 8.4 0 1 1 9.8 4 6.8 6.8 0 0 0 20 14.2Z" />
                </svg>
                <svg v-else class="en-svg" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2.8v2.1M12 19.1v2.1M2.8 12h2.1M19.1 12h2.1M5.4 5.4l1.5 1.5M17.1 17.1l1.5 1.5M18.6 5.4l-1.5 1.5M6.9 17.1l-1.5 1.5" />
                </svg>
                <span>{{ themeLabel }}</span>
              </button>
              <button
                class="quick-btn"
                type="button"
                :disabled="!music.available"
                @click="fromMenu('player')"
              >
                <svg class="en-svg" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9 17.4V5.9l9-1.8v11.4" />
                  <circle cx="6.6" cy="17.4" r="2.4" />
                  <circle cx="15.6" cy="15.5" r="2.4" />
                </svg>
                <span>{{ N.menu.player }}</span>
              </button>
              <button class="quick-btn" type="button" @click="fromMenu('settings')">
                <svg class="en-svg" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 8h8.8M17.2 8h2.8M4 16h2.8M11.2 16h8.8" />
                  <circle cx="15" cy="8" r="2.2" />
                  <circle cx="9" cy="16" r="2.2" />
                </svg>
                <span>{{ N.menu.settings }}</span>
              </button>
            </div>
          </div>

          <p class="sheet-foot en-mono">{{ N.menu.keys }}</p>
        </div>
      </div>
    </Transition>
  </header>
</template>

<style scoped>
.en-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: transparent;
  border-bottom: 1px solid transparent;
  transition: background-color 0.3s ease, border-color 0.3s ease, padding 0.3s ease;
}

/* 吸顶后覆盖在动画画布之上：用高不透明实底而非 backdrop-filter——
   后者会让浏览器在星轨每动一帧时都重算这条横带的背后模糊 */
.en-header.stuck {
  padding-top: var(--space-1);
  padding-bottom: var(--space-1);
  background: color-mix(in srgb, var(--ink-0) 94%, transparent);
  border-bottom-color: var(--line);
}

.skip-link {
  position: absolute;
  left: -9999px;
}

.skip-link:focus-visible {
  left: var(--space-2);
  top: var(--space-2);
  z-index: 20;
  padding: var(--space-0) var(--space-2);
  border-radius: var(--r-pill);
  background: var(--cold);
  color: var(--ink-0);
  font-size: var(--fs-xs);
  font-weight: var(--fw-medium);
}

/* ---- 签名：星轨印记 + 双行刊头（2026-11-16 重做） ----
   旧版是一枚 5.6px 壁的实心环 + 13px 等宽站名：浅色下环读成黑点、与一排 1.6 描边圆钮
   不是一族，站名也没有刊头重量。docs 记过「4px 细环撑不住 13px 站名」——那次的病根是
   标题太轻，所以这次两头一起动：印记改细描边（与图标钮同族），标题加重到 16px 展示衬线。 */
.brand {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  flex-shrink: 0;
}

.mark {
  width: 28px;
  height: 28px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  /* 线色取 --brand-ring（品牌蓝按主题兑出的那一枚，浅色 3.26:1 过非文本 3:1 线），
     不跟 currentColor 走——站名 hover 变冷色时印记保持自己的品牌蓝 */
  color: var(--brand-ring);
}

/* 星核是"星"，用 --white（深色暖白 / 浅色深墨），与星轨装置里星核的取色同一条 */
.mark .core {
  fill: var(--white);
  stroke: none;
}

/* hover：三道弧整体缓转 30°，像长曝光又走了一段。只动 transform、不常驻动画
   （标识不是一段动画，旧版那条「不再旋转」的结论对常驻仍成立）；减弱动效下不动 */
.mark .arcs {
  transform-origin: 14px 14px;
  transition: transform var(--dur) cubic-bezier(0.2, 0.8, 0.2, 1);
}

.brand:hover .mark .arcs {
  transform: rotate(30deg);
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1;
}

.brand-name {
  /* 站名是纯大写英文，走 Didone 刊头子集（与首屏 ESCAPING NOTES 同一族）；
     16px / 700 给标题应有的重量，压得住旁边那枚细描边印记 */
  font-family: var(--font-display-en);
  font-size: var(--fs-base);
  font-weight: var(--fw-bold);
  letter-spacing: 0.06em;
  color: var(--text-0);
  transition: color var(--dur-fast);
}

.brand-sub {
  font-size: var(--fs-3xs);
  letter-spacing: 0.3em;
  color: var(--text-1);
  transition: color var(--dur-fast);
}

/* 站名是回首页的链接，hover 与同排图标钮一致：主行变冷色，副行跟上但留在次级 */
.brand:hover .brand-name {
  color: var(--cold);
}

.brand:hover .brand-sub {
  color: var(--text-0);
}

/* ---- 导航 ---- */
.nav {
  display: flex;
  align-items: center;
  gap: var(--space-0);
}

.nav-link {
  position: relative;
  display: inline-flex;
  align-items: baseline;
  gap: var(--space-0);
  padding: var(--space-0) var(--space-1);
  color: var(--text-1);
  text-decoration: none;
  white-space: nowrap;
  /* 衬线体走 --font-serif 而不是 --font-display：展示层那枚是 build_font.mjs 按用到的字
     子集化出来的，导航里出现没裁进去的字就会掉回系统字体，一行字两种字形比无衬线还难看。 */
  font-family: var(--font-serif);
  font-size: var(--fs-md);
  line-height: var(--lh-snug);
  transition: color var(--dur-fast);
}

.nav-link .code {
  font-size: var(--fs-3xs);
  opacity: 0.6;
}

.nav-link:hover {
  color: var(--cold);
}

/* 选中态不再用红：全站舍弃红蓝撞色，冷蓝是唯一强调色（--hot 的去处见令牌层） */
.nav-link.active {
  color: var(--cold);
}

/* 下划线由左向右画出（左右内缩 = 文字两侧的内边距） */
.nav-link::after {
  content: '';
  position: absolute;
  left: var(--space-1);
  right: var(--space-1);
  bottom: 0;
  height: 2px;
  background: var(--cold);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform var(--dur) cubic-bezier(0.2, 0.8, 0.2, 1);
}

.nav-link:hover::after,
.nav-link.active::after {
  transform: scaleX(1);
}

/* ---- 右侧 ---- */
.right {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  flex-shrink: 0;
}

/* 右侧按钮统一：同高 32px 发丝胶囊框线（与 .en-btn-sm 同语言，仅形态更紧凑） */
.ico-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-0);
  height: 32px;
  padding: 0 var(--space-1);
  border-radius: var(--r-pill);
  border: 1px solid var(--line);
  background: none;
  color: var(--text-1);
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  line-height: 1;
  letter-spacing: 0.06em;
  cursor: pointer;
  text-decoration: none;
  transition: color var(--dur-fast), border-color var(--dur-fast), transform var(--dur);
}

/* 图标按钮：32px 正方形等大一枚（右上角四枚与汉堡/关闭共用这一档）。
   描边 SVG 的着色走 currentColor，所以 hover/播放中的变色规则与文字按钮同一条。
   热区：32px 太小、四枚之间只隔 8px，所以热区只外撑 4px（颜色/圆角不变，flow 不动）——
   单枚落到 40px，四枚的热区正好在间隙中部相接、互不侵占。 */
.ico-btn {
  width: 32px;
  padding: 0;
  justify-content: center;
  position: relative;
}

.ico-btn::after {
  content: '';
  position: absolute;
  inset: -4px;
}

.en-svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.ico-btn:hover {
  color: var(--cold);
  border-color: var(--cold);
  transform: translateY(var(--lift));
}

/* 播放中：红移标示；曲目为空：置灰 */
.music-btn.on {
  color: var(--hot);
  border-color: color-mix(in srgb, var(--hot) 45%, transparent);
}

/* ---- 次级页顶栏字色（静态，2026-11-07 起） ----
   抽屉收敛为单张后底片不再换，采样的动态字色（--hdr-fg / data-plate-tone）退役；
   次级页（.plate = 非首页路由）顶栏直接压在底片上，未吸顶时静态换色：
   浅色底片（paper4）顶带很暗，--text-1 只有 2.4:1 上下、--cold 亮蓝只有 1.8:1，
   整条落 --ink-0（纸色）——普通字、hover / 选中 / 下划线、发丝框线全用同一枚。
   深色底片（deep）顶带近黑：字取 --text-0，--cold 那枚亮蓝压得住（≈5:1），
   hover / 选中 / 下划线保持默认蓝。吸顶后顶栏有实底，回到主题默认。 */
.en-header.plate:not(.stuck) .brand-name,
.en-header.plate:not(.stuck) .nav-link,
.en-header.plate:not(.stuck) .ico-btn {
  color: var(--plate-hdr);
}

/* 发丝框线在照片上会消失：换成当刻字色兑出的 28% */
.en-header.plate:not(.stuck) .ico-btn {
  border-color: color-mix(in srgb, var(--plate-hdr) 28%, transparent);
}

.en-header.plate:not(.stuck) .brand:hover .brand-name,
.en-header.plate:not(.stuck) .nav-link:hover,
.en-header.plate:not(.stuck) .nav-link.active,
.en-header.plate:not(.stuck) .ico-btn:hover {
  color: var(--plate-fg);
}

/* 刊头副行与印记在照片上同样落当刻字色：--text-1 在 paper4 顶带只有 2.4:1，
   副行那 11.5px 小字不换成纸色就读不出来；印记整线落纸色（不兑透明，细线兑了更看不见） */
.en-header.plate:not(.stuck) .brand-sub {
  color: var(--plate-hdr);
}

.en-header.plate:not(.stuck) .mark {
  color: var(--plate-hdr);
}

.en-header.plate:not(.stuck) .brand:hover .brand-sub {
  color: var(--plate-fg);
}

.en-header.plate:not(.stuck) .ico-btn:hover {
  border-color: var(--plate-fg);
}

.en-header.plate:not(.stuck) .nav-link::after {
  background: var(--plate-fg);
}

/* 不可用的图标按钮（音乐曲目为空）：置灰 */
.ico-btn:disabled {
  opacity: 0.45;
  cursor: default;
}

.ico-btn:disabled:hover {
  color: var(--text-1);
  border-color: var(--line);
  transform: none;
}

.burger {
  display: none;
  padding: 0;
}

/* 三根线：14×10px，线宽 1.4px。口径来回校准过三次——1.6px 判太粗、1px 判太细，
   1.4px 落在两者之间：比同排描边 SVG 的 1.6px 略细（那四枚带圆形轮廓，是完整图标；
   这三根是纯线，同粗会更重），又不至于细到在 1× 屏上被抗锯齿吃掉。
   长度由 16 收到 14：短一点更紧凑，与 32px 钮的留白比例也更舒服。

   两个量单一来源：--bar-h 线宽、--bar-step 顶位步进。步进 = 中线(5px) − 半根线宽，
   于是三根的中心恰好落在 0.7 / 5 / 9.3，中间那根正压盒子中线上——
   开合时上下两根各移一个步进就与它重合，改线宽只改这两枚，位移自动跟着走。 */
.burger-box {
  --bar-h: 1.4px;
  --bar-step: 4.3px;
  position: relative;
  display: block;
  width: 14px;
  height: 10px;
}

.burger .bar {
  position: absolute;
  left: 0;
  width: 100%;
  height: var(--bar-h);
  /* 端点圆头，与同排 SVG 的 stroke-linecap: round 同一套收尾 */
  border-radius: 1px;
  background: currentColor;
  transition:
    transform var(--dur) cubic-bezier(0.2, 0.8, 0.2, 1),
    opacity var(--dur-fast) ease;
}

.burger .bar-1 {
  top: 0;
}

.burger .bar-2 {
  top: var(--bar-step);
}

.burger .bar-3 {
  top: calc(var(--bar-step) * 2);
}

/* 打开态：上下两根各移一个步进到中线再转 45°，中间那根横向收掉。
   两段位移写在同一个 transform 里，避免两条规则互相覆盖。 */
.burger.open .bar-1 {
  transform: translateY(var(--bar-step)) rotate(45deg);
}

.burger.open .bar-2 {
  opacity: 0;
  transform: scaleX(0.2);
}

.burger.open .bar-3 {
  transform: translateY(calc(var(--bar-step) * -1)) rotate(-45deg);
}

/* ---- 移动端菜单（全屏遮罩抽屉） ---- */
/* 保留全屏 backdrop-filter 遮罩作为整体强调效果；内部结构换新：标题栏、居中列表、冷色当前态。 */
.drawer {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: var(--space-3);
  background: color-mix(in srgb, var(--ink-0) 88%, transparent);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  overflow-y: auto;
  overscroll-behavior: contain; /* 手机橡皮筋别把滚动捅到底层页面 */
}

.drawer-inner {
  width: min(420px, 100%);
  /* 放得下就竖直居中；矮视口（如 320×568）里内容比屏幕高时，
     两个 auto 外边距归零，卡头贴顶、由 .drawer 的 overflow-y 往下滚——
     写成 align-items:center 会把卡头挤到负偏移处，滚也滚不回来 */
  margin-block: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--line);
}

.sheet-title {
  font-size: var(--fs-xs);
  letter-spacing: 0.1em;
  color: var(--text-1);
}

.sheet-close {
  width: 32px;
  min-width: 32px;
  padding: 0;
  justify-content: center;
}

.sheet-nav {
  display: flex;
  flex-direction: column;
}

.sheet-link {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-1);
  border-bottom: 1px solid var(--line);
  border-radius: var(--r-sm);
  text-decoration: none;
  transition: color var(--dur-fast), background-color var(--dur-fast);
}

/* 当前页：冷色底 + 左缘一道竖线。竖线与底色一起给，不让颜色单独承担状态
   （色弱读者与深色底片上都能读出来） */
.sheet-link.active {
  color: var(--cold);
  background: color-mix(in srgb, var(--cold) 8%, transparent);
  box-shadow: inset 2px 0 0 var(--cold);
}

/* 标签 + 说明两行；min-width:0 让长说明能正常换行而不是把箭头挤出容器 */
.sheet-txt {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.sheet-hint {
  font-family: var(--font-serif);
  font-size: var(--fs-2xs);
  line-height: var(--lh-snug);
  color: var(--text-1);
}

.sheet-link.active .sheet-hint {
  color: color-mix(in srgb, var(--cold) 72%, var(--text-1));
}

/* 当前页的静态记号：一枚实心点，与其余行的箭头占同一格，行宽不跳 */
.sheet-dot {
  width: 6px;
  height: 6px;
  margin-left: auto;
  margin-right: 5px;
  flex: none;
  border-radius: 50%;
  background: var(--cold);
}

.sheet-code {
  width: 3ch;
  flex-shrink: 0;
  font-size: var(--fs-2xs);
  color: var(--text-1);
  text-align: right;
}

.sheet-link.active .sheet-code {
  color: var(--cold);
}

/* 标签从 --fs-2xl 收到 --fs-xl：每行现在多了一句说明，两行加起来的高度与原先
   单行大字相当，六条仍能在常见手机高度里一屏放下，不必滚动 */
.sheet-label {
  font-family: var(--font-display);
  font-size: var(--fs-xl);
  font-weight: var(--fw-bold);
  line-height: var(--lh-tight);
  letter-spacing: -0.01em;
  color: var(--text-0);
}

.sheet-link.active .sheet-label,
.sheet-link:hover .sheet-label {
  color: var(--cold);
}

.sheet-arrow {
  margin-left: auto;
  color: var(--text-1);
  transition: transform var(--dur) cubic-bezier(0.2, 0.8, 0.2, 1), color var(--dur-fast);
}

.sheet-link:hover .sheet-arrow {
  transform: translateX(var(--nudge));
  color: var(--cold);
}

/* ---- 快捷操作：四枚带文字的按钮，两列排布 ---- */
.quick-lbl {
  margin: 0 0 var(--space-1);
  font-size: var(--fs-3xs);
  letter-spacing: 0.1em;
  color: var(--text-1);
}

.quick-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-1);
}

.quick-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  min-height: 44px;
  padding: 0 var(--space-2);
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  background: none;
  color: var(--text-0);
  font-family: var(--font-serif);
  font-size: var(--fs-sm);
  cursor: pointer;
  transition:
    color var(--dur-fast),
    border-color var(--dur-fast),
    background-color var(--dur-fast);
}

.quick-btn:hover {
  color: var(--cold);
  border-color: var(--cold);
  background: color-mix(in srgb, var(--cold) 7%, transparent);
}

.quick-btn:disabled {
  opacity: 0.45;
  cursor: default;
}

.quick-btn:disabled:hover {
  color: var(--text-0);
  border-color: var(--line);
  background: none;
}

.sheet-foot {
  padding-top: var(--space-2);
  border-top: 1px solid var(--line);
  font-size: var(--fs-3xs);
  color: var(--text-1);
}

.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.28s ease;
}

.sheet-enter-active .sheet-link,
.sheet-leave-active .sheet-link {
  transition: opacity 0.34s ease, transform 0.34s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

.sheet-enter-from .sheet-link {
  opacity: 0;
  transform: translateY(14px);
}

/* 播放器卡片：从顶栏下沿展开。位移比抽屉收敛一档——它只有 320px 宽，
   且锚在按钮正下方，跑太远会看不出"是哪枚按钮开的" */
.pop-enter-active,
.pop-leave-active {
  transition: opacity 0.2s ease, transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ---- 响应式 ---- */
/* 右上角四枚自 2026-10-09 起就是纯图标 32px 方（不再有文字档），
   所以原先"≤1400px 收起文字"那一档已无消费者，删掉 */

/* 导航整条实测 424.8px（6 枚 × 67.6px + 5 × 4px 间距，本机 Chrome 量的）；
   折叠断点 1280 沿用加「映像」那阵抬高的值，现为保守值；
   加一枚导航实打实多 72px，这个数别凭感觉估，估小了就是整条溢出被裁 */
@media (max-width: 1280px) {
  .en-header {
    padding: var(--space-1) var(--space-2);
  }
  .nav {
    display: none;
  }
  .burger {
    display: inline-flex;
  }
}

@media (max-width: 480px) {
  /* 窄屏整组刊头文字收起，只留印记（热区由 pointer:coarse 那档外撑） */
  .brand-text {
    display: none;
  }
}

/* 触控设备：顶栏按钮与抽屉内的关闭键一律撑到 44px（放在断点之后才能压过 32px 的宽度） */
@media (pointer: coarse) {
  .ico-btn {
    height: 44px;
    width: 44px;
    min-width: 44px;
    padding: 0;
    justify-content: center;
  }
  .sheet-close {
    width: 44px;
    min-width: 44px;
  }
  /* 窄屏只留 28px 星轨印记：热区用不可见的 ::after 撑到 44×44，观感与顶栏高度都不变 */
  .brand {
    position: relative;
  }
  .brand::after {
    content: '';
    position: absolute;
    inset: -10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  /* 印记 hover 的缓转是 transform：减弱动效下两态都钉成 none（与衍射芒同一条） */
  .mark .arcs,
  .brand:hover .mark .arcs {
    transform: none;
    transition: none;
  }
  .ico-btn:hover {
    transform: none;
  }
  .sheet-link,
  .sheet-arrow {
    transition: none;
  }
  /* 汉堡的形变靠 transform：减弱动效下不做动画，但**终态仍要区分**——
     上一版把两态都钉成 transform:none，结果打开与关闭长得一模一样，只剩中间那根
     淡出，读不出这是个"关闭"按钮。现在直接给终态、去掉过渡：形态照旧变成叉，
     只是瞬间完成，不做位移过程。 */
  .burger .bar {
    transition: none;
  }
  .quick-btn {
    transition: none;
  }
}
</style>
