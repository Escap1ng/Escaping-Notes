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

// 项目介绍（detail / points / stack）只活在 src/config/projects.js 里：后台的 PROJECTS 块是
// 「每行 name|desc|year|url」的行式编辑，装不下多段正文，保存回来的数组因此不带这三个字段。
// 不在这里回贴，后台点一次保存就会把介绍整片抹掉。远程那几项优先——改的是卡面文案，不该被种子盖回去。
// 代价：在后台给项目改名等于把它和介绍断开（按 name 配对），那时要去种子文件同步这个名字。
const intros = new Map(seedProjects.map((p) => [p.name, p]))
const withIntro = (list) => list.map((p) => ({ ...intros.get(p.name), ...p }))

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
    if (Array.isArray(remote.projects)) content.projects = withIntro(remote.projects)
    if (Array.isArray(remote.gear)) content.gear = remote.gear.map(gearItem)
    if (Array.isArray(remote.playlist)) content.playlist = remote.playlist
  }
  content.ready = true
}

export { withIntro }
