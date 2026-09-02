<script setup>
import { onMounted } from 'vue'
import { content } from '../lib/content.js'
import { auth, logout } from '../lib/auth.js'
import { theme, applyTheme, toggleTheme } from '../lib/theme.js'

// 井底/井外双主题：切换是叙事行为（逃逸/档案），见 docs/design.md §3
onMounted(() => applyTheme(theme.mode))

// 共振彩蛋：600ms 内连点 logo 三次
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

const nav = [
  { to: '/', label: '首页', code: '00' },
  { to: '/blog', label: '文章', code: '01' },
  { to: '/updates', label: '动态', code: '02' },
  { to: '/records', label: '歌单', code: '03' },
  { to: '/projects', label: '项目', code: '04' },
  { to: '/wall', label: '留言', code: '05' },
  { to: '/about', label: '关于', code: '06' },
]
</script>

<template>
  <header class="site-header">
    <a class="skip-link" href="#main">跳到内容</a>
    <RouterLink to="/" class="brand" aria-label="返回首页" @click="onBrand">
      <span class="brand-mark" aria-hidden="true">↗</span>
      <span class="readout brand-name">{{ content.site.name }}</span>
    </RouterLink>
    <nav class="nav" aria-label="主导航">
      <RouterLink v-for="item in nav" :key="item.to" :to="item.to" class="nav-link readout">
        <span class="nav-code" aria-hidden="true">{{ item.code }}</span>
        {{ item.label }}
      </RouterLink>
    </nav>
    <div class="header-right">
      <button
        class="theme-toggle readout"
        type="button"
        :aria-pressed="theme.mode === 'out'"
        title="切换井底/井外主题"
        @click="toggleTheme"
      >
        {{ theme.mode === 'well' ? '深色:井底' : '浅色:井外' }}
      </button>
      <div class="auth readout">
        <template v-if="auth.user">
          <RouterLink to="/admin" class="auth-link">ADMIN</RouterLink>
          <span class="auth-name">{{ auth.user.nickname }}</span>
          <button class="auth-link" type="button" @click="logout">登出</button>
        </template>
        <RouterLink v-else to="/login" class="auth-toggle readout">登录/注册</RouterLink>
      </div>
    </div>
  </header>
</template>

<style scoped>
.site-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--line);
  background: var(--ink-0);
}

.skip-link {
  position: absolute;
  left: -9999px;
}

.skip-link:focus-visible {
  left: var(--space-2);
  top: var(--space-2);
  background: var(--signal);
  color: var(--ink-0);
  padding: 4px 10px;
  font-family: var(--font-mono);
  font-size: 12px;
  z-index: 20;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.brand-mark {
  color: var(--signal);
  font-size: 18px;
  line-height: 1;
}

.brand-name {
  color: var(--text-0);
}

.nav {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.nav-link {
  padding: 4px 2px;
  border-bottom: 2px solid transparent;
  transition: color 0.2s, border-color 0.2s;
}

.nav-link:hover {
  color: var(--text-0);
}

.nav-link.router-link-active {
  color: var(--signal);
  border-color: var(--signal);
}

.nav-code {
  opacity: 0.55;
  margin-right: 4px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

/* 主题开关与登录/注册同款框线按钮：统一行高保证两框等大 */
.theme-toggle,
.auth-toggle {
  display: inline-flex;
  align-items: center;
  line-height: 1.5;
}

.theme-toggle {
  border: 1px solid var(--line);
  background: none;
  color: var(--text-1);
  padding: 4px 10px;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}

.theme-toggle:hover {
  border-color: var(--signal);
  color: var(--signal);
}

.auth {
  display: flex;
  gap: var(--space-2);
  align-items: baseline;
}

.auth a:hover,
.auth-link:hover {
  color: var(--signal);
}

/* 登录/注册：与主题开关同款框线 */
.auth-toggle {
  border: 1px solid var(--line);
  padding: 4px 10px;
  color: var(--text-1);
  transition: border-color 0.2s, color 0.2s;
}

.auth-toggle:hover {
  border-color: var(--signal);
  color: var(--signal);
}

.auth-link {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font: inherit;
  letter-spacing: inherit;
  padding: 0;
}

.auth-name {
  color: var(--signal);
}

/* 移动端头部紧凑化：隐藏编号、收紧间距 */
@media (max-width: 720px) {
  .site-header {
    padding: var(--space-1) var(--space-2);
  }

  .nav {
    gap: var(--space-1);
  }

  .nav-code {
    display: none;
  }
}
</style>
