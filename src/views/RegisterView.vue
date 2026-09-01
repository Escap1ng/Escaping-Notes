<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, setToken } from '../lib/api.js'
import { loadMe } from '../lib/auth.js'

const router = useRouter()
const form = ref({ username: '', nickname: '', password: '' })
const err = ref('')

async function submit() {
  err.value = ''
  const res = await api('/api/register', { method: 'POST', body: form.value })
  if (!res || !res.token) {
    err.value = '注册失败：用户名 3-20 位小写字母数字_-，密码 ≥6 位，或已被占用'
    return
  }
  setToken(res.token)
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
        USERNAME
        <input v-model="form.username" class="field" autocomplete="username" required />
      </label>
      <label class="readout">
        NICKNAME
        <input v-model="form.nickname" class="field" autocomplete="nickname" />
      </label>
      <label class="readout">
        PASSWORD
        <input v-model="form.password" class="field" type="password" autocomplete="new-password" required />
      </label>
      <p v-if="err" class="readout err">// {{ err }}</p>
      <button class="submit readout" type="submit">登记 · 注册</button>
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
  gap: 6px;
}

.field {
  background: none;
  border: 1px solid var(--line);
  color: var(--text-0);
  padding: 8px 12px;
  font-size: 14px;
}

.field:focus-visible {
  outline: 2px solid var(--signal);
  outline-offset: 2px;
}

.err {
  color: var(--signal);
}

.submit {
  align-self: flex-start;
  background: none;
  border: 1px solid var(--signal);
  color: var(--signal);
  padding: 8px 18px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.submit:hover {
  background: var(--signal);
  color: var(--ink-0);
}

.alt {
  margin-top: var(--space-3);
}

.alt a {
  color: var(--signal);
}
</style>
