import re
import sys
import pathlib

# Windows 控制台默认 GBK，中文诊断会直接崩；强制 UTF-8，Linux/CI 上是空操作
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

"""docs/api.md 的端点表与 server/api.py 的路由双向对拍；外加后端错误码与前端提示表的对拍。

用法：python scripts/check_api_doc.py          漂移则退出码 1
自检：python scripts/check_api_doc.py --self   注入一条文档没写的新路由与一个新错误码，确认它真的会报警
"""

DOC = pathlib.Path('docs/api.md')
SRC = pathlib.Path('server/api.py')
NARR = pathlib.Path('src/config/narrative.js')
PREFIX = r'/(?:api|uploads|blog|rss\.xml)'


def canon(p):
    """规整成可比对形：/api/users/([a-z0-9]+)/role 与 /api/users/{id}/role 都 -> /api/users/{}/role"""
    p = re.sub(r'\{[^{}]*\}', '{}', p)                       # {id} {slug}
    p = re.sub(r'\((?:\?P<[^>]+>)?[^()]*\)', '{}', p)        # 捕获组
    # api.py 里 /blog/[a-z0-9-]+ 是**不带捕获组**的写法，只处理 (...) 会漏掉它
    p = re.sub(r'\[[^\]]*\]\+?', '{}', p)                    # 裸字符类
    p = p.replace('\\Z', '').replace('^', '').replace('$', '')
    p = re.sub(r'\{}+', '{}', p)
    p = re.sub(r'/+', '/', p).rstrip('/')
    return p or '/'


def code_routes(src):
    out = set()
    for m in re.finditer(r"path == '(/[^']*)'", src):
        out.add(m.group(1))
    for m in re.finditer(r"re\.match\(r?'(\^[^']+)'", src):
        out.add(m.group(1))
    return {canon(x) for x in out if re.match(PREFIX, x.lstrip('^').rstrip('$'))}


def doc_routes(doc):
    """只认 §2「端点总表」里的反引号路径。

    散文里也会出现 `/blog/*`、`fetch('/api/upload')` 这类写法，它们不是端点声明；
    全文扫会把比对结果变成噪声，所以把文档侧的扫描范围钉在 §2 这一节。
    """
    m = re.search(r'^## 2\..*?(?=^## )', doc, re.S | re.M)
    if not m:
        raise SystemExit('文档里找不到 §2 —— 对拍失效，请先修文档结构')
    return {canon(x) for x in re.findall(r'`(' + PREFIX + r'[^`\n]*)`', m.group(0))}


def report(only_code, only_doc, n_code, n_doc):
    print(f'code routes: {n_code}   doc endpoints: {n_doc}')
    for x in only_code:
        print('  MISSING FROM DOC:', x)
    for x in only_doc:
        print('  NOT IN CODE     :', x)
    return bool(only_code or only_doc)


# ---------- 第二台对拍：后端错误码 ⇄ 前端提示表 ----------
# api.md §6 的 T2 记的是「所有失败塌成同一句提示」。收口之后要防的是它的回归：
# 后端新增一个 error 码而 narrative.js 忘了配，用户就又只能看到无信息的「请求未成功」。
def code_errors(src):
    return set(re.findall(r"'error':\s*'([^']+)'", src))


def mapped_errors(narr):
    m = re.search(r'errors:\s*\{(.*?)\n  \}', narr, re.S)
    if not m:
        raise SystemExit('narrative.js 里找不到 errors 表 —— 对拍失效，先确认字段还在')
    # 键有两种写法：含空格的必须带引号，其余是裸标识符
    return {(a or b) for a, b in re.findall(r"(?:'([^']*)'|([A-Za-z][\w -]*)):\s*'", m.group(1))}


def report_errors(codes, mapped):
    miss = sorted(codes - mapped)
    ghost = sorted(mapped - codes - {'offline', 'unknown'})
    print(f'error codes: {len(codes)}   mapped prompts: {len(mapped)}')
    for x in miss:
        print('  错误码没有对应提示（会回落成无信息那句）:', x)
    for x in ghost:
        print('  提示表里的码在 api.py 已不存在        :', x)
    return bool(miss or ghost)


if __name__ == '__main__':
    src = SRC.read_text('utf-8')
    doc = DOC.read_text('utf-8')
    narr = NARR.read_text('utf-8')
    if '--self' in sys.argv:
        # 负向对照：注入「代码里有、文档没写」的路由，与「后端会返回、提示表没配」的错误码
        src += "\n        elif path == '/api/bogus-newthing':\n            pass\n"
        src += "\n        return 400, {'error': 'bogus-code'}\n"
    c, d = code_routes(src), doc_routes(doc)
    bad = report(sorted(c - d), sorted(d - c), len(c), len(d))
    bad |= report_errors(code_errors(src), mapped_errors(narr))
    print('FAIL' if bad else 'PASS')
    sys.exit(1 if bad else 0)
