<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, setToken, tryApi } from '../lib/api.js'
import { loadMe } from '../lib/auth.js'

const router = useRouter()
const needsSetup = ref(false)
const form = ref({ username: '', nickname: '', password: '' })
const err = ref('')

onMounted(async () => {
  const b = await api('/api/bootstrap')
  needsSetup.value = !!b?.needsSetup
})

async function submit() {
  err.value = ''
  const r = await tryApi(needsSetup.value ? '/api/setup' : '/api/login', {
    method: 'POST',
    body: form.value,
  })
  // 后端每个失败分支都带机器码，这里翻成对应那一句（见 narrative.js errors）。
  // 以前不分状态一律提示"用户名或密码错误"，于是"后端没起"也说成密码错——T2。
  if (!r.ok) {
    err.value = r.reason
    return
  }
  if (!r.data?.token) {
    err.value = '登录异常：服务器没返回令牌'
    return
  }
  setToken(r.data.token)
  await loadMe()
  router.push('/admin')
}
</script>

<template>
  <section class="page auth-page">
    <p class="readout page-code">// AUTH · {{ needsSetup ? 'SETUP' : 'LOGIN' }}</p>
    <h2 class="page-title">{{ needsSetup ? '初始化站长' : '登录' }}</h2>
    <p v-if="needsSetup" class="readout hint">首个账号将成为站长，拥有发文与全部管理权限。</p>

    <form class="auth-form" @submit.prevent="submit">
      <label class="readout">
        USERNAME · 用户名（注册后不可修改）
        <input v-model="form.username" class="field" autocomplete="username" required />
      </label>
      <label v-if="needsSetup" class="readout">
        NICKNAME · 昵称（可随意修改）
        <input v-model="form.nickname" class="field" autocomplete="nickname" />
      </label>
      <label class="readout">
        PASSWORD · 密码
        <input v-model="form.password" class="field" type="password" autocomplete="current-password" required />
      </label>
      <p v-if="err" class="neo-note-err">// {{ err }}</p>
      <button class="neo-btn neo-btn-primary" type="submit">
        {{ needsSetup ? '点火 · 初始化' : '入轨 · 登录' }}
      </button>
    </form>

    <p v-if="!needsSetup" class="readout alt">
      没有账号？<RouterLink to="/register">注册访客</RouterLink>
    </p>
  </section>
</template>

<style scoped>
.auth-page {
  max-width: 420px;
}

.hint {
  margin: 0 0 var(--space-2);
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
