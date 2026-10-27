// 接缝声波的三条回归钉子（2026-10-20，10-27 补横向溢出）：
//   ⑴ 只许长在折线以上：容器底边钉在抽屉顶边、竖条走 flex-end，折线以下不留一段；
//   ⑵ 手机端的涨落波长收口：390px 要读得出「波」，不再只有左高右平的一段；
//   ⑶ 整排不越界：根数按 clientWidth 取 floor，末根整根落在容器里，不撑出横向滚动。
// 跑法：npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = (p) => readFileSync(join(ROOT, p), 'utf8')
const home = src('src/views/HomeView.vue')

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
  // 波高只取旧对称版的上半段，桌面轮廓不该被顺手改高
  assert.ok(Math.abs(num('WAVE_H_SCALE') - 0.7) < 1e-9)
  // 相位必须真的从这套常数算出来，而不是留着一个没人用的旋钮
  assert.match(home, /const wavePhase = \(\) =>[\s\S]*?WAVE_LEN_MIN[\s\S]*?WAVE_LEN_VW/)
  assert.match(home, /Math\.sin\(i \* phase \+ 0\.9\)/)
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
