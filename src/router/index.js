import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'
import { defineAsyncComponent, defineComponent, h } from 'vue'
import { skin } from '../lib/skin.js'

// Pages 测试镜像用 hash 路由（.env.pages）；自有域名生产用 history，详见 docs/manual.md §4.2
const history =
  import.meta.env.VITE_DEPLOY === 'pages' ? createWebHashHistory() : createWebHistory()

const T = 'Escaping Notes'

// 双皮肤路由：同一 path 下按 skin.mode 选择新版(neo)/旧版(legacy)视图，切换无需刷新
function skinned(legacy, neo) {
  const L = defineAsyncComponent(legacy)
  const N = defineAsyncComponent(neo)
  return defineComponent({
    name: 'SkinSwitch',
    setup: () => () => (skin.mode === 'neo' ? h(N) : h(L)),
  })
}

const router = createRouter({
  history,
  routes: [
    {
      path: '/',
      component: skinned(
        () => import('../views/HomeView.vue'),
        () => import('../views/neo/NeoHomeView.vue')
      ),
      meta: { t: `${T} · 逃逸笔记` },
    },
    {
      path: '/blog',
      component: skinned(
        () => import('../views/BlogView.vue'),
        () => import('../views/neo/NeoBlogView.vue')
      ),
      meta: { t: `文章 · ${T}` },
    },
    // 文章页 title 由 PostView / NeoPostView 按文章标题设置
    {
      path: '/blog/:slug',
      component: skinned(
        () => import('../views/PostView.vue'),
        () => import('../views/neo/NeoPostView.vue')
      ),
    },
    {
      path: '/updates',
      component: skinned(
        () => import('../views/UpdatesView.vue'),
        () => import('../views/neo/NeoUpdatesView.vue')
      ),
      meta: { t: `动态 · ${T}` },
    },
    {
      path: '/records',
      component: skinned(
        () => import('../views/RecordsView.vue'),
        () => import('../views/neo/NeoRecordsView.vue')
      ),
      meta: { t: `歌单 · ${T}` },
    },
    // 碎片页代码保留，暂不占用导航位（可 /fragments 直达）；仅旧版组件
    { path: '/fragments', component: () => import('../views/FragmentsView.vue'), meta: { t: `碎片 · ${T}` } },
    {
      path: '/projects',
      component: skinned(
        () => import('../views/ProjectsView.vue'),
        () => import('../views/neo/NeoProjectsView.vue')
      ),
      meta: { t: `载荷舱 · ${T}` },
    },
    {
      path: '/wall',
      component: skinned(
        () => import('../views/WallView.vue'),
        () => import('../views/neo/NeoWallView.vue')
      ),
      meta: { t: `留言墙 · ${T}` },
    },
    {
      path: '/about',
      component: skinned(
        () => import('../views/AboutView.vue'),
        () => import('../views/neo/NeoAboutView.vue')
      ),
      meta: { t: `关于 · ${T}` },
    },
    { path: '/login', component: () => import('../views/LoginView.vue'), meta: { t: `登录 · ${T}` } },
    { path: '/register', component: () => import('../views/RegisterView.vue'), meta: { t: `注册 · ${T}` } },
    { path: '/admin', component: () => import('../views/AdminView.vue'), meta: { t: `管理 · ${T}` } },
    {
      path: '/:pathMatch(.*)*',
      component: skinned(
        () => import('../views/NotFoundView.vue'),
        () => import('../views/neo/NeoNotFoundView.vue')
      ),
      meta: { t: `信号丢失 · ${T}` },
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
