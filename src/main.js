import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index.js'
import { legacyPath } from './lib/legacy.js'
import './styles/site.css'

// 别处贴过的旧链接还是 `/#/blog/<slug>` 那种形状，在挂载前改回路径形状（判据见 lib/legacy.js）
const legacy = legacyPath(location.hash)
if (legacy && legacy !== location.pathname + location.search) history.replaceState(null, '', legacy)

createApp(App).use(router).mount('#app')
