// 站点自有内容的唯一一道门：视图与组件不再各自去 import 数据文件。
//
// 为什么要收成一道门：同一份 `updates` 曾有两条路（`UpdatesView` 走 store、`HomeView` 直连
// `data/updates.js`）——"改了不生效"与"两处不一样"于是都变成必须读代码才能发现的问题。
// 加一类内容 = 在 `src/data/` 放一份文件 + 在这里挂一行，别处不动。
//
// 两件故意不进门：
//   · 文章——它是文件不是数据，取数在 `src/lib/posts.js`，字段口径在 `src/lib/schema.js`；
//   · 文案层 `narrative.js`（`N` / `navLabel` / `pageTitle`）——视图直连它是对的，它不参与
//     "改一处全站跟着变"，包一层只会让每句话多一次拷贝、多一跳。
//
// 也没人往这里写（全站只读），所以既不套 reactive 也不做深拷贝：一处赋值漏进来就该被
// Object.freeze 当场拦下，而不是静默改到下一个访客打开页面才看见。纯 ESM 不带 vue，
// 因此 Node 那一岸（scripts/）也 import 得动——同一扇门，两个岸。
import { friends } from './friends.js'
import { sitePlates } from './gallery.js'
import { playlist } from './music.js'
import { projects } from './projects.js'
import { site } from './site.js'
import { updates } from './updates.js'

export const content = Object.freeze({
  site,
  updates,
  projects,
  playlist,
  friends,
  // 映像柜里站点自己的那几张底片；文章封面不在这儿，由 src/lib/gallery.js 从各卷目录收
  plates: sitePlates,
})
