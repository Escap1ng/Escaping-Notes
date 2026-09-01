<script setup>
// 扫描 content/posts 下的 Markdown 文件（阶段二将解析 frontmatter 渲染为文章列表）
// query '?raw' 让 .md 以原始文本参与构建，避免被当作 JS 解析
const posts = Object.keys(
  import.meta.glob('/content/posts/*.md', { query: '?raw', import: 'default' })
)
  .map((path) => path.split('/').pop().replace(/\.md$/, ''))
  .sort()
</script>

<template>
  <section class="page">
    <p class="readout page-code">// MODULE_01 · POSTS</p>
    <h2 class="page-title">文章</h2>
    <p class="page-hint readout">
      文章系统（标签 / 字数 / 阅读时长）将于阶段二接通。当前在 content/posts 检测到的信号：
    </p>
    <ul class="post-list">
      <li v-for="slug in posts" :key="slug">
        <RouterLink class="link-item" :to="`/blog/${slug}`">/posts/{{ slug }}.md</RouterLink>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.post-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
  margin: var(--space-3) 0 0;
  padding: 0;
}
</style>
