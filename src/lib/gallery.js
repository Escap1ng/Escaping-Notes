// 映像柜（/gallery）的取数：文章封面 + 站点自己的底片，按 src 去重后串成一列。
// 照片在这里是**整张**上的墙，不做 3:2 裁切，所以 frontmatter 的 imagePos 用不上——
// 列表页那格封面才需要选焦点，这里看到的是原图的全幅。
import { loadPosts } from './posts.js'
import { sitePlates } from '../config/gallery.js'

// 歪斜角：按 src 哈希出来，同一张图永远同一个姿态。用 Math.random 的话每次进页整墙
// 换个角度，读起来是抖动而不是手作。值域 ±2.4°（7 档 × 0.8°）——再大白框就歪得扎眼。
function tiltFor(src) {
  let h = 0
  for (const ch of src) h = (h << 5) - h + ch.charCodeAt(0)
  return (Math.abs(h % 7) - 3) * 0.8
}

export async function loadGallery() {
  const shots = []
  const seen = new Set()
  const add = (src, title) => {
    if (!src || seen.has(src)) return
    seen.add(src)
    shots.push({ src, title, tilt: tiltFor(src) })
  }
  // loadPosts 两路（API / 打包）都按 date 倒序，所以最新那篇的封面落在墙上第一格；
  // 同一张图被两篇用过只留较新的那篇，柜里不会出现重影。
  for (const p of await loadPosts()) add(p.image, p.title || p.slug)
  for (const s of sitePlates) add(s.src, s.title)
  return shots
}
