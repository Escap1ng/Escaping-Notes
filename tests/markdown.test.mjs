// src/lib/markdown.js 的行为钉子
// 重点盯两类：① §10 ⑦ 那批"评审查出、自查全漏"的缺陷不许复活；② 渲染结果会进 v-html，
// 而 /api/posts 的写权限是 admin 或 owner（api.py 的 _post_write），所以"作者=可信"不成立，
// 链接与图片的 URL 口径必须当安全边界看。
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { renderMarkdown } from '../src/lib/markdown.js'

const html = (src) => renderMarkdown(src).html

/* ---------------- 注入面 ---------------- */
test('原始 HTML 与脚本一律转义，不进 DOM', () => {
  assert.equal(html('<script>alert(1)</script>'), '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>')
  // 引号被转义成 &quot; → 想 breakout 成属性也只能留在文本里，产不出 <img>
  const probe = html('![x](a.png" onload="alert(1))')
  assert.ok(!probe.includes('<img'), probe)
  assert.ok(probe.includes('&quot;'), `引号必须转义：${probe}`)
})

test('javascript: / data: 等危险协议不成链接，但文字保留', () => {
  for (const bad of [
    'javascript:window.name=document.domain', // 不含括号，绕得过"遇 ) 截断"的侥幸
    'JavaScript:alert(1)', // 协议大小写不敏感
    ' \tjavascript:alert(1)', // 浏览器会剥掉 URL 前导控制符
    'data:text/html;base64,PHNjcmlwdD4=',
    'vbscript:msgbox(1)',
  ]) {
    const out = html(`[点我](${bad})`)
    assert.ok(!/<a /.test(out), `不该产出链接：${out}`)
    assert.ok(out.includes('点我'), `文字不该被吞掉：${out}`)
  }
})

test('站内相对路径、锚点与常用协议照常成链接', () => {
  for (const good of ['/blog/a', './x.png', '#h-1', 'https://e.c/', 'http://e.c/', 'mailto:a@b.c', '//e.c/']) {
    assert.ok(html(`[x](${good})`).includes(`href="${good}"`), `该放行：${good}`)
  }
})

/* ---------------- 表格：只在下一行是分隔行时才开表 ---------------- */
test('含竖线的普通文字不许被断成表', () => {
  assert.equal(html('这里有 | 竖线 但不是表'), '<p>这里有 | 竖线 但不是表</p>')
  assert.equal(html('用 `a|b` 写法'), '<p>用 <code>a|b</code> 写法</p>')
})

test('表头必须有分隔行，对齐只取 left/right/center', () => {
  assert.ok(html('| a |\n|---|\n| 1 |').startsWith('<table>'))
  const out = html('| a | b | c |\n|:--|:-:|--:|\n| 1 | 2 | 3 |')
  assert.ok(out.includes('<th style="text-align:left">'))
  assert.ok(out.includes('<th style="text-align:center">'))
  assert.ok(out.includes('<th style="text-align:right">'))
  assert.ok(!/style="text-align:(?!left|right|center)/.test(out), '对齐值不许来自用户文本')
})

// §10 ⑦：'>' / '-' / '1.' 三个分支曾漏 flushTable()，把表格排到后方法块之后
test('表格后面接引用、列表、有序列表，表格仍在前', () => {
  for (const [name, block] of [
    ['引用', '> 引用'],
    ['无序列表', '- 项'],
    ['有序列表', '1. 项'],
    ['代码块', '```\ncode\n```'],
    ['标题', '## 下一节'],
  ]) {
    const out = html(`| a |\n|---|\n| 1 |\n${block}`)
    assert.ok(out.indexOf('<table>') < out.indexOf('</table>'), `${name} 把表格拆坏了：${out}`)
    assert.ok(out.startsWith('<table>'), `${name} 之前就该把表收口：${out}`)
  }
})

/* ---------------- 标题与目录 ---------------- */
test('一级 # 让给文章标题，正文最高到 h6', () => {
  const out = html('# 一\n##### 五\n###### 六')
  assert.ok(out.includes('<h2 id="h-1">一</h2>'))
  assert.ok(out.includes('<h6 id="h-2">五</h6>'))
  assert.ok(out.includes('<p>###### 六</p>'), '六个 # 不识别，按正文处理')
})

test('toc 只收 h2/h3，h4 及更深不入目录', () => {
  const { toc } = renderMarkdown('# 一\n## 二\n### 三\n#### 四')
  assert.deepEqual(toc.map((t) => t.level), [2, 3])
})

/* ---------------- 代码块 ---------------- */
test('代码块内转义且保留换行，未闭合也要产出', () => {
  assert.equal(html('```js\nlet a = 1\n```'), '<pre data-lang="js"><code>let a = 1</code></pre>')
  assert.equal(html('```\n<b>x</b>\n```'), '<pre data-lang=""><code>&lt;b&gt;x&lt;/b&gt;</code></pre>')
  assert.ok(html('```js\n没有闭合').includes('</pre>'), '未闭合的代码块不该把内容吞掉')
})

/* ---------------- 行内与段落 ---------------- */
test('加粗/斜体/行内代码/图片的产出形态', () => {
  assert.equal(html('**粗**'), '<p><strong>粗</strong></p>')
  assert.equal(html('*斜*'), '<p><em>斜</em></p>')
  assert.equal(html('`码`'), '<p><code>码</code></p>')
  assert.ok(html('![图](/a.png)').includes('<img src="/a.png" alt="图" loading="lazy" decoding="async" />'))
})

test('段内软换行成 <br />，空行分段', () => {
  assert.equal(html('上\n下'), '<p>上<br />下</p>')
  assert.equal(html('甲\n\n乙'), '<p>甲</p>\n<p>乙</p>')
})

test('分隔线成 hr，且不当成表格分隔行', () => {
  assert.equal(html('上\n---\n下'), '<p>上</p>\n<hr />\n<p>下</p>')
})
