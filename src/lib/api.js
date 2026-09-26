// 取数层唯一入口。两种用法，别混：
//   api()    → 成功给数据、任何失败给 null。给"后端缺席就降级到本地/种子"的读路径用。
//   tryApi() → 给 {ok,status,data,code,reason}。给需要告诉用户**到底为什么没成**的写路径用。
// 为什么要分两个函数：把 status 塞进 api() 的返回值会让 22 处降级判断同时失效（对象恒真），
// 那是比 T2 更糟的错。T2 的原症状是"密码错/被封/重名/限流/宕机/503 全显示同一句提示"。

import { N } from '../config/narrative.js'
import { KEYS, read, write } from './storage.js'

// 后端挂起时不能让界面无限转圈——超时即降级
const TIMEOUT = 10000
// 上传比读接口慢得多，单独一档；超了照样降级，不静默吞
const UPLOAD_TIMEOUT = 60000

// 后端压根没答话（网络不通 / 未启动 / 超时）。必须与"服务器答了但拒绝"分开：
// 混在一起就会出现"后端没起，提示你密码错了"这种把人引向错误方向的事。
const OFFLINE = 'offline'

export function getToken() {
  return read(KEYS.token)
}

export function setToken(t) {
  write(KEYS.token, t || null)
}

async function request(path, { method = 'GET', body, form, timeout = TIMEOUT } = {}) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeout)
  try {
    const headers = {}
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    // form 走 FormData：不能手设 Content-Type，boundary 由浏览器补
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch(path, {
      method,
      headers,
      body: form || (body !== undefined ? JSON.stringify(body) : undefined),
      signal: ctrl.signal,
    })
    let data = null
    try {
      data = await res.json()
    } catch {
      /* 空响应体或非 JSON：data 留 null，ok 仍以状态码为准 */
    }
    // 错误体里带的是机器码（api.py 的 {'error': 'bad credentials'}），翻不翻成中文由调用方决定
    return {
      ok: res.ok,
      status: res.status,
      data,
      code: res.ok ? null : data && data.error ? data.error : `HTTP ${res.status}`,
    }
  } catch {
    return { ok: false, status: 0, data: null, code: OFFLINE } // 网络错误 / 主动超时：一律降级
  } finally {
    clearTimeout(timer)
  }
}

export async function api(path, opts) {
  const r = await request(path, opts)
  return r.ok ? r.data : null
}

export async function tryApi(path, opts) {
  const r = await request(path, opts)
  return { ...r, reason: r.ok ? '' : (N.errors[r.code] || N.errors.unknown) }
}

// 上传唯一通道。此前 AdminView 里两处裸 fetch 手拼 Bearer，是唯一不受本文件契约保护的调用点
//（缺陷 T4）：没有超时、没有统一降级、令牌口径各写一遍。
export function uploadFile(path, file, opts = {}) {
  const form = new FormData()
  form.append('file', file)
  return tryApi(path, { method: 'POST', form, timeout: UPLOAD_TIMEOUT, ...opts })
}
