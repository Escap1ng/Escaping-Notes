// src/lib/frontmatter.js 的行为钉子：解析口径 + 缺省值 + 跨平台换行
// 跑法：npm test（Node 内置 test runner，零依赖）
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { parseFrontmatter, stats } from '../src/lib/frontmatter.js'

test('解析 LF 书写的 frontmatter，正文不含分隔线', () => {
  const { meta, body } = parseFrontmatter('---\ntitle: 甲\ndate: 2026-09-01\n---\n正文\n')
  assert.equal(meta.title, '甲')
  assert.equal(meta.date, '2026-09-01')
  assert.equal(body, '正文\n')
})

// 三份解析器里只有这一份漏了 \r?（api.py 与 build_seo.mjs 都写了）。
// Windows 上 core.autocrlf=true 的新克隆会拿到 CRLF 检出，漏掉这一条就等于
// 整个 frontmatter 不识别：标题空、日期回落 1970-01-01、`---` 一起当正文渲染出来。
test('CRLF 检出的文章必须与 LF 解析结果一致', () => {
  const lf = '---\ntitle: 甲\ndate: 2026-09-01\ntags: [随笔]\n---\n正文\n'
  const crlf = lf.replace(/\n/g, '\r\n')
  const a = parseFrontmatter(lf)
  const b = parseFrontmatter(crlf)
  // meta 必须逐字段相等；正文只允许差在行尾（下游 stats 去空白、markdown 逐行 trim，都不受影响）
  assert.deepEqual(b.meta, a.meta)
  assert.equal(b.body.replace(/\r\n/g, '\n'), a.body)
})

test('tags 支持方括号、引号与空值', () => {
  assert.deepEqual(parseFrontmatter('---\ntags: [a, "b", \'c\']\n---\n').meta.tags, ['a', 'b', 'c'])
  assert.deepEqual(parseFrontmatter('---\ntags: []\n---\n').meta.tags, [])
  assert.deepEqual(parseFrontmatter('---\n---\nx').meta.tags, [])
})

test('缺字段时给可渲染的默认值（title 空串、date 落 1970）', () => {
  const { meta } = parseFrontmatter('---\nsummary: 只有简介\n---\n')
  assert.equal(meta.title, '')
  assert.equal(meta.date, '1970-01-01')
  assert.equal(meta.summary, '只有简介')
})

test('没有闭合分隔线时不崩，整份当正文', () => {
  const { meta, body } = parseFrontmatter('---\ntitle: 甲\n没有闭合')
  assert.equal(meta.title, '')
  assert.ok(body.includes('title: 甲'))
})

test('值里带冒号只切第一刀', () => {
  assert.equal(parseFrontmatter('---\nsummary: 时间 12:30 的事\n---\n').meta.summary, '时间 12:30 的事')
})

test('stats 按去空白字数计，中文一字计一', () => {
  assert.deepEqual(stats('abcd'), { words: 4, minutes: 1 })
  assert.deepEqual(stats('掷 墨\n入渊'), { words: 4, minutes: 1 })
  assert.deepEqual(stats(''), { words: 0, minutes: 1 }) // 空正文也不显示 0 分钟
})

test('阅读时长按 400 字/分四舍五入，故 599 字仍显示 1 分钟', () => {
  // 口径备忘：这是 Math.round 而非 ceil，"不足 400 字算 1 分钟"只在 <600 字时成立。
  // 改这里就等于改全站所有文章显示的时长，别再当"四舍五入写错了"来"修"。
  assert.equal(stats('字'.repeat(599)).minutes, 1)
  assert.equal(stats('字'.repeat(600)).minutes, 2)
  assert.equal(stats('字'.repeat(1000)).minutes, 3)
})
