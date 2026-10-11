// 项目详情页的 URL 口径。
// 不另设 slug 字段：后台的 PROJECTS 块只编辑 name|desc|year|url 四样，多一列就会在那次保存里丢掉，
// 所以 URL 直接从 name 现算——名字里的空格换成连字符，大小写原样保留（URL 区分大小写）。
// 代价与介绍字段同一条：在后台改名等于换了个 URL，旧链接落到 404 那态。
export const projectSlug = (name) => (name || '').trim().replace(/\s+/g, '-')

export const findProject = (list, slug) => list.find((p) => projectSlug(p.name) === slug) || null
