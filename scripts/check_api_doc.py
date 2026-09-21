import re
import sys
import pathlib

"""docs/api.md 的端点表与 server/api.py 的路由双向对拍。

用法：python scripts/check_api_doc.py          漂移则退出码 1
自检：python scripts/check_api_doc.py --self   注入一条文档没写的新路由，确认它真的会报警
"""

DOC = pathlib.Path('docs/api.md')
SRC = pathlib.Path('server/api.py')
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


if __name__ == '__main__':
    src = SRC.read_text('utf-8')
    doc = DOC.read_text('utf-8')
    if '--self' in sys.argv:
        src += "\n        elif path == '/api/bogus-newthing':\n            pass\n"
    c, d = code_routes(src), doc_routes(doc)
    bad = report(sorted(c - d), sorted(d - c), len(c), len(d))
    print('FAIL' if bad else 'PASS')
    sys.exit(1 if bad else 0)
