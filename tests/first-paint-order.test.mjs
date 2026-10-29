// 首页首屏加载顺序的三条回归钉子（2026-10-27）：
//   ⑴ 照片先下：首屏地景是 LCP，星轨挂载与章节数据都排在它的 load 之后；
//   ⑵ 星轨按需下载：异步组件 + v-if，不随 HomeView 主块一起解析，也不抢在照片前画；
//   ⑶ 闸门从 --hero-img 令牌取图：图名不抄第三份，卡住 / 出错都要放行。
// 跑法：npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = (p) => readFileSync(join(ROOT, p), 'utf8')
const hero = src('src/components/HorizonHero.vue')
const home = src('src/views/HomeView.vue')
const gate = src('src/lib/hero.js')

// 判据做成纯函数：负向对照喂旧版文本，而不是对着字面量自说自话
const starsAfterPhoto = (h) =>
  /defineAsyncComponent\(\(\) => import\('\.\/StarTrails\.vue'\)\)/.test(h) &&
  /<StarTrails v-if="stars"/.test(h) &&
  /whenHeroReady\(\)\.then\(/.test(h) &&
  /stars\.value = true/.test(h)

const postsAfterPhoto = (v) =>
  /await whenHeroReady\(\)\s+posts\.value = await loadPosts\(\)/.test(v)

test('星轨等首屏图片 load 完再挂载，组件按需下载', () => {
  assert.equal(starsAfterPhoto(hero), true, '星轨又回到跟首屏照片同时开工')

  // 负向对照：改回静态 import + 无条件渲染，同一条判据必须变红
  const old = hero
    .replace("defineAsyncComponent(() => import('./StarTrails.vue'))", 'StarTrails')
    .replace('<StarTrails v-if="stars" interactive />', '<StarTrails interactive />')
  assert.notEqual(old, hero, '这记假根本没改动文件体')
  assert.equal(starsAfterPhoto(old), false)
})

test('折线以下的章节数据等首屏图片 load 完再取', () => {
  assert.equal(postsAfterPhoto(home), true, 'loadPosts 又跑在首屏照片前面')

  // 负向对照：把闸门那行删掉，loadPosts 就重新抢跑
  const old = home.replace(/await whenHeroReady\(\)\s+/, '')
  assert.notEqual(old, home, '这记假根本没改动文件体')
  assert.equal(postsAfterPhoto(old), false)
})

test('闸门从 --hero-img 取图：图名不抄第三份，卡住 / 出错都要放行', () => {
  assert.match(gate, /--hero-img/, '闸门没读主题令牌，图名可能又被抄了一份')
  assert.doesNotMatch(gate, /\/plates\//, '闸门里出现了写死的图名：图名只该在 site.css 一处')
  assert.match(gate, /addEventListener\('load'/)
  assert.match(gate, /addEventListener\('error'/)
  assert.match(gate, /setTimeout\(finish/, '没有超时兜底：图片卡住会把整页内容一起扣死')
})

test('手机首页在首屏照片到位前先不取展示衬线的 CJK 分片', () => {
  const boot = src('index.html')
  const css = src('src/styles/site.css')
  const app = src('src/App.vue')
  assert.match(boot, /classList\?\.add\('hero-pending'\)/, '首帧脚本没给手机首页挂降级类')
  assert.match(
    css,
    /html\.hero-pending\s*\{[^}]*--font-display:\s*var\(--font-serif\)/,
    '降级类没把 --font-display 落回系统宋体，147KB 的分片会抢在照片前面下'
  )
  assert.match(app, /classList\.remove\('hero-pending'\)/, '照片到位后没人摘类，字体永远换不回来')
})
