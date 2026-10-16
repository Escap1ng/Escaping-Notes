import re
import sys
import pathlib

# Windows 控制台默认 GBK，中文诊断会直接崩；强制 UTF-8，Linux/CI 上是空操作
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

"""文档引用完整性检查：抓两类必然会烂掉的东西。

1. 指向不存在的文件（例如 api.py 曾长期指向根本不存在的 docs/design.md）；
2. 指向不存在的 §节号（节号平移后最容易留下"见 §5.3"这种死链）。

§ 有个坑：本仓库的 § 记号是**重载**的——既指文档章节（design.md §3.1），
也指代码文件的内部分节横幅（site.css §6c、§11）。所以解析顺序是：
  引用点前 30 字内若显式写了 xxx.md / xxx.css / xxx.py → 用它作目标；
  否则默认当前文档；再否则"任意文档或代码里有这节"只作提示、不算失效。

用法：python scripts/check_doc_refs.py
"""

DOCS = ['README.md', 'README.en.md', 'docs/design.md', 'docs/manual.md']
CODE_SECTIONED = ['src/styles/site.css', 'src/lib/sky.js']

# 文档里作为"示例/待创建/构建产物"出现的路径，不是引用
EXAMPLES = {
    'my-first-post.md', 'xx.png', '/etc/systemd/system/escaping-notes-api.service',
    '/opt/escaping-notes/api.py', '/images/xx.png', 'XView.vue', 'Node.js',
    'package.js', 'vercel.js', 'users.js', 'data/users.js', 'server/data/records.js',
    'sitemap.xml', 'rss.xml', '/rss.xml', '/index.html', 'og.png', 'robots.txt',
    # 构建产物：静态壳写进 dist/ 的那份 404（仓库里没有这个文件，也不该有）
    '404.html', 'dist/404.html',
    'hello-world.md', 'en-display-serif-700.woff2',
}
SECTIONS = re.compile(r'§([0-9]+(?:\.[0-9]+)*)')
FILES = re.compile(r'([A-Za-z0-9_./-]+\.(?:md|py|mjs|cjs|vue|css|json|html|txt|xml|yaml|yml|woff2|png|ico|service|js))(?![a-z0-9])')
NAMED = re.compile(r'([A-Za-z0-9_./-]+\.(?:md|css|py|js|vue))')
RUNTIME = re.compile(r'(?:^|/)(?:server/)?data(?:/|$)|\b(?:records|users|sessions|messages|views|content|fragments)\.json$')   # 运行时数据，不进仓库


def headings(text):
    """文档标题里的编号 + 代码文件的 `---------- N. 标题 ----------` 横幅。"""
    out = {m.group(1) for m in re.finditer(r'^#{1,6}\s+([0-9]+(?:\.[0-9]+)*)[.、\s]', text, re.M)}
    out |= {m.group(1) for m in re.finditer(r'-{6,}\s*([0-9]+(?:\.[0-9]+)*)[.、\s]', text)}
    return out


def match_secs_key(named, secs):
    """把引用点写明的文件名对上 secs 的键（允许只写 site.css / design.md）。

    **只在该文件确有编号分节时才认它作目标**：`src/lib/sky.js` 这类文件虽在清单里却一条
    横幅都没有，若照样匹配，「归 `src/lib/sky.js`，见 §3.1」就会被错判成指向 sky.js。
    """
    ends = [k for k in secs if (k == named or k.endswith('/' + named)) and secs[k]]
    return ends[0] if len(ends) == 1 else None


# 文档会合法地提到"不存在/已删除"的文件（历史叙述），这些不是死引用
HIST_MARKS = ('原 ', '原`', '不存在', '已删除', '已退役', '曾指向', '废弃')

# 合并样式表之前那两份的名字，只允许活在日期化叙述里（design.md 第八/九轮、manual 里程碑）。
# 单列出来而不是靠 HIST_MARKS 的 14 字窗口去猜，是因为窗口一旦盖不住，这条就成了假死引用；
# 而真正的判据"这名字指向的文件在不在版本库里"由 tracked_files() 负责。
RETIRED_NAMES = {'neo.css', 'tokens.css'}

# design.md 引用的两支实测探针。脚本本身留在 `docs/assets/mock/measure/`，而那整个目录在
# .gitignore 里——所以从干净检出复算不了那两个数，这不是死链，是"证据在仓库外"。
# 把它们塞进 EXAMPLES 会混淆语义（那不是示例），单列一个口子，将来探针入库或文档改写即删。
OFFREPO_PROBES = {'quant-plate.mjs', 'line-probe.mjs'}


def tracked_files():
    """版本库里的文件清单。

    以前这里用 `Path('.').rglob('*')`，后果是检查会**被工作区里任何一份未跟踪的同名文件喂饱**：
    `vibe_images/plate-park-20260926/files/src/styles/neo.css` 这么一份 9MB 素材快照，
    就让整个仓库对已删除的 neo.css 的引用全部静默放行——而 by_base 是按 basename 匹配的，
    所以那份快照在哪个角落都无所谓。干净检出里根本没有它，检查器于是"在开发机上绿、在 CI 里红"
    或者反过来。改成问 git，量具才与它要核对的对象（版本库）同宽。
    """
    import subprocess

    try:
        out = subprocess.run(
            ['git', 'ls-files', '-z'], capture_output=True, timeout=20
        )
    except Exception as exc:                                    # 没有 git / 超时 / 非仓库
        print(f'  note       取不到 git ls-files（{exc}），退回工作区枚举——此时死引用不可信')
        return None
    if out.returncode != 0:
        print('  note       git ls-files 返回非 0，退回工作区枚举——此时死引用不可信')
        return None
    return {f.decode('utf-8', 'replace') for f in out.stdout.split(b'\0') if f}


def named_target(text, i, secs):
    """看 § 之前是否**紧贴着**写明了目标文件名。

    取前 40 字里最后一个文件名，且要求它与 § 之间只有空白/反引号/中文连接词，
    否则判为"没指明目标"（按当前文档处理）。这样 `docs/manual.md` §2.7 能正确归属，
    而「搬到 `site.css` §6c（它一直躺在 §5.4 …」里的 §5.4 不会被错认成指向 site.css。
    """
    near = text[max(0, i - 40):i]
    hits = list(NAMED.finditer(near))
    if not hits:
        return None
    last = hits[-1]
    if re.fullmatch(r'[\s``、，。:：()（）和与见的the]*', near[last.end():]):
        return match_secs_key(last.group(1), secs)
    return None


def check(mutate=False):
    root = pathlib.Path('.')
    tracked = tracked_files()
    if tracked is None:                                         # 取不到 git 时的退路
        tracked = {str(p).replace('\\', '/') for p in root.rglob('*') if p.is_file()
                   and 'node_modules' not in str(p) and not str(p).replace('\\', '/').startswith('.git/')}
    known = tracked
    by_base = {}
    for f in known:
        by_base.setdefault(pathlib.Path(f).name, set()).add(f)

    secs = {}
    for p in DOCS + CODE_SECTIONED:
        fp = root / p
        if fp.exists():
            secs[p] = headings(fp.read_text('utf-8'))
    any_sec = set().union(*secs.values()) if secs else set()

    bad_file, bad_sec, info_sec = [], [], []
    for p in DOCS:
        fp = root / p
        if not fp.exists():
            bad_file.append((p, f'<文档本身缺失: {p}>'))
            continue
        text = fp.read_text('utf-8')
        if mutate:
            # 探针：一条不存在的文件 + 一条不存在的节号，自检时两者都必须被抓到
            text += "\n参见 `docs/no-such-doc.md` 与 §99.9 的说法。\n"
        for m in FILES.finditer(text):
            f = m.group(1)
            base = f.rsplit('/', 1)[-1]
            if f.startswith(('http', 'www', './')) or f == pathlib.Path(p).name:
                continue
            # 「原 `BlackHole.vue`」「指向不存在的 docs/design.md」这类是历史/否定叙述，不是死引用
            i = m.start()
            if any(k in text[max(0, i - 14):i] for k in HIST_MARKS):
                continue
            if f in EXAMPLES or base in EXAMPLES or RUNTIME.search(f):
                continue
            if base in RETIRED_NAMES or base in OFFREPO_PROBES:                  # 见上面两段注释
                continue
            if f in known or base in by_base:
                continue
            bad_file.append((p, f))
        for m in SECTIONS.finditer(text):
            sec = m.group(1)
            target = named_target(text, m.start(), secs) or p
            have = secs.get(target, set())
            if sec in have:
                continue
            if sec in any_sec:
                owner = tuple(sorted(k for k, v in secs.items() if sec in v))
                info_sec.append((p, sec, owner))          # 跨文件引用，靠上下文判断，只提示
            else:
                bad_sec.append((p, sec, target))
    return bad_file, bad_sec, info_sec


def route_parity():
    """README 的路由表 vs src/router/index.js。

    本轮编辑 README 时我把 `/admin` 整行替换掉了，纯靠人眼发现不了——所以这条必须机器化。
    catch-all（/:pathMatch…）由表格下方注脚以"404"说明，不参与比对。
    """
    r = pathlib.Path('src/router/index.js')
    if not r.exists():
        return []
    code = {p for p in re.findall(r"path:\s*'([^']+)'", r.read_text('utf-8')) if 'pathMatch' not in p}
    problems = []
    for doc, sec in (('README.md', '页面地图'), ('README.en.md', 'Route Map')):
        t = pathlib.Path(doc).read_text('utf-8')
        m = re.search(r'## ' + sec + r'\n(.*?)(?=\n## |\Z)', t, re.S)
        if not m:
            problems.append((doc, '找不到路由表小节'))
            continue
        listed = set(re.findall(r'`(/[A-Za-z0-9:/.-]*)`', m.group(1)))
        for miss in sorted(code - listed):
            problems.append((doc, f'路由表漏了 {miss}（代码里有）'))
        for ghost in sorted(listed - code):
            problems.append((doc, f'路由表有过期条目 {ghost}（代码里已无此路由）'))
    return problems


if __name__ == '__main__':
    bf, bs, info = check(mutate='--self' in sys.argv)
    for p, f in sorted(set(bf)):
        print(f'  DEAD FILE  {p} -> {f}')
    for p, s, t in sorted(set(bs)):
        print(f'  DEAD §     {p} -> §{s}（{t} 里也没有这个节号）')
    for p, s, o in sorted(set(info)):
        print(f'  note       {p} -> §{s}  只在 {o} 里存在（跨文件引用，确认是否该写明文件名）')
    rp = route_parity()
    for p, msg in rp:
        print(f'  ROUTE MAP  {p} -> {msg}')
    print(f'\n失效路径 {len(set(bf))} / 失效节号 {len(set(bs))} / 跨文件提示 {len(set(info))} / 路由表漂移 {len(rp)}')
    sys.exit(1 if (bf or bs or rp) else 0)
