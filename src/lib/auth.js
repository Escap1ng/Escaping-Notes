// 会话状态：登录/登出/当前用户，供头部与管理界面共用
import { reactive } from 'vue'
import { api, getToken, setToken } from './api.js'

export const auth = reactive({ user: null, ready: false })

export async function loadMe() {
  const me = getToken() ? await api('/api/me') : null
  auth.user = me
  auth.ready = true
}

export function logout() {
  api('/api/logout', { method: 'POST' })
  setToken(null)
  auth.user = null
}

export const isAdmin = () => auth.user && (auth.user.role === 'admin' || auth.user.role === 'owner')
export const isOwner = () => auth.user && auth.user.role === 'owner'
