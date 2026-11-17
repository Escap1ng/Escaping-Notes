<script setup>
// HorizonHero · 首页首屏排版层：站名刊头 + 下滑提示
// 长曝光星轨装置由 StarTrails 提供（等首屏照片 load 完再按需挂载），本组件只负责叙事排版
import { defineAsyncComponent, onMounted, onUnmounted, ref } from 'vue'
import { N } from '../data/narrative.js'
import { content } from '../data/index.js'
import { whenHeroReady } from '../lib/hero.js'

/* 星轨是首屏最重的运行期工作：挂载即跑一次预曝光 buildPlate，之后每帧合成。
   它底下那张地景才是 LCP——先让照片 load 完，再挂星轨。块本身在照片下载期间就提前取回
   （那会儿下行基本闲着，小块 JS 抢不动照片的带宽），闸门开时 loader 的 import 命中模块缓存，
   星轨省一个块的往返。隐藏页里 rAF 不推进，星轨就停在"未挂载"，
   页面可见时再补上，不会抢在照片前面画出一屏无底片的星。 */
const StarTrails = defineAsyncComponent(() => import('./StarTrails.vue'))
// 只预取、不挂载；拒绝在这里吞掉，挂载时 Vue 走同一条 promise 会再报一次
import('./StarTrails.vue').catch(() => {})
const stars = ref(false)
// 地景图默认透明，等 whenHeroReady() 后再淡入；替身（.hero-lqip）垫在下面，
// 于是照片是从一层模糊山影里"对焦"出来的。闸门带 error/20s 超时兜底，不会永远藏着。
const plateReady = ref(false)
/* 刊头的入场（快门开启）：**不等照片**。站名是纯文字，首帧就该在，它才是这一页的身份；
   扣在 1.45MB 地景后面等于让最轻的东西等最重的东西。此前 heroIn 初值 false、由闸门翻真，
   而折线以下的合集与项目是同步数据、第一帧就画出来——于是读作"底部先于顶部加载"：
   首屏是一块只有模糊替身的空场，站名要一两秒后才出现，下方的卡片却早就在那儿了。
   现在挂载即显影（CSS 入场动画在首帧就跑），地景对焦、星轨挂载仍各自等闸门。
   字体是 font-display: swap（site.css 顶部两枚 @font-face），所以文字不会被字体扣住，
   Didone 到了再换形。 */
const heroIn = ref(true)
const still = ref(false)

const textEl = ref(null)

/* 首屏视差：文字随滚动下沉并淡出 */
let raf = 0
function onScroll() {
  if (raf) return
  raf = requestAnimationFrame(() => {
    raf = 0
    const y = scrollY
    // 照片没就位之前不写行内样式：刊头入场动画此刻正在跑（它不再等照片），
    // 行内 transform/opacity 会盖掉那条动画。等 plateReady 之后再接手视差。
    if (textEl.value && plateReady.value) {
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
  still.value = matchMedia('(prefers-reduced-motion: reduce)').matches
  addEventListener('scroll', onScroll, { passive: true })
  // 图先到、星轨后画：等首屏照片 load（whenHeroReady 自带 error / 超时兜底），下一帧再挂。
  // 隐藏文档里 rAF 不推进（内置 / 无头 surface 就是这一类），这时直接挂，别把星轨永远扣在门外。
  whenHeroReady().then(() => {
    plateReady.value = true // 只有地景对焦等这道闸门；刊头已在首帧显影（见 heroIn）
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
    <StarTrails v-if="stars" />

    <div ref="textEl" class="hero-text" :class="{ in: heroIn, still }">
      <h1 class="title">{{ N.heroTitle }}</h1>
      <!-- 口号铭牌：site.motto 是唯一来源（关于页自述下那行也读它），空串则整行不渲染。
           斜体衬线小字，作为题记挂在刊头下面——居中约束只认刊头，铭牌不参与抢星环那条线 -->
      <p v-if="content.site.motto" class="hero-motto">{{ content.site.motto }}</p>
    </div>

    <!-- 下滑提示（2026-11-17 第四版）：小字标签 + 一道垂线 + 一颗沿线下滑的星。
         圆盘那三版都否了（实心像贴纸 / 裸细环看不清 / 加卡面成平庸悬浮钮）——
         这版不做容器，做一条"曝光还在往下走"的轨迹，与刊头的碑刻感同族。
         可点（平滑滚到折线以下），随 --shift 淡出 -->
    <button class="scroll-cue" type="button" :aria-label="N.hero.scroll" @click="scrollDown">
      <span class="cue-label" aria-hidden="true">{{ N.hero.scroll }}</span>
      <span class="cue-track" aria-hidden="true"><span class="cue-star"></span></span>
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
  /* 刊头字宽（100px 下实测的基准）：整行 "ESCAPING NOTES" 在 0.04em 字距下 9.219em、
     长行 "ESCAPING" 5.352em。扣掉字距得纯字形宽：整行 9.219 − 14×0.04 = 8.659em，
     长行 5.352 − 8×0.04 = 5.032em（CSS 字距每个字符后都加一份，含末字符）。
     2026-11-16 第二轮（作者「重心有问题，标题还是不好看」）：**撤掉 scaleX 横向拉伸**。
     拉伸是假加宽——它把竖笔压胖、细横笔仍发尖，对比反而更失衡，读着就是"变形字"。
     改成天然手法：字距 0.04→0.10em 把行撑开（时装刊头的宽排法），字身比例一寸不动。
     0.10em 下整行 8.659 + 1.4 = 10.059em、长行 5.032 + 0.8 = 5.832em。
     字号按此重算保持原占比：桌面 8vw（整行 80.5% 视口）、手机两行 13.6vw
     （长行 79.3%，320 上 254px、留白 34px）；整行 10.059×13.6vw ≈ 1.37 视口宽，
     必然在词间空格处分行——不靠标记断行。测试按这两个宽度对拍。 */
  --fs-hero-title: 8vw;
  --lh-hero-title: 1.1;
  --hero-lines: 1;
  /* 口号铭牌：比刊头小两档的题记，行高 1.4，与刊头的间隙走 --space-2。
     这三个数同时喂 .hero-motto 的排版与下面的几何，一处改两处跟着走 */
  --fs-motto: clamp(var(--fs-sm), 0.6vw + 8px, var(--fs-md));
  --lh-motto: 1.4;
  --motto-gap: var(--space-2);
  --motto-h: calc(var(--lh-motto) * var(--fs-motto) + var(--motto-gap));
  /* 两个高度分开记，这是重心的关键（2026-11-16）：
     --title-h 只有刊头，--lockup-h 是刊头 + 铭牌的实际内容高。
     上一轮把铭牌并进同一个 --lockup-h 去做居中，等于把"整组"的中心抬到星环上方——
     大标题被往上拽约 25px、铭牌反而正压星环中心，作者判「重心有问题」。
     现在居中约束只认刊头（见 --hero-title-b），铭牌作为附属挂在它下面，
     刊头因此回到加铭牌之前那个被认可的位置。 */
  --title-h: calc(var(--hero-lines) * var(--lh-hero-title) * var(--fs-hero-title));
  --lockup-h: calc(var(--title-h) + var(--motto-h));
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
   同一条天空纱改成压向 #0b0e16（2026-11-15 随深色页底一起提亮，原 #020204），所以顶端也是
   #0b0e16、同样没有缝；两套共用一条山脊折线。纱色在 build_plate_bg.ps1 的 $INK_DEEP，
   与 site.css 深色块的 --ink-0 必须同值，改一处就要改两处并重烘。 */
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
  /* 块底目标分两档，取更靠上的那条：
     ① 不压山尖：块底 ≤ --peak-y − --crest-gap（山尖取 ridge.js 折线最小值 v=0.208，正落在
        居中的刊头底下——矮窗与宽屏上这是防压山的硬下限）。
     ② 压住星环中心：天极在视口 38%（src/lib/sky.js 的 POLE_FY，测试钉两处同值），刊头块心
        抬到它上方 --arc-gap。居中模型里块心 = 块底 − --lockup-h/2，反解得块底 = 星环中心
        − --arc-gap + --lockup-h/2。
     2026-11-01 作者判「英文刊头太低、应比星环中心再高一点」：此前只挂 ①，块底贴峰顶，块心
     落在天极下方（1440×900：389 vs 342）；现在 ② 是主约束，① 降为下限，矮窗仍由它兜底。
     垫量下限留 --space-4：横带很矮的视口（竖屏手机）峰顶本来就低，不必再把块心顶到顶栏。
     上限 0.42 个视口高是保险：窗口矮到装不下这条链时，宁可少留一口气，也不要让 padding
     吃掉整个内容盒。
     顶部再补一道「最低让位」：窗口够高时块心本来就在顶栏以下（--hero-top-free 更大），
     padding-top 算出来是 0，版式一字不动；窗口矮到刊头顶进固定顶栏时，把块整体下推，
     让刊头顶边恰好落在 --hero-header-clear。96px = 未吸顶的顶栏 65px + 滚动 40px 时
     刊头相对上移的 30px（首屏视差 translateY(y*0.25)），再往上吸顶底就接上了。
     下推量与居中模型严格对应：加 T 顶部垫后块顶 = 原块顶 + T/2，所以 T = 2×(目标 − 原块顶)。 */
  --arc-y: calc(var(--svh) * 0.38);
  --arc-gap: 32px;
  /* 两道约束都锚**刊头自己**，不是刊头 + 铭牌那一组（2026-11-16 修重心）：
     ② 刊头块心抬到星环中心上方 --arc-gap → 刊头块底 = 星环 − gap + --title-h/2；
     ① 不压山尖：铭牌底（= 刊头块底 + --motto-h）≤ 峰顶 − --crest-gap，
        反解到刊头块底就是下面第一项。取两者更靠上的一条。
     铭牌因此是"挂在刊头下面的题记"，它自己不去争星环那条线。 */
  --hero-title-b: min(
    calc(var(--peak-y) - var(--crest-gap) - var(--motto-h)),
    calc(var(--arc-y) - var(--arc-gap) + var(--title-h) / 2)
  );
  /* 内容盒里实际占高的是整组（刊头 + 铭牌），所以垫量按 --lockup-h 反解；
     居中的是整组，但整组的底边被钉在"刊头块底 + 铭牌高"上 */
  --hero-block-b: calc(var(--hero-title-b) + var(--motto-h));
  --hero-pad-b: min(
    max(var(--space-4), calc(var(--svh) + var(--lockup-h) - 2 * var(--hero-block-b))),
    calc(var(--svh) * 0.42)
  );
  /* 刊头顶边的自由空间 = 居中后剩下的上半段。内容盒里占高的是整组，所以减 --lockup-h；
     整组的顶边就是刊头顶边（铭牌挂在下面），于是这个数直接就是刊头顶边的位置 */
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

/* 快门开启：刊头随首屏照片一起显影——从轻微散焦、略大、偏下的位置落定。
   读作"这一夜开始曝光"，不是控件弹入，所以时长比指针反馈长一档、曲线慢起慢收。
   只作用在 .title 上（不动 .hero-text 自己）：那一层的 transform/opacity 归首屏视差写行内样式，
   两者分层才不会互相盖掉。
   2026-11-15：.in 从挂载起就在（heroIn 初值 true），不再等照片——站名是首屏的身份，
   不该排在 1.45MB 地景后面。视差那段行内样式仍等 plateReady 才写，所以入场动画不会被它盖掉；
   刷新停在页面中段时动画照跑一次（0.24s 内视差接手），比"顶部空着等图"轻得多。
   减弱动效：.still 直接给终态，不做位移与散焦。 */
.hero-text .title {
  opacity: 0;
}

.hero-text.in .title {
  animation: hero-develop 1.15s cubic-bezier(0.16, 0.72, 0.18, 1) both;
}

.hero-text.in.still .title {
  animation: none;
  opacity: 1;
}

@keyframes hero-develop {
  from {
    opacity: 0;
    transform: translateY(14px) scale(1.03);
    filter: blur(7px);
  }
  60% {
    opacity: 1;
  }
  to {
    opacity: 1;
    transform: none;
    filter: blur(0);
  }
}

/* 站名刊头：唯一主角。高对比 Didone 子集，字号随视口铺满约 80% 宽。
   字距 0.10em（2026-11-16 第二轮）：0.04em 配瘦字身读着窄，而 scaleX 拉伸是假加宽
   （竖笔压胖、细横笔仍发尖，读作变形字），已撤。宽字距是时装刊头的天然排法：
   行撑开了，字身比例一寸没动。0.18em 才是"散成一排孤岛"，0.10em 在刊头级字号上仍成词。
   末字符后也带一份字距，视觉上整行会偏左半个字距——用等量 text-indent 补回居中。 */
.title {
  margin: 0;
  font-family: var(--font-display-en);
  font-size: var(--fs-hero-title);
  font-weight: var(--fw-bold);
  line-height: var(--lh-hero-title); /* 展示级标题：行高刻意脱离四档刻度（同 .en-title/.en-h2） */
  letter-spacing: 0.1em;
  text-indent: 0.1em;
  white-space: nowrap;
  /* 给细横笔补一点肉：Didone 的横笔在大字号下细到发尖，作者判"不好看"。
     同色描边 0.6px 只把最细的笔画托起来，不改字形比例，也不像描边字那样发糊。
     深色底上字是暖白、描边同色，所以两套主题都只是"笔画略实"，不出现彩边。 */
  -webkit-text-stroke: 0.6px currentColor;
  text-shadow: 0 2px 26px color-mix(in srgb, var(--ink-0) 55%, transparent);
}

/* 口号铭牌：比刊头小两档的斜体题记（2026-11-16）。拉丁走系统衬线的真斜体
   （Georgia/Times 一系），不合成倾斜；与正体 Didone 成"碑刻 + 手写题记"的对照。
   字距 0.18em 与刊头的宽排法呼应，次文字色 + 半透，明确是附属而非第二个标题。
   它不参与星环那条居中约束（见 --hero-title-b），只挂在刊头下面 */
.hero-motto {
  margin: var(--motto-gap) 0 0;
  font-family: var(--font-serif);
  font-style: italic;
  font-size: var(--fs-motto);
  line-height: var(--lh-motto);
  letter-spacing: 0.18em;
  text-indent: 0.18em;
  color: color-mix(in srgb, var(--text-1) 88%, transparent);
  text-shadow: 0 1px 14px color-mix(in srgb, var(--ink-0) 45%, transparent);
}

/* 下滑提示（2026-11-17 第四版，作者「重做」→「太不清楚了」→「还是不好看」）。
   四版明账，别再回头试：① 52% ink-0 半透盘 + 淡冷细边 → 白贴纸；② 撤盘改裸细弧、
   次色兑 75% → 亮照片上看不见；③ 整色 text-0 + 2px → 仍「太不清楚」；④ 实底卡面 +
   饱和冷环 → 清楚了，但成了枚平庸悬浮钮，「还是不好看」。**病根是"圆盘容器"这个形态**：
   它在星空刊头旁边永远读作控件贴纸，加底更重、去底更虚，两头都不对。
   这版不做容器：一条 32px 垂线 + 一颗沿线下滑的星 + 一枚等宽小字标签，
   读作"曝光还在往下走"，是星轨语汇的微缩，与刊头碑刻感同族（编辑部式滚动提示）。
   **颜色用 --plate-hdr / --plate-fg**：这两枚本就是"压深色底片"专用（次级页顶栏在用），
   两套主题下都是浅色——首屏底部是深色山体（浅色版也是暗山脊），所以不再赌照片明暗，
   也不用 --cold（浅色主题那枚深蓝压暗山只有 1.8:1，正是 §8 记过的债）。
   位置沿用 2026-10-30：右下角，不压折线波峰。透明度挂 --shift：滚过前 1/6 即淡出。
   热区：整块（标签 + 线）约 40×70，已过 44px 短边兜底的大半，另用 ::after 外撑 6px。 */
.scroll-cue {
  position: absolute;
  right: var(--space-4);
  bottom: var(--space-4);
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  padding: 0;
  border: 0;
  background: none;
  color: var(--plate-hdr);
  cursor: pointer;
  opacity: calc(1 - var(--shift, 0) * 6);
}

.scroll-cue::after {
  content: '';
  position: absolute;
  inset: -6px;
}

/* 标签：实测提示区背景平均亮度 76.9（暗山脊），浅色压上去对比充足。
   **刻意不挂 .en-mono**：那条基元把 color:--text-1（灰）**直接设在这枚元素上**，
   而浅色原先只写在父钮 .scroll-cue 上、靠继承下来——直接声明永远赢继承，
   于是标签一直是灰字压暗山。这才是两版「发虚」的真因，不是字号也不是选色。
   现在颜色显式写在标签自己身上；等宽字族与仪器口径也在这里写一遍
   （--fs-xs、0.08em、大写），脱离基元后仍是同一档仪器文字。 */
.cue-label {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  font-weight: var(--fw-medium);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--plate-hdr);
  text-shadow: 0 1px 10px color-mix(in srgb, var(--ink-0) 55%, transparent);
  transition: color var(--dur-fast);
}

/* 垂线：上端渐隐、下端实色，读作"轨迹从上方延续下来"。
   1.5px（不是 1px）：1px 在高分屏缩略观看时几乎消失，实拍第一版就偏细弱 */
.cue-track {
  position: relative;
  display: block;
  width: 1.5px;
  height: 36px;
  background: linear-gradient(to bottom, transparent, currentColor 40%);
}

/* 星点：5px 实心圆 + 一圈同色微光，沿垂线自上而下滑行。
   用 --plate-fg（两主题都是浅色）保证在暗山脊上始终是一颗亮星 */
.cue-star {
  position: absolute;
  left: 50%;
  top: 0;
  width: 5px;
  height: 5px;
  margin-left: -2.5px;
  border-radius: 50%;
  background: var(--plate-fg);
  box-shadow: 0 0 8px color-mix(in srgb, var(--plate-fg) 75%, transparent);
  animation: cue-fall 2.4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.scroll-cue:hover .cue-label {
  color: var(--plate-fg);
}

/* 星点沿线下滑：两端淡入淡出（这里允许——线始终在，不像旧版空圆读成坏了），
   走完整条 32px 轨迹，读作一次曝光下行 */
@keyframes cue-fall {
  0% {
    transform: translateY(0);
    opacity: 0;
  }
  25% {
    opacity: 1;
  }
  75% {
    opacity: 1;
  }
  100% {
    transform: translateY(31px);
    opacity: 0;
  }
}

/* 手机刊头断成 ESCAPING / NOTES 两行（2026-11-01）：单行 8.8vw 在 390 上只有 34px，
   断行后长行能占到 80% 视口。上界 600px 高是给两行 lockup 留出竖向余量——横屏
   手机（≤430px 高）仍走上面的单行，不然两行字高会把内容盒撑爆（首屏 overflow:hidden）。
   行高 1.0：两行全大写 Didone 之间不留行距，栈起来才像一刊刊头而不是两个标题。
   块放在 .title 之后：同为 .title 一条规则，写在前面会被上面的 white-space: nowrap 盖掉。 */
@media (max-width: 720px) and (min-height: 600px) {
  .hero {
    /* 13.6vw：0.10em 字距下长行 5.832em，13.6vw × 5.832 ≈ 79.3% 视口
       （320 上 254px、左右各留 34px），与加铭牌之前的占比一致 */
    --fs-hero-title: 13.6vw;
    --lh-hero-title: 1;
    --hero-lines: 2;
  }

  .title {
    white-space: normal;
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

/* 减弱动效：全站那条规则把动画时长压到 0.01ms、只跑一次，星点会停在"滑到底、已淡出"
   的那一帧上——这里显式停在线中段并给足不透明度，别让整枚提示只剩一条空线。 */
@media (prefers-reduced-motion: reduce) {
  .cue-star {
    animation: none;
    opacity: 1;
    transform: translateY(16px);
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
