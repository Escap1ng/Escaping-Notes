// 项目页介绍字段的钉子。
// 为什么要钉两件事：
//   1) 卡片点开的面板靠 detail/points/stack，这三样只写在 src/config/projects.js 里
//      （后台的 PROJECTS 块是「每行 name|desc|year|url」，装不下多段正文）。后台那次保存
//      回来的数组不带它们——lib/content.js 若不回贴，介绍就整片没了，而且不报错。
//   2) 面板里少一个 N.projects.* 键，Vite 不会响，它渲染成空文本（同 hero-wording 那条判据）。
// 跑法：npm test（Node 内置 test runner，零依赖）
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { projects } from '../src/config/projects.js'
import { withIntro } from '../src/lib/content.js'
import { N } from '../src/config/narrative.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = (p) => readFileSync(join(ROOT, p), 'utf8')
const hanzi = (s) => (s.match(/\p{Script=Han}/gu) || []).length
const filled = (s) => typeof s === 'string' && s === s.trim() && s.length > 0

test('每个种子项目的卡面四字段与介绍三件都写满了', () => {
  assert.ok(projects.length >= 2, `只剩 ${projects.length} 个项目，这条判据等于没跑`)
  for (const p of projects) {
    for (const k of ['name', 'desc', 'year', 'url']) {
      assert.ok(filled(p[k]), `${p.name} 的 ${k} 空着或带首尾空格`)
    }
    assert.ok(Array.isArray(p.detail) && p.detail.length >= 2, `${p.name} 的 detail 少于两段`)
    p.detail.forEach((d, i) => {
      assert.ok(hanzi(d) >= 20, `${p.name} 的 detail[${i}] 只有 ${hanzi(d)} 个汉字，像占位句`)
    })
    assert.ok(Array.isArray(p.points) && p.points.length >= 3, `${p.name} 的 points 少于三条`)
    p.points.forEach((pt, i) => assert.ok(filled(pt), `${p.name} 的 points[${i}] 是空的`))
    assert.ok(filled(p.stack), `${p.name} 没写 stack`)
  }
})

// 正向：后台保存回来的形状（只有四字段）必须重新带上介绍，且卡面文案以远程为准
test('后台只存四字段时，介绍按 name 回贴、卡面以远程为准', () => {
  const saved = projects.map(({ name, desc, year, url }) => ({ name, desc, year, url }))
  const merged = withIntro(saved)
  assert.equal(merged.length, saved.length)
  for (const p of merged) {
    assert.ok(p.detail?.length, `${p.name} 没被回贴介绍`)
    assert.ok(p.points?.length && p.stack, `${p.name} 的 points/stack 丢了`)
    const seed = projects.find((s) => s.name === p.name)
    assert.equal(p.desc, seed.desc, `${p.name} 的卡面 desc 被种子盖回去了`)
  }
  const edited = withIntro([{ ...saved[0], desc: '改了的一句话' }])
  assert.equal(edited[0].desc, '改了的一句话', '后台改的那句没赢过种子')
})

// 反向对照：配对真的按 name 走。名字对不上就不该硬贴一份介绍——
// 若 withIntro 退化成「无条件贴种子里的第一条」，上面那条会照样绿，这里会红。
test('反向：陌生名字不贴介绍、已知名字不贴别人的介绍', () => {
  const odd = withIntro([{ name: '改了名字的旧项目', desc: 'x', year: '2026', url: '#' }])
  assert.equal(odd[0].detail, undefined, '名字对不上却贴了介绍')
  const one = withIntro([{ name: projects[1].name, desc: 'x', year: '2026', url: '#' }])
  assert.equal(one[0].stack, projects[1].stack, '贴成了别的项目的介绍')
  assert.notEqual(one[0].stack, projects[0].stack, '种子前两条的 stack 撞了，这条判据量不动')
})

// 面板引用的文案键必须真实存在：少一个键不会报错，只会在面板里渲染成一行空白
test('ProjectsView 里每一处 N.projects.* 引用都真实存在', () => {
  const used = [...src('src/views/ProjectsView.vue').matchAll(/\bN\.projects\.([A-Za-z_$][\w$]*)/g)]
    .map((m) => m[1])
  assert.ok(used.length >= 3, `只扫到 ${used.length} 处 N.projects. 引用，正则八成失效了`)
  for (const k of used) assert.ok(k in N.projects, `narrative.js 里没有 N.projects.${k}`)
})
