// 发文门禁与回执：判据全在 src/lib/schema.js，这个文件只做"读盘 → 打印 → 决定退出码"。
//
//   npm run check:content                     只跑校验
//   npm run build                             构建前先跑，红则不出产物
//   npm run dev                               启动时打一份回执，不拦（半写好的稿子要能接着写）
//
// 为什么门禁长在这里而不只在 tests/ 里：CI 里的 deploy.yml 过去只有 npm ci 与 npm run build，
// 而没有任何一条检查读过 content/posts/——封面漏了、日期写歪、frontmatter 键拼错，
// 全都是"构建绿、线上 404 或空块"。构建本身会红，才是作者每次都会经过的那一道。
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { aliasClashes } from '../src/lib/schema.js'
import { collectionProblems } from '../src/lib/collections.js'
import { content } from '../src/data/index.js'
import { readRolls } from './lib/rolls.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))

export function inspectPosts(root = process.cwd()) {
  const rolls = readRolls(root)
  const problems = []
  const notes = []
  for (const r of rolls) {
    for (const p of r.problems) problems.push(`${r.slug} — ${p}`)
    for (const n of r.notes) notes.push(`${r.slug} — ${n}`)
  }
  // 跨卷的判据必须拿全集才查得出来（旧名撞上一卷现名、两卷认领同一个旧名）
  const records = rolls.map((r) => r.record).filter(Boolean)
  for (const c of aliasClashes(records)) problems.push(`别名 — ${c}`)
  // 合集：slug 重复/坏父链/文章挂在不存在的合集上——同样只有全集才判得出
  for (const c of collectionProblems(content.collections, records)) problems.push(`合集 — ${c}`)
  return { rolls, problems, notes }
}

export function formatReceipt({ rolls, problems, notes }) {
  const lines = [`发文回执 · ${rolls.length} 卷`]
  for (const r of rolls) {
    if (!r.record) {
      lines.push(`  ${r.slug.padEnd(28)} 没有可解析的 index.md`)
      continue
    }
    const p = r.record
    lines.push(
      `  ${p.slug.padEnd(28)} ${p.date}  ${String(p.words).padStart(5)} 字 · ${String(p.minutes).padStart(2)} 分钟` +
        `  合集 ${p.collection || '—'}  封面${p.cover ? ' ✓' : ' —'}  标签 ${p.tags.join(' / ') || '—'}` +
        (p.draft ? '  【草稿：只在 dev 可见，不进产物】' : '') +
        (p.movedFrom.length ? `  旧名 → ${p.movedFrom.join(', ')}` : '')
    )
  }
  for (const n of notes) lines.push(`  提示  ${n}`)
  for (const p of problems) lines.push(`  问题  ${p}`)
  return lines
}

// 退出码的判据单列成函数：测试要能凭空验"门禁确实会红"，而不能只验"当下是绿的"
export function exitCode({ rolls, problems }) {
  if (!rolls.length) return 1
  return problems.length ? 1 : 0
}

// 直接执行时才打印与定退出码（被 vite 的插件 import 时只借用上面两个函数）
if ((process.argv[1] || '').replace(/\\/g, '/').endsWith('scripts/check_content.mjs')) {
  const found = inspectPosts(join(HERE, '..'))
  for (const line of formatReceipt(found)) console.log(line)
  const code = exitCode(found)
  if (!found.rolls.length) {
    console.error('没有读到任何一卷：content/posts/ 不存在或整个空了——线上会变成「还没有文章」，而且是安静的')
  } else if (code) {
    console.error(`发文门禁：${found.problems.length} 个问题`)
  } else {
    console.log(`发文门禁：通过（${found.notes.length} 条提示）`)
  }
  process.exit(code)
}
