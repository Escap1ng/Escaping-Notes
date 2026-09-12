<script setup>
// 新版观测者：第一人称自述 + 事实发丝表 + 装备 + 社交/友链
import { content } from '../../lib/content.js'
import { friends } from '../../config/friends.js'
import { N } from '../../config/narrative.js'

const facts = [
  { k: 'OBSERVER', v: () => content.site.author },
  { k: 'STATUS', v: () => content.site.bio },
  { k: 'LOC', v: () => content.site.location },
  { k: 'COORDS', v: () => content.site.coords },
]
</script>

<template>
  <section class="neo-shell">
    <span class="neo-glyph glyph" aria-hidden="true">{{ N.glyph.about }}</span>

    <p class="neo-eyebrow">{{ N.sections.about }}</p>
    <h2 class="neo-h2">关于</h2>

    <p class="bio">{{ N.aboutBio }}</p>

    <dl class="facts">
      <div v-for="f in facts" :key="f.k" class="fact">
        <dt class="neo-mono">{{ f.k }}</dt>
        <dd>{{ f.v() }}</dd>
      </div>
      <div class="fact">
        <dt class="neo-mono">MAIL</dt>
        <dd>{{ content.site.email }}</dd>
      </div>
    </dl>

    <section class="block">
      <p class="neo-eyebrow">// GEAR · 装备</p>
      <ul class="chips">
        <li v-for="g in content.gear" :key="g"><span class="neo-chip static">{{ g }}</span></li>
      </ul>
    </section>

    <section class="block">
      <p class="neo-eyebrow">// SOCIAL</p>
      <ul class="links">
        <li v-for="s in content.site.socials" :key="s.label">
          <a class="link" :href="s.url" target="_blank" rel="noopener noreferrer">
            {{ s.label }}<span class="arrow" aria-hidden="true">↗</span>
          </a>
        </li>
      </ul>
    </section>

    <section class="block">
      <p class="neo-eyebrow">// FRIENDS · 友链</p>
      <ul class="links">
        <li v-for="f in friends" :key="f.url">
          <a class="link" :href="f.url" target="_blank" rel="noopener noreferrer">
            {{ f.label }}<span class="arrow" aria-hidden="true">↗</span>
          </a>
        </li>
      </ul>
    </section>
  </section>
</template>

<style scoped>
.neo-shell {
  padding-top: var(--page-top);
}

.glyph {
  top: var(--space-3);
  left: -8vw;
}

.bio {
  max-width: var(--measure);
  margin: 0 0 var(--space-3);
  font-family: var(--font-serif);
  font-size: var(--fs-xl);
  line-height: var(--lh-relaxed);
}

.facts {
  margin: 0 0 var(--space-3);
}

.fact {
  display: grid;
  grid-template-columns: 12ch 1fr;
  gap: var(--space-2);
  padding: var(--space-1) 0;
  border-top: 1px solid var(--line);
}

.fact:last-child {
  border-bottom: 1px solid var(--line);
}

.fact dt {
  padding-top: var(--space-0);
}

.fact dd {
  margin: 0;
  font-size: var(--fs-md);
  overflow-wrap: anywhere;
}

.block {
  margin-bottom: var(--space-3);
}

.block .neo-eyebrow {
  margin-bottom: var(--space-2);
}

.chips {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.chips .static {
  cursor: default;
}

.links {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-0);
}

.link {
  position: relative;
  display: inline-flex;
  align-items: baseline;
  gap: var(--space-1);
  width: fit-content;
  font-family: var(--font-display);
  font-size: var(--fs-lg);
  font-weight: var(--fw-bold);
  color: var(--text-0);
  text-decoration: none;
  transition: color 0.22s;
}

/* 下划线由左向右画出 */
.link::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -3px;
  height: 1px;
  background: currentColor;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.32s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.link:hover::after {
  transform: scaleX(1);
}

.link:hover {
  color: var(--cold);
}

.arrow {
  font-size: var(--fs-xs);
  color: var(--text-1);
  transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), color 0.2s;
}

.link:hover .arrow {
  transform: translate(3px, -3px);
  color: var(--cold);
}

@media (max-width: 720px) {
  .fact {
    grid-template-columns: 1fr;
    gap: var(--space-0);
  }
  .bio {
    font-size: var(--fs-lg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .link:hover .arrow {
    transform: none;
  }
}
</style>
