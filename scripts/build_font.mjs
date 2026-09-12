// 展示层子集字体生成 —— 仅 --font-display（标题/卡名/抽屉项）使用，正文继续走系统宋体栈。
//
// 为什么需要：中文衬线在三平台没有共同系统字体，Windows 会落到 SimSun，
// 而 --font-display 最大到 132px，品牌观感全压在这一层（见 docs/design-neo.md §4.3）。
//
// 源字体：本机安装的 Noto Serif SC 可变字体（SIL OFL 1.1，版权与许可声明随产出文件保留）
//   默认 C:/Windows/Fonts/NotoSerifSC-VF.ttf，可用环境变量 FONT_SRC 覆盖
// 字表：GB2312 一级字表 3755 字（scripts/chars-gb2312-l1.txt，由 Python 标准库枚举生成）
//       ∪ 仓库现有内容用字（保证当前内容零回退）
// 实例化：wght=700 —— 展示层元素全部是 700，单实例体积最小
//
// 产物需提交进仓库；构建（vite build / CI）不调用本脚本，因此不依赖源字体。
// 用法：npm run font:build
import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import subsetFont from 'subset-font'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = process.env.FONT_SRC || 'C:/Windows/Fonts/NotoSerifSC-VF.ttf'
const CHARS_FILE = path.join(ROOT, 'scripts/chars-gb2312-l1.txt')
const OUT = path.join(ROOT, 'src/assets/fonts/en-display-serif-700.woff2')

// 展示层必定用到的 ASCII 可见字符与常用中英标点（与字表取并集）
const ASCII = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('')
const PUNCT = '—…“”‘’《》、。，；：！？（）·〈〉「」『』【】￥％＆＊＋－／＝'

// 扫描全站可渲染文案：文章标题/正文小标题、narrative/site/records 等配置、页面与组件文字
const SCAN = ['content/posts', 'src/config', 'src/views', 'src/components', 'index.html']

async function collect(p) {
  const abs = path.join(ROOT, p)
  try {
    const s = await stat(abs)
    if (s.isFile()) return [await readFile(abs, 'utf8')]
    const out = []
    for (const name of await readdir(abs)) out.push(...(await collect(path.join(p, name))))
    return out
  } catch {
    return []
  }
}

async function main() {
  const base = await readFile(CHARS_FILE, 'utf8')
  const scanned = (await Promise.all(SCAN.map(collect))).flat().join('\n')

  const chars = new Set()
  for (const ch of base + scanned + PUNCT + ASCII) {
    if (!/\s/.test(ch)) chars.add(ch)
  }
  const text = [...chars].join('')

  const subset = await subsetFont(await readFile(SRC), text, {
    targetFormat: 'woff2',
    variationAxes: { wght: 700 },
    preserveNameIds: [0, 13, 14], // 版权 + OFL 声明 + 许可地址随子集保留
    noHinting: true, // 展示级字号不需要 hinting
    keepFeatures: ['kern'],
  })

  await mkdir(path.dirname(OUT), { recursive: true })
  await writeFile(OUT, subset)
  console.log(`字符数 ${chars.size} → ${path.relative(ROOT, OUT)} ${(subset.length / 1024).toFixed(1)} KB`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
