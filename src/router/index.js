import { createRouter, createWebHistory } from 'vue-router'
import { N, navTitle, pageTitle } from '../config/narrative.js'

// 站内只有一种路由模式（history）。GitHub Pages 不能把未知路径回退到 index.html，
// 所以构建期为每一条真实路由写一份静态壳（scripts/build_seo.mjs 调 scripts/lib/shell.mjs），
// 并留一份 404.html 给拼错的地址与已删的页面——旧的 #/ 链接由 main.js 在挂载前改道。
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('../views/HomeView.vue'),
      meta: { t: navTitle('/') },
    },
    {
      path: '/blog',
      component: () => import('../views/BlogView.vue'),
      meta: { t: navTitle('/blog') },
    },
    {
      path: '/blog/:slug',
      component: () => import('../views/PostView.vue'),
      // 兜底标题：加载完成后由 PostView 换成文章标题；路由播报用 meta.t
      meta: { t: pageTitle('阅读') },
    },
    {
      path: '/updates',
      component: () => import('../views/UpdatesView.vue'),
      meta: { t: navTitle('/updates') },
    },
    {
      path: '/records',
      component: () => import('../views/RecordsView.vue'),
      meta: { t: navTitle('/records') },
    },
    {
      path: '/gallery',
      component: () => import('../views/GalleryView.vue'),
      meta: { t: navTitle('/gallery') },
    },
    {
      path: '/projects',
      component: () => import('../views/ProjectsView.vue'),
      meta: { t: navTitle('/projects') },
    },
    {
      // 与 /blog/:slug 同一套路：列表点进去是一页正文，不是浮层
      path: '/projects/:slug',
      component: () => import('../views/ProjectView.vue'),
      meta: { t: navTitle('/projects') },
    },
    {
      path: '/about',
      component: () => import('../views/AboutView.vue'),
      meta: { t: navTitle('/about') },
    },
    {
      path: '/:pathMatch(.*)*',
      component: () => import('../views/NotFoundView.vue'),
      meta: { t: pageTitle(N.nf.title) },
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
