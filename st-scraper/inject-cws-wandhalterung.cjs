#!/usr/bin/env node
/**
 * inject-cws-wandhalterung.cjs — the wall bracket the CWS Papierkörbe hang on.
 *
 * "Papierkorb CWS, 31 x 21 cm, … zusammenlegbar, freistehend, **ohne
 * Befestigungsmaterial**" — the bin ships with nothing to fix it to a wall. The
 * catalogue lists exactly one Zubehör against all four CWS Papierkorb bases
 * (pp. 4.170 and 4.179):
 *
 *     4611 611 (Eisengitter 31×21) ─┐
 *     4611 612 (Eisengitter 40×25) ─┤
 *     4611 861 (Stainless 40×25)   ─┼─→  4611 863  Wandhalterung CWS weiss
 *     4611 862 (Stainless 30×18)   ─┘
 *
 * `4611 863.000.000` was never injected, so the configurator had no article to
 * put under a bin. It IS in the Ch4 scrape (the shop's own per-art-Nr page):
 * "Wandhalterung CWS weiss, Weiss", CHF 7.80.
 *
 * NOT injected: the Paperbin Zubehör (`4611 876/877`, `879/880`, `882/883`).
 * Those read as brackets in a Zubehör column but are **Deckel** and **Rahmen** —
 * lids and frames, not wall mounts. And no other brand's Abfallbehälter has a
 * bracket article in the catalogue at all: the five "Wandhalter*" articles
 * already in the pool belong to Duschwischer and Geberit Duofix. That is why the
 * pairing is an explicit list and not inferred from "Wandmontage" in the text —
 * most bins say they CAN be wall-mounted while no bracket exists to order.
 *
 * Images: NOT set — see inject-abstellverschraubung.cjs.
 * IDEMPOTENT: matched by art-Nr; an existing entry only gains the fields it lacks.
 *
 *   node st-scraper/inject-cws-wandhalterung.cjs            # dry run
 *   node st-scraper/inject-cws-wandhalterung.cjs --write    # apply (backs up first)
 */
const fs = require('fs');
const path = require('path');
// custom-data.json is stored INTERNED (repeated mountingMaterials options and
// services live once in a shared table) — readData/writeData hide that. Reading it
// with fs directly yields the STRING "o412" where an option object is expected.
const { readData, writeData } = require('./_dataFile.cjs');

const WRITE = process.argv.includes('--write');
const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'custom-data.json');
const PRICES = path.join(ROOT, 'prices.json');
const VARIANTS = path.join(__dirname, 'chapter-4-variants-scraped.json');

const BRACKET_ART = '4611 863.000.000';
// The bin bases the catalogue pairs this bracket with (pp. 4.170, 4.179).
const BINS = ['4611 611', '4611 612', '4611 861', '4611 862'];

const data = readData();
const trays = (data.zubehoer_pool && data.zubehoer_pool.trays) || [];
if (!trays.length) { console.error('zubehoer_pool.trays is empty — wrong data file?'); process.exit(1); }

const variants = JSON.parse(fs.readFileSync(VARIANTS, 'utf8'));
const entry = variants[BRACKET_ART.replace(/[^0-9]/g, '').slice(0, 7)];
const scraped = entry && entry.variants && entry.variants[BRACKET_ART];
if (!scraped) { console.error(`${BRACKET_ART} is not in the Ch4 scrape — refusing to synthesize it.`); process.exit(1); }

const clean = (s) => String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const label = clean(scraped.desc);
const price = scraped.price;

// Which bins in the data will this bracket serve?
const served = trays.filter(t => BINS.some(b => String(t.artNr || '').startsWith(b + '.')));
console.log(`Bracket : ${BRACKET_ART}  "${label}"  CHF ${price}`);
console.log(`Serves  : ${served.length} bin SKU(s)`);
served.forEach(t => console.log(`   ${t.artNr}  ${(t.label || '').slice(0, 70)}`));
if (!served.length) console.log('   ⚠  none found — the bins are not in this data file, the bracket would be dead weight.');

let added = 0, updated = 0;
const existing = trays.find(t => t.artNr === BRACKET_ART);
if (existing) {
    if (!existing.productType) { existing.productType = 'Wandhalterung'; updated++; }
    if (!existing.manufacturer) { existing.manufacturer = 'CWS'; updated++; }
} else {
    trays.push({
        id: `ch4_${BRACKET_ART.replace(/[^0-9]/g, '')}`,
        manufacturer: 'CWS',
        form: 'Standard',
        size: 'Standard',
        artNr: BRACKET_ART,
        label,
        description: label,
        menge: 1,
        imgUrl: '',
        productType: 'Wandhalterung',
        // No targetSubcats: a bracket is never picked on its own — the bin pulls it in.
        tech: { Marke: 'CWS', Farbe: 'Weiss' },
    });
    added++;
}

const priceDoc = JSON.parse(fs.readFileSync(PRICES, 'utf8'));
let pAdded = 0, pFixed = null;
const cur = priceDoc.prices[BRACKET_ART];
if (cur == null) { priceDoc.prices[BRACKET_ART] = price; pAdded++; }
else if (Math.abs(cur - price) > 0.01) { pFixed = `${cur} → ${price}`; priceDoc.prices[BRACKET_ART] = price; }

console.log(`\nArticle: +${added} added, ${updated} field(s) filled`);
console.log(`Price  : +${pAdded} added${pFixed ? `, corrected ${pFixed}` : ''}`);

if (!WRITE) { console.log('\n(dry run — pass --write to apply)'); process.exit(0); }

for (const f of [DATA, PRICES]) fs.copyFileSync(f, `${f}.bak-wandhalterung`);
writeData(data, { backup: false });
fs.writeFileSync(PRICES, JSON.stringify(priceDoc, null, 2));
console.log('\n✅ written (backups: *.bak-wandhalterung)');
