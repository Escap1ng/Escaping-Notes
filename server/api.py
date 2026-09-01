#!/usr/bin/env python3
"""Escaping Notes · 极简后端 v2（零依赖，仅 Python3 标准库）

能力：注册/登录/会话/三角色（访客/管理员/站长）、文章 CRUD、留言墙、计数、
meta 注入（/ 与 /blog/:slug 服务端改写 index.html 的 title/OG/canonical）、RSS。
- 存储：JSON 文件 + data/posts/*.md，无数据库
- 监听：仅 127.0.0.1:8787，由 nginx 反代 /api/、/、/blog/、/rss.xml
- 安全：pbkdf2_hmac 加盐哈希、会话过期、每 IP 限流、长度限制
部署见 docs/manual.md §4.3；接口设计见 docs/design.md §7。
"""
import hashlib
import html
import json
import os
import re
import secrets
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

HOST, PORT = '127.0.0.1', 8787
BASE = Path(__file__).resolve().parent
DATA = BASE / 'data'
POSTS_DIR = DATA / 'posts'
DIST = BASE.parent / 'dist'
SITE_URL = os.environ.get('SITE_URL', 'https://escaping.top')
DATA.mkdir(exist_ok=True)
POSTS_DIR.mkdir(exist_ok=True)

USERS_F = DATA / 'users.json'
SESS_F = DATA / 'sessions.json'
MSG_F = DATA / 'messages.json'
VIEW_F = DATA / 'views.json'
CONTENT_F = DATA / 'content.json'
UPLOADS = DATA / 'uploads'
UPLOADS.mkdir(exist_ok=True)
CONTENT_KEYS = {'site', 'updates', 'links', 'projects', 'gear', 'playlist', 'whispers'}
CTYPES = {'.mp3': 'audio/mpeg', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
          '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml'}

LOCK = threading.RLock()  # 可重入：setup/register 外层持锁时 new_session 需再入
RATE = {}
SLUG_RE = re.compile(r'^[a-z0-9-]{1,60}$')
USER_RE = re.compile(r'^[a-z0-9_-]{3,20}$')
FRONT_RE = re.compile(r'^---\n(.*?)\n---\n?(.*)$', re.S)


# ---------- 存储 ----------
def load(path, default):
    try:
        return json.loads(path.read_text('utf-8'))
    except Exception:
        return default


def save(path, obj):
    tmp = path.with_suffix('.tmp')
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2), 'utf-8')
    tmp.replace(path)


# ---------- 密码与会话 ----------
def hash_pw(pw):
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac('sha256', pw.encode('utf-8'), bytes.fromhex(salt), 120_000).hex()
    return f'{salt}${dk}'


def check_pw(pw, stored):
    try:
        salt, dk = stored.split('$', 1)
    except ValueError:
        return False
    got = hashlib.pbkdf2_hmac('sha256', pw.encode('utf-8'), bytes.fromhex(salt), 120_000).hex()
    return secrets.compare_digest(got, dk)


def new_session(uid):
    tok = secrets.token_urlsafe(32)
    with LOCK:
        s = load(SESS_F, {})
        s[tok] = {'uid': uid, 'exp': int(time.time()) + 7 * 86400}
        save(SESS_F, s)
    return tok


# ---------- 文章（frontmatter md） ----------
def parse_post(path):
    text = path.read_text('utf-8')
    m = FRONT_RE.match(text)
    meta = {'tags': []}
    body = text
    if m:
        body = m.group(2)
        for line in m.group(1).splitlines():
            if ':' not in line:
                continue
            k, v = line.split(':', 1)
            k, v = k.strip(), v.strip()
            if k == 'tags':
                v = v.strip('[] ')
                meta['tags'] = [t.strip().strip('\'"') for t in v.split(',') if t.strip()] if v else []
            else:
                meta[k] = v
    meta.setdefault('title', path.stem)
    meta.setdefault('date', '1970-01-01')
    meta.setdefault('summary', '')
    return meta, body


def post_words(body):
    return len(re.sub(r'\s', '', body))


def list_posts():
    out = []
    for p in POSTS_DIR.glob('*.md'):
        meta, body = parse_post(p)
        words = post_words(body)
        out.append({**meta, 'slug': p.stem, 'words': words,
                    'minutes': max(1, round(words / 400))})
    out.sort(key=lambda x: x.get('date', ''), reverse=True)
    return out


def write_post(slug, meta, body):
    tags = ', '.join(meta.get('tags', []))
    head = (f"---\ntitle: {meta['title']}\ndate: {meta.get('date', time.strftime('%Y-%m-%d'))}\n"
            f"tags: [{tags}]\nsummary: {meta.get('summary', '')}\n---\n\n")
    (POSTS_DIR / f'{slug}.md').write_text(head + body, 'utf-8')


# ---------- meta 注入 ----------
def inject(html_doc, title, desc, url):
    e = html.escape
    html_doc = re.sub(r'<title>.*?</title>', f'<title>{e(title)}</title>', html_doc, count=1)
    html_doc = re.sub(r'(<meta name="description" content=")[^"]*(")',
                      lambda m: m.group(1) + e(desc) + m.group(2), html_doc, count=1)
    html_doc = re.sub(r'(<meta property="og:title" content=")[^"]*(")',
                      lambda m: m.group(1) + e(title) + m.group(2), html_doc, count=1)
    html_doc = re.sub(r'(<meta property="og:description" content=")[^"]*(")',
                      lambda m: m.group(1) + e(desc) + m.group(2), html_doc, count=1)
    if '<link rel="canonical"' in html_doc:
        html_doc = re.sub(r'(<link rel="canonical" href=")[^"]*(")',
                          lambda m: m.group(1) + e(url) + m.group(2), html_doc, count=1)
    else:
        html_doc = html_doc.replace('</head>', f'  <link rel="canonical" href="{e(url)}" />\n</head>', 1)
    return html_doc


def serve_doc(path):
    try:
        doc = (DIST / 'index.html').read_text('utf-8')
    except Exception:
        return 404, 'text/plain; charset=utf-8', b'not found'
    m = re.match(r'^/blog/([a-z0-9-]+)$', path)
    if m:
        post = next((p for p in list_posts() if p['slug'] == m.group(1)), None)
        if post:
            doc = inject(doc, f"{post['title']} · Escaping Notes",
                         post.get('summary') or '日常是引力，把我拉回井底；笔记是逃逸，送我抵达井外。',
                         f"{SITE_URL}/blog/{post['slug']}")
    return 200, 'text/html; charset=utf-8', doc.encode('utf-8')


# ---------- RSS ----------
def rss_xml():
    items = []
    for p in list_posts()[:20]:
        try:
            pub = time.strftime('%a, %d %b %Y 00:00:00 GMT', time.strptime(p.get('date', ''), '%Y-%m-%d'))
        except ValueError:
            pub = ''
        items.append(
            '<item>'
            f'<title>{html.escape(p["title"])}</title>'
            f'<link>{SITE_URL}/blog/{p["slug"]}</link>'
            f'<guid isPermaLink="true">{SITE_URL}/blog/{p["slug"]}</guid>'
            f'<pubDate>{pub}</pubDate>'
            f'<description>{html.escape(p.get("summary", ""))}</description>'
            '</item>')
    body = ''.join(items)
    return (f'<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>'
            f'<title>Escaping Notes</title><link>{SITE_URL}</link>'
            '<description>日常是引力，把我拉回井底；笔记是逃逸，送我抵达井外。</description>'
            f'{body}</channel></rss>').encode('utf-8')


class Handler(BaseHTTPRequestHandler):
    server_version = 'EscapingNotesAPI/2'

    # ---------- 工具 ----------
    def _json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _raw(self, code, ctype, body):
        self.send_response(code)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _body(self):
        length = int(self.headers.get('Content-Length', 0) or 0)
        raw = self.rfile.read(min(length, 1_000_000))
        try:
            return json.loads(raw or b'{}')
        except Exception:
            return None

    def _rate_limited(self):
        ip = self.client_address[0]
        now = time.time()
        RATE[ip] = [t for t in RATE.get(ip, []) if now - t < 60]
        if len(RATE[ip]) >= 30:
            return True
        RATE[ip].append(now)
        return False

    def _user(self):
        h = self.headers.get('Authorization', '')
        if not h.startswith('Bearer '):
            return None
        with LOCK:
            s = load(SESS_F, {}).get(h[7:])
        if not s or s['exp'] < time.time():
            return None
        u = next((x for x in load(USERS_F, []) if x['id'] == s['uid']), None)
        return u if u and not u.get('ban') else None

    def _pub(self, u):
        return {'id': u['id'], 'username': u['username'], 'nickname': u['nickname'], 'role': u['role']}

    # ---------- GET ----------
    def do_GET(self):
        path = urlparse(self.path).path
        if path == '/api/health':
            self._json(200, {'ok': True})
        elif path == '/api/bootstrap':
            self._json(200, {'needsSetup': len(load(USERS_F, [])) == 0})
        elif path == '/api/me':
            u = self._user()
            self._json(200, self._pub(u)) if u else self._json(401, {'error': 'unauthorized'})
        elif path == '/api/posts':
            self._json(200, list_posts())
        elif (m := re.match(r'^/api/posts/([a-z0-9-]+)$', path)):
            f = POSTS_DIR / f'{m.group(1)}.md'
            if not f.exists():
                self._json(404, {'error': 'not found'})
            else:
                meta, body = parse_post(f)
                self._json(200, {'meta': {**meta, 'slug': m.group(1)}, 'body': body})
        elif path == '/api/messages':
            with LOCK:
                self._json(200, load(MSG_F, [])[-100:])
        elif path == '/api/stats':
            with LOCK:
                self._json(200, load(VIEW_F, {}))
        elif path == '/api/users':
            u = self._user()
            if not u or u['role'] not in ('admin', 'owner'):
                self._json(403, {'error': 'forbidden'})
            else:
                self._json(200, [{k: x.get(k) for k in ('id', 'username', 'nickname', 'role', 'ban', 'created')}
                                 for x in load(USERS_F, [])])
        elif path == '/api/content':
            with LOCK:
                self._json(200, load(CONTENT_F, {}))
        elif (m := re.match(r'^/uploads/([a-z0-9._-]+)$', path)):
            f = UPLOADS / m.group(1)
            if f.exists():
                self._raw(200, CTYPES.get(f.suffix, 'application/octet-stream'), f.read_bytes())
            else:
                self._json(404, {'error': 'not found'})
        elif path == '/rss.xml':
            self._raw(200, 'application/rss+xml; charset=utf-8', rss_xml())
        elif path == '/' or re.match(r'^/blog/[a-z0-9-]+$', path):
            code, ctype, body = serve_doc(path)
            self._raw(code, ctype, body)
        else:
            self._json(404, {'error': 'not found'})

    # ---------- POST ----------
    def do_POST(self):
        path = urlparse(self.path).path
        if self._rate_limited():
            self._json(429, {'error': 'too fast'})
            return
        u = self._user()

        # 上传是 multipart，必须在 JSON 解析之前处理
        if path == '/api/upload':
            if not u or u['role'] != 'owner':
                self._json(403, {'error': 'owner only'})
                return
            up = self._multipart()
            if not up:
                self._json(400, {'error': 'bad file'})
                return
            name, filedata = up
            safe = re.sub(r'[^a-z0-9._-]', '', name.lower()) or 'file'
            dest = f'{int(time.time())}-{safe}'
            (UPLOADS / dest).write_bytes(filedata)
            self._json(200, {'ok': True, 'url': f'/uploads/{dest}'})
            return

        data = self._body()
        if data is None:
            self._json(400, {'error': 'bad json'})
            return

        if path == '/api/setup':
            with LOCK:
                if load(USERS_F, []):
                    self._json(409, {'error': 'already setup'})
                    return
                ok, resp = self._create_user(data, 'owner')
            self._json(ok, resp)
        elif path == '/api/register':
            with LOCK:
                ok, resp = self._create_user(data, 'visitor')
            self._json(ok, resp)
        elif path == '/api/login':
            uname = str(data.get('username', '')).strip().lower()
            pw = str(data.get('password', ''))
            with LOCK:
                user = next((x for x in load(USERS_F, []) if x['username'] == uname), None)
            if not user or not check_pw(pw, user['pass']):
                self._json(401, {'error': 'bad credentials'})
            elif user.get('ban'):
                self._json(403, {'error': 'banned'})
            else:
                self._json(200, {'token': new_session(user['id']), 'user': self._pub(user)})
        elif path == '/api/logout':
            h = self.headers.get('Authorization', '')
            if h.startswith('Bearer '):
                with LOCK:
                    s = load(SESS_F, {})
                    s.pop(h[7:], None)
                    save(SESS_F, s)
            self._json(200, {'ok': True})
        elif path == '/api/messages':
            name = (u['nickname'] if u else str(data.get('name', ''))[:24].strip()) or '匿名逃逸者'
            text = str(data.get('text', ''))[:200].strip()
            if not text:
                self._json(400, {'error': 'empty'})
                return
            with LOCK:
                msgs = load(MSG_F, [])
                msgs.append({'name': name, 'text': text, 'ts': int(time.time())})
                save(MSG_F, msgs[-500:])
            self._json(200, {'ok': True})
        elif path == '/api/view':
            slug = str(data.get('slug', ''))
            if not SLUG_RE.match(slug):
                self._json(400, {'error': 'bad slug'})
                return
            with LOCK:
                views = load(VIEW_F, {})
                views[slug] = views.get(slug, 0) + 1
                save(VIEW_F, views)
            self._json(200, {'ok': True, 'count': views[slug]})
        elif path == '/api/posts':
            self._post_write(u, data, None)
        elif (m := re.match(r'^/api/posts/([a-z0-9-]+)$', path)):
            self._post_write(u, data, m.group(1))
        elif (m := re.match(r'^/api/users/([a-z0-9]+)/role$', path)):
            self._user_role(u, m.group(1), data)
        elif (m := re.match(r'^/api/users/([a-z0-9]+)/ban$', path)):
            self._user_ban(u, m.group(1), data)
        else:
            self._json(404, {'error': 'not found'})

    # ---------- PUT（站点内容网页化，仅站长） ----------
    def do_PUT(self):
        path = urlparse(self.path).path
        m = re.match(r'^/api/content/([a-z]+)$', path)
        if not m or m.group(1) not in CONTENT_KEYS:
            self._json(404, {'error': 'not found'})
            return
        u = self._user()
        if not u or u['role'] != 'owner':
            self._json(403, {'error': 'owner only'})
            return
        data = self._body()
        if data is None:
            self._json(400, {'error': 'bad json'})
            return
        with LOCK:
            c = load(CONTENT_F, {})
            c[m.group(1)] = data
            save(CONTENT_F, c)
        self._json(200, {'ok': True})

    # ---------- multipart 极简解析（单文件，≤8MB） ----------
    def _multipart(self):
        ctype = self.headers.get('Content-Type', '')
        bm = re.search(r'boundary=(?:"([^"]+)"|([^;]+))', ctype)
        if not bm:
            return None
        boundary = (bm.group(1) or bm.group(2)).strip().encode()
        length = int(self.headers.get('Content-Length', 0) or 0)
        if length <= 0 or length > 8 * 1024 * 1024:
            return None
        raw = self.rfile.read(length)
        for part in raw.split(b'--' + boundary):
            if b'filename="' not in part:
                continue
            head, _, filedata = part.partition(b'\r\n\r\n')
            if filedata.endswith(b'\r\n'):
                filedata = filedata[:-2]
            nm = re.search(rb'filename="([^"]*)"', head)
            return (nm.group(1).decode('utf-8', 'replace') if nm else 'file'), filedata
        return None

    # ---------- DELETE ----------
    def do_DELETE(self):
        path = urlparse(self.path).path
        u = self._user()
        admin = u and u['role'] in ('admin', 'owner')
        if (m := re.match(r'^/api/posts/([a-z0-9-]+)$', path)):
            if not u or u['role'] != 'owner':
                self._json(403, {'error': 'owner only'})
            else:
                f = POSTS_DIR / f'{m.group(1)}.md'
                if f.exists():
                    f.unlink()
                self._json(200, {'ok': True})
        elif (m := re.match(r'^/api/messages/(\d+)$', path)):
            if not admin:
                self._json(403, {'error': 'forbidden'})
            else:
                ts = int(m.group(1))
                with LOCK:
                    msgs = load(MSG_F, [])
                    save(MSG_F, [x for x in msgs if x['ts'] != ts])
                self._json(200, {'ok': True})
        elif (m := re.match(r'^/api/users/([a-z0-9]+)$', path)):
            self._user_delete(u, m.group(1))
        else:
            self._json(404, {'error': 'not found'})

    # ---------- 业务子程序 ----------
    def _create_user(self, data, role):
        uname = str(data.get('username', '')).strip().lower()
        nick = str(data.get('nickname', ''))[:24].strip() or uname
        pw = str(data.get('password', ''))
        if not USER_RE.match(uname):
            return 400, {'error': 'bad username'}
        if len(pw) < 6:
            return 400, {'error': 'weak password'}
        users = load(USERS_F, [])
        if any(x['username'] == uname for x in users):
            return 409, {'error': 'taken'}
        user = {'id': secrets.token_hex(6), 'username': uname, 'nickname': nick,
                'pass': hash_pw(pw), 'role': role, 'ban': False, 'created': int(time.time())}
        users.append(user)
        save(USERS_F, users)
        return 200, {'token': new_session(user['id']), 'user': self._pub(user)}

    def _post_write(self, u, data, slug):
        if not u or u['role'] != 'owner':
            self._json(403, {'error': 'owner only'})
            return
        title = str(data.get('title', '')).strip()[:80]
        body = str(data.get('content', ''))
        if not title or not body.strip():
            self._json(400, {'error': 'empty'})
            return
        slug = slug or str(data.get('slug', '')).strip().lower() or \
            f"{data.get('date', time.strftime('%Y-%m-%d'))}-{secrets.token_hex(3)}"
        if not SLUG_RE.match(slug):
            self._json(400, {'error': 'bad slug'})
            return
        f = POSTS_DIR / f'{slug}.md'
        if f.exists() and not slug:
            self._json(409, {'error': 'exists'})
            return
        tags = [str(t).strip() for t in data.get('tags', []) if str(t).strip()][:8]
        write_post(slug, {'title': title, 'date': str(data.get('date', time.strftime('%Y-%m-%d')))[:10],
                          'tags': tags, 'summary': str(data.get('summary', ''))[:120]}, body)
        self._json(200, {'ok': True, 'slug': slug})

    def _user_role(self, u, uid, data):
        if not u or u['role'] != 'owner':
            self._json(403, {'error': 'owner only'})
            return
        role = data.get('role')
        if role not in ('admin', 'visitor'):
            self._json(400, {'error': 'bad role'})
            return
        with LOCK:
            users = load(USERS_F, [])
            t = next((x for x in users if x['id'] == uid), None)
            if not t or t['role'] == 'owner':
                self._json(404, {'error': 'not found'})
                return
            t['role'] = role
            save(USERS_F, users)
        self._json(200, {'ok': True})

    def _user_ban(self, u, uid, data):
        if not u or u['role'] not in ('admin', 'owner'):
            self._json(403, {'error': 'forbidden'})
            return
        with LOCK:
            users = load(USERS_F, [])
            t = next((x for x in users if x['id'] == uid), None)
            if not t or t['role'] == 'owner' or (u['role'] == 'admin' and t['role'] == 'admin'):
                self._json(403, {'error': 'forbidden'})
                return
            t['ban'] = bool(data.get('ban'))
            save(USERS_F, users)
        self._json(200, {'ok': True})

    def _user_delete(self, u, uid):
        if not u or u['role'] not in ('admin', 'owner'):
            self._json(403, {'error': 'forbidden'})
            return
        with LOCK:
            users = load(USERS_F, [])
            t = next((x for x in users if x['id'] == uid), None)
            if not t or t['id'] == u['id'] or t['role'] == 'owner' or \
                    (u['role'] == 'admin' and t['role'] == 'admin'):
                self._json(403, {'error': 'forbidden'})
                return
            save(USERS_F, [x for x in users if x['id'] != uid])
        self._json(200, {'ok': True})

    def log_message(self, fmt, *args):
        pass  # 保持安静；访问日志以 nginx 为准


if __name__ == '__main__':
    print(f'Escaping Notes API on {HOST}:{PORT} (SITE_URL={SITE_URL})')
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
