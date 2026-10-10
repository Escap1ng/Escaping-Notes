// 播放器种子曲单：/audio/ 下的自托管 mp3（仓库内 public/audio/，随构建进 dist）
// 服务器上线后主路径是 /admin 的 PLAYLIST 块（title|artist|file），此处仅作种子与离线/镜像回退
export const playlist = [
  { title: 'Secrets', artist: 'OneRepublic', file: '/audio/secrets-onerepublic.mp3' },
  { title: '悬溺', artist: '葛东琪', file: '/audio/xuanni-gedongqi.mp3' },
]
