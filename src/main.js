import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index.js'
import { legacyPath } from './lib/legacy.js'
// 展示层字体的 @font-face 由 npm run font:build 生成（unicode-range 分片）；
// 在 site.css 之前 import，字体族先注册，样式表里的 --font-display 才有东西可用
import './styles/font-display.css'
import './styles/site.css'

// 别处贴过的旧链接还是 `/#/blog/<slug>` 那种形状，在挂载前改回路径形状（判据见 lib/legacy.js）
const legacy = legacyPath(location.hash)
if (legacy && legacy !== location.pathname + location.search) history.replaceState(null, '', legacy)

createApp(App).use(router).mount('#app')
