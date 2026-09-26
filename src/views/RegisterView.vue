<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { setToken, tryApi } from '../lib/api.js'
import { loadMe } from '../lib/auth.js'

const router = useRouter()
const form = ref({ username: '', nickname: '', password: '' })
const err = ref('')

async function submit() {
  err.value = ''
  const r = await tryApi('/api/register', { method: 'POST', body: form.value })
  // 原来是一句"用户名 3-20 位…，或已被占用"把所有可能原因堆在一起让人逐条试。
  // 现在按后端给的机器码只说中的那一条（映射见 narrative.js errors）。
  if (!r.ok) {
    err.value = r.reason
    return
  }
  if (!r.data?.token) {
    err.value = '注册异常：服务器没返回令牌'
    return
  }
  setToken(r.data.token)
  await loadMe()
  router.push('/')
}
</script>

<template>
  <section class="page auth-page">
    <p class="readout page-code">// AUTH · REGISTER</p>
    <h2 class="page-title">注册访客</h2>

    <form class="auth-form" @submit.prevent="submit">
      <label class="readout">
        USERNAME · 用户名（注册后不可修改）
        <input v-model="form.username" class="field" autocomplete="username" required />
      </label>
      <label class="readout">
        NICKNAME · 昵称（可随意修改）
        <input v-model="form.nickname" class="field" autocomplete="nickname" />
      </label>
      <label class="readout">
        PASSWORD · 密码
        <input v-model="form.password" class="field" type="password" autocomplete="new-password" required />
      </label>
      <p v-if="err" class="neo-note-err">// {{ err }}</p>
      <button class="neo-btn neo-btn-primary" type="submit">登记 · 注册</button>
    </form>

    <p class="readout alt">
      已有账号？<RouterLink to="/login">登录</RouterLink>
    </p>
  </section>
</template>

<style scoped>
.auth-page {
  max-width: 420px;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.auth-form label {
  display: flex;
  flex-direction: column;
  gap: var(--space-0);
}

.alt {
  margin-top: var(--space-3);
}

.alt a {
  color: var(--signal);
}
</style>
