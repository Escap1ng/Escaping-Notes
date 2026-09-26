import argparse
import pathlib
import re
import subprocess
import sys

# Windows 控制台默认 GBK，中文诊断会直接崩；强制 UTF-8，Linux/CI 上是空操作
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

"""命名规约对拍：把 docs/design.md §9.7 写成的规则变成会红的检查。

规则只有写进代码才算约束；写在文档里的那些，三周后一定有人违反。这里检查的是**跟踪文件**
（git ls-files），未跟踪的临时素材与探针脚本不归它管——那类文件本该由 .gitignore 挡住。

EXEMPT 是**已知待办**，不是"这条规则不合理"。每一项都写清了什么在等谁：批次落地后必须把
对应条目删掉，留着就是假豁免。--self 会逐条验证规则本身抓得住违规（防"检查器永远通过"）。

用法：
    python scripts/check_naming.py            # 对拍当前仓库
    python scripts/check_naming.py --self     # 负向对照：每条规则必须能抓到我造的假
"""

# 目录标记重复：父目录名已经是文件名前缀（views/neo/NeoHomeView.vue 说两遍）
DIR_MARKER_DUP = ('neo',)
# 版本 / 临时标记：历史归 git，不该寄生在文件名里
TEMP_MARKS = re.compile(r'(-v\d+|[-_](?:final|new|old|temp|tmp|bak|mock|copy)\b)', re.I)
# 脚本动词族：前缀即职责，所以 scripts/ 不必再开子目录
SCRIPT_FAMILIES = ('build_', 'check_', 'sync_')
SCRIPT_DIRS = ('lib', 'data')

# 已知待办（批次落地后必须删除对应条目）
EXEMPT = {
    # components/neo/ 的前缀去重与 .neo-* 类名改名同属一次原子改动（改一半会全站掉样式），
    # 待底片那轮落地后一起做。见 docs/design.md §10 与本次改动的待办清单。
    'no-dir-marker-dup': {
        'src/components/neo/NeoCursor.vue',
        'src/components/neo/NeoSiteFooter.vue',
        'src/components/neo/NeoSiteHeader.vue',
    },
}

# 法律/惯例要求大写的文件，不算 kebab 违规
ASSET_ALLOW = re.compile(r'^(LICENSE|COPYING|README)([.-]|$)')

VUE = re.compile(r'^[A-Z][A-Za-z0-9]*\.vue$')                       # 组件 PascalCase
PY = re.compile(r'^[a-z][a-z0-9_]*\.py$')                           # Python PEP 8 snake_case
ASSET = re.compile(r'^[a-z0-9][a-z0-9._-]*$')                       # 静态资源全小写 kebab
STORE_KEY = re.compile(r"""localStorage\.(?:get|set|remove)Item\(\s*[`'"]([A-Za-z0-9_-]+)""")
BAD_STORE_PREFIX = re.compile(r'^(?!en-)')


def tracked_files():
    out = subprocess.run(['git', 'ls-files'], capture_output=True, text=True, check=True).stdout
    return [ln for ln in out.splitlines() if ln]


def posix(p):
    return str(p).replace('\\', '/')


def check_rules(files):
    """返回 [(规则名, 文件, 说明), ...]。"""
    bad = []

    def flag(rule, f, why):
        if f in EXEMPT.get(rule, ()):
            return
        bad.append((rule, f, why))

    for f in files:
        parts = f.split('/')
        base = parts[-1]
        parent = parts[-2] if len(parts) > 1 else ''

        # 1. 目录标记重复
        for m in DIR_MARKER_DUP:
            if parent == m and base.lower().startswith(m) and len(base) > len(m) + 1:
                flag('no-dir-marker-dup', f, f'父目录 `{m}/` 与文件名前缀重复')

        # 2. 版本 / 临时标记
        m = TEMP_MARKS.search(base)
        if m:
            flag('no-version-or-temp-mark', f, f'文件名带临时标记 `{m.group(1)}`')

        # 3. scripts/ 动词族
        if parts[0] == 'scripts' and len(parts) > 1:
            if len(parts) == 2 and not base.startswith(SCRIPT_FAMILIES):
                flag('script-verb-family', f, f'未以 {'/'.join(SCRIPT_FAMILIES)} 起手')
            if len(parts) > 2 and parts[1] not in SCRIPT_DIRS:
                flag('script-verb-family', f, f'scripts/{parts[1]}/ 不是已知族目录 {SCRIPT_DIRS}')

        # 4. 扩展名按运行方式分
        if parts[0] == 'src' and base.endswith(('.mjs', '.cjs')):
            flag('extension-by-runtime', f, 'src/ 走 Vite，应统一 .js / .vue')
        if parts[0] == 'scripts' and base.endswith('.js'):
            flag('extension-by-runtime', f, 'scripts/ 由 node 直接执行，应用 .mjs')

        # 5. 组件 PascalCase / Python snake_case
        if base.endswith('.vue') and not VUE.match(base):
            flag('case-by-file-type', f, '.vue 组件名应为 PascalCase')
        if base.endswith('.py') and not PY.match(base):
            flag('case-by-file-type', f, '.py 应为 PEP 8 snake_case')

        # 6. 静态资源全小写 kebab（构建产物不在跟踪范围，无需例外）
        if parts[0] in ('src', 'public', 'docs') and 'assets' in parts and not ASSET.match(base):
            if not ASSET_ALLOW.match(base):
                flag('kebab-static-assets', f, '资源名应为小写 kebab（不带大写/空格/哈希）')

    # 7. 浏览器存储键前缀
    for f in files:
        if not f.endswith(('.js', '.vue')) or not pathlib.Path(f).exists():
            continue
        text = pathlib.Path(f).read_text(encoding='utf-8', errors='replace')
        for key in STORE_KEY.findall(text):
            if BAD_STORE_PREFIX.match(key):
                flag('storage-key-prefix', f, f'存储键 `{key}` 未用 en- 前缀')

    return bad


def fixture_rules():
    """每条规则一个必定命中的假样本——规则失守在这里就当场红。"""
    return {
        'no-dir-marker-dup': ('src/components/neo/NeoThing.vue', 'src/views/neo/NeoThingView.vue'),
        'no-version-or-temp-mark': ('src/views/HomeView-v2.vue', 'src/lib/sky_final.js'),
        'script-verb-family': ('scripts/woothing.mjs', 'scripts/tools/png.mjs'),
        'extension-by-runtime': ('src/lib/thing.mjs', 'scripts/thing.js'),
        'case-by-file-type': ('src/views/home_view.vue', 'server/API.py'),
        'kebab-static-assets': ('src/assets/fonts/DisplaySerif.woff2',),
        'storage-key-prefix': (None,),
    }


def run_self_test():
    """负向对照：对每条规则喂假路径，要求它被抓出来。"""
    print('自测（负向对照）：')
    failures = []
    for rule, fixtures in fixture_rules().items():
        for fx in fixtures:
            if fx is None:                       # 存储键规则走内容而非路径
                tmp = pathlib.Path('.naming_self_probe.js')
                tmp.write_text("localStorage.setItem('bogus-key', '1')\n", encoding='utf-8')
                hits = [b for b in check_rules([posix(tmp)]) if b[0] == rule]
                tmp.unlink(missing_ok=True)
            else:
                hits = [b for b in check_rules([fx]) if b[0] == rule]
            ok = bool(hits)
            print(f'  {"ok  " if ok else "FAIL"} {rule:28s} ← {fx or "(存储键字面量)"}')
            if not ok:
                failures.append(rule)
    # 反向覆盖：真仓库里必须"干净"，否则说明自测样本与真实规则不是一回事
    real = check_rules(tracked_files())
    unexpected = {b[0] for b in real if b[1] not in EXEMPT.get(b[0], ())}
    print(f'  规则数 {len(fixture_rules())} / 失守 {len(failures)}')
    if failures:
        print('规则失守（检查器不会有人红）：', ', '.join(sorted(set(failures))))
        return 1
    if unexpected:
        print('注意：真实仓库已存在违规，先跑不带 --self 的对拍看清单：', ', '.join(sorted(unexpected)))
    print('PASS')
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--self', action='store_true', dest='self_test',
                    help='负向对照：每条规则必须能抓住造的假样本')
    args = ap.parse_args()

    if args.self_test:
        return run_self_test()

    files = tracked_files()
    bad = check_rules(files)
    exempt = sum(1 for f in files if any(f in v for v in EXEMPT.values()))
    print(f'tracked files: {len(files)}   violations: {len(bad)}   exempt(待办): {exempt}')
    for rule, f, why in sorted(bad):
        print(f'  {rule:28s} {f}  — {why}')
    if bad:
        print('FAIL — 改文件名用 `git mv` 保留历史，再跑 npm run check:docs 修引用')
        return 1
    print('PASS')
    return 0


if __name__ == '__main__':
    sys.exit(main())
