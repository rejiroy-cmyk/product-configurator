#!/usr/bin/env node
/**
 * inject-cws-panels.cjs — the CWS front panels, so "ohne Panel" can be closed.
 *
 * 24 CWS dispensers in `zubehoer_pool` state in their own text that they ship
 * WITHOUT the front panel and name the panel's art-Nr base right there:
 *
 *     "… Schaumgenerator für Seifenkonzentrate, ohne Panel CF Slim 4611 230"
 *
 * The panels themselves were never injected — `4611 230.*` is not in
 * custom-data.json at all — so the rule that adds one to the BOM had nothing to
 * resolve. They ARE in the Ch4 scrape (`chapter-4-variants-scraped.json`), which
 * is the shop's own per-art-Nr variant list, plus the catalogue dump for the two
 * bases the variant run never reached.
 *
 * Injects the WHITE variant only (finish code 100 — COLOUR RULE: the finish is the
 * art-Nr triplet, never label text). White is the panel the configurator always
 * orders; the other six colours (309/341/343/350/730/801 Paradise, 341/347
 * PureLine) are a deliberate omission — nothing selects them, and carrying them
 * would put six unreachable SKUs into every accessory facet list.
 *
 * `4611 183.000.000` (Handlotionspender CWS Paradise Slim) is the one dispenser
 * whose ERP text says "ohne Panel" and then stops — no art-Nr. The catalogue
 * pairs it on page 4.169 (the Zubehör art-Nr listed with the product is
 * `4611 184`), so that pairing is written onto the dispenser as `panelBase`
 * rather than guessed at render time.
 *
 * Labels: the shop's white row is truncated like every ERP short text, and the
 * coloured siblings carry the full sentence. `description` is healed from a
 * sibling with its colour name swapped for "Weiss", so fullLabel() can stitch.
 *
 * Images: NOT set — see inject-abstellverschraubung.cjs. Run the localisation
 * pipeline for these art-Nrs instead of baking a vendor URL.
 *
 * IDEMPOTENT: matched by art-Nr; an existing entry only gains the fields it lacks.
 *
 *   node st-scraper/inject-cws-panels.cjs            # dry run
 *   node st-scraper/inject-cws-panels.cjs --write    # apply (backs up first)
 */
const fs = require('fs');
const path = require('path');

const WRITE = process.argv.includes('--write');
const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'custom-data.json');
const PRICES = path.join(ROOT, 'prices.json');
const VARIANTS = path.join(__dirname, 'chapter-4-variants-scraped.json');

const WHITE = '100';                       // COLOR_NAMES['100'] === 'Weiss'
// label-prefix by design: a label starting with "Panel " states what the article IS.
const RX_PANEL_IDENTITY = /^panel\b/i;
// The colour name the shop appends to a sibling's full text, so it can be swapped for Weiss.
const SIBLING_COLOURS = /,\s*(Navy blue|Silber|Rot|Schwarz|Forest green|Posh purple|Mintgrün)\s*$/i;

// Panels the Ch4 variant run never reached. Both are in
// catalogue-inspection/ch4-products.json with an explicit "Farbe: 100, …" list,
// so the white SKU is stated by the catalogue, not synthesized here.
const FROM_CATALOGUE = {
    '4611 236': {
        label: 'Panel CWS Paper Slim, zu Papierhandtuchspender CWS Paradise Paper',
        description: 'Panel CWS Paper Slim, zu Papierhandtuchspender CWS Paradise Paper Slim S, Kunststoff, Weiss',
        price: 46.5,
    },
};

// The one dispenser whose text names no panel (catalogue p. 4.169 pairs them).
const PANEL_BASE_BY_ARTICLE = { '4611 183.000.000': '4611 184' };

const fmtArt = (base, code) => `${base}.${code}.000`;
const clean = (s) => String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const baseOf = (art) => { const d = String(art || '').replace(/[^0-9]/g, ''); return d.length >= 7 ? `${d.slice(0, 4)} ${d.slice(4, 7)}` : null; };

// ── 1. Which panels does the catalogue actually ask for? ──────────────────────
// FULL-TEXT RULE: "ohne Panel <name> <art-Nr>" lives in the description; the
// label truncates long before the number.
const RX_OHNE_PANEL = /ohne\s+panel\b[^.;]*?(\d{4})\s*(\d{3})\b/i;

const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const trays = (data.zubehoer_pool && data.zubehoer_pool.trays) || [];
if (!trays.length) { console.error('zubehoer_pool.trays is empty — wrong data file?'); process.exit(1); }

const wanted = new Map();          // panel base -> [dispenser art-Nrs asking for it]
const noBase = [];                 // dispensers that say "ohne Panel" and name nothing
for (const t of trays) {
    const text = clean(`${t.label || ''} ${t.description || ''}`);
    if (!/ohne\s+panel/i.test(text)) continue;
    const m = RX_OHNE_PANEL.exec(text);
    if (!m) { noBase.push(t.artNr); continue; }
    const base = `${m[1]} ${m[2]}`;
    if (!wanted.has(base)) wanted.set(base, []);
    wanted.get(base).push(t.artNr);
}
for (const [art, base] of Object.entries(PANEL_BASE_BY_ARTICLE)) {
    if (!trays.some(t => t.artNr === art)) continue;
    if (!wanted.has(base)) wanted.set(base, []);
    wanted.get(base).push(`${art} (via catalogue pairing)`);
}

console.log(`"ohne Panel" dispensers: ${[...wanted.values()].flat().length}, distinct panels: ${wanted.size}`);
if (noBase.length) console.log(`  no art-Nr in text (need PANEL_BASE_BY_ARTICLE): ${noBase.join(', ')}`);

// ── 2. Resolve each panel's white SKU ────────────────────────────────────────
const variants = JSON.parse(fs.readFileSync(VARIANTS, 'utf8'));

const resolve = (base) => {
    const key = base.replace(/\s/g, '');
    const art = fmtArt(base, WHITE);
    const entry = variants[key];
    if (entry && entry.variants && entry.variants[art]) {
        const white = entry.variants[art];
        // The white row is the truncated shop listing; a coloured sibling carries
        // the full sentence. Heal `description` off the sibling, colour swapped.
        let description = clean(white.desc);
        const sibling = Object.entries(entry.variants).find(([a, o]) => a !== art && SIBLING_COLOURS.test(clean(o.desc)));
        if (sibling) description = clean(sibling[1].desc).replace(SIBLING_COLOURS, ', Weiss');
        else if (!/,\s*weiss\s*$/i.test(description)) description = `${description}, Weiss`;
        return { artNr: art, label: clean(white.desc), description, price: white.price };
    }
    if (FROM_CATALOGUE[base]) return { artNr: art, ...FROM_CATALOGUE[base] };
    return null;
};

const upserts = [];
const unresolved = [];
for (const base of [...wanted.keys()].sort()) {
    const rec = resolve(base);
    if (!rec) { unresolved.push(base); continue; }
    if (!RX_PANEL_IDENTITY.test(rec.label)) { unresolved.push(`${base} (not a Panel: "${rec.label}")`); continue; }
    upserts.push(rec);
}

if (unresolved.length) {
    console.log(`\n⚠  ${unresolved.length} panel(s) could not be resolved — they stay out of the data ` +
        `so the BOM shows a visible warning row instead of a guessed art-Nr:`);
    unresolved.forEach(b => console.log(`     ${b}`));
}

// ── 3. Upsert ────────────────────────────────────────────────────────────────
const byArt = new Map(trays.map(t => [t.artNr, t]));
let added = 0, updated = 0;
for (const rec of upserts) {
    const existing = byArt.get(rec.artNr);
    if (existing) {
        let touched = false;
        if (!existing.description || existing.description.length < rec.description.length) { existing.description = rec.description; touched = true; }
        if (!existing.productType) { existing.productType = 'Panel'; touched = true; }
        if (!existing.manufacturer) { existing.manufacturer = 'CWS'; touched = true; }
        if (touched) updated++;
        continue;
    }
    trays.push({
        id: `ch4_${rec.artNr.replace(/[^0-9]/g, '')}`,
        manufacturer: 'CWS',
        form: 'Standard',
        size: 'Standard',
        artNr: rec.artNr,
        label: rec.label,
        description: rec.description,
        menge: 1,
        imgUrl: '',
        productType: 'Panel',
        // No targetSubcats: a panel is never picked on its own — the dispenser's
        // "ohne Panel" text pulls it in. Tagging it would put it in every
        // Accessoires facet list as a standalone choice.
        tech: { Marke: 'CWS', Serie: /pureline/i.test(rec.description) ? 'PureLine' : 'Paradise', Farbe: 'Weiss' },
    });
    added++;
}

// The dispenser whose text names no panel gets the catalogue pairing as a field.
let tagged = 0;
for (const [art, base] of Object.entries(PANEL_BASE_BY_ARTICLE)) {
    const t = byArt.get(art);
    if (!t) continue;
    if (t.panelBase === base) continue;
    t.panelBase = base;
    tagged++;
}

// ── 4. Prices ────────────────────────────────────────────────────────────────
// The shop scrape is per-art-Nr and authoritative. prices.json already holds an
// entry for five of these panels, and every one of them is the DISPENSER's price
// bled across by the catalogue PDF parser — the "ohne Panel … Farbe: 100, …"
// footer sits inside the dispenser's own block, so both art-Nrs got its number
// (4611 314 and 4611 315 are both CHF 1204; 4611 300/302/309/311/322/324 all 199).
// A CHF 199 panel row would misprice every BOM it lands in, so the scraped value
// wins here — each correction is printed.
const priceDoc = JSON.parse(fs.readFileSync(PRICES, 'utf8'));
let pAdded = 0;
const pFixed = [];
for (const rec of upserts) {
    if (rec.price == null) continue;
    const cur = priceDoc.prices[rec.artNr];
    if (cur == null) { priceDoc.prices[rec.artNr] = rec.price; pAdded++; }
    else if (Math.abs(cur - rec.price) > 0.01) {
        pFixed.push(`${rec.artNr}: ${cur} (catalogue bleed) → ${rec.price} (shop scrape)`);
        priceDoc.prices[rec.artNr] = rec.price;
    }
}

console.log(`\nPanels: +${added} added, ${updated} updated, ${tagged} dispenser(s) tagged with panelBase`);
console.log(`Prices: +${pAdded} added, ${pFixed.length} corrected`);
pFixed.forEach(c => console.log(`     ${c}`));
upserts.forEach(r => console.log(`   ${r.artNr}  ${r.price != null ? String(r.price).padStart(7) : '      ?'}  ${r.label}`));

if (!WRITE) { console.log('\n(dry run — pass --write to apply)'); process.exit(0); }

for (const f of [DATA, PRICES]) fs.copyFileSync(f, `${f}.bak-panels`);
fs.writeFileSync(DATA, JSON.stringify(data, null, 2));
fs.writeFileSync(PRICES, JSON.stringify(priceDoc, null, 2));
console.log('\n✅ written (backups: *.bak-panels)');
