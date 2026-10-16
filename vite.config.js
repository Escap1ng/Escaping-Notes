// 纯静态站的构建配置：产物挂在域名根路径，所以 base 固定 '/'——Pages 绑了自定义域名后由
// GitHub 把 escap1ng.github.io/Escaping-Notes/ 重定向到域名根，资源不能再带仓库名前缀。
// mode=pages（npm run build:pages）与默认 mode 只差路由历史模式，见 src/router/index.js 读 VITE_DEPLOY。
import { cpSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, extname, join, resolve, sep } from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { exitCode, formatReceipt, inspectPosts } from './scripts/check_content.mjs'
import { publishedAssets, readRolls } from './scripts/lib/rolls.mjs'
import { parseRollUrl } from './src/lib/schema.js'

// ---------- 一卷底片 = 一个目录 = 一段 URL 前缀 ----------
// content/posts/<slug>/ 里的素材（除 index.md 与 *-src.* 原图）上线到 /blog/<slug>/<文件名>。
// 这条路由由构造决定：封面、正文插图、映像柜那张都是同一个文件，作者不写路径、也不必手抄。
// 三件事在这里办齐：
//   1. 构建/启动时读盘 → 打发文回执，构建遇问题直接红（门禁的判据在 src/lib/schema.js）
//   2. 把清单交给浏览器（virtual:rolls，src/lib/posts.js 用它判断某卷有没有封面）
//   3. dev 用中间件顶替静态托管，build 把文件拷进 outDir——两边同一条 URL，不改天换地
const ROLL_ID = 'virtual:rolls'
const RESOLVED = `\0${ROLL_ID}`
const ASSET_TYPE = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
}

function postRolls() {
  let rolls = []
  // slug → { 文件名: 磁盘路径 }，扫描时算一次；dev 的每个素材请求都只查表
  let served = new Map()
  let root = process.cwd()
  let outDir = 'dist'
  const scan = () => {
    rolls = readRolls(root)
    served = new Map(rolls.map((r) => [r.slug, new Map(publishedAssets(r).map((a) => [a.name, a.path]))]))
  }
  return {
    name: 'post-rolls',

    configResolved(cfg) {
      root = cfg.root
      outDir = resolve(root, cfg.build.outDir)
      scan()
    },

    buildStart() {
      const found = inspectPosts(root)
      for (const line of formatReceipt(found)) console.log(line)
      // 与 CLI 用同一条退出判据：删空 content/posts/ 时 npm run check 会红，构建也必须红
      if (exitCode(found)) {
        this.error(
          found.problems.length
            ? `发文门禁拦下：${found.problems.length} 个问题（逐条在上面的回执里）`
            : '发文门禁拦下：content/posts/ 不存在或整个空了'
        )
      }
    },

    resolveId(id) {
      if (id === ROLL_ID) return RESOLVED
    },

    load(id) {
      if (id !== RESOLVED) return
      if (!rolls.length) scan()
      const map = Object.fromEntries(rolls.map((r) => [r.slug, r.files]))
      return `export const rollFiles = ${JSON.stringify(map)}\n`
    },

    configureServer(server) {
      // dev 里不拦：半篇稿子也要能接着写，回执打在终端上
      for (const line of formatReceipt(inspectPosts(root))) console.log(line)

      server.middlewares.use((req, res, next) => {
        // 形状由 schema 判，磁盘路径只在"这一卷真实存在的素材"里查：
        // 拿用户输入的字符串拼路径这条路一步都不走
        const hit = parseRollUrl(req.url || '')
        const path = hit ? served.get(hit.slug)?.get(hit.name) : undefined
        if (!path || !existsSync(path)) return next()
        res.setHeader('Content-Type', ASSET_TYPE[extname(hit.name).toLowerCase()] || 'application/octet-stream')
        res.setHeader('Cache-Control', 'no-store')
        res.end(readFileSync(path))
      })

      // 新增/删掉一卷或一卷里的素材 → 那份清单变了，虚拟模块要重新生成（正文里引用了
      // 刚放进去的图，不重启就得看到 404）
      server.watcher.on('all', (_event, p) => {
        if (!p.split(sep).join('/').includes('content/posts')) return
        scan()
        const mod = server.moduleGraph.getModuleById(RESOLVED)
        if (mod) server.moduleGraph.invalidateModule(mod)
        server.ws.send({ type: 'full-reload' })
      })
    },

    closeBundle() {
      for (const roll of rolls) {
        for (const a of publishedAssets(roll)) {
          mkdirSync(dirname(join(outDir, 'blog', roll.slug, a.name)), { recursive: true })
          cpSync(a.path, join(outDir, 'blog', roll.slug, a.name))
        }
      }
    },
  }
}

export default defineConfig(() => ({
  base: '/',
  plugins: [vue(), postRolls()],
}))
