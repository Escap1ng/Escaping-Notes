<script setup>
import { onMounted } from 'vue'
import SiteHeader from './components/SiteHeader.vue'
import SiteFooter from './components/SiteFooter.vue'
import { loadContent } from './lib/content.js'
import { loadMe } from './lib/auth.js'

onMounted(() => {
  loadContent()
  loadMe()
})
</script>

<template>
  <SiteHeader />
  <main id="main">
    <RouterView />
  </main>
  <SiteFooter />
</template>

<style scoped>
main {
  min-height: calc(100vh - 128px);
}
</style>
