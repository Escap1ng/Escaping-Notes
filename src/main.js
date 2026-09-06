import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index.js'
import './styles/tokens.css'
// neo.css 必须在 tokens.css 之后：新版皮肤靠导入顺序 + data-skin 特异性覆盖旧令牌
import './styles/neo.css'

createApp(App).use(router).mount('#app')
