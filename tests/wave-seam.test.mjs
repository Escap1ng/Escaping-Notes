// 接缝波脊的五条回归钉子（2026-10-20 起，10-30 第三次重做后重写）：
//   ⑴ 只许长在折线以上：容器底边钉在抽屉顶边，路径在 y = WAVE_PEAK 处闭合；
//   ⑵ 包络两端归零、中部最高，各宽度是同一条钟；
//   ⑶ 钟身有质感、但不许扎出单根尖刺；
//   ⑷ 三列行波同向推进：脊线在动、轮廓不动（石钟不呼吸）；
//   ⑸ HomeView 真的接在 lib 上，并且不再有竖条。
// 判据全部对 `src/lib/wave.js` 的纯函数下手；负向对照喂"没有包络/恒定质感/白噪声/静止"的假数据。
// 跑法：npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { WAVE_PEAK, ridgeHeight, ridgePath } from '../src/lib/wave.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = (p) => readFileSync(join(ROOT, p), 'utf8')
const home = src('src/views/HomeView.vue')

const STEP = 6
const heights = (width, t = 0) => {
  const a = []
  for (let x = 0; x <= width; x += STEP) a.push(ridgeHeight(x, width, t) * WAVE_PEAK)
  return a
}
// 25 个采样点的滑动平均（≈150px 窗口）：抹掉细节行波，留包络本身的形状
const smooth = (a, k = 25) =>
  a.map((_, i) => {
    let v = 0
    let n = 0
    for (let j = i - k; j <= i + k; j++) {
      if (j >= 0 && j < a.length) {
        v += a[j]
        n++
      }
    }
    return v / n
  })
const bell = (u) => Math.sin(Math.PI * Math.min(1, Math.max(0, u)))
const maxStep = (a) => {
  let m = 0
  for (let i = 1; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - a[i - 1]))
  return m
}
const bands = (a) => {
  const n = a.length
  return [0, 0.2, 0.4, 0.6, 0.8].map((f) => {
    const b = a.slice(Math.floor(n * f), Math.floor(n * (f + 0.2)))
    return b.reduce((x, y) => x + y, 0) / b.length
  })
}
// 包络除掉之后的"质感"（只用包络够高的那一段，两端 0/0 没有意义）
const texture = (a) => {
  const out = []
  for (let i = 0; i < a.length; i++) {
    const b = bell(i / (a.length - 1))
    if (b >= 0.3) out.push(a[i] / (WAVE_PEAK * b))
  }
  return out
}
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length
const sd = (a) => {
  const m = mean(a)
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length)
}

/* ⑴ 只长在折线上方：判据做成纯函数，负向对照喂旧版的"上下居中"写法 */
const onlyAbove = (css) => {
  const block = css.match(/\.wave \{([\s\S]*?)\n\}/)
  if (!block) return false
  const b = block[1]
  return /bottom:\s*100%/.test(b) && !/top:\s*0/.test(b) && !/translateY\(-50%\)/.test(b) && /height:/.test(b)
}

test('波脊只立在折线上方：路径在接缝处闭合，容器底边钉在抽屉顶边', () => {
  assert.equal(onlyAbove(home), true, '波脊没有钉在接缝上')

  const old = home.replace('bottom: 100%;', 'top: 0;\n  transform: translateY(-50%);')
  assert.notEqual(old, home, '这记假根本没改动文件体')
  assert.equal(onlyAbove(old), false)

  // 路径自己也在底线收口：起点与终点都落在 y = WAVE_PEAK，折线以下一段都没有
  for (const w of [320, 1440, 1920]) {
    const d = ridgePath(w, 0)
    assert.match(d, new RegExp(`^M0,${WAVE_PEAK}`), `${w}px 的路径没从接缝起笔`)
    assert.match(d, new RegExp(`L${w},${WAVE_PEAK}Z$`), `${w}px 的路径没在接缝收口`)
    const ys = [...d.matchAll(/L[\d.]+,([\d.]+)/g)].map((m) => Number(m[1]))
    assert.ok(Math.min(...ys) >= 0 && Math.max(...ys) <= WAVE_PEAK, `${w}px 的路径画出了画布`)
  }
})

test('包络两端归零、中部最高：各宽度是同一条钟', () => {
  // 负向对照：只留质感、不乘包络（一条到处一样高的带子）
  const noBell = heights(1440).map((_, i) => WAVE_PEAK * (0.6 + 0.4 * Math.sin(i / 3)))
  assert.ok(noBell[0] > 20, '对照失效：没有包络的假数据两端竟然也归零了')

  for (const w of [320, 390, 768, 1440, 1920]) {
    const a = heights(w)
    assert.ok(a[0] <= 4 && a[a.length - 1] <= 4, `${w}px 两端没有消失（${a[0].toFixed(1)} / ${a.at(-1).toFixed(1)}px）`)

    const [b1, b2, b3, b4, b5] = bands(a)
    assert.ok(b2 < b3 && b3 > b4, `${w}px 五段均高 ${[b1, b2, b3, b4, b5].map((v) => v.toFixed(1)).join('/')} 不是"涨—顶—落"`)
    assert.ok(b3 >= b1 * 2.5, `${w}px 中段只有两端的 ${(b3 / b1).toFixed(1)} 倍`)
    assert.ok(b1 < 35 && b5 < 35, `${w}px 两侧没有低下去（${b1.toFixed(1)} / ${b5.toFixed(1)}px）`)

    // 峰位与肩线看平滑后的包络：单点峰值会被质感推偏几十像素。
    // 只在 ≥768px 上量峰位——320/390 上一列 560px 的涌浪连一个周期都放不下，
    // 峰落在 30% 还是 50% 取决于噪声的相位，形状该由下面的五段均高来钉。
    const s = smooth(a)
    if (w >= 768) {
      const at = s.indexOf(Math.max(...s)) / (s.length - 1)
      assert.ok(at >= 0.35 && at <= 0.65, `${w}px 峰落在 ${(at * 100).toFixed(0)}% 处，不在中间`)
      const shoulder = s[Math.floor(s.length * 0.25)] / Math.max(...s)
      assert.ok(shoulder >= 0.5 && shoulder <= 0.9, `${w}px 1/4 处是峰的 ${(shoulder * 100).toFixed(0)}%，肩线不像钟形`)
    }
    assert.ok(Math.max(...a) >= 60 && Math.max(...a) <= 92, `${w}px 峰值 ${Math.max(...a).toFixed(1)}px 不在 60–92 之间`)
  }
})

test('钟身有质感：除包络后仍有起伏，但不许扎出尖刺', () => {
  const a = heights(1440)
  const ratio = texture(a)
  assert.ok(sd(ratio) >= 0.02, `质感起伏只有 ${sd(ratio).toFixed(3)}，等于一条光溜溜的钟`)
  assert.ok(Math.max(...ratio) - Math.min(...ratio) >= 0.1, '质感最大落差不到 10%，看不出起伏')
  assert.ok(maxStep(a) <= 8, `相邻采样点差 ${maxStep(a).toFixed(1)}px，会读成尖刺`)

  // 负向对照：同一包络配恒定质感 → sd 归零；逐点白噪声 → 斜率必然越线
  const flat = a.map((_, i) => WAVE_PEAK * bell(i / (a.length - 1)) * 0.8)
  assert.ok(sd(texture(flat)) < 0.01, '恒定质感的对照没归零，判据写错了')

  let seed = 7
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
  const white = Array.from({ length: 120 }, () => WAVE_PEAK * (0.4 + 0.6 * rnd()))
  assert.ok(maxStep(white) > 8, '白噪声对照没被抓住，斜率判据是摆设')
})

test('三列行波同向推进：脊线在动，包络不动', () => {
  const crest = (t) => {
    const s = smooth(heights(1440, t))
    let bi = 0
    let bv = -1
    for (let i = Math.floor(s.length * 0.15); i < Math.floor(s.length * 0.85); i++) {
      if (s[i] > bv) {
        bv = s[i]
        bi = i
      }
    }
    return bi / (s.length - 1)
  }

  const track = [0, 2, 4, 6, 8].map(crest)
  for (let i = 1; i < track.length; i++) {
    assert.ok(track[i] > track[i - 1], `t=${[0, 2, 4, 6, 8][i]}s 时波峰没有继续右移：${track.map((v) => v.toFixed(3)).join(' → ')}`)
  }
  // 8 秒里至少走过 5% 的整排宽（太慢就等于静止）
  assert.ok(track.at(-1) - track[0] >= 0.05, `8 秒只走了 ${((track.at(-1) - track[0]) * 100).toFixed(1)}% 的宽度`)

  // 脊线真的在变：同一点的高度随时间变化
  const a = heights(1440, 0)
  const b = heights(1440, 4)
  assert.ok(Math.max(...a.map((v, i) => Math.abs(v - b[i]))) >= 3, '4 秒后脊线几乎没动')

  // 负向对照：时间被忽略（整排呼吸式的静止轮廓）→ 峰位不动
  const still = [0, 2, 4, 6, 8].map(() => crest(0))
  assert.ok(still[still.length - 1] - still[0] === 0, '静止对照竟然也在移动')
})

test('HomeView 接在 lib 上，竖条已经撤掉', () => {
  assert.match(home, /from '\.\.\/lib\/wave\.js'/, 'HomeView 没从 lib/wave.js 取波脊')
  assert.match(home, /ridgePath\(waveW\.value,/, 'HomeView 没按容器宽重算路径')
  assert.match(home, /WAVE_PEAK/, '容器高不是从 lib 读的')
  assert.match(home, /drawerEl\.value\?\.clientWidth/, '宽度必须量抽屉的 clientWidth（innerWidth 含滚动条）')
  assert.doesNotMatch(home, /innerWidth[\s\S]{0,80}waveW/, '波宽又用 innerWidth 了')
  assert.doesNotMatch(home, /\.wave i\b/, '竖条的样式还留着')
  assert.doesNotMatch(home, /wave-breathe/, '整排呼吸的关键帧还留着')

  // 停帧条件必须在：离屏 / 隐藏 / 减弱动效
  assert.match(home, /prefers-reduced-motion/, '没有减弱动效的静态分支')
  assert.match(home, /IntersectionObserver/, '没有离屏停帧')
  assert.match(home, /document\.hidden/, '没有标签页隐藏停帧')
})
