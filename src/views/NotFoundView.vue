<template>
  <section class="page">
    <p class="readout">// SIGNAL_LOST · 404</p>
    <h2 class="page-title">该轨迹不存在</h2>
    <p class="readout hint">你请求的信号未捕获，或已离轨。</p>
    <RouterLink class="link-item" to="/">返回井底</RouterLink>
  </section>
</template>

<style scoped>
.hint {
  margin: 0 0 var(--space-3);
}
</style>
