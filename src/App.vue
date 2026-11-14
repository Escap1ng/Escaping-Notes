<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SiteHeader from './components/SiteHeader.vue'
import SiteFooter from './components/SiteFooter.vue'
import { debounce } from './lib/debounce.js'
import { whenHeroReady } from './lib/hero.js'

const route = useRoute()
const router = useRouter()
// 次级页（非首页）：main 加空白滚动余量，把页脚压出首屏
const isSub = computed(() => route.path !== '/')

/* 手机首页的抽屉底片排在最后取：它只在折线以下露脸，照片到位后也先不抓这 0.5MB——
   那一拍下行让给字体分片与章节数据，底片等第一次滚动再开始下，没人滚就没人下。
   历史：最早挂在照片后面立刻取，Slow 4G 上与 LCP 那张照片抢同一条下行，实测首屏
   从 ~7s 拖到 ~21s；后来改成等照片，如今再往后挪一拍。两道放行：⑴ 滚动（含 scroll-cue
   的平滑滚动与键盘）；⑵ 离开首页去次级页——那里的底片就是正文背景，等不得。
   桌面与次级页从首帧起就是 live。 */
const deferPlate = !isSub.value && matchMedia('(max-width: 720px)').matches
const plateLive = ref(!deferPlate)

function releasePlate() {
  plateLive.value = true
  removeEventListener('scroll', releasePlate)
}

// 去次级页立即放行：底片是正文背景，不能扣在滚动闸门后面
watch(isSub, (sub) => {
  if (sub) releasePlate()
})

// 站内换页的视图块是按路由动态 import 的：指到链接上就先取，点下去时通常已经就位。
// 只预热同源、无 target/download 的链接；组件 loader 由路由表自己给出，别在这里再抄一份路径。
const warmed = new Set()
function warm(e) {
  const a = e.target?.closest?.('a[href]')
  if (!a || a.target || a.hasAttribute('download')) return
  const url = new URL(a.href, location.href)
  if (url.origin !== location.origin) return
  const to = url.pathname + url.search
  if (warmed.has(to)) return
  warmed.add(to)
  for (const m of router.resolve(to).matched) {
    const load = m.components?.default
    if (typeof load === 'function') Promise.resolve(load()).catch(() => {})
  }
}

/* 换页：把离开方钉在它原来的视野上。
   路由的 scrollBehavior 是瞬时回顶（§6.3），而离开方还要在场上淡出 0.38–0.45s。两件事叠起来
   有个可见的缺陷：从首页折线以下点导航时，scrollY 归零让首屏重新进视野——地景照片与刊头
   在淡出的那半秒里"闪回"一次。这里在 before-leave 记下当前 scrollY，把离开方整页上移同样的
   距离（它已是 position:absolute，移动不影响进入方），于是旧页保持用户离开那一刻的画面淡出。
   进入方从顶部开始，正是它该有的落点。离开结束即复位，不留残留。
   位移走 `translate` 而不是 `transform`：fall-out 的关键帧自己在动 transform(scale)，
   写进 transform 会被动画整条盖掉（首页那条只动 opacity 才不受影响）。两者是可叠加的独立
   属性——docs/design.md §9 第 19 条留下的正是这条教训。不支持 translate 的浏览器忽略它，
   回到改动前的行为，不会画错。 */
function onLeaveStart(el) {
  const y = scrollY
  if (y > 0 && el?.style) el.style.translate = `0 ${-y}px`
}
function onLeaveDone(el) {
  if (el?.style) el.style.translate = ''
}

// 路由切换后向读屏播报新页面（SPA 不会自行触发）
const announced = ref('')
watch(
  () => route.path,
  () => {
    announced.value = route.meta.t || ''
  }
)

// 滚动深度：一次写入 --shift（0..1），驱动全站晕影、首屏下滑提示淡出，以及文章页顶部那条进度线。
// JS 侧没有第二个读者（原 lib/shift.js 的 shift.v 镜像只服务 StarTrails 那条非交互分支，
// 随它的退役一并删了）。maxScroll 只缓存、不每帧读取：scrollHeight 会强制同步布局，
// 60fps 下等于每帧一次重排。
let shiftRaf = 0
let maxScroll = 0
let lastShift = -1
function measure() {
  maxScroll = document.documentElement.scrollHeight - innerHeight
}
function applyShift() {
  shiftRaf = 0
  const p = maxScroll > 0 ? Math.min(1, Math.max(0, scrollY / maxScroll)) : 0
  if (p === lastShift) return // 值没变就不写样式，省掉一次无关的重算
  lastShift = p
  document.documentElement.style.setProperty('--shift', p.toFixed(4))
}
function onScroll() {
  if (!shiftRaf) shiftRaf = requestAnimationFrame(applyShift)
}
const onResize = debounce(() => {
  measure()
  onScroll()
}, 150)

let ro = null

onMounted(() => {
  measure()
  if (deferPlate) {
    whenHeroReady().then(() => {
      // 照片已就位，展示衬线可以取回来了（首帧脚本挂的临时降级，见 site.css §3a）
      document.documentElement.classList.remove('hero-pending')
      // 底片最后取：等第一次滚动；刷新时已滚过首屏则立即放行
      if (scrollY > 0) releasePlate()
      else addEventListener('scroll', releasePlate, { passive: true, once: true })
    })
  }
  // body 尺寸变化 = 页面变高了（内容/图片加载、路由切换、字体换入）：重测缓存
  ro = new ResizeObserver(() => {
    measure()
    onScroll()
  })
  ro.observe(document.body)
  addEventListener('scroll', onScroll, { passive: true })
  addEventListener('resize', onResize)
  addEventListener('pointerover', warm, { passive: true })
  addEventListener('focusin', warm)
  applyShift()
})

onUnmounted(() => {
  if (shiftRaf) cancelAnimationFrame(shiftRaf)
  ro?.disconnect()
  removeEventListener('scroll', onScroll)
  removeEventListener('resize', onResize)
  removeEventListener('pointerover', warm)
  removeEventListener('focusin', warm)
  removeEventListener('scroll', releasePlate)
  onResize.cancel()
  document.documentElement.style.removeProperty('--shift')
})
</script>

<template>
  <!-- 风景底片层挂在 App 上，不挂在任何路由组件里：
       `fall` 转场给页根加了 transform + filter，而 filter 会让页根成为 position:fixed
       后代的包含块——放在 HomeView 里的那层 fixed 实测被解析成 .home 的盒子
       （rect 587x1629、跟着滚动），根本不是"不动的底图"。挂在这里才在视口上。
       首页与次级页共用这一层；首页上方由 .hero-plate（不透明、在 hero 内）盖住。 -->
  <div class="sub-plate" :class="{ live: plateLive }" aria-hidden="true"></div>
  <div class="en-vignette" aria-hidden="true"></div>
  <SiteHeader />
  <main id="main" tabindex="-1" :class="{ 'en-sub': isSub }">
    <RouterView v-slot="{ Component, route }">
      <!-- 不用 out-in：Vue 3.5 下离开方在 leave 期间重渲染（如 RouterLink active 翻转）
           会丢失挂起的 enter；并行模式 + leave 绝对定位叠层规避 -->
      <Transition name="fall" @before-leave="onLeaveStart" @after-leave="onLeaveDone">
        <component :is="Component" :key="route.path" />
      </Transition>
    </RouterView>
  </main>
  <SiteFooter />
  <!-- 路由播报：SPA 换页不刷新文档，读屏用户需要被告知当前页面 -->
  <p class="sr-only" role="status" aria-live="polite">{{ announced }}</p>
</template>

<style>
/* 次级页的风景底：清晰素材 + 沉回 --ink-0 的渐变。
   区别只是它 fixed 铺满视口——次级页没有首屏要避让。
   z-index: -1 让它待在页面底色之上、所有内容之下；main 自己是 position: relative。
   平纱（原来烘在素材里的 42%）已按要求撤掉，压暗只剩这一条**竖向**渐变：它管的是折线以下
   与页尾的可读性，不再管整幅的"灰"。试过把它改成上下两条纱（中间留清晰窗口）和"顶部淡入 +
   原斜坡"两种形状，实测裸字最坏点仍卡在 1.0~1.8:1 上不去——一张无纱的风景照片上放裸字就是
   到不了 AA，形状无关；能到 AA 的只有落在卡片上的字（5.5:1 起）。
   2026-10-29：作者嫌上下两片白太大。底部起点 18% → 52%、且只到 100% 才铺满 —— 视口下半截
   不再是一块死白，最底一条仍能托住页脚。
   2026-10-30：页顶裸字压在底片上读不清（浅色 /blog 实测导航 --text-1 2.4:1、当前项 --cold
   1.3:1）。先选了「短白带」（顶部 72px 纯 --ink-0，72 → 182px 渐入底片），同日又嫌
   「顶部白条实在太丑」——白带整体撤掉，改成**字色跟随底片**（lib/plateTone.js 逐张采样）。
   2026-11-07：抽屉收敛成单张，平白逐秒换色的依据没了，动态采样退役——次级页未吸顶的
   顶栏改为**静态**换色（浅色整体纸色 `--plate-hdr`，深色 `--text-0`，见 site.css 两套
   主题块与 SiteHeader 的 `.plate` 规则），首页仍维持主题默认。
   底片自 y=0 起原样露出，这里不再有遮罩，也没有坐标系要补。
   模糊不再烘在素材里，是 --plate-blur 这个运行时参数（0–12px 滑杆，见 lib/plate.js）。
   初值 12 = 拉满（默认口味），所以**默认就会建这层渲染面**；只有用户把滑杆拖回 0，
   html[data-plate-blur] 才不匹配、filter 整条消失、回到素材本来的清晰。
   补边（inset 负值）是必需的：blur 会把图层边缘淡进透明，不撑开就在视口四周一圈白边。 */
.sub-plate {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background: linear-gradient(to bottom, transparent 52%, var(--ink-0) 100%) no-repeat,
    var(--plate-img) no-repeat 50% 34% / cover;
}

html[data-plate-blur] .sub-plate {
  inset: calc(var(--plate-blur) * -3);
  -webkit-filter: blur(var(--plate-blur));
  filter: blur(var(--plate-blur));
}

/* 抽屉底图 2026-11-07 起不再轮播：原先三层（父层 + 两个 <i>，各占 10s 错拍）收敛成
   .sub-plate 一张常驻（默认 = 源图 plate4 烘的 paper4），原先的 plate-slot 关键帧、
   --plate-cycle、负向延迟、lib/plateTone.js 的动态字色随之退役。 */
.sub-plate {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background: linear-gradient(to bottom, transparent 52%, var(--ink-0) 100%) no-repeat,
    var(--plate-img) no-repeat 50% 34% / cover;
}

html[data-plate-blur] .sub-plate {
  inset: calc(var(--plate-blur) * -3);
  -webkit-filter: blur(var(--plate-blur));
  filter: blur(var(--plate-blur));
}

/* 手机首页：首屏照片没到位之前底片先不挂，照片到位后也等第一次滚动再取。
   只留下压暗渐变，页脚 / 抽屉露出来也不会看到半张图；live 类由 script 在滚动闸门后加
   （去次级页立即加）。桌面与次级页从首帧起就是 live，所以这两条只影响窄屏首页。 */
.sub-plate:not(.live) {
  background-image: linear-gradient(to bottom, transparent 52%, var(--ink-0) 100%);
}

main {
  position: relative;
  min-height: calc(100vh - 128px);
}
</style>
