import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 纯静态站的构建配置：产物挂在域名根路径，所以 base 固定 '/'——Pages 绑了自定义域名后由
// GitHub 把 escap1ng.github.io/Escaping-Notes/ 重定向到域名根，资源不能再带仓库名前缀。
// mode=pages（npm run build:pages）与默认 mode 只差路由历史模式，见 src/router/index.js 读 VITE_DEPLOY。
export default defineConfig(() => ({
  base: '/',
  plugins: [vue()],
}))
