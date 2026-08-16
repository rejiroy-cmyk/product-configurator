#!/usr/bin/env node
/**
 * inject-abstellverschraubung.cjs — the Abstellverschraubung family, in every finish.
 *
 * custom-data.json carried FOUR Abstellverschraubungen, all Verchromt (501), and
 * three of them untagged (no `productType`), so the accessory pool could not see
 * them at all: a Schwarz-matt mixer sat on a chrome stop valve with no alternative
 * to switch to. The scraped catalogue already held the rest.
 *
 * TWO sources, and reading only the first is why the first run of this script came
 * up short:
 *   · catalogue-inspection/ch6-api*.json — full SAP records (label, tech, price)
 *     but ONE finish per article, whichever the article page opened on.
 *   · chapter-6-variants-scraped.json    — the "Weitere Varianten" matrix, i.e. the
 *     OTHER finishes: Edelstahloptik, Titanschwarz/Gold matt/Rosengold PVD, Brushed
 *     copper, Brushed graphite. Gotcha (CLAUDE.md): `variants` is an OBJECT keyed by
 *     art-Nr, not an array — Array.isArray() reads it as empty.
 *
 * Entries are written per 7-digit BASE with the other finishes as `variants`, which
 * is what accSkuInColour needs to keep a user's chosen MODEL and swap only its colour.
 * IDEMPOTENT: matched by art-Nr; an existing entry only gains what it lacks, and a
 * localised `imgUrl` is never overwritten.
 *
 * SAP short text is TWO fields (maktx + maktx2) and the dumps truncate `maktx` at
 * ~40 chars — the label is stitched from both, with `description` carrying the rest
 * for fullLabel() to heal at render time.
 *
 * Images: NOT set. The dump's URL points at the vendor's PS1 bank and every image in
 * this app is a local `img/*.webp`; baking a remote URL puts live vendor traffic back
 * into the page (the shadow-ban trap). Run the localisation pipeline instead.
 *
 * A "Set à 2 Stück" IS injected — `packUnits()` in _shared.js reads the pack size out
 * of the label, so a position that needs two valves orders ONE set.
 *
 *   node st-scraper/inject-abstellverschraubung.cjs            # dry run
 *   node st-scraper/inject-abstellverschraubung.cjs --write    # apply (backs up first)
 */
const fs = require('fs');
const path = require('path');

const WRITE = process.argv.includes('--write');
const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'custom-data.json');
const API_DUMPS = ['catalogue-inspection/ch6-api.json', 'catalogue-inspection/ch6-api-refetch.json']
    .map(f => path.join(__dirname, f));
const VARIANT_DUMP = path.join(__dirname, 'chapter-6-variants-scraped.json');

// label-prefix by design: a label starting with "Abstellverschraubung" states what
// the article IS. Everything else in the range (Abdichtungsset, Rosette) is not.
const RX_IDENTITY = /^abstellverschraubung/i;
// Non-criteria attributes, dropped at ingest exactly as apply-refetched-text.cjs does.
const TECH_DROP = new Set(['Volumen', 'Gewicht', 'Geräuschgruppe', 'Energieeffizienzklasse']);

const artNr = (raw) => {
    const d = String(raw || '').replace(/[^0-9]/g, '');
    return d.length === 13 ? `${d.slice(0, 4)} ${d.slice(4, 7)}.${d.slice(7, 10)}.${d.slice(10)}` : String(raw || '').trim();
};
const baseOf = (a) => String(a || '').replace(/[^0-9]/g, '').slice(0, 7);
const clean = (s) => String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
// tech comes as ["Marke: KWC", …] in one dump and [{label,value}, …] in the other.
const techMap = (t) => {
    const out = {};
    for (const e of (Array.isArray(t) ? t : [])) {
        let k, v;
        if (e && typeof e === 'object') { k = e.label; v = e.value; }
        else { const m = /^([^:]+):\s*(.*)$/.exec(String(e || '')); if (m) { k = m[1]; v = m[2]; } }
        k = clean(k); v = clean(v);
        if (k && v && !TECH_DROP.has(k)) out[k] = v;
    }
    return out;
};

// art-Nr -> {label, description, tech, manufacturer}
const sku = new Map();
const remember = (art, label, description, tech) => {
    const prev = sku.get(art);
    const best = { artNr: art, label: clean(label), description: clean(description), tech: tech || (prev && prev.tech) || null };
    // The longer text wins: one dump truncates the label, the other the description.
    if (prev) {
        if ((prev.label || '').length > best.label.length) best.label = prev.label;
        if ((prev.description || '').length > (best.description || '').length) best.description = prev.description;
        if (!best.tech) best.tech = prev.tech;
    }
    best.manufacturer = (best.tech && best.tech['Marke']) || (prev && prev.manufacturer)
        || (/\bAlterna\b/i.test(best.label) ? 'Alterna' : (/(KWC|Laufen|Neoperl)/i.exec(best.label) || [])[1] || 'Andere');
    sku.set(art, best);
};

for (const file of API_DUMPS) {
    if (!fs.existsSync(file)) { console.warn(`missing dump: ${path.basename(file)}`); continue; }
    for (const rec of Object.values(JSON.parse(fs.readFileSync(file, 'utf8')))) {
        if (!rec || typeof rec !== 'object' || !rec.matnr) continue;
        const label = clean([rec.maktx, rec.maktx2].filter(Boolean).join(' '));
        const desc = clean(rec.description);
        if (!RX_IDENTITY.test(label) && !RX_IDENTITY.test(desc)) continue;
        remember(artNr(rec.matnr), RX_IDENTITY.test(label) ? label : desc, desc, techMap(rec.tech));
    }
}
if (fs.existsSync(VARIANT_DUMP)) {
    for (const entry of Object.values(JSON.parse(fs.readFileSync(VARIANT_DUMP, 'utf8')))) {
        if (!entry || typeof entry !== 'object') continue;
        // `variants` is an OBJECT keyed by art-Nr — see the header.
        for (const [art, v] of Object.entries(entry.variants || {})) {
            const desc = clean(v && v.desc);
            if (!RX_IDENTITY.test(desc)) continue;
            remember(artNr(art), desc, desc, null);
        }
    }
} else console.warn(`missing dump: ${path.basename(VARIANT_DUMP)}`);

// group by base: one pool entry, the other finishes as variants
const bases = new Map();
for (const s of [...sku.values()].sort((a, b) => a.artNr.localeCompare(b.artNr))) {
    const b = baseOf(s.artNr);
    if (!bases.has(b)) bases.set(b, []);
    bases.get(b).push(s);
}

const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const pool = (data.zubehoer_pool && data.zubehoer_pool.trays) || [];
if (!pool.length) { console.error('zubehoer_pool.trays is empty — wrong file?'); process.exit(1); }
const byArt = new Map(pool.map(p => [p.artNr, p]));

const added = [], grown = [], tagged = [];
let seq = 0;
for (const [b, skus] of [...bases].sort()) {
    // An entry already in the pool anchors the base, whichever finish it carries.
    const existing = skus.map(s => byArt.get(s.artNr)).find(Boolean);
    const head = existing ? skus.find(s => s.artNr === existing.artNr) : skus[0];
    const rest = skus.filter(s => s.artNr !== head.artNr);

    if (existing) {
        if (existing.productType !== 'Abstellverschraubung') tagged.push(head);
        existing.productType = 'Abstellverschraubung';
        if (!existing.manufacturer || existing.manufacturer === 'Andere') existing.manufacturer = head.manufacturer;
        if ((!existing.tech || !Object.keys(existing.tech).length) && head.tech) existing.tech = head.tech;
        existing.variants = existing.variants || [];
        for (const v of rest) {
            if (existing.variants.some(x => x && x.artNr === v.artNr) || byArt.has(v.artNr)) continue;
            existing.variants.push({ artNr: v.artNr, label: v.label, menge: 1, imgUrl: '' });
            grown.push(v);
        }
        continue;
    }
    pool.push({
        id: 'av_' + b + (++seq),
        manufacturer: head.manufacturer,
        form: 'Standard',
        size: 'Standard',
        montageart: 'alle',
        artNr: head.artNr,
        label: head.label,
        menge: 1,
        imgUrl: '',                 // see header: never a vendor URL
        variants: rest.map(v => ({ artNr: v.artNr, label: v.label, menge: 1, imgUrl: '' })),
        mountingMaterials: [],
        productType: 'Abstellverschraubung',
        tech: head.tech || undefined,
        description: head.description,
    });
    added.push(head);
    grown.push(...rest);
}

const colourOf = (a) => (/\.(\d{3})\./.exec(a) || [])[1] || '???';
const show = (list, title) => {
    console.log(`\n${title}: ${list.length}`);
    for (const r of list) console.log(`   ${r.artNr}  [${colourOf(r.artNr)}]  ${String(r.label).slice(0, 74)}`);
};
show(added, 'ADDED as a new base');
show(grown, 'ADDED as a finish variant');
show(tagged, 'TAGGED (already present, gained productType)');

const finishes = {};
let n = 0;
for (const p of pool) {
    if (p.productType !== 'Abstellverschraubung') continue;
    for (const s of [p, ...(p.variants || [])]) { finishes[colourOf(s.artNr)] = (finishes[colourOf(s.artNr)] || 0) + 1; n++; }
}
console.log(`\npool family after this run: ${n} SKUs — ${Object.entries(finishes).sort().map(([c, k]) => `${c}×${k}`).join(', ')}`);

if (!WRITE) { console.log('\nDRY RUN — nothing written. Re-run with --write to apply.'); process.exit(0); }
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backup = `${DATA}.bak-${stamp}`;
fs.copyFileSync(DATA, backup);
fs.writeFileSync(DATA, JSON.stringify(data, null, 2));   // MUST stay indent-2, or the diff is all 94k records
console.log(`\nbackup : ${path.basename(backup)}`);
console.log(`written: custom-data.json`);
