// 站点内容 store：全部取自 src/config/*.js 的种子（纯静态站，构建期定稿）
import { reactive } from 'vue'
import { site as seedSite } from '../config/site.js'
import { updates as seedUpdates } from '../config/updates.js'
import { projects as seedProjects } from '../config/projects.js'
import { playlist as seedPlaylist } from '../config/music.js'

const clone = (o) => JSON.parse(JSON.stringify(o))

// gear 早先是纯字符串（每行一项），现在是 {name, note}。旧数据里还可能是字符串，
// 统一在入口扳成对象，消费方（关于页）就只认一种形状
const gearItem = (g) => (typeof g === 'string' ? { name: g, note: '' } : g)

export const content = reactive({
  site: { ...seedSite },
  updates: clone(seedUpdates),
  projects: clone(seedProjects),
  gear: (seedSite.gear || []).map(gearItem),
  playlist: clone(seedPlaylist),
})
