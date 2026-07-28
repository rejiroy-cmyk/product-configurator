/**
 * rewrite-imgurls-to-proxy.cjs
 * Routes every vendor product-image URL in custom-data.json through the free
 * wsrv.nl image proxy/cache, so the browser (and your users) hit wsrv.nl instead
 * of the vendor CDN. wsrv fetches each image from the vendor once, caches it, and
 * serves it from its own CDN — ending the app->vendor traffic that caused the ban.
 *
 *   https://profishop.../multimedia/Web/PG1/x.png
 *     -> https://wsrv.nl/?url=profishop.../multimedia/Web/PG1/x.png
 *
 * Reversible: REVERSE=1 unwraps back to the vendor URLs. Backs up first.
 * Usage:  node rewrite-imgurls-to-proxy.cjs [--dry]
 *         REVERSE=1 node rewrite-imgurls-to-proxy.cjs
 */
'use strict';
const fs = require('fs');
const path = require('path');

const DATA = path.resolve(path.dirname(fs.realpathSync(__filename)), '../custom-data.json');
const DRY = process.argv.includes('--dry');
const REVERSE = !!process.env.REVERSE;
const PROXY = 'https://wsrv.nl/?url=';
const VENDOR_RE = /sanitastroesch\.ch\/multimedia\//;

const toProxy = u => PROXY + u.replace(/^https?:\/\//, '');
const fromProxy = u => {
  const raw = u.slice(PROXY.length);
  return /^https?:\/\//.test(raw) ? raw : 'https://' + raw;
};

const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
let changed = 0;
(function w(n) {
  if (Array.isArray(n)) { n.forEach(w); return; }
  if (!n || typeof n !== 'object') return;
  for (const k of ['imgUrl', 'mainImgUrl', 'image']) {
    const u = n[k];
    if (typeof u !== 'string' || !u.trim()) continue;
    if (REVERSE) {
      if (u.startsWith(PROXY)) { n[k] = fromProxy(u); changed++; }
    } else {
      if (!u.startsWith(PROXY) && VENDOR_RE.test(u)) { n[k] = toProxy(u); changed++; }
    }
  }
  for (const k of Object.keys(n)) w(n[k]);
})(data);

console.log(`${REVERSE ? 'REVERSE (unwrap)' : 'wrap through wsrv.nl'}${DRY ? ' (dry-run)' : ''}: ${changed} image URLs ${REVERSE ? 'restored' : 'proxied'}`);
if (DRY) process.exit(0);
if (!changed) { console.log('Nothing to change.'); process.exit(0); }

const bak = DATA + `.bak-proxy-${REVERSE ? 'reverse' : 'apply'}`;
fs.copyFileSync(DATA, bak);
fs.writeFileSync(DATA, JSON.stringify(data, null, 2) + '\n');
console.log(`Wrote custom-data.json (backup: ${path.basename(bak)}).`);
