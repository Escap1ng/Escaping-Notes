<script setup>
import GravityWell from '../components/GravityWell.vue'

// 逃逸目录：装置内坐标的键盘/降级入口，保留为独立区块
const index = [
  { code: '01', name: '文章', desc: '已入轨的逃逸粒子', to: '/blog' },
  { code: '02', name: '动态', desc: '井边近况', to: '/updates' },
  { code: '03', name: '歌单', desc: '井外回响 · QQ 音乐快照', to: '/records' },
  { code: '04', name: '项目', desc: '已部署的载荷', to: '/projects' },
  { code: '05', name: '留言', desc: '访客投进井里的信号', to: '/wall' },
  { code: '06', name: '关于', desc: '逃逸者档案', to: '/about' },
]
</script>

<template>
  <!-- 单根包裹：Transition 子组件需单一根节点 -->
  <div>
    <GravityWell />

    <section class="home-index-wrap">
      <p class="readout index-head">// escape_index · 逃逸目录</p>
      <nav class="home-index" aria-label="站点内容索引">
        <RouterLink v-for="item in index" :key="item.code" :to="item.to" class="index-row">
          <span class="readout index-code">{{ item.code }}</span>
          <span class="index-name">{{ item.name }}</span>
          <span class="readout index-desc">{{ item.desc }}</span>
          <span class="index-arrow" aria-hidden="true">→</span>
        </RouterLink>
      </nav>
    </section>
  </div>
</template>

<style scoped>
.home-index-wrap {
  max-width: 1080px;
  margin: 0 auto;
  padding: var(--space-4) var(--space-3);
}

.index-head {
  margin: 0 0 var(--space-2);
}

.index-row {
  display: grid;
  grid-template-columns: 4ch 8ch 1fr auto;
  align-items: baseline;
  gap: var(--space-2);
  padding: var(--space-2) 0;
  border-top: 1px solid var(--line);
}

.index-row:last-child {
  border-bottom: 1px solid var(--line);
}

.index-name {
  font-family: var(--font-serif);
  font-size: 22px;
  font-weight: 700;
  transition: color 0.2s;
}

.index-arrow {
  color: var(--text-1);
  transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), color 0.2s;
}

.index-row:hover .index-name,
.index-row:focus-visible .index-name {
  color: var(--signal);
}

.index-row:hover .index-arrow {
  transform: translateX(6px);
  color: var(--signal);
}

@media (max-width: 720px) {
  .index-row {
    grid-template-columns: 4ch 1fr auto;
  }
  .index-desc {
    display: none;
  }
}
</style>
