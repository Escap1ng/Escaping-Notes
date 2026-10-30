<script setup>
// HorizonHero · 首页首屏排版层：站名刊头 + 下滑提示
// 长曝光星轨装置由 StarTrails(interactive) 提供（等首屏照片 load 完再按需挂载），本组件只负责叙事排版
import { defineAsyncComponent, onMounted, onUnmounted, ref } from 'vue'
import { N } from '../data/narrative.js'
import { whenHeroReady } from '../lib/hero.js'

/* 星轨是首屏最重的运行期工作：挂载即跑一次预曝光 buildPlate，之后每帧合成。
   它底下那张地景才是 LCP——先让照片 load 完，再挂星轨；异步组件顺带把 StarTrails
   拆出 HomeView 的 chunk，按需下载。隐藏页里 rAF 不推进，星轨就停在"未挂载"，
   页面可见时再补上，不会抢在照片前面画出一屏无底片的星。 */
const StarTrails = defineAsyncComponent(() => import('./StarTrails.vue'))
const stars = ref(false)
// 地景图默认透明，等 whenHeroReady() 后再淡入；替身（.hero-lqip）垫在下面，
// 于是照片是从一层模糊山影里"对焦"出来的。闸门带 error/20s 超时兜底，不会永远藏着。
const plateReady = ref(false)

const textEl = ref(null)

/* 首屏视差：文字随滚动下沉并淡出 */
let raf = 0
function onScroll() {
  if (raf) return
  raf = requestAnimationFrame(() => {
    raf = 0
    const y = scrollY
    if (textEl.value) {
      textEl.value.style.transform = `translateY(${(y * 0.25).toFixed(1)}px)`
      textEl.value.style.opacity = Math.max(0, 1 - y / 520).toFixed(3)
    }
  })
}

/* 下滑提示点击：滚过一整屏到折线以下；减弱动效时不做强平滑 */
function scrollDown() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  scrollTo({ top: innerHeight, behavior: reduce ? 'auto' : 'smooth' })
}

onMounted(() => {
  addEventListener('scroll', onScroll, { passive: true })
  // 图先到、星轨后画：等首屏照片 load（whenHeroReady 自带 error / 超时兜底），下一帧再挂。
  // 隐藏文档里 rAF 不推进（内置 / 无头 surface 就是这一类），这时直接挂，别把星轨永远扣在门外。
  whenHeroReady().then(() => {
    plateReady.value = true
    if (document.visibilityState === 'hidden') stars.value = true
    else requestAnimationFrame(() => (stars.value = true))
  })
})
onUnmounted(() => {
  if (raf) cancelAnimationFrame(raf)
  removeEventListener('scroll', onScroll)
})
</script>

<template>
  <section class="hero">
    <!-- 首屏第一帧的替身：36px 宽的模糊底（data URI，见 site.css 主题块）。
         单独一层压在地景图下面，真图不透明、到了自然盖住；不并进 .hero-plate 的背景层，
         否则 LCP 会记到真图之后的字体换入上（实测晚 1.3s）。 -->
    <div class="hero-lqip" aria-hidden="true"></div>

    <!-- 首屏地景：DOM 排在 canvas 之前，所以星轨画在它上面。装饰层，读屏跳过 -->
    <div class="hero-plate" :class="{ ready: plateReady }" aria-hidden="true"></div>

    <!-- StarTrails 不再对外发事件：变星（文章节点）装置 2026-10-09 整体撤除，
         首屏不再有点击入口，文章归折线以下的精选卡；挂载本身等首屏照片就位（见 script） -->
    <StarTrails v-if="stars" interactive />

    <div ref="textEl" class="hero-text">
      <h1 class="title">{{ N.heroTitle }}</h1>
    </div>

    <!-- 下滑提示：首屏右下角一枚圆钮，细描边里一枚下箭头轻轻往下走；可点（平滑滚到折线以下），
         随 --shift 淡出 -->
    <button class="scroll-cue" type="button" aria-label="向下滚动" @click="scrollDown">
      <svg class="cue-arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.2 6 8 10.8 12.8 6" /></svg>
    </button>

  </section>
</template>

<style scoped>
.hero {
  position: relative;
  height: var(--svh);
  overflow: hidden;
  /* 不透明底：挡掉挂在 App 上那层 fixed 抽屉底片。
     它铺满整个视口，首屏若不给自己铺底，抽屉那张图就会从折线处渗进来，
     和首屏那张山叠在一起。有了这层底，两张图只在折线**相接**，不互相透出。 */
  background: var(--ink-0);
  display: flex;
  flex-direction: column;

  /* 首屏几何的一条链（两个数：横带多高、山尖落在哪儿），全部相对 .hero 自己的盒子算。
     --svh 是它的高度，同时是下面所有算式的分母；不支持 svh 的浏览器整条退回 vh，
     几何照旧成立（原来那对 height:100vh/100svh + @supports 兜底由这一个令牌替掉）。
     素材 6000x1860，`50% 0` 顶边钉死，所以横带只要不小于视口宽的 31%（=1860/6000）就能
     把照片一寸不缺地放下；再高只多吃横向裁剪，故 31vw 是**下限**而不是定值。上限 0.7 个
     视口高是留给天空与排版的——横带再高就把标题顶进顶栏。
     山尖取 ridge.js 那条折线的最小值 v=0.208（在 u=0.515，正落在居中的刊头底下）；
     显示出来的素材高 ihS = max(横带高, 31vw)，于是峰顶 y = 折线 + 0.208·ihS。 */
  --svh: 100vh;
  --band-h: clamp(calc(var(--svh) * 0.54), 31vw, calc(var(--svh) * 0.7));
  --peak-y: calc(var(--svh) - var(--band-h) + 0.208 * max(var(--band-h), 31vw));
  /* lockup 自己的高：只剩站名一行。字号/行高都引下面那条规则用的同一枚令牌，
     改字号不会让这里的推算悄悄失准 */
  /* 刊头一行约 9.22em 宽（100px 下实测：无字距 8.66em，0.04em 字距 9.22em）。
     字号取 8.8vw，整行约占 81% 视口：1440 上 127px、1920 上 169px，手机 390 上
     34px；横向留白 320/360/390 为 30.2/34.0/36.9px，三档窄屏都不出画。 */
  --fs-hero-title: 8.8vw;
  --lh-hero-title: 1.1;
  --lockup-h: calc(var(--lh-hero-title) * var(--fs-hero-title));
  --crest-gap: 56px;
}

@supports (height: 100svh) {
  .hero {
    --svh: 100svh;
  }
}

/* 首屏地景：不做满屏壁纸，做成一条**地平线横带**，钉在底边、高度见上面的 --band-h
   （照片按 cover 铺满宽度时自己的高度，所以横带一寸都不缺；视口够方时保持 54% 不动）。
   淡出不在 CSS 里，烘在素材里：build_plate_bg.ps1 给 plate-hero.jpg 的山脊以上盖了一层
   竖向天空纱，顶端正好压在 --ink-0（实测与 #F2F5F9 差 1/765 通道和），到峰顶收敛为 0——
   山一寸没被遮。于是 `50% 0` 把素材第 0 行钉死在横带顶边，边界两侧同色，任何视口下都没有缝。
   原来的 mask 是把照片落在边上的 #9FB4CB 在 105px 内插到 #F2F5F9：两端颜色不等，边界处从
   一片全平（0.910）直接接上每 20px 掉 0.098 的陡坡——那个折角就是横杠。把渐变拉长只是摊开
   同一段色差，"两端不等"这件事不变；现在两端实测差 1/765 通道和，边界那一档降到 0.021。
   横带高度在这里，画面取哪一段是 bake 里的 700/1120/2560。
   暗色是同一取景的压暗版（plate-hero-deep.jpg，build_plate_bg.ps1 用同一个 $full 烘出），
   同一条天空纱改成压向 #020204，所以顶端也是 #020204、同样没有缝；两套共用一条山脊折线。 */
.hero-lqip {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: var(--band-h);
  z-index: 0;
  /* 替身本身就烘过模糊（36px 原图），这里不再加 filter：滤镜会给整块横带开一层合成面，
     实测会把地景的 LCP 拖到真图之后（一到两秒不等）。纯背景层没有这个问题。 */
  background: var(--hero-lqip) no-repeat 50% 0 / cover;
}

.hero-plate {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: var(--band-h);
  z-index: 0;
  background: var(--hero-img) no-repeat 50% 0 / cover;
  /* 真图到达后从替身里淡出（见 script 的 plateReady）。先透明：图没就位时
     不会有一帧硬切，下面的 .hero-lqip 一直可见 */
  opacity: 0;
}

.hero-plate.ready {
  opacity: 1;
  transition: opacity 0.24s ease;
}

/* 星轨等照片 load 完才挂载（见 script）：给它一段淡入，别在已经看得见的照片上硬贴一屏星。
   只动 opacity；减弱动效下直接出现。 */
.hero :deep(.st-abs) {
  animation: stars-in 0.9s ease both;
}

@keyframes stars-in {
  from {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero :deep(.st-abs) {
    animation: none;
  }
}

.hero-text {
  position: relative;
  z-index: 2;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  /* 底部垫量：由峰顶位置反解出来，不是钉一个 vh。
     居中模型里块底 = (--svh - 垫)/2 + 块高/2，令它等于 --peak-y - --crest-gap 即得下面的式子。
     横带高度随视口比例变（见 --band-h），固定 vh 在宽屏上会让刊头压上山尖、在方屏上又把字
     抬得过高。垫量下限留 --space-4：横带很矮的视口（竖屏手机）峰顶本来就低，不必再把块心
     顶到顶栏。上限 0.42 个视口高是保险：窗口矮到装不下这条链时，宁可少留一口气，也不要让
     padding 吃掉整个内容盒。
     顶部再补一道「最低让位」：窗口够高时块心本来就在顶栏以下（--hero-top-free 更大），
     padding-top 算出来是 0，版式一字不动；窗口矮到刊头顶进固定顶栏时，把块整体下推，
     让刊头顶边恰好落在 --hero-header-clear。96px = 未吸顶的顶栏 65px + 滚动 40px 时
     刊头相对上移的 30px（首屏视差 translateY(y*0.25)），再往上吸顶底就接上了。
     下推量与居中模型严格对应：加 T 顶部垫后块顶 = 原块顶 + T/2，所以 T = 2×(目标 − 原块顶)。 */
  --hero-pad-b: min(
    max(var(--space-4), calc(var(--svh) + var(--lockup-h) - 2 * (var(--peak-y) - var(--crest-gap)))),
    calc(var(--svh) * 0.42)
  );
  --hero-top-free: calc((var(--svh) - var(--hero-pad-b) - var(--lockup-h)) / 2);
  --hero-header-clear: 96px;
  padding: max(0px, calc(2 * (var(--hero-header-clear) - var(--hero-top-free)))) var(--space-3)
    var(--hero-pad-b);
  text-align: center;
  pointer-events: none;
  will-change: transform, opacity;
}

.hero-text > * {
  pointer-events: auto;
}

/* 站名刊头：唯一主角。高对比 Didone 子集，字号随视口铺满约 85% 宽；
   字距留在 0.04em——0.18em 在刊头级字号上会散成一排孤岛。 */
.title {
  margin: 0;
  font-family: var(--font-display-en);
  font-size: var(--fs-hero-title);
  font-weight: var(--fw-bold);
  line-height: var(--lh-hero-title); /* 展示级标题：行高刻意脱离四档刻度（同 .en-title/.en-h2） */
  letter-spacing: 0.04em;
  white-space: nowrap;
  text-shadow: 0 2px 26px color-mix(in srgb, var(--ink-0) 55%, transparent);
}

/* 下滑提示：首屏右下角一枚 46px 圆钮，细描边里一枚下箭头轻轻往下走——
   读作"往下走"，形状与顶栏那排圆钮同族，但大一圈（32 vs 46），不至于被读成第五个顶栏按钮。
   2026-10-30 从正中挪到右侧：折线声波的峰就在正中，圆钮压在波峰上像一颗樱桃，也让
   "下面还有"跟波形抢同一处视线。同日由 38×58 胶囊改成圆形。
   透明度挂 --shift：滚过首屏前 1/6 即淡出，不留残影。
   按钮本身不动（动的是箭头，就不会晃到点击位置）；46 靠 ::after 补到 58 的触控热区
   （manual §4 的 44px 兜底）。减弱动效下箭头停在正中的静态一撇。 */
.scroll-cue {
  position: absolute;
  right: var(--space-4);
  bottom: var(--space-4);
  z-index: 2;
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  /* 冷色=交互：下滑提示是"该动了"的信号，用灰读不出，用冷色一眼锁定 */
  border: 1.5px solid color-mix(in srgb, var(--cold) 75%, transparent);
  /* 半透底托：山脊照片明暗不定，裸描边会被吃掉，垫一层同族底把箭头托出来 */
  background: color-mix(in srgb, var(--ink-0) 52%, transparent);
  border-radius: 50%;
  color: var(--cold);
  cursor: pointer;
  opacity: calc(1 - var(--shift, 0) * 6);
  transition: border-color var(--dur-fast), background-color var(--dur-fast);
}

.scroll-cue::after {
  content: '';
  position: absolute;
  inset: -6px;
  border-radius: 50%;
}

/* 描边箭头，与顶栏那组 en-svg 同一套（fill:none + 圆头圆角），不另画实心三角形 */
.cue-arrow {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
  animation: cue-track 2.2s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
}

.scroll-cue:hover {
  border-color: var(--cold);
  background: color-mix(in srgb, var(--ink-0) 62%, transparent);
}

/* 箭头在圆内轻轻起伏：3px 往返 + 透明度 0.55↔1，全程可见。
   旧版是"走 6px、两端淡出"，一半时间按钮里是空的——换成圆钮之后那半个空圆像坏了。 */
@keyframes cue-track {
  0%,
  100% {
    transform: translateY(-3px);
    opacity: 0.55;
  }
  50% {
    transform: translateY(3px);
    opacity: 1;
  }
}

@media (max-width: 720px) {
  /* 窄屏只收横向留白。底部垫量不再另开一档：它由 --peak-y 推出来，已经跟着视口形状走了
     （旧的那支 clamp(44px,12vh,110px) 是手动版的同一件事，横带一改自适应就会压上山尖）。 */
  .hero-text {
    padding-left: var(--space-2);
    padding-right: var(--space-2);
  }

  /* 提示贴到 16px 页边，跟正文留白对齐；68px 的偏移在 390 上会浮在半空 */
  .scroll-cue {
    right: var(--space-2);
    bottom: var(--space-3);
  }
}

/* 减弱动效：全站那条规则把动画时长压到 0.01ms、只跑一次，箭头会停在"走到底、已淡出"
   的那一帧上——这里显式停回正中那道静态一撇，别让提示整个消失。 */
@media (prefers-reduced-motion: reduce) {
  .cue-arrow {
    animation: none;
    opacity: 0.9;
    transform: none;
  }
}

/* 窗口矮到刊头必须整体让位时，块底会碰上底部那枚下滑提示。
   它只是"下面还有"的提示，没地方时不硬挤——让给刊头。 */
@media (max-height: 430px) {
  .scroll-cue {
    display: none;
  }
}
</style>
