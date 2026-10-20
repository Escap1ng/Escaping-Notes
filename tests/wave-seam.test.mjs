// 接缝声波的两条回归钉子（2026-10-20）：
//   ⑴ 只许长在折线以上：容器底边钉在抽屉顶边、竖条走 flex-end，折线以下不留一段；
//   ⑵ 手机端的涨落波长收口：390px 要读得出「波」，不再只有左高右平的一段。
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
const cycles = (width) => (Math.ceil((width + 1) / pitch()) * pitch()) / waveLen(width)

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
