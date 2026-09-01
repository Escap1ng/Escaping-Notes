<script setup>
import { useRoute } from 'vue-router'
const route = useRoute()
</script>

<template>
  <section class="page">
    <p class="readout page-code">// MODULE_01 · POST_VIEW</p>
    <h2 class="page-title">{{ route.params.slug }}</h2>
    <p class="page-hint readout">阅读视图（纸感栏宽 + 海拔进度）将于阶段二点亮。</p>
  </section>
</template>
