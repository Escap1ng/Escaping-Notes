<script setup>
// 新版页脚：宽屏一行三格（版权与许可 · 致谢 · 回到顶部），窄屏叠成三行居中。
// 作者名与协议都取自 src/config/site.js（经 lib/content.js 的 store）：名字关于页已经在读它，
// 页脚再抄一份字面量就是第二处事实，改名时必然分叉。年份运行时取，不写死。
import { N } from '../config/narrative.js'
import { content } from '../lib/content.js'

const year = new Date().getFullYear()

function toTop() {
  scrollTo({
    top: 0,
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
  })
}
</script>

<template>
  <footer class="en-footer">
    <p class="rights en-mono">
      <span>© {{ year }} {{ content.site.author }}</span>
      <a
        class="cc"
        :href="content.site.license.url"
        target="_blank"
        rel="license noopener noreferrer"
        :title="content.site.license.name + '：' + N.footer.licenseScope"
      >
        {{ content.site.license.name }}<span class="arrow" aria-hidden="true">↗</span>
      </a>
    </p>
    <span class="thanks">{{ N.footer.thanks }}</span>
    <button class="en-btn en-btn-sm en-btn-quiet" type="button" @click="toTop">
      {{ N.footer.top }}<span class="en-ico en-ico-up" aria-hidden="true">↑</span>
    </button>
  </footer>
</template>

<style scoped>
.en-footer {
  position: relative;
  z-index: 2;
  display: grid;
  /* 中间那格按内容宽，两边各 1fr——致谢因此是真正的居中，而不是被左右两块的宽窄推着走 */
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-top: 1px solid var(--line);
}

.thanks {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: var(--fs-xs);
  color: var(--text-1);
  text-align: center;
}

.rights {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin: 0;
}

.cc {
  color: var(--cold);
  transition: color var(--dur-fast);
}

.cc:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.cc .arrow {
  font-size: var(--fs-xs);
  color: var(--text-1);
  transition: transform var(--dur), color var(--dur-fast);
}

.cc:hover .arrow {
  transform: translate(var(--nudge), calc(-1 * var(--nudge)));
  color: var(--cold);
}

.en-footer > .en-btn {
  justify-self: end;
}

@media (max-width: 720px) {
  .en-footer {
    grid-template-columns: 1fr;
    justify-items: center;
    padding: var(--space-2);
  }
  .en-footer > .en-btn {
    justify-self: center;
  }
}
</style>
