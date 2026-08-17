/**
 * drop-anlageteile.cjs — removes the Duofix and Tece Profil "Anlageteile" families.
 *
 * "Anlageteile" are the actuation/trim parts sold against a concealed cistern. Three
 * families are being retired from the catalogue:
 *
 *   Geberit Duofix    3341 120 (Zweimengen Sigma 01) · 3341 122 (Tango) · 3341 125 (Bolero)
 *   Tece Profil       3341 401 (Zweimengen Now)
 *   Geberit Kombifix  3341 108 (Zweimengen Sigma 01) · 3341 110 (Spül-/Stop) ·
 *                     3341 111 (Tango) · 3341 112 (Bolero)
 *
 * Plus, by explicit decision, one article that shares only the WORD:
 *
 *   3163 160          "Anlageteile Geberit" — NOT cistern trim. Its description reads
 *                     "Einbausifon, für Waschtisch": the visible cover set for a concealed
 *                     WASHBASIN siphon, sibling of 3163 165 (the siphon itself). It is what
 *                     completed the six Duofix Waschtischelemente whose labels say "mit
 *                     Einbausifon, OHNE Abdeckplatte" (3612 207/209/232/288 …), so those
 *                     elements no longer have a cover option in Waschtisch / Mix & Match /
 *                     Waschtischmischer. Flagged and confirmed by Reji on 2026-08-17.
 *
 * Re-running is safe: a base that is already gone simply reports zero.
 *
 * Removal covers THREE places, because an art-Nr can sit in any of them:
 *   1. the tray itself (zubehoer_pool)
 *   2. its `variants[]` — the other finishes go with the base, they are the same article
 *   3. `mountingMaterials` options on other trays — the Tece one is an option in an
 *      "Anlageteile" group on 5 Wandklosett trays
 *
 * A group left holding only its "Ohne …" option is removed too: a dropdown whose sole
 * choice is "no thanks" is a dead control, not a configuration.
 *
 * DELIBERATELY UNTOUCHED:
 *   3163 165              Einbausiphon Geberit Waschtisch (the siphon 3163 160 covered)
 *   the other 77 Tece articles (Betätigungsplatten, Dusch-WC, elements, …)
 *
 * Dry-run by default; `--write` backs up first (writeData returns the .bak path).
 *
 *   node st-scraper/drop-anlageteile.cjs
 *   node st-scraper/drop-anlageteile.cjs --write
 */
'use strict';
const { readData, writeData } = require('./_dataFile.cjs');

const WRITE = process.argv.includes('--write');

const BASES = [
    { base: '3341 120', why: 'Duofix — Zweimengen Sigma 01' },
    { base: '3341 122', why: 'Duofix — Tango' },
    { base: '3341 125', why: 'Duofix — Bolero' },
    { base: '3341 401', why: 'Tece Profil — Zweimengen Now' },
    { base: '3341 108', why: 'Kombifix — Zweimengen Sigma 01' },
    { base: '3341 110', why: 'Kombifix — Spül-/Stop vorne' },
    { base: '3341 111', why: 'Kombifix — Tango' },
    { base: '3341 112', why: 'Kombifix — Bolero' },
    { base: '3163 160', why: 'Einbausifon-Abdeckung Waschtisch — see the header note' },
];
const isTarget = (artNr) => BASES.some((b) => String(artNr || '').startsWith(b.base));

const traysOf = (pool) => (pool && pool.trays) || (Array.isArray(pool) ? pool : null);
const clean = (s) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const isOhne = (o) => /^ohne\b/i.test(clean(o.label)) || /^ohne_/i.test(String(o.artNr || ''));

const data = readData();
const removed = { trays: [], variants: [], options: [], groups: [] };

for (const poolKey of Object.keys(data)) {
    const trays = traysOf(data[poolKey]);
    if (!trays) continue;

    for (let i = trays.length - 1; i >= 0; i--) {
        const t = trays[i];
        if (!t || typeof t !== 'object') continue;

        // 1 + 2. the tray and everything under it
        if (isTarget(t.artNr)) {
            removed.trays.push({ pool: poolKey, artNr: t.artNr, label: clean(t.label).slice(0, 80) });
            for (const v of t.variants || []) removed.variants.push({ pool: poolKey, artNr: v.artNr, of: t.artNr });
            trays.splice(i, 1);
            continue;
        }

        // a stray variant on a tray that is otherwise staying
        if (Array.isArray(t.variants)) {
            for (let j = t.variants.length - 1; j >= 0; j--) {
                if (!isTarget(t.variants[j].artNr)) continue;
                removed.variants.push({ pool: poolKey, artNr: t.variants[j].artNr, of: t.artNr });
                t.variants.splice(j, 1);
            }
        }

        // 3. mounting-material options, and any group they leave hollow
        if (!Array.isArray(t.mountingMaterials)) continue;
        for (let gi = t.mountingMaterials.length - 1; gi >= 0; gi--) {
            const g = t.mountingMaterials[gi];
            if (!g || !Array.isArray(g.options)) continue;
            let touched = false;
            for (let oi = g.options.length - 1; oi >= 0; oi--) {
                if (!isTarget(g.options[oi].artNr)) continue;
                removed.options.push({
                    pool: poolKey, tray: t.artNr, group: g.name, artNr: g.options[oi].artNr,
                });
                g.options.splice(oi, 1);
                touched = true;
            }
            if (!touched) continue;
            if (g.options.length === 0 || g.options.every(isOhne)) {
                removed.groups.push({
                    pool: poolKey, tray: t.artNr, group: g.name,
                    leftover: g.options.map((o) => clean(o.label)).join(' / ') || '(empty)',
                });
                t.mountingMaterials.splice(gi, 1);
            }
        }
    }
}

const line = (s) => console.log(s);
line(`\n${WRITE ? 'REMOVING' : 'DRY RUN — would remove'}:\n`);
line(`  trays     ${removed.trays.length}`);
for (const r of removed.trays) line(`      ${r.pool} | ${r.artNr} | ${r.label}`);
line(`  variants  ${removed.variants.length}`);
for (const r of removed.variants) line(`      ${r.pool} | ${r.artNr}  (of ${r.of})`);
line(`  options   ${removed.options.length}`);
for (const r of removed.options) line(`      ${r.pool} | tray ${r.tray} | group "${r.group}" | ${r.artNr}`);
line(`  groups    ${removed.groups.length}   (left with nothing but an "Ohne …" choice)`);
for (const r of removed.groups) line(`      ${r.pool} | tray ${r.tray} | "${r.group}" | leftover: ${r.leftover}`);
line(`\n  SKUs gone: ${removed.trays.length + removed.variants.length}\n`);

if (!WRITE) {
    line('Nothing written. Re-run with --write to apply.\n');
    process.exit(0);
}
const bak = writeData(data);
line(`Written. Backup: ${bak}\n`);
