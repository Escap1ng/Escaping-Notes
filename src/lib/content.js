// 站点内容 store：API 事实源优先，配置文件作种子与离线回退（Pages 镜像可用）
import { reactive } from 'vue'
import { api } from './api.js'
import { site as seedSite } from '../config/site.js'
import { updates as seedUpdates } from '../config/updates.js'
import { projects as seedProjects } from '../config/projects.js'
import { playlist as seedPlaylist } from '../config/music.js'

const clone = (o) => JSON.parse(JSON.stringify(o))

// gear 早先是纯字符串（每行一项），现在是 {name, note}。服务器里那份旧数据还会回传字符串，
// 统一在入口扳成对象，消费方（关于页 / 后台表单）就只认一种形状
const gearItem = (g) => (typeof g === 'string' ? { name: g, note: '' } : g)

export const content = reactive({
  site: { ...seedSite },
  updates: clone(seedUpdates),
  projects: clone(seedProjects),
  gear: (seedSite.gear || []).map(gearItem),
  playlist: clone(seedPlaylist),
  ready: false,
})

export async function loadContent() {
  const remote = await api('/api/content')
  if (remote) {
    if (remote.site) Object.assign(content.site, remote.site)
    if (Array.isArray(remote.updates)) content.updates = remote.updates
    if (Array.isArray(remote.projects)) content.projects = remote.projects
    if (Array.isArray(remote.gear)) content.gear = remote.gear.map(gearItem)
    if (Array.isArray(remote.playlist)) content.playlist = remote.playlist
  }
  content.ready = true
}
