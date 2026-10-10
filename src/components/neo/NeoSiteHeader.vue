<script setup>
// 新版顶栏：无底色悬浮条 + 吸积环签名 + 等宽深度导航
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { content } from '../../lib/content.js'
import { auth, logout } from '../../lib/auth.js'
import { theme, toggleTheme } from '../../lib/theme.js'
import { music } from '../../lib/music.js'
import { debounce } from '../../lib/debounce.js'
import { trapFocus } from '../../lib/focus.js'
import MusicCard from '../MusicCard.vue'
import SettingsCard from '../SettingsCard.vue'
import { N } from '../../config/narrative.js'

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
/* 设置卡片：顶栏「设置」按钮点开的那一张（目前只有底片模糊滑杆） */
const settings = ref(false)
// 三张面板都挂在顶栏下沿同一条线上，任何时刻只开一张
function togglePlayer() {
  drawer.value = false
  settings.value = false
  player.value = !player.value
}
function toggleDrawer() {
  player.value = false // 两张面板都是右上角的下层，不叠着开
  settings.value = false
  drawer.value = !drawer.value
}
function toggleSettings() {
  drawer.value = false
  player.value = false
  settings.value = !settings.value
}

function closeDrawer() {
  drawer.value = false
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
  <header class="neo-header" :class="{ stuck }">
    <a class="skip-link" href="#main">跳到内容</a>

    <RouterLink to="/" class="brand" aria-label="返回首页">
      <span class="mark" aria-hidden="true"></span>
      <span class="brand-name neo-mono">{{ content.site.name }}</span>
    </RouterLink>

    <nav class="nav" aria-label="主导航">
      <RouterLink
        v-for="(item, i) in N.nav"
        :key="item.to"
        :to="item.to"
        class="nav-link neo-mono"
        :class="{ active: i === activeIdx }"
      >
        <span class="code" aria-hidden="true">{{ item.code }}</span>{{ item.label }}
      </RouterLink>
    </nav>

    <div class="right">
      <!-- 右上角四枚：搜索 / 主题 / 音乐 / 设置。搜索暂只摆位，未接任何行为 -->
      <button class="ico-btn" type="button" aria-label="搜索" title="搜索">
        <svg class="neo-svg" viewBox="0 0 24 24" aria-hidden="true">
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
        <svg v-if="theme.mode === 'well'" class="neo-svg" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 14.2A8.4 8.4 0 1 1 9.8 4 6.8 6.8 0 0 0 20 14.2Z" />
        </svg>
        <svg v-else class="neo-svg" viewBox="0 0 24 24" aria-hidden="true">
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
        :aria-label="music.available ? (player ? '播放器：收起' : '播放器：展开') : '播放器：暂无曲目'"
        :title="music.available ? (player ? '收起播放器' : '打开播放器') : '暂无曲目可播'"
        @click="togglePlayer"
      >
        <svg class="neo-svg" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 17.4V5.9l9-1.8v11.4" />
          <circle cx="6.6" cy="17.4" r="2.4" />
          <circle cx="15.6" cy="15.5" r="2.4" />
        </svg>
      </button>

      <button
        class="ico-btn settings-btn"
        type="button"
        :aria-expanded="settings"
        aria-controls="neo-settings"
        :aria-label="settings ? '设置：收起' : '设置：展开'"
        :title="settings ? '收起设置' : '设置'"
        @click="toggleSettings"
      >
        <svg class="neo-svg" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 8h8.8M17.2 8h2.8M4 16h2.8M11.2 16h8.8" />
          <circle cx="15" cy="8" r="2.2" />
          <circle cx="9" cy="16" r="2.2" />
        </svg>
      </button>

      <div v-if="auth.user" class="auth neo-mono">
        <RouterLink to="/admin" class="auth-link">ADMIN</RouterLink>
        <span class="auth-name">{{ auth.user.nickname }}</span>
        <button class="auth-link" type="button" @click="logout">登出</button>
      </div>

      <button
        class="burger ico-btn"
        type="button"
        :aria-expanded="drawer"
        aria-controls="neo-drawer"
        :aria-label="drawer ? '关闭菜单' : '打开菜单'"
        @click="toggleDrawer"
      >
        <span class="neo-ico" aria-hidden="true">{{ drawer ? '✕' : '≡' }}</span>
      </button>
    </div>

    <Transition name="pop">
      <MusicCard v-if="player" @close="player = false" />
    </Transition>

    <Transition name="pop">
      <SettingsCard v-if="settings" @close="settings = false" />
    </Transition>

    <Transition name="drawer">
      <div
        v-if="drawer"
        id="neo-drawer"
        ref="drawerEl"
        class="drawer"
        role="dialog"
        aria-modal="true"
        aria-label="站点菜单"
      >
        <button class="drawer-close ico-btn" type="button" aria-label="关闭菜单" @click="closeDrawer">
          <span class="neo-ico" aria-hidden="true">✕</span>
        </button>

        <nav class="drawer-nav" aria-label="移动端主导航">
          <RouterLink
            v-for="(item, i) in N.nav"
            :key="item.to"
            :to="item.to"
            class="drawer-link"
            :class="{ active: i === activeIdx }"
            :style="{ transitionDelay: `${60 + i * 45}ms` }"
            @click="closeDrawer"
          >
            <span class="d-code neo-mono" aria-hidden="true">{{ item.code }}</span>
            <span class="d-label">{{ item.label }}</span>
            <span class="d-arrow" aria-hidden="true">→</span>
          </RouterLink>
        </nav>

        <div v-if="auth.user" class="drawer-auth neo-mono">
          <RouterLink to="/admin" class="neo-btn neo-btn-quiet" @click="closeDrawer">ADMIN</RouterLink>
          <span class="drawer-name">{{ auth.user.nickname }}</span>
          <button class="neo-btn neo-btn-quiet" type="button" @click="logout(); closeDrawer()">登出</button>
        </div>

        <p class="drawer-foot neo-mono">// Escap1ng · 仍在坠入</p>
      </div>
    </Transition>
  </header>
</template>

<style scoped>
.neo-header {
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
.neo-header.stuck {
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
  /* 光子环：用品牌令牌（跨主题固定深色配色），避免浅色主题下发色黯淡。
     去掉了原来 20% 处那一段 --brand-white——白色止点在浅色标签页/顶栏背景上等于
     把四分之一环擦掉，这就是它看着"糊、缺一段"的原因；现在全程饱和，冷蓝占主导。 */
  background: conic-gradient(
    from 210deg,
    var(--brand-cold),
    var(--brand-hot) 34%,
    color-mix(in srgb, var(--brand-hot) 55%, var(--brand-cold)) 64%,
    var(--brand-cold)
  );
  -webkit-mask: radial-gradient(closest-side, transparent 50%, #000 53%);
  mask: radial-gradient(closest-side, transparent 50%, #000 53%);
  filter: saturate(1.2);
  /* 不再旋转：这是一枚标识，不是一段动画；转起来只会让它一直停在运动模糊里看不清 */
}

.brand-name {
  font-size: var(--fs-2xs);
  letter-spacing: 0.14em;
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
  transition: color 0.22s;
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
  transition: transform 0.32s cubic-bezier(0.2, 0.8, 0.2, 1);
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

/* 右侧按钮统一：同高 32px 发丝胶囊框线（与 .neo-btn-sm 同语言，仅形态更紧凑） */
.ico-btn,
.auth-link {
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
  transition: color 0.22s, border-color 0.22s, transform 0.22s;
}

/* 图标按钮：32px 正方形等大一枚（右上角三枚与汉堡/关闭共用这一档）。
   描边 SVG 的着色走 currentColor，所以 hover/播放中的变色规则与文字按钮同一条 */
.ico-btn {
  width: 32px;
  padding: 0;
  justify-content: center;
}

.neo-svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.ico-btn:hover,
.auth-link:hover {
  color: var(--cold);
  border-color: var(--cold);
  transform: translateY(-1px);
}

/* 播放中：红移标示；歌单为空：置灰 */
.music-btn.on {
  color: var(--hot);
  border-color: color-mix(in srgb, var(--hot) 45%, transparent);
}

/* 不可用的图标按钮（音乐歌单为空）：置灰 */
.ico-btn:disabled {
  opacity: 0.45;
  cursor: default;
}

.ico-btn:disabled:hover {
  color: var(--text-1);
  border-color: var(--line);
  transform: none;
}

.auth {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.auth-name {
  color: var(--hot);
  /* 宽度上限兜底：极长昵称以省略号截断，而不是把右侧入口挤出视口 */
  max-width: 10ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.burger {
  display: none;
  padding: var(--space-0) var(--space-1);
}

/* ---- 抽屉 ---- */
/* 全站唯一保留 backdrop-filter 的表面：它是打开即遮满全屏的模态，
   背后星轨被 88% 实底压住，模糊只在这 0.28s 的进出场里算，不构成常驻开销 */
.drawer {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-3);
  background: color-mix(in srgb, var(--ink-0) 88%, transparent);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
}

/* 抽屉自带关闭按钮：抽屉 z-index 高于顶栏，会盖住汉堡按钮，
   触屏用户若无此按钮就只剩「点导航离开」一条出路 */
.drawer-close {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  width: 32px;
  min-width: 32px;
  padding: 0;
  justify-content: center;
}

.drawer-nav {
  display: flex;
  flex-direction: column;
  /* 半档：抽屉项自带上下内边距，整档 4px 会让列表显得松散 */
  gap: calc(var(--space-0) / 2);
}

.drawer-link {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  border-left: 2px solid transparent;
  text-decoration: none;
  transition: border-color 0.24s, background-color 0.24s;
}

.drawer-link.active {
  border-left-color: var(--hot);
  background: color-mix(in srgb, var(--hot) 8%, transparent);
}

.d-code {
  font-size: var(--fs-2xs);
  width: 12ch;
  flex-shrink: 0;
}

.d-label {
  font-family: var(--font-display);
  font-size: var(--fs-3xl);
  font-weight: var(--fw-bold);
  line-height: var(--lh-tight);
  letter-spacing: -0.01em;
  color: var(--text-0);
}

.drawer-link.active .d-label {
  color: var(--hot);
}

.d-arrow {
  margin-left: auto;
  color: var(--text-1);
  transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), color 0.2s;
}

.drawer-link:hover .d-arrow {
  transform: translateX(var(--space-0));
  color: var(--cold);
}

/* 抽屉内的管理入口（移动端顶栏隐藏 auth 时的兜底）：复用 .neo-btn-quiet */
.drawer-auth {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2);
  padding-top: var(--space-2);
  font-size: var(--fs-xs);
}

.drawer-name {
  color: var(--hot);
}

.drawer-foot {
  padding-top: var(--space-2);
  border-top: 1px solid var(--line);
}

.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.28s ease;
}

.drawer-enter-active .drawer-link,
.drawer-leave-active .drawer-link {
  transition: opacity 0.34s ease, transform 0.34s cubic-bezier(0.2, 0.8, 0.2, 1), border-color 0.24s;
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

.drawer-enter-from .drawer-link {
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
/* 右上角三枚自 2026-10-09 起就是纯图标 32px 方（不再有文字档），
   所以原先"≤1400px 收起文字"那一档已无消费者，删掉 */

/* 昵称是顶栏唯一宽度不可控的元素：1240px 以下先收起，
   否则会把「管理/登出」挤出可视区（html 的 overflow-x: clip 会静默裁掉，用户无从发现） */
@media (max-width: 1240px) {
  .auth-name {
    display: none;
  }
}

/* 导航整条实测 497px（「映像」进来之后是 7 枚 × 67.6px + 6 × 4px 间距，本机 Chrome 量的），
   与品牌 / 右上角三枚 / 登录后的管理入口相加超过 1280px，故折叠断点从 1200 抬到 1280。
   加一枚导航实打实要 72px——这个数别凭感觉估，估小了就是 1201~1279px 那一段整条溢出被裁 */
@media (max-width: 1280px) {
  .neo-header {
    padding: var(--space-1) var(--space-2);
  }
  .nav {
    display: none;
  }
  .burger {
    display: inline-flex;
  }
  /* 顶栏容不下管理入口：移到抽屉（.drawer-auth） */
  .auth {
    display: none;
  }
}

@media (max-width: 480px) {
  .brand-name {
    display: none;
  }
}

/* 触控设备：顶栏按钮与抽屉内的文字入口一律撑到 44px（放在断点之后才能压过 32px 的宽度） */
@media (pointer: coarse) {
  .ico-btn {
    height: 44px;
    width: 44px;
    min-width: 44px;
    padding: 0;
    justify-content: center;
  }
  /* 带文字的入口只加高不加宽，宽度交给内容 */
  .auth-link {
    height: 44px;
  }
  .drawer-close {
    width: 44px;
    min-width: 44px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mark {
    animation: none;
  }
  .ico-btn:hover,
  .auth-link:hover {
    transform: none;
  }
  .drawer-link,
  .d-arrow {
    transition: none;
  }
}
</style>
