// 接缝声波的四条回归钉子（2026-10-20，10-27 补横向溢出，10-30 补波形本身）：
//   ⑴ 只许长在折线以上：容器底边钉在抽屉顶边、竖条走 flex-end，折线以下不留一段；
//   ⑵ 手机端的涨落波长收口：390px 要读得出「波」，不再只有左高右平的一段；
//   ⑶ 整排不越界：根数按 clientWidth 取 floor，末根整根落在容器里，不撑出横向滚动；
//   ⑷ 波形本身：一条与整排同宽的钟形包络——中部最高、两侧递减、最边上归零，
//      包络里仍有局部起伏，但不许长出单根尖刺。
// 跑法：npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = (p) => readFileSync(join(ROOT, p), 'utf8')
const home = src('src/views/HomeView.vue')
// 去空白再比对：高度式子只钉「算什么」，不钉换行与缩进
const tight = home.replace(/\s+/g, '')

// 判据做成纯函数：负向对照喂旧版/改坏的文本，而不是对着字面量自说自话
const onlyAbove = (css) => {
  const block = css.match(/\.wave \{([\s\S]*?)\n\}/)
  if (!block) return false
  const b = block[1]
  return (
    /bottom:\s*100%/.test(b) &&
    /align-items:\s*flex-end/.test(b) &&
    !/translateY\(-50%\)/.test(b) &&
    /clip-path:\s*inset\(-8px 0 0 0\)/.test(b)
  )
}

const num = (name) => {
  const m = home.match(new RegExp(`const ${name} = ([\\d.]+)`))
  assert.ok(m, `HomeView 里找不到常数 ${name}`)
  return Number(m[1])
}
const pitch = () => num('BAR_W') + num('BAR_GAP')
const waveLen = (width) => {
  const min = num('WAVE_LEN_MIN')
  const max = num('WAVE_LEN_MAX')
  return Math.max(min, Math.min(max, width * num('WAVE_LEN_VW')))
}
/* 整排占宽：n 根共 pitch·n − gap px，根数取整根放得下的最大值（旧口径 ceil 会多补一根）。 */
const span = (width) => Math.floor((width + num('BAR_GAP')) / pitch()) * pitch() - num('BAR_GAP')
const cycles = (width) => span(width) / waveLen(width)

/* 高度式子照抄 HomeView 的算法——但先钉住那几行字面量，改了式子这里必须跟着改，
   否则下面量到的就不是页面上那一排。 */
const frac = (x) => x - Math.floor(x)
const noise = (i) => frac(Math.sin(i * 127.1 + 311.7) * 43758.5453)
const shapePinned = () =>
  tight.includes('constbell=Math.pow(Math.sin(Math.PI*((i+0.5)/count)),WAVE_BELL_POW)') &&
  tight.includes(
    'consttexture=Math.min(1,Math.max(0,WAVE_T_FLOOR+WAVE_T_SWING*(WAVE_W_SLOW*slow+WAVE_W_MID*mid+WAVE_W_FINE*fine)+WAVE_W_JIT*jitter))'
  ) &&
  tight.includes('constslow=0.5+0.5*Math.sin(i*phase+0.9)') &&
  tight.includes('constmid=0.5+0.5*Math.sin(i*midPhase+2.1)') &&
  tight.includes('constfine=0.5+0.5*Math.sin(i*finePhase+5.2)') &&
  tight.includes('constjitter=(noise(i-0.5)+noise(i)+noise(i+0.5))/3-0.5') &&
  tight.includes('h:Math.round(WAVE_PEAK*bell*texture),')

const bell = (u) => Math.pow(Math.sin(Math.PI * u), num('WAVE_BELL_POW'))

const heights = (width) => {
  assert.ok(shapePinned(), 'HomeView 的波形式子换了形状，本文件的复算已与页面脱节')
  const count = Math.floor((width + num('BAR_GAP')) / pitch())
  const phase = (2 * Math.PI * pitch()) / waveLen(width)
  const midPhase = (2 * Math.PI * pitch()) / num('WAVE_MID_LEN')
  const finePhase = (2 * Math.PI * pitch()) / num('WAVE_FINE_LEN')
  return Array.from({ length: count }, (_, i) => {
    const slow = 0.5 + 0.5 * Math.sin(i * phase + 0.9)
    const mid = 0.5 + 0.5 * Math.sin(i * midPhase + 2.1)
    const fine = 0.5 + 0.5 * Math.sin(i * finePhase + 5.2)
    const jitter = (noise(i - 0.5) + noise(i) + noise(i + 0.5)) / 3 - 0.5
    const texture = Math.min(
      1,
      Math.max(
        0,
        num('WAVE_T_FLOOR') +
          num('WAVE_T_SWING') * (num('WAVE_W_SLOW') * slow + num('WAVE_W_MID') * mid + num('WAVE_W_FINE') * fine) +
          num('WAVE_W_JIT') * jitter
      )
    )
    return Math.round(num('WAVE_PEAK') * bell((i + 0.5) / count) * texture)
  })
}

/* 2026-10-29 那一版：7 抽平滑噪声 × 慢正弦，整排几乎等高。留作负向对照。 */
const smooth7 = (i) =>
  (noise(i - 3) + 2 * noise(i - 2) + 3 * noise(i - 1) + 4 * noise(i) + 3 * noise(i + 1) + 2 * noise(i + 2) + noise(i + 3)) / 16
const legacyHeights = (width) => {
  const count = Math.floor((width + num('BAR_GAP')) / pitch())
  const phase = (2 * Math.PI * pitch()) / waveLen(width)
  return Array.from({ length: count }, (_, i) => {
    const swell = 0.5 + 0.5 * Math.sin(i * phase + 0.9)
    return Math.round((26 + 76 * Math.pow(smooth7(i), 0.9) * (0.65 + 0.35 * swell)) * 0.7)
  })
}

const maxStep = (a) => {
  let m = 0
  for (let i = 1; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - a[i - 1]))
  return m
}
/* 五段均高：两端各 20%、中间三段。钟形包络要的是"涨—顶—落"。 */
const bands = (a) => {
  const n = a.length
  return [0, 0.2, 0.4, 0.6, 0.8].map((f) => {
    const b = a.slice(Math.floor(n * f), Math.floor(n * (f + 0.2)))
    return b.reduce((x, y) => x + y, 0) / b.length
  })
}

test('接缝声波只立在折线上方，折线以下不留弧段', () => {
  assert.equal(onlyAbove(home), true, '声波仍在接缝上下对称，折线以下还有一段')
  // 负向对照：改回旧版的 top:0 + translateY(-50%)，同一条判据必须变红
  const old = home
    .replace('bottom: 100%;', 'top: 0;\n  transform: translateY(-50%);')
    .replace('align-items: flex-end;', 'align-items: center;')
    .replace('  clip-path: inset(-8px 0 0 0);\n', '')
  assert.equal(onlyAbove(old), false)
  // 旧的 ::before 上半截延伸必须整块删掉，否则会多出一截高度
  assert.doesNotMatch(home, /\.wave i::before/)
  // 底座贴线：呼吸收缩时不能离地
  assert.match(home, /transform-origin:\s*center bottom/)
})

test('手机端波长收口：390px 至少 1.4 个涨落，桌面仍是旧的 530px', () => {
  // 旧口径固定 530px：390px 只有 0.74 个涨落，这是"左高右平"的来源
  const old = (width) => (Math.ceil((width + 1) / pitch()) * pitch()) / 530
  assert.ok(old(390) < 0.8, '对照失效：旧的 530px 在 390px 上竟然已经很完整')
  assert.ok(cycles(390) >= 1.4 && cycles(390) <= 1.9, `390px 上是 ${cycles(390).toFixed(2)} 个涨落`)
  assert.ok(Math.abs(cycles(1440) - 2.72) < 0.05, `1440px 上是 ${cycles(1440).toFixed(2)} 个涨落`)
  // 相位必须真的从这套常数算出来，而不是留着一个没人用的旋钮
  assert.match(home, /const wavePhase = \(\) =>[\s\S]*?WAVE_LEN_MIN[\s\S]*?WAVE_LEN_VW/)
})

test('竖条整根落在容器内：末根不越界，页面不再多出横向滚动', () => {
  /* 旧口径拿 innerWidth 补根：1590px 视口里 clientWidth 只有 1582px（8px 竖向滚动条），
     ceil((1590+1)/pitch) = 228 根，整排 1594px，比容器多出 12px——clip-path 只裁画面，
     不改滚动溢出，页面因此一直挂着横向滚动条。 */
  const oldSpan = (container, viewport = container) =>
    Math.ceil((viewport + 1) / pitch()) * pitch() - num('BAR_GAP')
  assert.equal(oldSpan(1582, 1590) - 1582, 12, '对照失效：旧口径在 1582px 容器上竟然没越界')

  for (const width of [320, 390, 768, 1120, 1440, 1582, 1920]) {
    assert.ok(span(width) <= width, `${width}px 上整排 ${span(width)}px 越出容器`)
  }

  // 宽度必须量容器可视宽（clientWidth，已扣滚动条），且取 floor；innerWidth 含滚动条
  const fn = home.match(/const barCount = \(width\) =>[\s\S]*?WAVE_PITCH\)/)
  assert.ok(fn, 'HomeView 里找不到 barCount(width)')
  assert.match(fn[0], /document\.documentElement\.clientWidth/)
  assert.match(fn[0], /Math\.floor/)
  assert.doesNotMatch(fn[0], /innerWidth/)
  // 滚动条出现/消失不发 resize，根数得由容器上的 ResizeObserver 跟着改
  assert.match(home, /drawerEl\.value\?\.clientWidth/)
  assert.match(home, /new ResizeObserver\(syncWave\)/)
})

test('钟形包络：中部最高、两侧递减、最边上归零，各宽度是同一条钟', () => {
  // 负向对照：10-29 那版整排几乎等高（30–64px），五段均高不该满足"中段三倍于两端"
  const legacy = legacyHeights(1440)
  const lb = bands(legacy)
  assert.ok(lb[2] < lb[0] * 2, `对照失效：旧式子的中段已经是两端的 ${(lb[2] / lb[0]).toFixed(1)} 倍`)

  for (const w of [320, 390, 768, 1440, 1920]) {
    const a = heights(w)
    const [b1, b2, b3, b4, b5] = bands(a)
    // 最边上那几根是 0–3px 的小芽——包络自己归零，不是被容器裁掉的
    assert.ok(a[0] <= 4 && a[a.length - 1] <= 4, `${w}px 两端没有消失（${a[0]} / ${a[a.length - 1]}px）`)
    assert.ok(b2 < b3 && b3 > b4, `${w}px 五段均高 ${[b1, b2, b3, b4, b5].map((v) => v.toFixed(1)).join('/')} 不是"涨—顶—落"`)
    assert.ok(b1 < 35 && b5 < 35, `${w}px 两侧没有低下去（两端段均高 ${b1.toFixed(1)} / ${b5.toFixed(1)}px）`)
    assert.ok(b3 >= b1 * 2.5, `${w}px 中段只有两端的 ${(b3 / b1).toFixed(1)} 倍`)

    const peak = Math.max(...a)
    assert.ok(peak >= 70 && peak <= 92, `${w}px 峰值 ${peak}px 不在 70–92 之间`)
    const at = a.indexOf(peak) / a.length
    assert.ok(at >= 0.35 && at <= 0.65, `${w}px 峰落在整排 ${(at * 100).toFixed(0)}% 处，不在中间`)
  }

  // 1/4 处是包络的 0.71：与参照图同一条弧，不是一条被拉平的台地
  const a = heights(1440)
  const quarter = a[Math.floor(a.length * 0.25)]
  const peak = Math.max(...a)
  assert.ok(quarter / peak >= 0.6 && quarter / peak <= 0.85, `1/4 处高 ${quarter}px、峰 ${peak}px，肩线不像钟形`)

  // 两端归零不是裁出来的：容器的 clip-path 只裁底边，左右不放刀
  assert.match(home, /clip-path:\s*inset\(-8px 0 0 0\)/)
})

test('局部随机化：钟形上仍有局部起伏，但不许长出单根尖刺', () => {
  const a = heights(1440)
  assert.ok(maxStep(a) <= 13, `1440px 上相邻两根差 ${maxStep(a)}px，会读成尖刺`)

  // 把包络除掉，剩下的是"质感"：它必须有起伏，否则只是一条光溜溜的钟
  const peak = num('WAVE_PEAK')
  const ratios = a
    .map((h, i) => ({ h, b: bell((i + 0.5) / a.length) }))
    .filter(({ b }) => b >= 0.3)
    .map(({ h, b }) => h / (peak * b))
  const mean = ratios.reduce((x, y) => x + y, 0) / ratios.length
  const sd = Math.sqrt(ratios.reduce((s, v) => s + (v - mean) ** 2, 0) / ratios.length)
  assert.ok(sd >= 0.03, `质感起伏只有 ${sd.toFixed(3)}，整排等于一条光钟`)
  assert.ok(Math.max(...ratios) - Math.min(...ratios) >= 0.1, '质感的最大落差不到 10%，看不出起伏')

  // 负向对照：同一包络配恒定质感 → 起伏归零；逐根白噪声 → 斜率必然越线
  const flat = a.map((_, i) => Math.round(peak * bell((i + 0.5) / a.length) * 0.8))
  const flatRatios = flat
    .map((h, i) => ({ r: h / (peak * bell((i + 0.5) / flat.length)), b: bell((i + 0.5) / flat.length) }))
    .filter(({ b }) => b >= 0.3)
    .map(({ r }) => r)
  const flatMean = flatRatios.reduce((x, y) => x + y, 0) / flatRatios.length
  const flatSd = Math.sqrt(flatRatios.reduce((s, v) => s + (v - flatMean) ** 2, 0) / flatRatios.length)
  assert.ok(flatSd < 0.01, '恒定质感的对照没归零，判据写错了')

  const white = Array.from({ length: 100 }, (_, i) => 5 + Math.round(115 * noise(i * 7.7 + 3)))
  assert.ok(maxStep(white) > 13, '白噪声对照没被抓住，斜率判据是摆设')
})
