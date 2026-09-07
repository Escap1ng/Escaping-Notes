<template>
  <section class="neo-shell nf">
    <span class="neo-glyph glyph" aria-hidden="true">{{ N.glyph.nf }}</span>

    <div class="plate" aria-hidden="true">
      <span class="star"></span>
      <span class="beam cross"></span>
      <span class="beam diag"></span>
    </div>

    <h2 class="neo-h2 title">{{ N.nf.title }}</h2>
    <p class="lede">{{ N.nf.text }}</p>

    <div class="cta">
      <RouterLink class="neo-btn neo-btn-primary" to="/">{{ N.nf.home }}</RouterLink>
      <RouterLink class="neo-btn neo-btn-ghost" to="/blog">{{ N.nf.blog }}</RouterLink>
    </div>
  </section>
</template>

<script setup>
import { N } from '../../config/narrative.js'
</script>

<style scoped>
.nf {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 78vh;
  padding-top: 120px;
}

.glyph {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -58%);
}

/* 长曝光取景框：环带星轨弧残卷 + 一颗不在编的暗星（锥形衍射芒） */
.plate {
  position: relative;
  width: 220px;
  height: 220px;
  margin-bottom: var(--space-4);
  border-radius: 50%;
  /* conic 划出断续星轨弧段，再以 radial mask 挖成同心环带（呼应首页 BANDS） */
  background: conic-gradient(
    from 18deg,
    var(--cold) 0.02turn,
    transparent 0.14turn,
    transparent 0.18turn,
    var(--white) 0.3turn,
    transparent 0.42turn,
    transparent 0.46turn,
    var(--cold) 0.6turn,
    var(--hot) 0.7turn,
    transparent 0.84turn
  );
  -webkit-mask: radial-gradient(
    closest-side,
    transparent 0 29%,
    #000 31% 38%,
    transparent 40% 52%,
    #000 54% 61%,
    transparent 63% 74%,
    #000 76% 82%,
    transparent 84%
  );
  mask: radial-gradient(
    closest-side,
    transparent 0 29%,
    #000 31% 38%,
    transparent 40% 52%,
    #000 54% 61%,
    transparent 63% 74%,
    #000 76% 82%,
    transparent 84%
  );
  filter: blur(0.5px) saturate(1.1);
  opacity: 0.88;
  animation: plate-spin 52s linear infinite;
}

@keyframes plate-spin {
  to {
    transform: rotate(360deg);
  }
}

/* 中心暗星：冷色光晕加白核 */
.star {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 9px;
  height: 9px;
  margin: -4.5px 0 0 -4.5px;
  border-radius: 50%;
  background: var(--white);
  box-shadow:
    0 0 10px 2px color-mix(in srgb, var(--cold) 85%, transparent),
    0 0 26px 9px color-mix(in srgb, var(--cold) 32%, transparent);
}

/* 锥形衍射芒：中心最亮、沿芒长渐隐，主十字 + 斜十字（副 1:0.45） */
.beam {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 120px;
  height: 120px;
  margin: -60px 0 0 -60px;
  pointer-events: none;
  background:
    linear-gradient(
        to right,
        transparent,
        color-mix(in srgb, var(--white) 55%, transparent) 50%,
        transparent
      )
      no-repeat 50% 50% / 100% 1px,
    linear-gradient(
        to bottom,
        transparent,
        color-mix(in srgb, var(--white) 55%, transparent) 50%,
        transparent
      )
      no-repeat 50% 50% / 1px 100%;
}

.beam.diag {
  width: 54px;
  height: 54px;
  margin: -27px 0 0 -27px;
  opacity: 0.75;
  transform: rotate(45deg);
}

.title {
  margin-bottom: 6px;
}

.lede {
  margin: 0 0 var(--space-3);
  max-width: 34ch;
  color: var(--text-1);
  font-size: 15px;
}

.cta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

@media (prefers-reduced-motion: reduce) {
  .plate {
    animation: none;
  }
}
</style>
