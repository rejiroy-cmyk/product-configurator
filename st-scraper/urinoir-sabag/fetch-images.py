"""Download + localise the PG1 shots for the injected urinals.
Same convention as localize-images.cjs: BANK_base_sha1(bare)[:8].webp, q75/method=6."""
import hashlib, io, json, os, re, sys, urllib.request

QUALITY, METHOD = 75, 6
OUT = 'public/img'
jobs = json.load(open(sys.argv[1]))
os.makedirs(OUT, exist_ok=True)

def local_name(url):
    bare = re.sub(r'^https?://', '', url)
    m = re.search(r'/Web/(PG1|PS1)/(.+?)\.(png|jpg|jpeg)$', bare, re.I)
    bank = m.group(1) if m else 'X'
    base = re.sub(r'[^A-Za-z0-9_.-]', '_', m.group(2) if m else bare)[:60]
    h = hashlib.sha1(bare.encode()).hexdigest()[:8]
    return f'{bank}_{base}_{h}.webp'

from PIL import Image
done, skipped, failed = [], [], []
for j in jobs:
    url = j['img']
    name = local_name(url)
    path = os.path.join(OUT, name)
    if os.path.exists(path):
        skipped.append(name); j['local'] = 'img/' + name; continue
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        raw = urllib.request.urlopen(req, timeout=30).read()
        im = Image.open(io.BytesIO(raw))
        if im.mode not in ('RGB', 'RGBA'):
            im = im.convert('RGBA' if 'A' in im.mode else 'RGB')
        buf = io.BytesIO()
        im.save(buf, 'WEBP', quality=QUALITY, method=METHOD)
        # never write a degenerate file — a 0-byte or near-empty image is a silent blank tile
        if buf.tell() < 200:
            failed.append((j['art'], 'suspiciously small')); continue
        open(path, 'wb').write(buf.getvalue())
        done.append((name, buf.tell()))
        j['local'] = 'img/' + name
    except Exception as e:
        failed.append((j['art'], str(e)[:60]))

json.dump(jobs, open(sys.argv[1], 'w'), indent=1, ensure_ascii=False)
print(f'fetched {len(done)} · already present {len(skipped)} · failed {len(failed)}')
for n, b in done[:6]: print(f'   {b:>6} B  {n}')
for a, why in failed: print(f'   FAIL {a}: {why}')
