import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'

// Pages 测试镜像用 hash 路由（.env.pages）；自有域名生产用 history，详见 docs/manual.md §4.2
const history =
  import.meta.env.VITE_DEPLOY === 'pages' ? createWebHashHistory() : createWebHistory()

const T = 'Escaping Notes'

const router = createRouter({
  history,
  routes: [
    {
      path: '/',
      component: () => import('../views/HomeView.vue'),
      meta: { t: `${T} · 逃逸笔记` },
    },
    {
      path: '/blog',
      component: () => import('../views/BlogView.vue'),
      meta: { t: `文章 · ${T}` },
    },
    {
      path: '/blog/:slug',
      component: () => import('../views/PostView.vue'),
      // 兜底标题：加载完成后由 PostView 换成文章标题；路由播报用 meta.t
      meta: { t: `阅读 · ${T}` },
    },
    {
      path: '/updates',
      component: () => import('../views/UpdatesView.vue'),
      meta: { t: `动态 · ${T}` },
    },
    {
      path: '/records',
      component: () => import('../views/RecordsView.vue'),
      meta: { t: `音乐 · ${T}` },
    },
    {
      path: '/gallery',
      component: () => import('../views/GalleryView.vue'),
      meta: { t: `映像 · ${T}` },
    },
    {
      path: '/projects',
      component: () => import('../views/ProjectsView.vue'),
      meta: { t: `项目 · ${T}` },
    },
    {
      path: '/about',
      component: () => import('../views/AboutView.vue'),
      meta: { t: `关于 · ${T}` },
    },
    {
      path: '/login',
      component: () => import('../views/LoginView.vue'),
      meta: { t: `登录 · ${T}` },
    },
    {
      path: '/admin',
      component: () => import('../views/AdminView.vue'),
      meta: { t: `管理 · ${T}` },
    },
    {
      path: '/:pathMatch(.*)*',
      component: () => import('../views/NotFoundView.vue'),
      meta: { t: `这里没有页面 · ${T}` },
    },
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
