// 动态时间线：手写动态（src/data/updates.js）与已发布文章（lib/posts.js）在这里合并。
// 文章按 frontmatter 的 date 自动进动态，手写条目只记文章之外的事——发文不必再手补一条。
// 首页「最近动态」与 /updates 都用这一个函数，顺序、去重与文章条目的形状只有一份口径。
import { N } from '../data/narrative.js'
import { sortByDate } from './schema.js'

function fromPost(post) {
  return {
    key: `post:${post.slug}`,
    kind: 'post',
    date: post.date,
    text: `${N.feed.post}：《${post.title}》`,
    to: post.url || `/blog/${post.slug}`,
  }
}

export function mergeFeed(updates, posts) {
  const notes = (Array.isArray(updates) ? updates : []).map((u, i) => ({
    ...u,
    key: `note:${u.date}:${i}`,
    kind: 'note',
  }))
  const articles = (Array.isArray(posts) ? posts : []).map(fromPost)
  // 同一天的文章排在手写动态前：文章是内容，手写条目是注脚。
  // sortByDate 是全站唯一排序口径（文章列表 / 精选 / 映像柜 / RSS / sitemap 同一条），且为稳定排序。
  return sortByDate([...articles, ...notes])
}
