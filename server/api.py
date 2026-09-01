#!/usr/bin/env python3
"""Escaping Notes · 极简后端（零依赖，仅 Python3 标准库）

为纯静态站点提供跨设备共享数据：留言墙 + 浏览量。
- 存储：JSON 文件（server/data/），无数据库
- 监听：仅 127.0.0.1:8787，由 nginx 反代 /api/ 暴露，不直接对外
- 防滥用：长度限制 + 每 IP 每分钟 10 次 POST 限流
部署步骤见 docs/manual.md §4.3 第 7 步。
"""
import json
import re
import time
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

HOST, PORT = '127.0.0.1', 8787
DATA_DIR = Path(__file__).resolve().parent / 'data'
DATA_DIR.mkdir(exist_ok=True)
MSG_FILE = DATA_DIR / 'messages.json'
VIEW_FILE = DATA_DIR / 'views.json'

LOCK = threading.Lock()
RATE = {}  # ip -> [timestamp]
SLUG_RE = re.compile(r'^[a-z0-9-]{1,60}$')


def load(path, default):
    try:
        return json.loads(path.read_text('utf-8'))
    except Exception:
        return default


def save(path, obj):
    tmp = path.with_suffix('.tmp')
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2), 'utf-8')
    tmp.replace(path)  # 原子替换，避免写坏


class Handler(BaseHTTPRequestHandler):
    server_version = 'EscapingNotesAPI/1'

    def _json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_body(self):
        length = int(self.headers.get('Content-Length', 0) or 0)
        raw = self.rfile.read(min(length, 8192))
        try:
            return json.loads(raw or b'{}')
        except Exception:
            return None

    def _rate_limited(self):
        ip = self.client_address[0]
        now = time.time()
        RATE[ip] = [t for t in RATE.get(ip, []) if now - t < 60]
        if len(RATE[ip]) >= 10:
            return True
        RATE[ip].append(now)
        return False

    def do_GET(self):
        path = urlparse(self.path).path
        if path == '/api/messages':
            with LOCK:
                self._json(200, load(MSG_FILE, [])[-100:])
        elif path == '/api/stats':
            with LOCK:
                self._json(200, load(VIEW_FILE, {}))
        elif path == '/api/health':
            self._json(200, {'ok': True})
        else:
            self._json(404, {'error': 'not found'})

    def do_POST(self):
        if self._rate_limited():
            self._json(429, {'error': 'too fast'})
            return
        data = self._read_body()
        if data is None:
            self._json(400, {'error': 'bad json'})
            return
        path = urlparse(self.path).path

        if path == '/api/messages':
            name = str(data.get('name', ''))[:24].strip() or '匿名逃逸者'
            text = str(data.get('text', ''))[:200].strip()
            if not text:
                self._json(400, {'error': 'empty'})
                return
            with LOCK:
                msgs = load(MSG_FILE, [])
                msgs.append({'name': name, 'text': text, 'ts': int(time.time())})
                save(MSG_FILE, msgs[-500:])
            self._json(200, {'ok': True})

        elif path == '/api/view':
            slug = str(data.get('slug', ''))
            if not SLUG_RE.match(slug):
                self._json(400, {'error': 'bad slug'})
                return
            with LOCK:
                views = load(VIEW_FILE, {})
                views[slug] = views.get(slug, 0) + 1
                save(VIEW_FILE, views)
            self._json(200, {'ok': True, 'count': views[slug]})

        else:
            self._json(404, {'error': 'not found'})

    def log_message(self, fmt, *args):
        pass  # 保持安静；访问日志以 nginx 为准


if __name__ == '__main__':
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
