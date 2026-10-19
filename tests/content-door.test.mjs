// 取数这一侧的两条规矩：src/config 已经分家成 src/data，而结构化内容只能从一道门进。
// 为什么钉住：同一份 updates 曾有两条路（列表页走 store、首页直连数据文件），那种状态下
// "改了不生效"要读三个文件才看得出来。跑法：npm test
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { content } from '../src/data/index.js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = (p) => readFileSync(join(ROOT, p), 'utf8')
const tracked = () =>
  execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).split(/\r?\n/).filter(Boolean)

// 扫描面只取 src/ 与 scripts/：这条文件自己写着被禁的名字，把 tests/ 也算进来就会命中自己
// （同一族坑这一轮踩过三次，不该再靠豁免清单遮掩）
const codeOnly = (list) => list.filter((f) => /^(src|scripts)\//.test(f) && /\.(js|mjs|vue)$/.test(f))

test('src/config 这个目录名已经不再存在，两个转手壳也没留着', () => {
  assert.ok(!existsSync(join(ROOT, 'src', 'config')), 'src/config 还在：分家没做完')
  assert.ok(!tracked().some((f) => f.startsWith('src/config/')))
  for (const dead of ['src/lib/content.js', 'src/lib/records.js']) {
    assert.ok(!existsSync(join(ROOT, dead)), `${dead} 还躺着`)
    assert.ok(!tracked().includes(dead))
  }
  for (const f of codeOnly(tracked())) {
    const text = src(f)
    assert.ok(!/lib\/content\.js|lib\/records\.js/.test(text), `${f} 还引用已删的转手壳`)
    assert.ok(!text.includes('src/' + 'config/'), `${f} 还写着 src/config/ 这个旧位置`)
  }
  // 反向覆盖：这两记假必须被同一条判据抓到，而不是永远绿
  assert.ok(/lib\/content\.js|lib\/records\.js/.test("import { content } from '../lib/content.js'"))
  assert.ok(/src\/config\//.test('docs 里还写着 src/' + 'config/site.js'))
})

// 门只许有两种 import：那道门本身，与文案层（narrative.js 故意不进门，理由写在门的第一段注释）
const DOOR_OK = ['../data/index.js', '../data/narrative.js']

test('结构化内容只有一条路：视图、组件、路由与 lib 都不许绕开门直连数据文件', () => {
  const faces = tracked().filter((f) => /^src\/(views|components|router|lib)\//.test(f) && /\.(js|vue)$/.test(f))
  assert.ok(faces.length >= 25, `扫描面只有 ${faces.length} 个文件，这条判据是空的`)
  let seen = 0
  for (const f of faces) {
    for (const m of src(f).matchAll(/from '(\.\.\/data\/[^']+)'/g)) {
      seen += 1
      assert.ok(DOOR_OK.includes(m[1]), `${f} 绕开门直连了 ${m[1]}`)
    }
  }
  assert.ok(seen >= 20, `只扫到 ${seen} 处 data import，视图层大概整片没被读到`)
  // 反向覆盖：绕门那种写法必须落在白名单外
  assert.ok(!DOOR_OK.includes('../data/updates.js'))
})

test('门上的每一项都有人读，没有挂出来却没人用的字段', () => {
  const door = src('src/data/index.js')
  const keys = Object.keys(content)
  assert.ok(keys.length >= 6, `门上只有 ${keys.length} 项，读盘没读全`)
  const corpus = codeOnly(tracked())
    .filter((f) => f !== 'src/data/index.js')
    .map((f) => src(f))
    // 解构写法（const { records, friends } = content）同样是消费方：只查 content.x 会把它误报成死字段
    .join('\n')
    .replace(/const \{([^}]*)\} = content/g, (_all, inner) =>
      inner.split(',').map((n) => `content.${n.trim()}`).join('\n')
    )
  for (const k of keys) {
    assert.ok(
      door.includes(`${k}:`) || new RegExp(`^\\s+${k},`, 'm').test(door),
      `门里没有 ${k}`
    )
    assert.match(corpus, new RegExp(`content\\.${k}\\b`), `content.${k} 没有消费方——删掉它，别挂着`)
  }
})

test('那道门不带 vue：Node 这一岸 import 得动，两个岸读的是同一个对象', () => {
  const door = src('src/data/index.js')
  assert.ok(!door.includes("from 'vue'"), '门里带了 vue，scripts/ 就 import 不动，只能各拿一份')
  assert.ok(door.includes('Object.freeze'), '全站没人写它，那就冻住：漏写的赋值该当场响')
  // 本文件顶部就是 Node 侧 import 进来的；能跑到这里说明这一岸走得通
  assert.equal(content.site.url.replace(/\/+$/, ''), 'https://escaping.top')
  assert.ok(content.projects.length >= 1 && content.playlist.length >= 1)
  assert.match(content.site.avatar, /^https:\/\//)
  assert.ok(content.plates.some((p) => p.src === '/plates/plate-hero.jpg'))
  // build_seo 也必须走门，而不是自己再 import 两份数据文件
  const seo = src('scripts/build_seo.mjs')
  assert.ok(seo.includes("from '../src/data/index.js'"), 'SEO 那一岸没接门')
  assert.ok(!/from '\.\.\/src\/data\/(site|projects|music|friends|records|updates|gallery)\.js'/.test(seo))
})
