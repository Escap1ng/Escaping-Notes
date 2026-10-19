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
/* 搜索卡片：顶栏「搜索」按钮点开的那一张（结果行点进文章，全量交给 /blog?q=） */
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
function onDrawerBackdrop(e) {
  // 点空白处即收，点内容区不收
  if (e.target === e.currentTarget) closeDrawer()
}
function onKey(e) {
  if (e.key === 'Escape') closeDrawer()
}
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
  onScroll()
})

onUnmounted(() => {
  removeEventListener('scroll', onScroll)
  removeEventListener('resize', onResize)
  removeEventListener('keydown', onKey)
  onResize.cancel()
  trap?.()
  document.body.style.overflow = ''
})

const themeLabel = computed(() => (theme.mode === 'well' ? N.theme.dark : N.theme.light))
</script>

<template>
  <header class="en-header" :class="{ stuck }">
    <a class="skip-link" href="#main">跳到内容</a>

    <RouterLink to="/" class="brand" aria-label="返回首页">
      <span class="mark" aria-hidden="true"></span>
      <span class="brand-name en-mono">{{ content.site.name }}</span>
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
        :aria-label="search ? '搜索：收起' : '搜索：展开'"
        :title="search ? '收起搜索' : '搜索文章'"
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
        type="button"
        :aria-expanded="drawer"
        aria-controls="en-drawer"
        :aria-label="drawer ? '关闭菜单' : '打开菜单'"
        @click="toggleDrawer"
      >
        <span class="en-ico" aria-hidden="true">{{ drawer ? '✕' : '≡' }}</span>
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
            <span class="sheet-title en-mono">// MENU</span>
            <button class="sheet-close ico-btn" type="button" aria-label="关闭菜单" @click="closeDrawer">
              <span class="en-ico" aria-hidden="true">✕</span>
            </button>
          </div>

          <nav class="sheet-nav" aria-label="移动端主导航">
            <RouterLink
              v-for="(item, i) in N.nav"
              :key="item.to"
              :to="item.to"
              class="sheet-link"
              :class="{ active: i === activeIdx }"
              :style="{ transitionDelay: `${60 + i * 45}ms` }"
              @click="closeDrawer"
            >
              <span class="sheet-code en-mono" aria-hidden="true">{{ item.code }}</span>
              <span class="sheet-label">{{ item.label }}</span>
              <span class="sheet-arrow" aria-hidden="true">→</span>
            </RouterLink>
          </nav>

          <p class="sheet-foot en-mono">// Escap1ng · 仍在坠入</p>
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
  background: var(--hot);
  color: var(--ink-0);
  font-size: var(--fs-xs);
  font-weight: var(--fw-medium);
}

/* ---- 签名：镂空吸积环（mask 挖空中心，提亮加饱和） ---- */
.brand {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  flex-shrink: 0;
}

.mark {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  /* 光子环：全冷蓝单色调，避免红蓝混出紫色。用 brand-cold 与少量白色的高光段
     制造环面亮度变化；mix 里白色只占 25%，结果仍是蓝色，不会在浅色顶栏背景上
     被读成"缺一段"。 */
  background: conic-gradient(
    from 210deg,
    var(--brand-cold),
    color-mix(in srgb, var(--brand-cold) 75%, #fff) 22%,
    var(--brand-cold) 44%,
    var(--brand-cold)
  );
  -webkit-mask: radial-gradient(closest-side, transparent 50%, #000 53%);
  mask: radial-gradient(closest-side, transparent 50%, #000 53%);
  filter: saturate(1.05);
  /* 不再旋转：这是一枚标识，不是一段动画；转起来只会让它一直停在运动模糊里看不清 */
}

.brand-name {
  font-size: var(--fs-2xs);
  letter-spacing: 0.14em;
  color: var(--text-0);
  transition: color var(--dur-fast);
}

/* 站名是回首页的链接，原先 hover 什么都不变，与同排五枚图标钮不一致 */
.brand:hover .brand-name {
  color: var(--cold);
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
   描边 SVG 的着色走 currentColor，所以 hover/播放中的变色规则与文字按钮同一条 */
.ico-btn {
  width: 32px;
  padding: 0;
  justify-content: center;
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
  padding: var(--space-0) var(--space-1);
}

/* ---- 移动端菜单（全屏遮罩抽屉） ---- */
/* 保留全屏 backdrop-filter 遮罩作为整体强调效果；内部结构换新：标题栏、居中列表、冷色当前态。 */
.drawer {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-3);
  background: color-mix(in srgb, var(--ink-0) 88%, transparent);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  overflow-y: auto;
}

.drawer-inner {
  width: min(420px, 100%);
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
  align-items: baseline;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-1);
  border-bottom: 1px solid var(--line);
  text-decoration: none;
  transition: color var(--dur-fast), background-color var(--dur-fast);
}

.sheet-link.active {
  color: var(--cold);
  background: color-mix(in srgb, var(--cold) 6%, transparent);
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

.sheet-label {
  font-family: var(--font-display);
  font-size: var(--fs-2xl);
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

.sheet-foot {
  padding-top: var(--space-2);
  border-top: 1px solid var(--line);
  font-size: var(--fs-xs);
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

/* 导航整条实测 424.8px（6 枚 × 67.6px + 5 × 4px 间距，本机 Chrome 量的）。
   折叠断点 1280 沿用加「映像」时抬高的值，现为保守值；加一枚导航实打实多 72px，
   这个数别凭感觉估，估小了就是整条溢出被裁 */
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
  .brand-name {
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
  /* 窄屏只留 24px 吸积环：热区用不可见的 ::after 撑到 44×44，观感与顶栏高度都不变 */
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
  .mark {
    animation: none;
  }
  .ico-btn:hover {
    transform: none;
  }
  .sheet-link,
  .sheet-arrow {
    transition: none;
  }
}
</style>
