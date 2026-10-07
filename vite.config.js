import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// mode=pages（npm run build:pages）→ GitHub Pages 镜像；默认 mode → 自建服务器生产。
// 两种模式都挂在域名根路径，所以 base 固定 '/'：Pages 绑了自定义域名后由 GitHub 把
// escap1ng.github.io/Escaping-Notes/ 重定向到域名根，资源不能再带仓库名前缀。
// 两者的真正差异只有路由历史模式，见 src/router/index.js 读 VITE_DEPLOY。
export default defineConfig(() => ({
  base: '/',
  plugins: [vue()],
  server: {
    // 本地开发时把 /api 代理到极简后端（未启动后端时前端自动降级，不报错）
    proxy: {
      '/api': 'http://127.0.0.1:8787',
    },
  },
}))
