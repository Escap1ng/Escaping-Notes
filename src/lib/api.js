// 极简 API 客户端：任何失败返回 null，站点自动降级（只读/本地模式）
const TOKEN_KEY = 'en-token'
// 单次请求上限：后端挂起时不能让界面无限转圈——超时即降级（可能要多等一会儿才能出内容）
const TIMEOUT = 10000

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t)
  else localStorage.removeItem(TOKEN_KEY)
}

export async function api(path, { method = 'GET', body, timeout = TIMEOUT } = {}) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeout)
  try {
    const headers = {}
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch(path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null // 网络错误 / 主动超时：一律降级
  } finally {
    clearTimeout(timer)
  }
}
