/* 首屏地景的加载闸门：这张照片是首页的 LCP，星轨与章节内容都等它 load 完再开工。
   URL 从 --hero-img 令牌读（site.css 两主题各自定义），不再抄第三份图名映射；
   这里 new Image() 与 index.html 的 preload 指向同一个 URL，浏览器会把两条合成一条请求。
   图片出错或请求卡住时不能把整页内容一起扣住：error 立即放行，另有超时兜底。 */
let heroReady = null

export function whenHeroReady() {
  if (heroReady) return heroReady
  heroReady = new Promise((resolve) => {
    let done = false
    let timer = 0
    const finish = () => {
      if (done) return
      done = true
      clearTimeout(timer)
      resolve()
    }
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--hero-img')
    const src = raw.match(/url\(["']?(.+?)["']?\)/)?.[1]
    if (!src) return finish()
    const img = new Image()
    img.fetchPriority = 'high'
    img.addEventListener('load', finish, { once: true })
    img.addEventListener('error', finish, { once: true })
    img.src = src
    // 兜底要留得比慢网的实际下载还长：6s 在 Slow 4G 上会比 1.45MB 的照片先到，
    // 闸门一开，封面与轮播又会回头跟 LCP 抢带宽。error 自己立即放行，这里只管"卡住"。
    timer = setTimeout(finish, 20000)
  })
  return heroReady
}
