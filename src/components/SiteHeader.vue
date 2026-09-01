<script setup>
import { onMounted, ref } from 'vue'
import { content } from '../lib/content.js'
import { auth, logout } from '../lib/auth.js'

// 井底/井外双主题：切换是叙事行为（逃逸/档案），见 docs/design.md §3
const theme = ref('well')
function applyTheme(t) {
  theme.value = t
  document.documentElement.dataset.theme = t
  localStorage.setItem('en-theme', t)
}
onMounted(() => {
  if (localStorage.getItem('en-theme') === 'out') applyTheme('out')
})
function toggleTheme() {
  applyTheme(theme.value === 'well' ? 'out' : 'well')
}

const nav = [
  { to: '/', label: '首页', code: '00' },
  { to: '/blog', label: '文章', code: '01' },
  { to: '/updates', label: '动态', code: '02' },
  { to: '/links', label: '收藏', code: '03' },
  { to: '/projects', label: '项目', code: '04' },
  { to: '/wall', label: '留言墙', code: '05' },
  { to: '/about', label: '关于', code: '06' },
]
</script>

<template>
  <header class="site-header">
    <a class="skip-link" href="#main">跳到内容</a>
    <RouterLink to="/" class="brand" aria-label="返回首页">
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
        :aria-pressed="theme === 'out'"
        title="切换井底/井外主题"
        @click="toggleTheme"
      >
        LOC: {{ theme === 'well' ? '井底' : '井外' }}
      </button>
      <div class="auth readout">
        <template v-if="auth.user">
          <RouterLink to="/admin" class="auth-link">ADMIN</RouterLink>
          <span class="auth-name">{{ auth.user.nickname }}</span>
          <button class="auth-link" type="button" @click="logout">登出</button>
        </template>
        <template v-else>
          <RouterLink to="/login">登录</RouterLink>
          <RouterLink to="/register">注册</RouterLink>
        </template>
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
</style>
