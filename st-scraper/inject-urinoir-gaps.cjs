/**
 * inject-urinoir-gaps.cjs — the 8 urinals we sell that were never in custom-data.json.
 *
 * Surfaced by the SABAG cross-check (see st-scraper/urinoir-sabag/): every one of them
 * resolves on our own Profishop, so they are in our range — they had simply never been
 * injected. The `urinoir` pool held 41 where it should hold 49.
 *
 *   Laufen Val          2112 886 · 2112 887 · 2112 888
 *   Alessi One          2121 197
 *   Duravit Me by Starck 2141 867
 *   Starck 1            2147 192 · 2147 193
 *   Subway              2317 385
 *
 * Every art-Nr, label, price, GTIN and image URL comes from profishop's own search.ws —
 * nothing is synthesized. That matters: `2141 867.100.202` carries **202** in the third
 * triplet (the Cleaneffekt coating), not `000`. Fabricating a finish triplet from the
 * base is exactly what put 78 wrong art-Nrs into this file once before.
 *
 * Labels: `label` is SAP's short text and `description` the long one, matching every
 * other tray in the pool — `fullLabel()` stitches them at render time. The long text is
 * taken whole from Description_long, so the maktx/maktx2 truncation trap cannot bite.
 *
 * mountingMaterials is deliberately EMPTY. What each of these needs is worked out in
 * URINOIR_ELEMENT_RULES.md; inventing groups here would pre-empt rules not yet agreed.
 *
 * Idempotent: a base already in the pool is left alone, so a re-run is a no-op.
 *
 *   node st-scraper/inject-urinoir-gaps.cjs            # dry run
 *   node st-scraper/inject-urinoir-gaps.cjs --write    # backs up, then writes
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { readData, writeData } = require('./_dataFile.cjs');

const WRITE = process.argv.includes('--write');
const SRC = path.join(__dirname, 'urinoir-sabag', 'urinoir-gaps.json');
const PRICES = path.join(__dirname, '..', 'prices.json');
const IMGDIR = path.join(__dirname, '..', 'public', 'img');

// COLOUR RULE: the finish comes from the art-Nr triplet via COLOR_NAMES, never from the
// shop's own Farbe field. Read out of the ESM module by regex — this is CommonJS.
const COLOR_NAMES = (() => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'modules', 'factories', '_colorCodes.js'), 'utf8');
    const out = {};
    for (const m of src.matchAll(/'(\d{3})':\s*"([^"]+)"/g)) out[m[1]] = m[2];
    return out;
})();

// Same filename derivation as localize-images.cjs — bank + path + sha1(bare)[0..8].
const localName = (url) => {
    const bare = url.replace(/^https?:\/\//, '');
    const m = /\/Web\/(PG1|PS1)\/(.+?)\.(png|jpg|jpeg)$/i.exec(bare);
    const bank = m ? m[1] : 'X';
    const base = (m ? m[2] : bare).replace(/[^A-Za-z0-9_.-]/g, '_').slice(0, 60);
    return `${bank}_${base}_${crypto.createHash('sha1').update(bare).digest('hex').slice(0, 8)}.webp`;
};
const imgFor = (url) => {
    const n = localName(url);
    return fs.existsSync(path.join(IMGDIR, n)) ? 'img/' + n : '';
};

const colour = (art) => COLOR_NAMES[String(art).split('.')[1]] || '';
// "Ein- und Ablauf verdeckt" is what the pool means by Verdeckt — same reading as the
// 41 trays already there. FULL-TEXT: read the long description, not the truncated label.
const formOf = (t) => /verdeckt/i.test(t) ? 'Verdeckt' : 'Standard';

const src = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const data = readData();
const pool = data.urinoir && data.urinoir.trays;
if (!Array.isArray(pool)) { console.error('urinoir pool missing'); process.exit(1); }

const have = new Set(pool.map(t => String(t.artNr || '').slice(0, 8)));
const added = [], skipped = [], noImg = [];
const priceAdds = {};

for (const b of src) {
    if (have.has(b.base)) { skipped.push(b.base); continue; }
    const vs = b.variants;
    const first = vs[0];
    const tray = {
        id: 'shop_' + b.base.replace(/\s/g, ''),
        manufacturer: b.brand,
        form: formOf(first.long),
        size: 'Standard',
        artNr: first.art,
        label: first.short,
        menge: 1,
        imgUrl: imgFor(first.img),
        variants: vs.slice(1).map(v => ({
            artNr: v.art,
            label: v.long + (colour(v.art) ? ', ' + colour(v.art) : ''),
            farbe: colour(v.art),
            imgUrl: imgFor(v.img),
        })),
        mountingMaterials: [],
        description: first.long,
        tech: { Marke: b.brand },
    };
    if (!tray.imgUrl) noImg.push(first.art);
    for (const v of vs) if (v.price != null) priceAdds[v.art] = v.price;
    pool.push(tray);
    added.push(tray);
}

const line = (s) => console.log(s);
line(`\n${WRITE ? 'INJECTING' : 'DRY RUN — nothing written'}\n`);
line(`  urinoir pool: ${pool.length - added.length} -> ${pool.length}`);
line(`  bases added : ${added.length}   skipped (already present): ${skipped.length}`);
line(`  SKUs        : ${added.reduce((n, t) => n + 1 + t.variants.length, 0)}`);
line(`  prices      : ${Object.keys(priceAdds).length}`);
if (noImg.length) line(`  ⚠ without image: ${noImg.join(', ')}`);
line('');
for (const t of added) {
    line(`  ${t.artNr}  ${t.form.padEnd(8)} ${t.manufacturer}`);
    line(`     ${t.label.slice(0, 88)}`);
    line(`     img ${t.imgUrl || '(none)'}  ·  ${t.variants.length} variant(s): ${t.variants.map(v => v.artNr + ' ' + v.farbe).join(' | ') || '—'}`);
}
if (!WRITE) { line('\nRe-run with --write to apply.\n'); process.exit(0); }

const prices = JSON.parse(fs.readFileSync(PRICES, 'utf8'));
let pAdded = 0;
for (const [a, v] of Object.entries(priceAdds)) if (prices.prices[a] == null) { prices.prices[a] = v; pAdded++; }
prices.meta.entries = Object.keys(prices.prices).length;
fs.writeFileSync(PRICES, JSON.stringify(prices, null, 2));
const bak = writeData(data);
line(`\nWritten. prices.json +${pAdded} entries. Backup: ${bak}\n`);
