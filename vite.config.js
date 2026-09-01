import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// mode=pages（npm run build:pages）→ GitHub Pages 测试镜像；默认 mode → 自有域名生产
export default defineConfig(({ mode }) => ({
  base: mode === 'pages' ? '/Escaping-Notes/' : '/',
  plugins: [vue()],
  server: {
    // 本地开发时把 /api 代理到极简后端（未启动后端时前端自动降级，不报错）
    proxy: {
      '/api': 'http://127.0.0.1:8787',
    },
  },
}))
