// 英文刊头 Didone 子集生成 —— 仅首页站名（--font-display-en）使用。
//
// 为什么需要：站名升为唯一主角后，Noto Serif SC 的英文部分对比度不够、读不出刊头感；
// 换一枚高对比 Didone（Playfair Display，SIL OFL 1.1）只裁大写+空格，子集极小。
//
// 联网手册（下载由作者执行，本机直连慢，勿由代理自动拉）：
//   命令   → 从 Google Fonts 官方仓库 ofl/playfairdisplay/ 取得可变字体
//            PlayfairDisplay[wght].ttf（OFL），放到 fonts-src/PlayfairDisplay-VF.ttf
//   证明   → 文件 > 100KB 且为 TrueType 可变字体（含 wght 轴）
//   带回   → 该 ttf 的本地路径，供下面 FONT_SRC_DIDONE 使用
//   构建   → FONT_SRC_DIDONE=fonts-src/PlayfairDisplay-VF.ttf npm run font:build:didone
//   证明   → 脚本打印「字符数 27 → …woff2  ~KB」
//   带回   → src/assets/fonts/en-display-didone-700.woff2（提交进仓库）
//
// 实例化 wght=700：刊头只用 700，单实例体积最小。DM Serif Display 为静态 400、无法实例化
// 700，故源字体须为 Playfair Display 可变版。
//
// 产物需提交进仓库；构建（vite build / CI）不调用本脚本，因此不依赖源字体。
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import subsetFont from 'subset-font'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = process.env.FONT_SRC_DIDONE
const OUT = path.join(ROOT, 'src/assets/fonts/en-display-didone-700.woff2')

// 站名「ESCAPING NOTES」只含大写与空格；裁到最小集合
const TEXT = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ '

async function main() {
  if (!SRC) {
    console.error('缺少 FONT_SRC_DIDONE：先按文件头手册取得 PlayfairDisplay[wght].ttf 再跑')
    process.exit(1)
  }
  const subset = await subsetFont(await readFile(SRC), TEXT, {
    targetFormat: 'woff2',
    variationAxes: { wght: 700 },
    preserveNameIds: [0, 13, 14], // 版权 + OFL 声明 + 许可地址随子集保留
    noHinting: true, // 刊头级字号不需要 hinting
    keepFeatures: ['kern'],
  })

  await mkdir(path.dirname(OUT), { recursive: true })
  await writeFile(OUT, subset)
  console.log(`字符数 ${TEXT.length} → ${path.relative(ROOT, OUT)} ${(subset.length / 1024).toFixed(1)} KB`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
