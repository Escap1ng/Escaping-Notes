// 浏览器存储键的唯一定义处。
// 为什么要收口：这些键此前散在 6 个文件里，同一个键被两处拼成不同名字时不会报错，
// 只会"用户设置静默丢失"。收口之后 check:naming 能查出字面量漂移，改名也只需改这里。
// 命名口径见 docs/design.md §9.7：统一 `en-` 前缀 + 概念名。

const PREFIX = 'en-'

export const KEYS = {
  token: `${PREFIX}token`, // 登录令牌，api.js 每次请求随 Authorization 头带上
  theme: `${PREFIX}theme`, // 主题：'well' 深色 / 'out' 浅色
  volume: `${PREFIX}vol`, // 播放器音量 0–1
  blur: `${PREFIX}plate-blur`, // 底片模糊 0–12px（0 = 清晰）。index.html 的首帧内联脚本按同样
  // 的字面量读它，改这里必须同步改那边，否则进页会先清晰一闪。
  views: `${PREFIX}views-`, // 阅读数回退（累计），实际键 = 该前缀 + slug
  viewed: `${PREFIX}viewed-`, // 本次会话是否已计过数，只活到关标签页，所以放 sessionStorage
}

// index.html 首帧内联脚本要按同样的键预置主题，防闪烁；那边只能写字面量，
// 所以这里把口径写成一条注释并由 tests 之外的人核对——改值时必须同步改 index.html。
export const THEME_DEFAULT = 'well'

export function read(key, fallback = null, area = localStorage) {
  try {
    const v = area.getItem(key)
    return v === null ? fallback : v
  } catch {
    // 隐私模式/存储被禁用时不炸站，按"没存过"处理
    return fallback
  }
}

export function write(key, value, area = localStorage) {
  try {
    if (value === null || value === undefined) area.removeItem(key)
    else area.setItem(key, String(value))
  } catch {
    /* 写不进去就不写：这些都只是偏好与回退计数，丢了不影响内容可读 */
  }
}

// 只有这一处需要按 slug 拼键，所以拼法也收在这里，调用点不出现前缀字面量
export function viewsKey(slug) {
  return `${KEYS.views}${slug}`
}

export function viewedKey(slug) {
  return `${KEYS.viewed}${slug}`
}
