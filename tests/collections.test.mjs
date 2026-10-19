// 合集树与顺序的钉子：层级、汇总、章节顺序，以及门禁的负向样本。
// 这些判据同时被页面（views）与构建期门禁（scripts/check_content.mjs）使用，
// 所以在这里用一份小树把行为钉住，而不是只验仓库当下那三个合集。跑法：npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  ancestorsOf,
  chainOf,
  childrenOf,
  collectionProblems,
  postsOf,
  rootsOf,
  sectionize,
  sortChapter,
  subtreeOf,
} from '../src/lib/collections.js'
import { N } from '../src/data/narrative.js'

const LIST = [
  { slug: 'root', title: '根', summary: '顶层', order: 2 },
  { slug: 'first', title: '第一支', summary: '一支', parent: 'root', order: 2 },
  { slug: 'second', title: '第二支', summary: '二支', parent: 'root', order: 1 },
  { slug: 'deep', title: '更下一层', summary: '三层', parent: 'first', order: 1 },
  { slug: 'other', title: '另一个顶层', summary: '另一个', order: 1 },
]

const POSTS = [
  { slug: 'p3', collection: 'first', order: 2, date: '2026-10-02' },
  { slug: 'p1', collection: 'first', order: 1, date: '2026-10-09' },
  { slug: 'p2', collection: 'deep', order: 1, date: '2026-10-01' },
  { slug: 'p0', collection: 'root', date: '2026-09-01' },
  { slug: 'p9', collection: 'other', order: 1, date: '2026-10-10' },
]

test('顶层、子集与祖先链都按 order 排，且不把别的顶层混进来', () => {
  assert.deepEqual(rootsOf(LIST).map((c) => c.slug), ['other', 'root'])
  assert.deepEqual(childrenOf(LIST, 'root').map((c) => c.slug), ['second', 'first'])
  assert.deepEqual(ancestorsOf(LIST, 'deep').map((c) => c.slug), ['root', 'first'])
  assert.deepEqual(chainOf(LIST, 'deep').map((c) => c.slug), ['root', 'first', 'deep'])
  assert.deepEqual(subtreeOf(LIST, 'root').map((c) => c.slug), ['root', 'second', 'first', 'deep'])
})

test('上级合集汇总所有后代的文章；显式 order 排在前面，没有 order 的按日期', () => {
  assert.deepEqual(postsOf(LIST, 'root', POSTS).map((p) => p.slug), ['p2', 'p1', 'p3', 'p0'])
  assert.deepEqual(postsOf(LIST, 'first', POSTS).map((p) => p.slug), ['p2', 'p1', 'p3'])
  assert.deepEqual(postsOf(LIST, 'other', POSTS).map((p) => p.slug), ['p9'])
})

test('合集页分组：当前合集先出，再按子树先序，深度跟着层级走', () => {
  const sections = sectionize(LIST, 'root', POSTS)
  assert.deepEqual(
    sections.map((s) => [s.collection.slug, s.depth, s.posts.map((p) => p.slug)]),
    [
      ['root', 0, ['p0']],
      ['first', 1, ['p1', 'p3']],
      ['deep', 2, ['p2']],
    ]
  )
})

test('sortChapter 不改入参，同 order 按日期与 slug 兜底', () => {
  const list = [
    { slug: 'b', order: 1, date: '2026-09-02' },
    { slug: 'a', order: 1, date: '2026-09-02' },
    { slug: 'c', order: 1, date: '2026-09-01' },
  ]
  assert.deepEqual(sortChapter(list).map((p) => p.slug), ['c', 'a', 'b'])
  assert.deepEqual(list.map((p) => p.slug), ['b', 'a', 'c'])
})

test('合集门禁：重复 slug、坏父链、成环、文章挂错合集都必须被抓到', () => {
  assert.deepEqual(collectionProblems(LIST, POSTS), [])
  assert.ok(collectionProblems([...LIST, { slug: 'root', title: '重复' }]).some((p) => p.includes('重复')))
  assert.ok(collectionProblems([...LIST, { slug: 'orphan', title: '孤儿', parent: 'nope' }]).some((p) => p.includes('不存在')))
  assert.ok(
    collectionProblems([...LIST, { slug: 'loop-a', title: 'A', parent: 'loop-b' }, { slug: 'loop-b', title: 'B', parent: 'loop-a' }]).some(
      (p) => p.includes('成环')
    )
  )
  assert.ok(collectionProblems(LIST, [...POSTS, { slug: 'lost', collection: 'nope' }]).some((p) => p.includes('不在 collections.js')))
  assert.ok(collectionProblems([{ slug: 'Bad Slug', title: '坏' }]).some((p) => p.includes('网址片段')))
})

test('导航编号连续，合集排在 01 文章与 03 动态之间', () => {
  assert.deepEqual(N.nav.map((n) => n.code), ['00', '01', '02', '03', '04', '05', '06'])
  assert.equal(N.nav.find((n) => n.to === '/collections').code, '02')
  assert.equal(N.nav.findIndex((n) => n.to === '/collections'), 2)
})
