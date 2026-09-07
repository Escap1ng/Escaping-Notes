// QQ 音乐歌单运行时 store：/api/records 事实源优先，静态快照（config/records.js）作离线/镜像回退
// 同步：/api/sync/records（POST，仅站长）→ 后端重抓 QQ 音乐并落盘，前端 loadRecords 刷新
import { reactive } from 'vue'
import { api } from './api.js'
import { records as seed } from '../config/records.js'

export const records = reactive({ ...seed })

export async function loadRecords() {
  const r = await api('/api/records')
  if (r && Array.isArray(r.songs) && r.songs.length) Object.assign(records, r)
}

export async function syncRecords() {
  return api('/api/sync/records', { method: 'POST' })
}
