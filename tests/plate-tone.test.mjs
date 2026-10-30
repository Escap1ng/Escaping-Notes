// 顶栏字色跟不跟得上底片轮播的钉子。
// 为什么要钉：换色靠"动画时钟 → 第几张"这一步折算，它不报错，错一格就是整轮提前 10s
// 换了字色（用户读作"卡不上点"）。2026-10-30 实测：CSS 动画的 currentTime 已经吃过
// animation-delay，早先那版再 +9000 让字色永久提前一整档，于是重写并把它钉成边界值。
// 跑法：npm test（Node 内置 test runner，零依赖）
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { plateSlot } from '../src/lib/plateTone.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = (p) => readFileSync(join(ROOT, p), 'utf8')
// 判据量代码不量注释：上面那几行的来龙去脉里就写着 +9000
const code = (p) => src(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

test('换色落在交叉的中点：9.5 / 19.5 / 29.5s', () => {
  // 底层那张从 0 一直到 9s，9→10s 与第二张交叉，中点 9.5s 换色
  const cases = [
    [0, 0],
    [4000, 0],
    [9499, 0],
    [9500, 1],
    [19499, 1],
    [19500, 2],
    [24000, 2],
    [29499, 2],
    [29500, 0],
    [30000, 0],
    [39500, 1],
  ]
  for (const [t, want] of cases) assert.equal(plateSlot(t), want, `${t}ms 应落在第 ${want} 张`)
})

test('时钟不会倒着退档：负值、超一圈都回绕到同一张', () => {
  for (const t of [0, 30000, 60000, 90000]) assert.equal(plateSlot(t), plateSlot(t % 30000))
  // 动画 currentTime 为负只可能在 delay 之前出现；此时相当于上一层的时间
  assert.equal(plateSlot(-500), 0)
  assert.equal(plateSlot(-501), 2)
  assert.equal(plateSlot(-10500), 2) // −10500 ≡ 19500 (mod 30000)
})

test('判据能红：旧实现（+9000）在这里过不去', () => {
  // 负向对照：把当初那行原样算一遍，整轮错开一格——不然上面那组边界值等于没测
  const old = (t) => Math.floor(((((t + 9000) % 30000) + 30000) % 30000) / 10000)
  assert.notEqual(old(4000), plateSlot(4000))
  assert.equal(old(4000), 1)
  // 且新实现在同一时刻必须对，不是"两边都错成一样"
  assert.equal(plateSlot(4000), 0)
})

test('换色时刻与 plate-slot 的 delay 同步（改了延迟就会红）', () => {
  const app = src('src/App.vue')
  const delays = [...app.matchAll(/--pd:\s*(\d+)s/g)].map((m) => Number(m[1]) * 1000)
  assert.deepEqual(delays, [9000, 19000])
  // 第一层 <i> 占第 1 档、第二层占第 2 档：各自 delay + 交叉中点处必须正好换到它
  delays.forEach((d, i) => assert.equal(plateSlot(d + 500), i + 1, `delay ${d}ms 处该换到第 ${i + 1} 张`))
  // 周期也是同一枚常数：site.css 的 --plate-cycle 必须 = 3 × 10s
  const css = src('src/styles/site.css')
  assert.match(css, /--plate-cycle:\s*30s/)
  // 相位只认动画时钟：不按自己的秒数算（那会在 SPA 从首页进来时永久错开）
  const tone = code('src/lib/plateTone.js')
  assert.match(tone, /getAnimations\?\.\(\)\[0\]/)
  assert.match(tone, /return plateSlot\(t\)/)
  assert.doesNotMatch(tone, /\+\s*9000/)
})
