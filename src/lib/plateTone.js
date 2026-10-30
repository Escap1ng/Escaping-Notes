// 页顶字色跟随底片：三张轮播底片的顶带（顶栏那 ~76px）亮度差得很远——
// 浅色下 paper1 的 p50 相对亮度 ≈0.23、paper3 ≈0.03、paper4 ≈0.01（2026-10-30 实测，
// 按 CSS 的 cover / 50% 34% 映射采样）。同一枚字色必有一张不达标：
// 墨字压 paper1 只有 ~5.0:1，压 paper3 掉到 1.4:1；纸字反过来是 3.4 / 13 / 20。
// 所以这里在起页时逐张采样顶带，在「--text-0」与「--ink-0」两枚主题令牌里挑
// 最坏样本也过 4.5:1 的那一枚写进 --hdr-fg，并按 plate-slot 的 10s 档位跟着换；
// 颜色变化交给顶栏自己的 transition 交叉淡，与底片淡入同拍。
//
// 只服务次级页：首页顶栏压的是 .hero-plate（自带天空纱），字色维持主题默认。

const TOP = 76 // 顶栏高度（触控档 76px，宽屏 65px；取大的那一档）
const SLOT_MS = 10000 // 与 site.css 的 --plate-cycle 30s / 3 张同拍
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)')

const lin = (v) => {
  const c = v / 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}
const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)

const hexLum = (h) => {
  const s = h.trim().replace('#', '')
  const n = s.length === 3 ? s.split('').map((c) => c + c).join('') : s
  return lum(parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16))
}
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)

// 两张牌之间混一档（只吃 hex 令牌；t=0 取 a，t=1 取 b）
function mixHex(a, b, t) {
  const pa = a.trim().replace('#', '')
  const pb = b.trim().replace('#', '')
  const ch = (s, i) => parseInt(s.slice(i, i + 2), 16)
  const one = (i) => Math.round(ch(pa, i) * (1 - t) + ch(pb, i) * t)
  return '#' + [0, 2, 4].map((i) => one(i).toString(16).padStart(2, '0')).join('')
}

const urlOf = (v) => v.trim().replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '')

// 顶带在底片上的位置：CSS background-size: cover、background-position: 50% 34%
function stripRect(img) {
  const scale = Math.max(innerWidth / img.naturalWidth, innerHeight / img.naturalHeight)
  const offY = (innerHeight - img.naturalHeight * scale) * 0.34
  const y = Math.max(0, -offY) / scale
  return { y, h: Math.min(TOP / scale, img.naturalHeight - y) }
}

// 返回 [{ lo, hi }]：该张顶带的亮度下沿 / 上沿（p5 / p95）。
// 不用 img.decode()：标签页在后台时它可能一直不 resolve（实测隐藏标签页里 15s 不返回）；
// onload + drawImage 就够——drawImage 会同步解码，图片本身早被底片层缓存过了。
function loadImg(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

async function sampleStrip(url) {
  const img = await loadImg(url)
  const { y, h } = stripRect(img)
  const cvs = document.createElement('canvas')
  cvs.width = 160
  cvs.height = 12
  const g = cvs.getContext('2d', { willReadFrequently: true })
  g.drawImage(img, 0, y, img.naturalWidth, h, 0, 0, cvs.width, cvs.height)
  const d = g.getImageData(0, 0, cvs.width, cvs.height).data
  const ls = []
  for (let i = 0; i < d.length; i += 4) ls.push(lum(d[i], d[i + 1], d[i + 2]))
  ls.sort((a, b) => a - b)
  const p = (q) => ls[Math.min(ls.length - 1, Math.floor(q * ls.length))]
  return { lo: p(0.05), hi: p(0.95) }
}

export function createPlateTone() {
  let tones = [] // [{ lo, hi, fg, cold }] 三张的顺序：--plate-img / -2 / -3
  let timer = 0
  let start = 0
  let current = -1
  let running = false
  let token = 0 // 主题切换后旧采样作废

  function apply(i) {
    current = i
    const t = tones[i]
    const root = document.documentElement
    if (!t) {
      root.removeAttribute('data-plate-tone')
      root.removeAttribute('data-plate-cold')
      root.style.removeProperty('--hdr-fg')
      return
    }
    root.style.setProperty('--hdr-fg', t.fg)
    root.dataset.plateTone = t.fg
    if (t.cold) root.dataset.plateCold = '1'
    else delete root.dataset.plateCold
  }

  // 当前该用哪一张的字色 = 底片动画自己走到哪一档，而不是"采样器启动了几秒"。
  // 两者不是同一个钟：先逛首页再 SPA 跳到次级页时，.sub-plate 的轮播早就在跑，
  // 按自己的秒数算会永久错开 10~20s（字色对不上当前那张）。第一层 <i> 的 CSS 动画
  // 延迟 9s，所以 全局相位 = currentTime + 9000，再按 30s 一圈切成三档。
  function phase() {
    const a = document.querySelector('.sub-plate > i')?.getAnimations?.()[0]
    const t = a?.currentTime
    if (typeof t === 'number' && Number.isFinite(t)) {
      return Math.floor((((t + 9000) % 30000) + 30000) % 30000 / SLOT_MS)
    }
    // 拿不到动画（无动画层、或减弱动效停成了第一张）：按启动秒数兜底
    return Math.floor((performance.now() - start) / SLOT_MS) % 3
  }

  async function sample() {
    const mine = ++token
    const cs = getComputedStyle(document.documentElement)
    const text0 = cs.getPropertyValue('--text-0').trim()
    const ink0 = cs.getPropertyValue('--ink-0').trim()
    const cold = cs.getPropertyValue('--cold').trim()
    const urls = ['--plate-img', '--plate-img-2', '--plate-img-3'].map((k) => urlOf(cs.getPropertyValue(k)))
    const strips = await Promise.all(urls.map((u) => sampleStrip(u).catch(() => null)))
    if (mine !== token || !running) return
    // 三枚候选：两枚主题令牌 + 「重一档的墨」——浅色下 text-0 压 paper1 的最暗 5%
    // 只有 4.46:1（差在四舍五入线上），混 30% 黑后是 4.65:1；深色主题里这枚混出来是灰，
    // 每张各取最优，它自然不会胜出。
    const heavyInk = mixHex(text0, '#000000', 0.3)
    const cands = [text0, ink0, heavyInk]
    const worst = (fg, s) => {
      const lf = hexLum(fg)
      return Math.min(ratio(lf, s.lo), ratio(lf, s.hi))
    }
    // 逐张选色：这三张顶带亮度差一个数量级（0.23 / 0.03 / 0.01），单色必有一张不达标
    tones = strips.map((s) => {
      if (!s) return null
      let fg = cands[0]
      for (const c of cands) if (worst(c, s) > worst(fg, s)) fg = c
      return { ...s, fg, cold: worst(cold, s) >= 4.5 }
    })
    // 减弱动效：轮播停在第一张，字色只认第一张
    if (REDUCED.matches) {
      apply(0)
      return
    }
    apply(phase())
  }

  // 标签页藏起来时 setInterval 会被压到 1s/次甚至 1min/次，切回来颜色可能滞后。
  // 每次可见性变化都立刻对一次表；相位本身读的是 CSS 动画的 currentTime，不累积漂移。
  function onVis() {
    if (document.visibilityState === 'visible') tick()
  }

  function tick() {
    // 减弱动效：轮播停在第一张，字色不跟着时间翻了
    if (REDUCED.matches) {
      if (current !== 0) apply(0)
      return
    }
    const i = phase()
    if (i !== current) apply(i)
  }

  return {
    start() {
      if (running) return
      running = true
      start = performance.now()
      // 立刻采：三张底片此时已经是 .sub-plate 的背景、正从缓存里出来，onload 很快；
      // 早一步落定字色，省掉「默认灰字压在照片上」那几帧
      sample()
      timer = setInterval(tick, 400)
      document.addEventListener('visibilitychange', onVis)
    },
    stop() {
      running = false
      clearInterval(timer)
      timer = 0
      current = -1
      document.removeEventListener('visibilitychange', onVis)
      const root = document.documentElement
      root.removeAttribute('data-plate-tone')
      root.removeAttribute('data-plate-cold')
      root.style.removeProperty('--hdr-fg')
    },
    // 主题换了：令牌与底片都换了一套，重采
    refresh() {
      if (running) sample()
    },
  }
}
