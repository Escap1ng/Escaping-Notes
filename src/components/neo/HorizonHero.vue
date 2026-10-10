<script setup>
// HorizonHero · 首页首屏排版层：站名打字机 + 十六字宣言
// 长曝光星轨装置由 StarTrails(interactive) 提供，本组件只负责叙事排版
import { onMounted, onUnmounted, ref } from 'vue'
import StarTrails from './StarTrails.vue'
import { N } from '../../config/narrative.js'

const textEl = ref(null)

/* 站名打字机：逐字打出，打完才放行宣言两行（.ln 的动画在 ready 前是暂停的）。
   光标只在打字期间存在——打满后再留一枚永久闪烁的竖线，读起来像没加载完，不像标题。 */
const typed = ref('')
const ready = ref(false)
const caret = ref(true)
let twTimer = 0

function typeTitle() {
  const title = N.heroTitle
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    typed.value = title
    ready.value = true
    caret.value = false // 没有打字过程，也就不该有光标
    return
  }
  let i = 0
  const tick = () => {
    typed.value = title.slice(0, ++i)
    if (i >= title.length) {
      ready.value = true
      twTimer = setTimeout(() => (caret.value = false), 1500) // 再闪一会儿退场，别在最后一字上硬切
    } else {
      twTimer = setTimeout(tick, 82)
    }
  }
  twTimer = setTimeout(tick, 260)
}

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

onMounted(() => {
  addEventListener('scroll', onScroll, { passive: true })
  typeTitle()
})
onUnmounted(() => {
  if (raf) cancelAnimationFrame(raf)
  clearTimeout(twTimer)
  removeEventListener('scroll', onScroll)
})
</script>

<template>
  <section class="hero">
    <!-- 首屏地景：DOM 排在 canvas 之前，所以星轨画在它上面。装饰层，读屏跳过 -->
    <div class="hero-plate" aria-hidden="true"></div>

    <!-- StarTrails 不再对外发事件：变星（文章节点）装置 2026-10-09 整体撤除，
         首屏不再有点击入口，文章归折线以下的精选卡 -->
    <StarTrails interactive />

    <div ref="textEl" class="hero-text" :class="{ ready }">
      <h1 class="title" :aria-label="N.heroTitle"
        ><span class="tw" aria-hidden="true">{{ typed }}</span
        ><span class="caret" :class="{ gone: !caret }" aria-hidden="true"></span
      ></h1>
      <p class="manifesto">
        <span class="ln ln1">{{ N.manifesto[0] }}</span>
        <span class="ln ln2">{{ N.manifesto[1] }}</span>
      </p>
    </div>

  </section>
</template>

<style scoped>
.hero {
  position: relative;
  height: 100vh;
  height: 100svh;
  overflow: hidden;
  /* 不透明底：挡掉挂在 App 上那层 fixed 抽屉底片。
     它铺满整个视口，首屏若不给自己铺底，抽屉那张图就会从折线处渗进来，
     和首屏那张山叠在一起。有了这层底，两张图只在折线**相接**，不互相透出。 */
  background: var(--ink-0);
  display: flex;
  flex-direction: column;
}

@supports not (height: 100svh) {
  .hero {
    height: 100vh;
  }
}

/* 首屏地景：不做满屏壁纸，做成一条**地平线横带**——照片只占下沿 54%，
   上半屏整片空出来给标题与星轨。留白是这么来的，不是把字缩小让位。
   淡出不在 CSS 里，烘在素材里：build_plate_bg.ps1 给 plate-hero.jpg 的山脊以上盖了一层
   竖向天空纱，顶端正好压在 --ink-0（实测与 #F2F5F9 差 1/765 通道和），到峰顶收敛为 0——
   山一寸没被遮。于是 `50% 0` 把素材第 0 行钉死在横带顶边，边界两侧同色，任何视口下都没有缝。
   原来的 mask 是把照片落在边上的 #9FB4CB 在 105px 内插到 #F2F5F9：两端颜色不等，边界处从
   一片全平（0.910）直接接上每 20px 掉 0.098 的陡坡——那个折角就是横杠。把渐变拉长只是摊开
   同一段色差，"两端不等"这件事不变；现在两端实测差 1/765 通道和，边界那一档降到 0.021。
   横带高度是这里的 top，画面取哪一段是 bake 里的 700/1120/2560。
   暗色下 --hero-img 是抽屉那张压暗版，顶端 #090E14 对 #020204 只差 1.07:1，本就看不见缝。 */
.hero-plate {
  position: absolute;
  top: 46%;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 0;
  background: var(--hero-img) no-repeat 50% 0 / cover;
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
  gap: var(--space-3); /* 站名与联句之间留一口气：--space-2 时两行贴成一个块，锁不住也分不开 */
  /* 整块上提：峰顶占视口 ≈62%，文字居中时宣言几乎贴到山尖。底部垫 19vh 把块心
     抬到天空的重心处，联句与峰顶之间留出一口气（13vh→16vh→19vh 是他逐版要求再提）。
     视差 translateY 照旧随滚动下沉。 */
  padding: 0 var(--space-3) clamp(64px, 19vh, 210px);
  text-align: center;
  pointer-events: none;
  will-change: transform, opacity;
}

.hero-text > * {
  pointer-events: auto;
}

/* 站名：打字机逐字打出，光标是「还在曝光」的信号 */
/* 中英主次：站名是第一眼，但那十六个字才是有分量的句——两行要读成一个 lockup，
   而不是"大标题 + 小副标"。比例收到 ≈1.6:1（60/38），并让两行**宽度接近**：
   英文 14 字 ×(0.72+0.18)em ≈ 12.6em ≈ 756px，中文 17 字 ×1.08em ≈ 18.4em ≈ 700px。
   旧的 70/34（2.1:1）就是"大小不协调"的来源：中文被压成了副标。 */
.title {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(22px, 4.2vw, 60px);
  font-weight: var(--fw-bold);
  line-height: 1.1; /* 展示级标题：行高刻意脱离四档刻度（同 .neo-title/.neo-h2） */
  letter-spacing: 0.18em; /* 全大写小字号要靠字距撑开，0.06em 在 20px 上会挤成一团 */
  white-space: nowrap;
  text-shadow: 0 2px 26px color-mix(in srgb, var(--ink-0) 55%, transparent);
}

.caret {
  display: inline-block;
  width: max(2px, 0.06em);
  height: 0.86em;
  margin-left: 0.1em;
  vertical-align: -0.06em;
  background: var(--cold); /* 光标属交互，只准用冷色 */
  animation: caret-blink 1.05s steps(1, end) infinite;
}

/* 打满后淡出退场，不是硬切：transition 走 opacity，动画本身已经不再改它 */
.caret.gone {
  opacity: 0;
  transition: opacity 0.6s ease;
}

@keyframes caret-blink {
  0%,
  49% {
    opacity: 1;
  }
  50%,
  100% {
    opacity: 0;
  }
}

.manifesto {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(18px, 3.0vw, 38px); /* 与站名 60 成 ≈1.6:1：再小就读成副标，lockup 散掉 */
  font-weight: var(--fw-bold);
  line-height: 1.9; /* 联句行距：1.7 时两行粗宋贴得太近，读成一坨；1.9 才有联的呼吸 */
  /* 字距随下潜被潮汐拉长。基线从 -0.02em 抬到 +0.08em：负字距是英文排版的遗留，
     汉字粗宋 34px 挤在一起笔画会互相咬；正字距才读得出碑帖味。潮汐项同比加长。 */
  letter-spacing: calc(0.08em + var(--shift, 0) * 0.06em);
  text-shadow: 0 2px 26px color-mix(in srgb, var(--ink-0) 55%, transparent);
}

/* 联句不断行：每半句恒为一行，字号随视口连续缩放。
   打完站名才放行（.hero-text.ready）——paused 期间连 animation-delay 的钟都不走 */
.ln {
  display: block;
  white-space: nowrap;
  clip-path: inset(0 0 100% 0);
  animation: ln-reveal 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  animation-play-state: paused;
}

.hero-text.ready .ln {
  animation-play-state: running;
}

.ln2 {
  animation-delay: 0.18s;
}

@keyframes ln-reveal {
  to {
    clip-path: inset(0 0 -12% 0);
  }
}

@media (max-width: 720px) {
  /* 窄屏也要保住上提的那口气，只是垫得少一点（手机视口矮，16vh 会顶到顶栏） */
  .hero-text {
    padding: 0 var(--space-2) clamp(44px, 12vh, 110px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ln {
    clip-path: none;
    animation: none;
  }
  .caret {
    animation: none;
    opacity: 1;
  }
}
</style>
