<script setup>
// HorizonHero · 首页首屏排版层：站名打字机 + 十六字宣言
// 长曝光星轨装置由 StarTrails(interactive) 提供，本组件只负责叙事排版
import { onMounted, onUnmounted, ref } from 'vue'
import StarTrails from './StarTrails.vue'
import { N } from '../config/narrative.js'

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

/* 下滑提示点击：滚过一整屏到折线以下；减弱动效时不做强平滑 */
function scrollDown() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  scrollTo({ top: innerHeight, behavior: reduce ? 'auto' : 'smooth' })
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

    <!-- 下滑提示：可点（平滑滚到折线以下），也靠 bob 暗示"下面还有"；随 --shift 淡出 -->
    <button class="scroll-cue" type="button" aria-label="向下滚动" @click="scrollDown">↓</button>

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
     山尖取 ridge.js 那条折线的最小值 v=0.208（在 u=0.515，正落在居中的联句底下）；
     显示出来的素材高 ihS = max(横带高, 31vw)，于是峰顶 y = 折线 + 0.208·ihS。 */
  --svh: 100vh;
  --band-h: clamp(calc(var(--svh) * 0.54), 31vw, calc(var(--svh) * 0.7));
  --peak-y: calc(var(--svh) - var(--band-h) + 0.208 * max(var(--band-h), 31vw));
  /* lockup 自己的高：站名一行 + --space-3 那口气 + 宣言两行。字号/行高都引下面那两条规则
     用的同一组令牌，改字号不会让这里的推算悄悄失准 */
  --fs-hero-title: clamp(40px, 7vw, 96px);
  --lh-hero-title: 1.1;
  --fs-manifesto: clamp(14px, 2vw, 22px);
  --lh-manifesto: 1.8;
  --lockup-h: calc(
    var(--lh-hero-title) * var(--fs-hero-title) + var(--space-3) + 2 * var(--lh-manifesto) * var(--fs-manifesto)
  );
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
.hero-plate {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: var(--band-h);
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
  /* 整块上提：底部垫量由峰顶位置反解出来，不是钉一个 vh。
     居中模型里块底 = (--svh - 垫)/2 + 块高/2，令它等于 --peak-y - --crest-gap 即得下面的式子。
     横带高度随视口比例变（见 --band-h），固定 vh 在宽屏上会让联句压上山尖、在方屏上又把字
     抬得过高（13vh→16vh→19vh 那几版就是在手动追这件事）。垫量下限留 --space-4：
     横带很矮的视口（竖屏手机）峰顶本来就低，不必再把块心顶到顶栏。上限 0.42 个视口高是
     保险：窗口矮到装不下这条链时，宁可少留一口气，也不要让 padding 吃掉整个内容盒。 */
  padding: 0 var(--space-3)
    min(
      max(var(--space-4), calc(var(--svh) + var(--lockup-h) - 2 * (var(--peak-y) - var(--crest-gap)))),
      calc(var(--svh) * 0.42)
    );
  text-align: center;
  pointer-events: none;
  will-change: transform, opacity;
}

.hero-text > * {
  pointer-events: auto;
}

/* 站名：打字机逐字打出，光标是「还在曝光」的信号 */
/* 中英主次：站名是唯一主角（刊头），联句退成题注，权重差 ≈4:1（96/22）。
   英文用高对比 Didone 子集、字距收到 0.04em 读成刊头；中文降为 400 系统宋、
   字距拉到 0.35em 读成碑帖题注。旧的 1.6:1 让两行权重接近、没有主次。 */
.title {
  margin: 0;
  font-family: var(--font-display-en);
  font-size: var(--fs-hero-title);
  font-weight: var(--fw-bold);
  line-height: var(--lh-hero-title); /* 展示级标题：行高刻意脱离四档刻度（同 .en-title/.en-h2） */
  letter-spacing: 0.04em; /* 刊头字距：0.18em 在 96px 上会散成一排孤岛 */
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
  animation: none; /* 退场时停掉闪烁，否则 animation 会覆盖 transition 的 opacity */
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

/* 下滑提示：一枚细圈 ↓，轻 bob 暗示"下面还有"；可点，平滑滚过首屏。
   透明度挂 --shift：滚过首屏前 1/6 即淡出，不留残影。bob 用 transform，
   居中靠 margin-left 而非 translateX，把 transform 整条让给动画。 */
.scroll-cue {
  position: absolute;
  left: 50%;
  bottom: var(--space-4);
  z-index: 2;
  width: 52px;
  height: 52px;
  margin-left: -26px;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 冷色=交互：下滑提示是"该动了"的信号，用灰读不出，用冷色一眼锁定 */
  border: 1px solid color-mix(in srgb, var(--cold) 70%, transparent);
  /* 半透底托：山脊照片明暗不定，裸圈会被吃掉，垫一层同族底把箭头托出来 */
  background: color-mix(in srgb, var(--ink-0) 45%, transparent);
  border-radius: 50%;
  color: var(--cold);
  font-family: var(--font-mono);
  font-size: var(--fs-base);
  line-height: 1;
  cursor: pointer;
  opacity: calc(1 - var(--shift, 0) * 6);
  animation: cue-bob 1.8s ease-in-out infinite;
  transition: border-color var(--dur-fast), color var(--dur-fast), background-color var(--dur-fast);
}

.scroll-cue:hover {
  border-color: var(--cold);
  color: var(--cold);
  background: color-mix(in srgb, var(--ink-0) 62%, transparent);
}

@keyframes cue-bob {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(10px);
  }
}

.manifesto {
  margin: 0;
  font-family: var(--font-serif); /* 题注走系统宋体栈，不再吃那枚 700 子集 */
  font-size: var(--fs-manifesto); /* 与站名 ≈4:1：再大就抢回主角位，lockup 散掉 */
  font-weight: var(--fw-normal); /* 400：粗宋在小号下会糊成一块 */
  line-height: var(--lh-manifesto);
  /* 题注字距拉宽读成碑帖；潮汐项保留但同比缩小（字已小，再拉长会散）。 */
  letter-spacing: calc(0.35em + var(--shift, 0) * 0.05em);
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
  /* 窄屏只收横向留白。底部垫量不再另开一档：它由 --peak-y 推出来，已经跟着视口形状走了
     （旧的那支 clamp(44px,12vh,110px) 是手动版的同一件事，横带一改自适应就会压上山尖）。 */
  .hero-text {
    padding-left: var(--space-2);
    padding-right: var(--space-2);
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
