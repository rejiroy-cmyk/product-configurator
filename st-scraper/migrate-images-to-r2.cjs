/**
 * migrate-images-to-r2.cjs
 * Copies every CDN-verified product image from the vendor CDN into a Cloudflare R2
 * bucket (S3 API), streaming download->upload with no local staging. Rate-limited,
 * resumable (skips objects already in the manifest or already in the bucket).
 *
 * Reads : st-scraper/image-validated.json  (unique live vendor URLs)
 * Writes: st-scraper/r2-migration-manifest.json  { "<vendorUrl>": "<publicUrl>" }
 *
 * Required env (never pasted in chat — export locally):
 *   R2_ACCOUNT_ID          Cloudflare account id (for the S3 endpoint)
 *   R2_BUCKET              bucket name
 *   R2_ACCESS_KEY_ID       R2 API token access key id
 *   R2_SECRET_ACCESS_KEY   R2 API token secret
 *   R2_PUBLIC_BASE         public base URL, e.g. https://pub-xxxx.r2.dev  (no trailing /)
 * Optional:
 *   COOKIE_FILE            vendor session cookie file (images are public; fallback only)
 *   R2_CONC                concurrency (default 6)
 *   MAX                    cap number of images this run (for a test batch)
 *
 * Usage:  R2_ACCOUNT_ID=... R2_BUCKET=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... \
 *         R2_PUBLIC_BASE=https://pub-xxxx.r2.dev node migrate-images-to-r2.cjs [MAX]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');

const DIR = path.dirname(fs.realpathSync(__filename));
const VALID = path.resolve(DIR, 'image-validated.json');
const MANIFEST = path.resolve(DIR, 'r2-migration-manifest.json');

const { R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_BASE } = process.env;
const CONC = parseInt(process.env.R2_CONC || '6', 10);
const MAX = parseInt(process.argv[2] || process.env.MAX || '9999999', 10);

for (const [k, v] of Object.entries({ R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_BASE })) {
  if (!v) { console.error(`Missing env ${k}. See header for required variables.`); process.exit(1); }
}
const PUBLIC_BASE = R2_PUBLIC_BASE.replace(/\/+$/, '');

let cookie = '';
if (process.env.COOKIE_FILE) cookie = fs.readFileSync(path.resolve(DIR, process.env.COOKIE_FILE), 'utf8').replace(/\s*\n\s*/g, ' ').trim();

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  forcePathStyle: true,
});

const sleep = ms => new Promise(r => setTimeout(r, ms));
const keyOf = url => url.replace(/^https?:\/\/[^/]+\/multimedia\//, '');   // Web/PG1/xxx.png
const ctOf = url => /\.jpe?g$/i.test(url) ? 'image/jpeg' : (/\.png$/i.test(url) ? 'image/png' : 'application/octet-stream');

function fetchBuf(url) {
  return new Promise(res => {
    https.get(url, { timeout: 20000, headers: { 'User-Agent': 'Mozilla/5.0', ...(cookie ? { Cookie: cookie } : {}) } }, r => {
      if (r.statusCode !== 200) { r.resume(); return res({ err: `HTTP ${r.statusCode}` }); }
      const chunks = []; r.on('data', c => chunks.push(c)); r.on('end', () => res({ buf: Buffer.concat(chunks) }));
    }).on('error', e => res({ err: e.message })).on('timeout', function () { this.destroy(); res({ err: 'timeout' }); });
  });
}

const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};
const urls = [...new Set(Object.values(JSON.parse(fs.readFileSync(VALID, 'utf8'))).filter(Boolean))];
const todo = urls.filter(u => !(u in manifest)).slice(0, MAX);

console.log(`bucket:${R2_BUCKET} | unique images:${urls.length} | already done:${Object.keys(manifest).length} | this run:${todo.length} | conc:${CONC}`);
if (!todo.length) { console.log('Nothing to do.'); process.exit(0); }

let i = 0, up = 0, skip = 0, fail = 0;
function save() { fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2)); }

async function worker() {
  while (i < todo.length) {
    const url = todo[i++];
    const key = keyOf(url);
    try {
      // skip if object already exists in bucket (resumable across manifest loss)
      try { await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key })); manifest[url] = `${PUBLIC_BASE}/${key}`; skip++; continue; } catch (_) {}
      const { buf, err } = await fetchBuf(url);
      if (err || !buf) { fail++; if (fail <= 20) console.log(`  ✗ fetch ${err} ${key}`); continue; }
      await s3.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, Body: buf, ContentType: ctOf(url), CacheControl: 'public, max-age=31536000, immutable' }));
      manifest[url] = `${PUBLIC_BASE}/${key}`;
      up++;
      await sleep(40 + Math.random() * 80);   // be polite to the vendor CDN
    } catch (e) {
      fail++; if (fail <= 20) console.log(`  ✗ put ${String(e.message).slice(0, 80)} ${key}`);
    }
    if ((up + skip) % 200 === 0) { save(); console.log(`  ${i}/${todo.length} | uploaded:${up} existed:${skip} failed:${fail}`); }
  }
}

(async () => {
  await Promise.all(Array.from({ length: CONC }, worker));
  save();
  console.log(`\n════ r2 migration done ════\n  uploaded:${up} | already-existed:${skip} | failed:${fail}\n  manifest: ${MANIFEST} (${Object.keys(manifest).length} mapped)`);
})();
