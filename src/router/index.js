import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'

// Pages 测试镜像用 hash 路由（.env.pages）；自有域名生产用 history，详见 docs/manual.md §4.2
const history =
  import.meta.env.VITE_DEPLOY === 'pages' ? createWebHashHistory() : createWebHistory()

const router = createRouter({
  history,
  routes: [
    { path: '/', component: () => import('../views/HomeView.vue') },
    { path: '/blog', component: () => import('../views/BlogView.vue') },
    { path: '/blog/:slug', component: () => import('../views/PostView.vue') },
    { path: '/updates', component: () => import('../views/UpdatesView.vue') },
    { path: '/links', component: () => import('../views/LinksView.vue') },
    { path: '/wall', component: () => import('../views/WallView.vue') },
    { path: '/about', component: () => import('../views/AboutView.vue') },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
