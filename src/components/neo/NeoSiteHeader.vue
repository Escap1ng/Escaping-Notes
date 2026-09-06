<script setup>
// 新版顶栏：无底色悬浮条 + 吸积环签名 + 等宽深度导航
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { content } from '../../lib/content.js'
import { auth, logout } from '../../lib/auth.js'
import { theme, applyTheme, toggleTheme } from '../../lib/theme.js'
import { music, requestMusicToggle } from '../../lib/music.js'
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

/* 共振彩蛋：600ms 内连点签名三次 */
let clicks = 0
let clickT = 0
function onBrand() {
  const now = Date.now()
  clicks = now - clickT < 600 ? clicks + 1 : 1
  clickT = now
  if (clicks >= 3) {
    clicks = 0
    window.dispatchEvent(new Event('en-resonance'))
  }
}

/* 抽屉 */
const drawer = ref(false)
function closeDrawer() {
  drawer.value = false
}
function onKey(e) {
  if (e.key === 'Escape') closeDrawer()
}
watch(drawer, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})
function onResize() {
  if (innerWidth > 900) closeDrawer()
}

onMounted(() => {
  applyTheme(theme.mode)
  addEventListener('scroll', onScroll, { passive: true })
  addEventListener('resize', onResize)
  addEventListener('keydown', onKey)
  onScroll()
})

onUnmounted(() => {
  removeEventListener('scroll', onScroll)
  removeEventListener('resize', onResize)
  removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
})

const themeLabel = computed(() => (theme.mode === 'well' ? N.theme.dark : N.theme.light))
</script>

<template>
  <header class="neo-header" :class="{ stuck }">
    <a class="skip-link" href="#main">跳到内容</a>

    <RouterLink to="/" class="brand" aria-label="返回首页" @click="onBrand">
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
        <span aria-hidden="true">{{ music.playing ? '❚' : '♪' }}</span>
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
        <span aria-hidden="true">{{ theme.mode === 'well' ? '☾' : '☀' }}</span>
        <span class="txt">{{ themeLabel }}</span>
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
        aria-label="打开菜单"
        @click="drawer = !drawer"
      >
        <span aria-hidden="true">{{ drawer ? '✕' : '≡' }}</span>
      </button>
    </div>

    <Transition name="drawer">
      <div v-if="drawer" id="neo-drawer" class="drawer" role="dialog" aria-modal="true" aria-label="站点菜单">
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
            <span class="d-code neo-mono" aria-hidden="true">{{ item.code }} · r/rs {{ item.depth }}</span>
            <span class="d-label">{{ item.label }}</span>
            <span class="d-arrow" aria-hidden="true">→</span>
          </RouterLink>
        </nav>
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
  padding: 14px var(--space-3);
  background: transparent;
  border-bottom: 1px solid transparent;
  transition: background-color 0.3s ease, border-color 0.3s ease, padding 0.3s ease;
}

.neo-header.stuck {
  padding-top: 9px;
  padding-bottom: 9px;
  background: color-mix(in srgb, var(--ink-0) 82%, transparent);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
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
  padding: 6px 14px;
  border-radius: var(--r-pill);
  background: var(--hot);
  color: var(--ink-0);
  font-size: 13px;
  font-weight: 600;
}

/* ---- 签名：镂空吸积环（mask 挖空中心，提亮加饱和） ---- */
.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.mark {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: conic-gradient(from 210deg, var(--hot), var(--white) 20%, var(--cold) 46%, var(--hot) 82%, var(--hot));
  -webkit-mask: radial-gradient(closest-side, transparent 50%, #000 53%);
  mask: radial-gradient(closest-side, transparent 50%, #000 53%);
  filter: saturate(1.35) brightness(1.15);
  animation: spin 14s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.brand-name {
  font-size: 12px;
  letter-spacing: 0.14em;
  color: var(--text-0);
}

/* ---- 导航 ---- */
.nav {
  display: flex;
  align-items: center;
  gap: 4px;
}

.nav-link {
  position: relative;
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  padding: 6px 10px;
  color: var(--text-1);
  text-decoration: none;
  white-space: nowrap;
  font-size: 14px;
  transition: color 0.22s;
}

.nav-link .code {
  font-size: 11px;
  opacity: 0.6;
}

.nav-link:hover {
  color: var(--cold);
}

.nav-link.active {
  color: var(--hot);
}

/* 下划线由左向右画出 */
.nav-link::after {
  content: '';
  position: absolute;
  left: 10px;
  right: 10px;
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
  gap: 10px;
  flex-shrink: 0;
}

/* 右侧按钮统一：同高 32px 发丝胶囊框线 */
.ico-btn,
.auth-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border-radius: var(--r-pill);
  border: 1px solid var(--line);
  background: none;
  color: var(--text-1);
  font-family: var(--font-mono);
  font-size: 13px;
  letter-spacing: 0.06em;
  cursor: pointer;
  text-decoration: none;
  transition: color 0.22s, border-color 0.22s, transform 0.22s;
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

.music-btn:disabled {
  opacity: 0.45;
  cursor: default;
}

.music-btn:disabled:hover {
  color: var(--text-1);
  border-color: var(--line);
  transform: none;
}

.auth {
  display: flex;
  align-items: center;
  gap: 8px;
}

.auth-name {
  color: var(--hot);
}

.burger {
  display: none;
  padding: 6px 10px;
}

/* ---- 抽屉（全站仅两处玻璃之二） ---- */
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

.drawer-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.drawer-link {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  padding: 12px var(--space-2);
  border-left: 2px solid transparent;
  text-decoration: none;
  transition: border-color 0.24s, background-color 0.24s;
}

.drawer-link.active {
  border-left-color: var(--hot);
  background: color-mix(in srgb, var(--hot) 8%, transparent);
}

.d-code {
  font-size: 12px;
  width: 12ch;
  flex-shrink: 0;
}

.d-label {
  font-family: var(--font-display);
  font-size: 30px;
  font-weight: 700;
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
  transform: translateX(6px);
  color: var(--cold);
}

/* 抽屉内的登录入口（移动端顶栏隐藏 auth 时的兜底） */
.drawer-auth {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid var(--line);
  font-size: 13px;
}

.drawer-auth-link {
  background: none;
  border: none;
  padding: 0;
  color: var(--text-1);
  font: inherit;
  letter-spacing: inherit;
  cursor: pointer;
  text-decoration: none;
  transition: color 0.22s;
}

.drawer-auth-link:hover {
  color: var(--cold);
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
@media (max-width: 1024px) {
  .ico-btn .txt {
    display: none;
  }
  .ico-btn {
    padding: 6px 10px;
  }
  .auth-name {
    display: none;
  }
}

@media (max-width: 900px) {
  .neo-header {
    padding: 10px var(--space-2);
  }
  .nav {
    display: none;
  }
  .burger {
    display: inline-flex;
  }
  .auth {
    display: none;
  }
}

@media (max-width: 480px) {
  .brand-name {
    display: none;
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
