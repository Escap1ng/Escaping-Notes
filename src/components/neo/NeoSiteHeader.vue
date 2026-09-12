<script setup>
// 新版顶栏：无底色悬浮条 + 吸积环签名 + 等宽深度导航
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { content } from '../../lib/content.js'
import { auth, logout } from '../../lib/auth.js'
import { theme, toggleTheme } from '../../lib/theme.js'
import { music, requestMusicToggle } from '../../lib/music.js'
import { cursor, toggleCursor } from '../../lib/cursor.js'
import { debounce } from '../../lib/debounce.js'
import { trapFocus } from '../../lib/focus.js'
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
// 视口回到宽屏时收起抽屉。阈值与 CSS 的导航折叠断点（1200px）必须一致
const onResize = debounce(() => {
  if (innerWidth > 1200) closeDrawer()
}, 150)

onMounted(() => {
  // 此处不再 applyTheme：首帧已由 index.html 写入 data-theme，
  // 挂载时重复写入会把「跟随系统」得到的结果当成用户选择永久固化。
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
const cursorHint = computed(() =>
  cursor.capable
    ? cursor.on
      ? '光标：关闭沉浸光标'
      : '光标：开启沉浸光标'
    : '光标：本设备不支持（需精细指针且未开启减弱动效）'
)
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
      <button
        class="ico-btn music-btn"
        :class="{ on: music.playing }"
        type="button"
        :disabled="!music.available"
        :aria-pressed="music.playing"
        :aria-label="music.available ? (music.playing ? '音乐：暂停' : '音乐：播放') : '音乐：歌单为空'"
        :title="music.available ? (music.playing ? '音乐：暂停' : '音乐：播放') : '音乐：歌单为空'"
        @click="requestMusicToggle"
      >
        <!-- 播放符号全站唯一：▶ 播放 / ❚ 暂停（与底部播放器同源） -->
        <span class="neo-ico" aria-hidden="true">{{ music.playing ? '❚' : '▶' }}</span>
        <span class="txt">音乐</span>
      </button>

      <button
        class="ico-btn"
        type="button"
        :aria-pressed="theme.mode === 'out'"
        :aria-label="`主题：${themeLabel}`"
        :title="`主题：${themeLabel}`"
        @click="toggleTheme"
      >
        <span class="neo-ico" aria-hidden="true">{{ theme.mode === 'well' ? '☾' : '☀' }}</span>
        <span class="txt">{{ themeLabel }}</span>
      </button>

      <button
        class="ico-btn"
        type="button"
        :disabled="!cursor.capable"
        :aria-pressed="cursor.on"
        :aria-label="cursorHint"
        :title="cursor.capable ? `${cursorHint}（仅首页生效）` : cursorHint"
        @click="toggleCursor"
      >
        <!-- ✦ 实心=开 · ✧ 空心=关 -->
        <span class="neo-ico" aria-hidden="true">{{ cursor.on ? '✦' : '✧' }}</span>
        <span class="txt">光标</span>
      </button>

      <div class="auth neo-mono">
        <template v-if="auth.user">
          <RouterLink to="/admin" class="auth-link">ADMIN</RouterLink>
          <span class="auth-name">{{ auth.user.nickname }}</span>
          <button class="auth-link" type="button" @click="logout">登出</button>
        </template>
        <RouterLink v-else to="/login" class="auth-link">登录/注册</RouterLink>
      </div>

      <button
        class="burger ico-btn"
        type="button"
        :aria-expanded="drawer"
        aria-controls="neo-drawer"
        :aria-label="drawer ? '关闭菜单' : '打开菜单'"
        @click="drawer = !drawer"
      >
        <span class="neo-ico" aria-hidden="true">{{ drawer ? '✕' : '≡' }}</span>
      </button>
    </div>

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

        <div class="drawer-auth neo-mono">
          <template v-if="auth.user">
            <RouterLink to="/admin" class="neo-btn neo-btn-quiet" @click="closeDrawer">ADMIN</RouterLink>
            <span class="drawer-name">{{ auth.user.nickname }}</span>
            <button class="neo-btn neo-btn-quiet" type="button" @click="logout(); closeDrawer()">登出</button>
          </template>
          <RouterLink v-else to="/login" class="neo-btn neo-btn-quiet" @click="closeDrawer">
            登录/注册
          </RouterLink>
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
  /* 光子环：用品牌令牌（跨主题固定深空配色），避免纸面主题下发色黯淡 */
  background: conic-gradient(
    from 210deg,
    var(--brand-hot),
    var(--brand-white) 20%,
    var(--brand-cold) 46%,
    var(--brand-hot) 82%,
    var(--brand-hot)
  );
  -webkit-mask: radial-gradient(closest-side, transparent 50%, #000 53%);
  mask: radial-gradient(closest-side, transparent 50%, #000 53%);
  filter: saturate(1.35) brightness(1.15);
  animation: spin 14s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
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
  font-size: var(--fs-sm);
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

.nav-link.active {
  color: var(--hot);
}

/* 下划线由左向右画出（左右内缩 = 文字两侧的内边距） */
.nav-link::after {
  content: '';
  position: absolute;
  left: var(--space-1);
  right: var(--space-1);
  bottom: 0;
  height: 2px;
  background: var(--hot);
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

/* 图标按钮：固定最小宽度并居中，防止各字形宽度差异导致切换时按钮跳动
   （图标本身的等宽由 .neo-ico 保证） */
.ico-btn {
  min-width: 80px;
  justify-content: center;
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

/* 不可用的图标按钮（音乐歌单为空 / 本设备不支持沉浸光标）：置灰 */
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

/* 抽屉内的登录入口（移动端顶栏隐藏 auth 时的兜底）：复用 .neo-btn-quiet */
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

/* ---- 响应式 ---- */
/* 图标按钮只留图标（4 枚 32px 圆形）：带文字时「品牌 + 整条导航 + 4 枚按钮 + 登录」
   在 ≤1400px 会超出视口宽度，而 html 的 overflow-x: clip 会静默裁掉——导航优先级高于按钮文字 */
@media (max-width: 1400px) {
  .ico-btn .txt {
    display: none;
  }
  .ico-btn {
    /* 图标按钮：固定正方形（圆形），各枚严格等大 */
    padding: 0;
    width: 32px;
    min-width: 32px;
    justify-content: center;
  }
}

/* 昵称是顶栏唯一宽度不可控的元素：1240px 以下先收起，
   否则会把「登录/管理」挤出可视区（html 的 overflow-x: clip 会静默裁掉，用户无从发现） */
@media (max-width: 1240px) {
  .auth-name {
    display: none;
  }
}

/* 导航整条约需 490px，与品牌 / 4 枚按钮 / 登录相加超过 1200px，
   故导航折叠与登录入口收进抽屉的断点定在 1200px */
@media (max-width: 1200px) {
  .neo-header {
    padding: var(--space-1) var(--space-2);
  }
  .nav {
    display: none;
  }
  .burger {
    display: inline-flex;
  }
  /* 顶栏容不下登录/管理：入口移到抽屉（.drawer-auth） */
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
