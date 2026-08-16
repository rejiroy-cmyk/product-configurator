/**
 * rewrite-imgurls-to-r2.cjs
 * Rewrites custom-data.json imgUrl / mainImgUrl from vendor CDN URLs to their R2
 * public URLs using r2-migration-manifest.json. Backs up first (rollback = restore
 * the backup, or re-run with REVERSE=1 to map R2 URLs back to vendor URLs).
 *
 * Usage:  node rewrite-imgurls-to-r2.cjs [--dry]
 *         REVERSE=1 node rewrite-imgurls-to-r2.cjs   # undo (R2 -> vendor)
 */
'use strict';
const fs = require('fs');
const path = require('path');
// custom-data.json is stored INTERNED (repeated mountingMaterials options and
// services live once in a shared table) — readData/writeData hide that. Reading it
// with fs directly yields the STRING "o412" where an option object is expected.
const { readData, writeData } = require('./_dataFile.cjs');

const DIR = path.dirname(fs.realpathSync(__filename));
const DATA = path.resolve(DIR, '../custom-data.json');
const MANIFEST = path.resolve(DIR, 'r2-migration-manifest.json');
const DRY = process.argv.includes('--dry');
const REVERSE = !!process.env.REVERSE;

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));   // vendorUrl -> r2Url
const map = {};
for (const [vendor, r2] of Object.entries(manifest)) map[REVERSE ? r2 : vendor] = REVERSE ? vendor : r2;

const data = readData();
let rewritten = 0, unmappedVendor = 0;
const VENDOR_RE = /\/\/[^/]*sanitastroesch\.ch\//;

(function w(n) {
  if (Array.isArray(n)) { n.forEach(w); return; }
  if (!n || typeof n !== 'object') return;
  for (const k of ['imgUrl', 'mainImgUrl', 'image']) {
    const u = n[k];
    if (typeof u === 'string' && u.trim()) {
      if (u in map) { n[k] = map[u]; rewritten++; }
      else if (!REVERSE && VENDOR_RE.test(u)) unmappedVendor++;   // a vendor URL not yet migrated
    }
  }
  for (const k of Object.keys(n)) w(n[k]);
})(data);

console.log(`${REVERSE ? 'REVERSE ' : ''}rewrite ${DRY ? '(dry-run) ' : ''}: ${rewritten} URLs remapped | ${unmappedVendor} vendor URLs still unmapped (migrate them first)`);
if (DRY) { console.log('dry-run: no file written.'); process.exit(0); }
if (!rewritten) { console.log('Nothing to rewrite.'); process.exit(0); }

const bak = DATA + `.bak-r2-${REVERSE ? 'reverse' : 'apply'}`;
fs.copyFileSync(DATA, bak);
writeData(data, { backup: false });
console.log(`Wrote custom-data.json (backup: ${path.basename(bak)}).`);
