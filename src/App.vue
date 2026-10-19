<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SiteHeader from './components/SiteHeader.vue'
import SiteFooter from './components/SiteFooter.vue'
import { debounce } from './lib/debounce.js'
import { shift } from './lib/shift.js'

const route = useRoute()
const router = useRouter()
// 次级页（非首页）：main 加空白滚动余量，把页脚压出首屏
const isSub = computed(() => route.path !== '/')

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

// 路由切换后向读屏播报新页面（SPA 不会自行触发）
const announced = ref('')
watch(
  () => route.path,
  () => {
    announced.value = route.meta.t || ''
  }
)

// 滚动深度：写入 --shift（0..1）与 lib/shift.js，驱动首页标题字距、全站晕影，
// 以及文章页顶部那条进度线。shift.js 那份镜像是给 JS 侧每帧读用的，
// 目前它唯一的读者在 StarTrails 那条已经不触发的非交互分支里（design.md §3.2）。
// maxScroll 只缓存、不每帧读取：scrollHeight 会强制同步布局，60fps 下等于每帧一次重排。
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
  shift.v = p
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
  onResize.cancel()
  document.documentElement.style.removeProperty('--shift')
})
</script>

<template>
  <!-- 风景底片层挂在 App 上，不挂在任何路由组件里：
       `fall` 转场给页根加了 transform + filter，而 filter 会让页根成为 position:fixed
       后代的包含块——放在 HomeView 里的那层 fixed 实测被解析成 .home 的盒子
       （rect 587x1629、跟着滚动），根本不是"不动的底图"。挂在这里才在视口上。
       首页与次级页共用这一层；首页上方由 .hero-plate（不透明、在 hero 内）盖住。
       两个 <i> 是轮播的第 2–3 张，父元素自己那张是第 1 张，见下面的 plate-slot。 -->
  <div class="sub-plate" aria-hidden="true"><i></i><i></i></div>
  <div class="en-vignette" aria-hidden="true"></div>
  <SiteHeader />
  <main id="main" tabindex="-1" :class="{ 'en-sub': isSub }">
    <RouterView v-slot="{ Component, route }">
      <!-- 不用 out-in：Vue 3.5 下离开方在 leave 期间重渲染（如 RouterLink active 翻转）
           会丢失挂起的 enter；并行模式 + leave 绝对定位叠层规避 -->
      <Transition name="fall">
        <component :is="Component" :key="route.path" />
      </Transition>
    </RouterView>
  </main>
  <SiteFooter />
  <!-- 路由播报：SPA 换页不刷新文档，读屏用户需要被告知当前页面 -->
  <p class="sr-only" role="status" aria-live="polite">{{ announced }}</p>
</template>

<style>
/* 次级页的风景底：清晰素材 + 沉回 --ink-0 的渐变 + 顶端羽化。
   区别只是它 fixed 铺满视口——次级页没有首屏要避让。
   z-index: -1 让它待在页面底色之上、所有内容之下；main 自己是 position: relative。
   平纱（原来烘在素材里的 42%）已按要求撤掉，压暗只剩这一条**竖向**渐变：它管的是折线以下
   与页尾的可读性，不再管整幅的"灰"。试过把它改成上下两条纱（中间留清晰窗口）和"顶部淡入 +
   原斜坡"两种形状，实测裸字最坏点仍卡在 1.0~1.8:1 上不去——一张无纱的风景照片上放裸字就是
   到不了 AA，形状无关；能到 AA 的只有落在卡片上的字（5.5:1 起）。所以这条渐变保持原样，
   裸字那几处另案处理（见报告）。
   模糊不再烘在素材里，是 --plate-blur 这个运行时参数（0–12px 滑杆，见 lib/plate.js）。
   初值 12 = 拉满（默认口味），所以**默认就会建这层渲染面**；只有用户把滑杆拖回 0，
   html[data-plate-blur] 才不匹配、filter 整条消失、回到素材本来的清晰。
   补边（inset 负值）是必需的：blur 会把图层边缘淡进透明，不撑开就在视口四周一圈白边。
   注意撑开的是 .sub-plate 自己的框，所以顶端那条 180px 羽化和 cover 会跟着挪 3*模糊 的距离。 */
.sub-plate {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background: linear-gradient(to bottom, transparent 18%, var(--ink-0) 78%) no-repeat,
    var(--plate-img) no-repeat 50% 34% / cover;
  -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 180px, #000 100%);
  mask-image: linear-gradient(to bottom, transparent 0, #000 180px, #000 100%);
}

html[data-plate-blur] .sub-plate {
  inset: calc(var(--plate-blur) * -3);
  -webkit-filter: blur(var(--plate-blur));
  filter: blur(var(--plate-blur));
}

/* 抽屉底图轮播三张（源图 plate1/3/4）。第一张是 .sub-plate 自己的背景，其余两张各占一层
   <i>，每层自带一份"沉回 ink-0"的渐变——渐变必须跟着每一层走，否则浮上来的那张会盖掉父层的
   压暗，文字对比就没了。
   两层共用一条关键帧，只靠 animation-delay 错开：每张独占 9s、两端各 1s 与邻张交叉，
   第 29–30s 两层全灭，露出来的就是父层那张。延迟写成 10s 的倍数减 1s，是为了让淡出与下一张的
   淡入落在同一秒上。
   深色主题下三个令牌指向同一张，动画照跑但看不出变化。
   周期 30s = 每张 10s（原来是 48s / 每张 16s，作者改口要 10s 一张），常数在 site.css。
   加一张要动三处：模板多一个 <i>、这里多一档延迟、--plate-cycle +10s（关键帧的
   3.333%/33.333%/36.667% 是按 30s 一圈算的，改了周期就得跟着重算）。 */
.sub-plate > i {
  position: absolute;
  inset: 0;
  opacity: 0;
  background-repeat: no-repeat;
  background-size: auto, cover;
  background-position: 50% 0, 50% 34%;
  background-image: linear-gradient(to bottom, transparent 18%, var(--ink-0) 78%), var(--pi);
  animation: plate-slot var(--plate-cycle) ease-in-out infinite;
  animation-delay: var(--pd);
}

.sub-plate > i:nth-child(1) {
  --pi: var(--plate-img-2);
  --pd: 9s;
}

.sub-plate > i:nth-child(2) {
  --pi: var(--plate-img-3);
  --pd: 19s;
}

/* 3.333% = 1s、33.333% = 10s：淡入 1s、满 9s、淡出 1s，其余 20s 待着。 */
@keyframes plate-slot {
  0%,
  36.667%,
  100% {
    opacity: 0;
  }
  3.333%,
  33.333% {
    opacity: 1;
  }
}

/* 减弱动效：停掉轮播，只留第一张。10s 一张比原来的 48s 显眼得多，
   这条以前没有——是这次把频率提高才必须补的。 */
@media (prefers-reduced-motion: reduce) {
  .sub-plate > i {
    animation: none;
    opacity: 0;
  }
}

main {
  position: relative;
  min-height: calc(100vh - 128px);
}
</style>
