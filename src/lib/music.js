// 全局播放器状态总线：顶栏「音乐」按钮与 MusicPlayer 组件共享
import { reactive } from 'vue'

export const music = reactive({ playing: false, available: false })

export function requestMusicToggle() {
  window.dispatchEvent(new Event('en-music-toggle'))
}
