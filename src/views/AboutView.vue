<script setup>
import { site } from '../config/site.js'
</script>

<template>
  <section class="page">
    <p class="readout page-code">// MODULE_05 · OBSERVER</p>
    <h2 class="page-title">关于</h2>
    <dl class="about-list">
      <div class="about-row">
        <dt class="readout">OBSERVER</dt>
        <dd>{{ site.author }}</dd>
      </div>
      <div class="about-row">
        <dt class="readout">STATUS</dt>
        <dd>{{ site.bio }}</dd>
      </div>
      <div class="about-row">
        <dt class="readout">LOC</dt>
        <dd>{{ site.location }}</dd>
      </div>
      <div class="about-row">
        <dt class="readout">MAIL</dt>
        <dd>
          <a class="mail" :href="`mailto:${site.email}`">{{ site.email }}</a>
        </dd>
      </div>
    </dl>
    <p class="readout social-title">// SOCIAL</p>
    <ul class="link-list">
      <li v-for="s in site.socials" :key="s.label">
        <a class="link-item" :href="s.url" target="_blank" rel="noopener noreferrer">
          {{ s.label }}<span aria-hidden="true">↗</span>
        </a>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.about-list {
  margin: 0 0 var(--space-3);
}

.about-row {
  display: grid;
  grid-template-columns: 12ch 1fr;
  gap: var(--space-2);
  padding: var(--space-1) 0;
  border-top: 1px solid var(--line);
}

.about-row dt {
  padding-top: 4px;
}

.about-row dd {
  margin: 0;
}

.mail:hover {
  color: var(--signal);
}

.social-title {
  margin: 0 0 var(--space-2);
}

@media (max-width: 720px) {
  .about-row {
    grid-template-columns: 1fr;
    gap: 2px;
  }
}
</style>
