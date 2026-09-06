// 新版(neo)/旧版(legacy) 双皮肤 store：切换是界面代际切换，见 docs/design.md §12
import { reactive } from 'vue'

export const skin = reactive({
  mode: localStorage.getItem('en-skin') === 'legacy' ? 'legacy' : 'neo',
})

export function applySkin(m) {
  skin.mode = m
  document.documentElement.dataset.skin = m
  localStorage.setItem('en-skin', m)
}

export function toggleSkin() {
  applySkin(skin.mode === 'neo' ? 'legacy' : 'neo')
}
