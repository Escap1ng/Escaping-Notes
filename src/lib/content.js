// 站点内容 store：API 事实源优先，配置文件作种子与离线回退（Pages 镜像可用）
import { reactive } from 'vue'
import { api } from './api.js'
import { site as seedSite } from '../config/site.js'
import { updates as seedUpdates } from '../config/updates.js'
import { linkGroups as seedLinks } from '../config/links.js'
import { projects as seedProjects } from '../config/projects.js'
import { playlist as seedPlaylist } from '../config/music.js'
import { whispers as seedWhispers } from '../config/whispers.js'

const clone = (o) => JSON.parse(JSON.stringify(o))

export const content = reactive({
  site: { ...seedSite },
  updates: clone(seedUpdates),
  linkGroups: clone(seedLinks),
  projects: clone(seedProjects),
  gear: clone(seedSite.gear || []),
  playlist: clone(seedPlaylist),
  whispers: clone(seedWhispers),
  ready: false,
})

export async function loadContent() {
  const remote = await api('/api/content')
  if (remote) {
    if (remote.site) Object.assign(content.site, remote.site)
    if (Array.isArray(remote.updates)) content.updates = remote.updates
    if (Array.isArray(remote.links)) content.linkGroups = remote.links
    if (Array.isArray(remote.projects)) content.projects = remote.projects
    if (Array.isArray(remote.gear)) content.gear = remote.gear
    if (Array.isArray(remote.playlist)) content.playlist = remote.playlist
    if (Array.isArray(remote.whispers)) content.whispers = remote.whispers
  }
  content.ready = true
}
