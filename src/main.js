import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index.js'
import './styles/tokens.css'

createApp(App).use(router).mount('#app')
