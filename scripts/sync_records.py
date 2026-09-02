#!/usr/bin/env python3
"""QQ 音乐歌单快照同步（零依赖，仅 Python3 标准库）

用法：python scripts/sync_records.py [disstid]
  抓取公开歌单 → 生成 src/config/records.js（前端打包用静态快照）。
  默认 disstid 为本站绑定歌单。平时网站不调用任何外部 API；
  歌单有增删时手动跑一次本脚本并 git push 即可更新。
"""
import json
import re
import sys
import time
import urllib.request
from pathlib import Path

DISSTID = sys.argv[1] if len(sys.argv) > 1 else '9772836439'
API = ('https://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg'
       '?type=1&json=1&utf8=1&onlysong=0&disstid={id}&loginUin=0&hostUin=0'
       '&format=json&inCharset=utf8&outCharset=utf-8&notice=0&platform=yqq&needNewCode=0')
OUT = Path(__file__).resolve().parent.parent / 'src' / 'config' / 'records.js'


def clean(s):
    """去掉 QQ 音乐返回文本里的 HTML 标签与控制字符"""
    s = re.sub(r'<[^>]+>', '', str(s or ''))
    return s.replace('\u0000', '').strip()


def main():
    req = urllib.request.Request(
        API.format(id=DISSTID),
        headers={'Referer': 'https://y.qq.com/', 'User-Agent': 'Mozilla/5.0'})
    data = json.loads(urllib.request.urlopen(req, timeout=15).read().decode('utf-8'))
    if data.get('code') != 0 or not data.get('cdlist'):
        sys.exit(f'歌单不可达或未公开：code={data.get("code")}')
    cd = data['cdlist'][0]
    songs = [{
        'title': clean(s.get('songname')),
        'artist': ' / '.join(clean(x.get('name')) for x in (s.get('singer') or []) if x.get('name')),
        'url': f"https://y.qq.com/n/ryqq/songDetail/{s.get('songmid', '')}",
    } for s in (cd.get('songlist') or []) if s.get('songname')]
    records = {
        'name': clean(cd.get('dissname')) or 'QQ 音乐歌单',
        'desc': clean(cd.get('desc')),
        'cover': cd.get('logo') or '',
        'url': f"https://y.qq.com/n/ryqq/playlist/{DISSTID}",
        'updated': time.strftime('%Y-%m-%d %H:%M'),
        'songs': songs,
    }
    body = json.dumps(records, ensure_ascii=False, indent=2)
    OUT.write_text(
        '// QQ 音乐歌单快照：由 scripts/sync_records.py 生成，请勿手改；更新=重跑脚本\n'
        f'export const records = {body}\n', 'utf-8')
    print(f'已生成 {OUT}：《{records["name"]}》{len(songs)} 首')


if __name__ == '__main__':
    main()
