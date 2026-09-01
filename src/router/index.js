import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'

// Pages 测试镜像用 hash 路由（.env.pages）；自有域名生产用 history，详见 docs/manual.md §4.2
const history =
  import.meta.env.VITE_DEPLOY === 'pages' ? createWebHashHistory() : createWebHistory()

const T = 'Escaping Notes'

const router = createRouter({
  history,
  routes: [
    { path: '/', component: () => import('../views/HomeView.vue'), meta: { t: `${T} · 逃逸笔记` } },
    { path: '/blog', component: () => import('../views/BlogView.vue'), meta: { t: `文章 · ${T}` } },
    // 文章页 title 由 PostView 按文章标题设置
    { path: '/blog/:slug', component: () => import('../views/PostView.vue') },
    { path: '/updates', component: () => import('../views/UpdatesView.vue'), meta: { t: `动态 · ${T}` } },
    { path: '/links', component: () => import('../views/LinksView.vue'), meta: { t: `收藏 · ${T}` } },
    { path: '/projects', component: () => import('../views/ProjectsView.vue'), meta: { t: `载荷舱 · ${T}` } },
    { path: '/wall', component: () => import('../views/WallView.vue'), meta: { t: `留言墙 · ${T}` } },
    { path: '/about', component: () => import('../views/AboutView.vue'), meta: { t: `关于 · ${T}` } },
    { path: '/login', component: () => import('../views/LoginView.vue'), meta: { t: `登录 · ${T}` } },
    { path: '/register', component: () => import('../views/RegisterView.vue'), meta: { t: `注册 · ${T}` } },
    { path: '/admin', component: () => import('../views/AdminView.vue'), meta: { t: `管理 · ${T}` } },
    { path: '/:pathMatch(.*)*', component: () => import('../views/NotFoundView.vue'), meta: { t: `信号丢失 · ${T}` } },
  ],
  scrollBehavior() {
    // 瞬时回顶：避免 smooth 滚动在转场期间产生滑动抽搐
    return { top: 0, behavior: 'instant' }
  },
})

// 路由 meta 管理器：同步 document.title
router.afterEach((to) => {
  if (to.meta.t) document.title = to.meta.t
})

export default router
