// 动态时间线的合并口径：已发布文章自动进动态，手写条目只记文章之外的事。
// 为什么钉住：首页「最近动态」与 /updates 各写一套合并/排序，迟早出现两页顺序不同；
// 手写一条「第 N 篇正文上线」也会和自动条目重复。合并只走 src/lib/feed.js 一处。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mergeFeed } from '../src/lib/feed.js'
import { N } from '../src/data/narrative.js'

const posts = [
  { slug: 'newer', url: '/blog/newer', title: '新文', date: '2026-10-10' },
  { slug: 'older', url: '/blog/older', title: '旧文', date: '2026-09-01' },
]
const notes = [
  { date: '2026-10-19', text: '站务' },
  { date: '2026-10-10', text: '同一天的手写' },
]

test('手写动态与文章合并后按日期倒序', () => {
  const feed = mergeFeed(notes, posts)
  assert.deepEqual(
    feed.map((e) => e.date),
    ['2026-10-19', '2026-10-10', '2026-10-10', '2026-09-01']
  )
  assert.equal(feed[0].text, '站务')
  assert.equal(feed[0].kind, 'note')
})

test('文章条目取标题、网址与唯一 key', () => {
  const post = mergeFeed([], posts).find((e) => e.kind === 'post' && e.to === '/blog/newer')
  assert.equal(post.text, `${N.feed.post}：《新文》`)
  assert.equal(post.key, 'post:newer')
  assert.equal(post.date, '2026-10-10')
  assert.equal(post.kind, 'post')
})

test('同一天文章排在手写动态前；没有 url 时回落到 /blog/<slug>', () => {
  const same = mergeFeed([{ date: '2026-10-10', text: '手写' }], [{ slug: 'x', title: 'X', date: '2026-10-10' }])
  assert.deepEqual(same.map((e) => e.kind), ['post', 'note'])
  assert.equal(same[0].to, '/blog/x')
})

test('空输入不炸，同一天的手写条目 key 仍唯一', () => {
  assert.deepEqual(mergeFeed([], []), [])
  const feed = mergeFeed(
    [
      { date: '2026-10-10', text: '甲' },
      { date: '2026-10-10', text: '乙' },
    ],
    []
  )
  assert.equal(new Set(feed.map((e) => e.key)).size, 2)
})
