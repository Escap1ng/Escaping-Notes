import { createRouter, createWebHistory } from 'vue-router'
import { rollRoutes } from 'virtual:rolls'
import { N, navTitle, pageTitle } from '../data/narrative.js'

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
      path: '/collections',
      component: () => import('../views/CollectionsView.vue'),
      meta: { t: navTitle('/collections') },
    },
    {
      // 与 /blog/:slug 同一套路：合集列表点进去是一页目录，不是浮层
      path: '/collections/:slug',
      component: () => import('../views/CollectionView.vue'),
      // 兜底标题：加载后由 CollectionView 换成合集名
      meta: { t: navTitle('/collections') },
    },
    {
      path: '/updates',
      component: () => import('../views/UpdatesView.vue'),
      meta: { t: navTitle('/updates') },
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

// 旧网址改道：一卷改名后，登记在 `movedFrom` 里的旧 slug 在组件挂载之前就被解析到现名。
// 为什么放在路由而不是详情页：视图不该自己跳（`lib/exit.js` 立的那条"程序化跳转只此一处"就是
// 为这个），而且改道要按目标页完整走一遍——标题、读屏播报、回到顶部，都不该先闪一下「这里没有这一篇」。
// 表由构建期算好（vite.config.js 把 rollRoutes 塞进 virtual:rolls）：这里只查一张几百字节的表。
// 试过在守卫里静态 import 取数模块，入口 chunk 的 gzip 从 56.42 kB 涨到 58.30 kB——
// 为深链上的一次跳转让每个访客多载 1.9 kB，不划算。草稿不在这张表里，也不认领别名。
router.beforeResolve((to) => {
  const slug = to.params.slug
  if (!slug || !to.path.startsWith('/blog/')) return true
  if (rollRoutes.live.includes(slug)) return true
  const target = rollRoutes.alias[slug]
  return target ? `/blog/${target}` : true
})

// 路由 meta 管理器：同步 document.title
router.afterEach((to) => {
  if (to.meta.t) document.title = to.meta.t
})

export default router
