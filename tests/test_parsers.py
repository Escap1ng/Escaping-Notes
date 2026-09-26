"""server/api.py 的解析口径 + 与前端那份的跨语言对拍（结构方案 S2 / 缺陷 T3 的守门人）

为什么要跨语言对拍：同一篇文章现在有三份解析实现（api.py、src/lib/frontmatter.js、
scripts/build_seo.mjs）。只在各自语言内部测，口径漂了没人知道——漂的表现是"同一条
文章在自有域名下与 Pages 镜像上显示不同"，那种问题最难查。

api.py 在导入时会 mkdir(DATA)，所以先把 SITE_DATA 指到临时目录再导入，仓库零污染。

跑法：python -m unittest discover -s tests -p 'test_*.py'（或 npm test，两个 runner 都带）
"""
import json
import os
import pathlib
import subprocess
import sys
import tempfile
import unittest

# Windows 控制台默认 GBK：用例名里的中文一 print 就崩，强制 UTF-8（Linux/CI 上是空操作）
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

ROOT = pathlib.Path(__file__).resolve().parent.parent
_tmp = tempfile.mkdtemp(prefix='en-test-data-')
os.environ['SITE_DATA'] = _tmp                       # 必须在 import api 之前
sys.path.insert(0, str(ROOT / 'server'))
import api                                           # noqa: E402

FM = ROOT / 'src' / 'lib' / 'frontmatter.js'

# 交给 Node 跑的一份：读 fixtures JSON，输出 [{title,date,tags,words}]
_JS_DRIVER = """
const fs = require('fs');
const { pathToFileURL } = require('node:url');
const [, , fxPath, modPath] = process.argv;
(async () => {
  const m = await import(pathToFileURL(modPath).href);
  const fx = JSON.parse(fs.readFileSync(fxPath, 'utf8'));
  const out = fx.map((o) => {
    const { meta, body } = m.parseFrontmatter(o.raw);
    return { title: meta.title, date: meta.date, tags: meta.tags, words: m.stats(body).words };
  });
  process.stdout.write(JSON.stringify(out));
})();
"""


def js_side(raws):
    """跑一次 Node，拿前端那份的解析结果。"""
    with tempfile.TemporaryDirectory() as d:
        fx = pathlib.Path(d) / 'fx.json'
        drv = pathlib.Path(d) / 'drv.cjs'
        fx.write_text(json.dumps([{'raw': r} for r in raws]), encoding='utf-8')
        drv.write_text(_JS_DRIVER, encoding='utf-8')
        res = subprocess.run(['node', str(drv), str(fx), str(FM)],
                             capture_output=True, text=True, encoding='utf-8')
        if res.returncode != 0:
            raise RuntimeError(f'node 侧失败：{res.stderr[:400]}')
        return json.loads(res.stdout)


def py_side(raws):
    out = []
    for i, raw in enumerate(raws):
        f = api.POSTS_DIR / f'fixture-{i}.md'
        f.write_text(raw, encoding='utf-8', newline='')
        meta, body = api.parse_post(f)
        out.append({'title': meta['title'], 'date': meta['date'],
                    'tags': meta['tags'], 'words': api.post_words(body)})
    return out


GOOD = [
    '---\ntitle: 甲\ndate: 2026-09-01\ntags: [随笔]\nsummary: s\n---\n掷墨入渊\n',
    '---\r\ntitle: 乙\r\ndate: 2026-09-02\r\ntags: [技术, "设计"]\r\nsummary: s\r\n---\r\n正文\r\n',
    '---\ntitle: 丙: 带冒号\ndate: 2026-09-03\ntags: []\nsummary: \n---\n只有正文\n',
]


class TestParsers(unittest.TestCase):
    def test_api_py_handles_crlf(self):
        """api.py 的 FRONT_RE 写了 \\r?，CRLF 检出的文章照常解析。"""
        f = api.POSTS_DIR / 'crlf.md'
        f.write_text('---\r\ntitle: 丁\r\ndate: 2026-09-04\r\n---\r\n正文\r\n', encoding='utf-8', newline='')
        meta, body = api.parse_post(f)
        self.assertEqual(meta['title'], '丁')
        self.assertEqual(meta['date'], '2026-09-04')
        self.assertNotIn('---', body)

    def test_words_counts_cjk_per_character(self):
        self.assertEqual(api.post_words('掷 墨\n入渊'), 4)
        self.assertEqual(api.post_words(''), 0)

    def test_parity_on_wellformed_posts(self):
        """三份实现必须给同一个答案——这是对拍的正题。"""
        self.assertEqual(py_side(GOOD), js_side(GOOD))

    @unittest.expectedFailure
    def test_title_default_still_diverges(self):
        """已知缺陷：缺 title 时 api.py 回落文件名，frontmatter.js 回落空串。

        于是同一篇文章在自有域名（走 API）与 Pages 镜像（走打包回退）上标题不同。
        收口由结构方案 S2 负责；S2 落地后这一条会 XPASS，届时把它删掉。
        """
        raw = '---\ndate: 2026-09-05\n---\n正文\n'
        p, j = py_side([raw])[0], js_side([raw])[0]
        self.assertEqual(p['title'], j['title'])


if __name__ == '__main__':
    unittest.main()
