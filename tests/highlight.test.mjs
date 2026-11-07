// src/lib/highlight.js 的行为钉子
// 高亮的输出经 v-html 进 DOM：**转义口径**是安全边界（收未转义原文、自己转义），
// 这里盯三类：① 任何语言下 <、"、& 都不得裸出；② 陌生语言逐字退出（=无高亮时代）；
// ③ token 类只产 kw/num/key/fn/str/com 六枚，供 site.css §9 对账。
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { highlight } from '../src/lib/highlight.js'

test('陌生语言与缺省语言原样转义，不产 token', () => {
  for (const lang of [undefined, '', 'text', 'html']) {
    const out = highlight('let a = "<b>"', lang)
    assert.equal(out, 'let a = &quot;&lt;b&gt;&quot;')
    assert.ok(!out.includes('tok-'), `${lang} 不该上色：${out}`)
  }
})

test('html 藏在字符串/注释里也必须转义（每语言抽查）', () => {
  for (const lang of ['python', 'json', 'js', 'powershell']) {
    const out = highlight('"<script>"', lang)
    assert.ok(!out.includes('<script'), `${lang} 漏转义：${out}`)
    assert.ok(out.includes('&lt;script&gt;'), `${lang} 应转义成实体：${out}`)
  }
})

test('python：关键字蓝、内建 fn、字符串含引号整体上色', () => {
  assert.equal(highlight('def f():\n    return True', 'python'), '<span class="tok-kw">def</span> f():\n    <span class="tok-kw">return</span> <span class="tok-kw">True</span>')
  assert.equal(highlight("print('hi')", 'python'), '<span class="tok-fn">print</span>(<span class="tok-str">\'hi\'</span>)')
  // 注释里的 def 不再是关键字；f 前缀串整段是 str
  assert.equal(highlight('# def\nname = f"x{y}"', 'python'), '<span class="tok-com"># def</span>\nname = <span class="tok-str">f&quot;x{y}&quot;</span>')
})

test('python：三引号串跨行整段上色（未闭合也收尾）', () => {
  const out = highlight('a = """第一行\n第二行', 'python')
  assert.equal(out, 'a = <span class="tok-str">&quot;&quot;&quot;第一行\n第二行</span>')
})

test('json：键与值分档，true/false/null 是关键字', () => {
  const out = highlight('{"k": [1, 2.5e3], "s": "lit", "b": null}', 'json')
  assert.ok(out.includes('class="tok-key">&quot;k&quot;</span>'), out)
  assert.ok(out.includes('class="tok-str">&quot;lit&quot;</span>'), out)
  assert.ok(out.includes('class="tok-num">1</span>') && out.includes('class="tok-num">2.5e3</span>'), out)
  assert.ok(out.includes('class="tok-kw">null</span>'), out)
})

test('js：行注释与块注释、模板串、十六进制数字', () => {
  assert.equal(highlight('const n = 0x1F // 十六', 'js'), '<span class="tok-kw">const</span> n = <span class="tok-num">0x1F</span> <span class="tok-com">// 十六</span>')
  assert.ok(highlight('/* <b> */', 'js').includes('&lt;b&gt;'))
  assert.equal(highlight('`t ${x}`', 'js'), '<span class="tok-str">`t ${x}`</span>')
})

test('powershell：命令连写不劈参数，参数、插值串、块注释各归各', () => {
  const out = highlight('Write-Host -NoNewline "$name" <# c #>', 'powershell')
  // Verb-Noun 连写的 -Host 不是参数；空白后的 -NoNewline 才是
  assert.ok(!out.includes('tok-kw">-Host'), out)
  assert.ok(out.includes('class="tok-kw">-NoNewline</span>'), out)
  // 双引号串整体是 str（PS 的插值串就长这样，串内 $name 不再单拆）
  assert.ok(out.includes('class="tok-str">&quot;$name&quot;</span>'), out)
  assert.ok(out.includes('class="tok-com">&lt;# c #&gt;</span>'), out)
  // 变量只有在串外才单拆成 key
  assert.equal(highlight('$name = 1', 'powershell'), '<span class="tok-key">$name</span> = <span class="tok-num">1</span>')
})

test('未闭合的引号吃到行尾为止，不吞后续行', () => {
  const out = highlight('let a = "未闭合\nlet b = 2', 'js')
  assert.ok(out.includes('tok-str">&quot;未闭合'), out)
  assert.ok(out.includes('\n<span class="tok-kw">let</span> b = <span class="tok-num">2</span>'), out)
})

test('token 类只产六枚', () => {
  const all = [
    highlight('def f(x): return len(x) + 0x1  # 注释', 'python'),
    highlight('{"k": null}', 'json'),
    highlight('const a = `b`', 'js'),
    highlight('$v -Param', 'powershell'),
  ].join('')
  const classes = [...all.matchAll(/tok-([\w-]+)/g)].map((m) => m[1])
  assert.deepEqual([...new Set(classes)].sort(), ['com', 'fn', 'key', 'kw', 'num', 'str'])
})
