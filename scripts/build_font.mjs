// 展示层子集字体生成 —— 仅 --font-display（标题/卡名/抽屉项）使用，正文继续走系统宋体栈。
//
// 为什么需要：中文衬线在三平台没有共同系统字体，Windows 会落到 SimSun，
// 而 --font-display 最大到 132px，品牌观感全压在这一层（见 docs/design.md §4.3）。
//
// 源字体：本机安装的 Noto Serif SC 可变字体（SIL OFL 1.1，版权与许可声明随产出文件保留）
//   默认 C:/Windows/Fonts/NotoSerifSC-VF.ttf，可用环境变量 FONT_SRC 覆盖
// 字表：GB2312 一级字表 3755 字（scripts/data/chars-gb2312-l1.txt，由 Python 标准库枚举生成）
//       ∪ 仓库现有内容用字（保证当前内容零回退）
// 实例化：wght=700 —— 展示层元素全部是 700，单实例体积最小
//
// 分片：整份 3773 字 ≈ 720 KB，但一页真正落到展示衬线上的汉字通常只有几十个。
// 所以产物切成多个 woff2，每个 @font-face 只声明自己那批字的 unicode-range——
// 浏览器按页面实际用到的字去取片，没命中的片根本不下载。字表覆盖与单文件版完全相同。
//   片 0 = ASCII / 标点 + 展示语料常用字（模板、数据文案、文章标题与小标题）
//   其余片 = 剩余 GB2312 字，按仓库语料词频降序、每片 300 字
// 新文章用到片 0 以外的字时会自动多取一片；只影响那一个标题，不会整站回退。
// 生成的 @font-face 写在 src/styles/font-display.css，由 main.js 在 site.css 之前 import。
//
// 产物需提交进仓库；构建（vite build / CI）不调用本脚本，因此不依赖源字体。
// 用法：npm run font:build
import { readFile, writeFile, mkdir, readdir, stat, unlink } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import subsetFont from 'subset-font'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = process.env.FONT_SRC || 'C:/Windows/Fonts/NotoSerifSC-VF.ttf'
const CHARS_FILE = path.join(ROOT, 'scripts/data/chars-gb2312-l1.txt')
const OUT_DIR = path.join(ROOT, 'src/assets/fonts')
const CSS_OUT = path.join(ROOT, 'src/styles/font-display.css')
const NAME = 'en-display-serif-700'
const COLD_CHUNK = 300

// 展示层必定用到的 ASCII 可见字符与常用中英标点（与字表取并集）
const ASCII = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('')
const PUNCT = '—…“”‘’《》、。，；：！？（）·〈〉「」『』【】￥％＆＊＋－／＝'

// 只扫文本文件：content/posts 里还有封面与正文插图，按 utf8 读二进制会把乱码当成"用字"
const TEXT_FILE = /\.(md|vue|js|mjs|json|html|txt)$/i
// 扫描全站可渲染文案：文章标题/正文小标题、narrative/site 等配置、页面与组件文字
const SCAN = ['content/posts', 'src/data', 'src/views', 'src/components', 'index.html']

const isCJK = (ch) => /[\u3400-\u9fff\uf900-\ufaff]/.test(ch)
const printable = (ch) => /[^\s\u0000-\u001f\u007f-\u009f]/.test(ch)

async function collect(p) {
  const abs = path.join(ROOT, p)
  const s = await stat(abs)
  if (s.isFile()) return TEXT_FILE.test(p) ? [await readFile(abs, 'utf8')] : []
  const out = []
  for (const name of await readdir(abs)) out.push(...(await collect(path.join(p, name))))
  return out
}

// .vue 只看模板：script/style 里的标识符与注释不是页面文字
const templateOf = (src) =>
  src.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<!--[\s\S]*?-->/g, '')

// 片 0 的语料：一页上真正走展示衬线的字基本都在这里（卡片标题、章节标题、文章刊头）
async function displayChars() {
  const out = new Set()
  const add = (text) => {
    for (const ch of text) if (isCJK(ch)) out.add(ch)
  }
  for (const p of ['src/components', 'src/views']) {
    for (const src of await collect(p)) add(templateOf(src))
  }
  for (const src of await collect('src/data')) add(src)
  for (const md of await collect('content/posts')) {
    const front = md.match(/^---[\s\S]*?\n---/)
    const title = front && front[0].match(/^title:\s*(.+)$/m)
    if (title) add(title[1])
    for (const line of md.split(/\r?\n/)) if (/^#{1,6}\s+/.test(line)) add(line)
  }
  for (const src of await collect('index.html')) add(src)
  return out
}

// 相邻码点并成区间，少写几百个 U+xxxx
function unicodeRange(text) {
  const cps = [...new Set([...text].map((ch) => ch.codePointAt(0)))].sort((a, b) => a - b)
  const hex = (n) => n.toString(16).toUpperCase().padStart(4, '0')
  const parts = []
  for (let i = 0; i < cps.length; ) {
    let j = i
    while (j + 1 < cps.length && cps[j + 1] === cps[j] + 1) j++
    parts.push(i === j ? `U+${hex(cps[i])}` : `U+${hex(cps[i])}-${hex(cps[j])}`)
    i = j + 1
  }
  return parts.join(', ')
}

function face(i, text) {
  const file = `${NAME}-${String(i).padStart(2, '0')}.woff2`
  return `@font-face {
  font-family: 'EN Display Serif';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('../assets/fonts/${file}') format('woff2');
  unicode-range: ${unicodeRange(text)};
}`
}

async function removeStale(keep) {
  const files = await readdir(OUT_DIR)
  const shard = new RegExp(`^${NAME}-\\d+\\.woff2$`)
  for (const f of files) {
    // 旧版单文件不再被任何 CSS 引用，留着只会让仓库多一份 720 KB 的死重量
    if ((shard.test(f) || f === `${NAME}.woff2`) && !keep.has(f)) {
      await unlink(path.join(OUT_DIR, f))
      console.log(`  − 删除过期分片 ${f}`)
    }
  }
}

async function main() {
  const base = await readFile(CHARS_FILE, 'utf8')
  const scanned = (await Promise.all(SCAN.map(collect))).flat().join('\n')
  const hot = await displayChars()

  const chars = new Set()
  for (const ch of base + scanned + PUNCT + ASCII) if (printable(ch)) chars.add(ch)
  for (const ch of hot) chars.add(ch)

  const freq = new Map()
  for (const ch of scanned) freq.set(ch, (freq.get(ch) || 0) + 1)

  const ascii = [...new Set(ASCII + PUNCT)].filter((ch) => chars.has(ch))
  const rest = [...chars]
    .filter((ch) => !ascii.includes(ch) && !hot.has(ch))
    .sort((a, b) => (freq.get(b) || 0) - (freq.get(a) || 0) || a.codePointAt(0) - b.codePointAt(0))

  const texts = [ascii.join('') + [...hot].join('')]
  for (let i = 0; i < rest.length; i += COLD_CHUNK) texts.push(rest.slice(i, i + COLD_CHUNK).join(''))

  const srcBuf = await readFile(SRC)
  await mkdir(OUT_DIR, { recursive: true })
  const keep = new Set()
  let total = 0
  for (let i = 0; i < texts.length; i++) {
    const subset = await subsetFont(srcBuf, texts[i], {
      targetFormat: 'woff2',
      variationAxes: { wght: 700 },
      preserveNameIds: [0, 13, 14], // 版权 + OFL 声明 + 许可地址随子集保留
      noHinting: true, // 展示级字号不需要 hinting
      keepFeatures: ['kern'],
    })
    const file = `${NAME}-${String(i).padStart(2, '0')}.woff2`
    await writeFile(path.join(OUT_DIR, file), subset)
    keep.add(file)
    total += subset.length
    console.log(`  片 ${String(i).padStart(2, '0')}  ${String([...texts[i]].length).padStart(4)} 字  ${(subset.length / 1024).toFixed(1)} KB`)
  }
  await writeFile(CSS_OUT, texts.map((t, k) => face(k, t)).join('\n\n') + '\n')
  await removeStale(keep)

  console.log(
    `\n字符数 ${chars.size} → ${texts.length} 片，合计 ${(total / 1024).toFixed(1)} KB；` +
      `首片 ${((await stat(path.join(OUT_DIR, `${NAME}-00.woff2`))).size / 1024).toFixed(1)} KB（页面命中几片才下几片）`
  )
  console.log(`@font-face → ${path.relative(ROOT, CSS_OUT)}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
