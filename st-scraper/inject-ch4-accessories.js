// Inject Ch4 Accessoires into zubehoer_pool (mirrors the Ch5 Spiegel injection).
// One pool tray per SKU variant, tagged productType + targetSubcats. NO new category.
// Data-only: UI toggles are wired separately. Companion/Hold/Exclude buckets are NOT injected.
//
// Usage:
//   node inject-ch4-accessories.js           # DRY RUN (counts + samples, writes nothing)
//   node inject-ch4-accessories.js --apply    # write custom-data.json + prices.json (minified)
const fs = require('fs');
const path = require('path');

const APPLY = process.argv.includes('--apply');
const SCRAPE = path.resolve(__dirname, 'chapter-4-variants-scraped.json');
const DATA = path.resolve(__dirname, '../custom-data.json');
const PRICES = path.resolve(__dirname, '../prices.json');

// ---- configurator code -> real custom-data.json category keys ----
const CODE2KEYS = {
    WTM: ['waschtischmischer'], WT: ['waschtisch'], MM: ['mixandmatch'],
    BM: ['bademischer'], DM: ['duschenmischer'], DTW: ['duschtrennwand'],
    BA: ['badeabtrennung'], BW: ['badewanne'], DWA: ['duschenwanne'],
    DR: ['duschenrinne'], WC: ['wandklosett', 'standklosett'], WTR: ['waschtrog'],
};
const keys = (codes) => [...new Set(codes.flatMap(c => CODE2KEYS[c] || []))];

const WASHBASIN = ['WTM', 'WT', 'MM'], MIRROR = ['WTM', 'MM', 'WT'], SHOWER = ['DM'],
    SHOWER_BM = ['DM', 'BM'], GLASS = ['DTW', 'BA'], SHOWERCURT = ['BW', 'DWA'],
    WC = ['WC'], TOWELDISP = ['WT', 'MM'], BATH = ['BW'], BATHTOWEL = ['BM', 'DM'], HEAT = ['DM', 'BM'];

// ---- family (leading noun of mainDesc) -> ['MAP', productType, targetCodes] | ['HOLD'] | ['EXCLUDE'] | ['COMPANION'] ----
const FAM = {};
const put = (names, disp) => names.forEach(n => { FAM[n] = disp; });

put(['Handtuchhalter', 'Handtuchhaken', 'Handtuchring', 'Handtuchstange', 'Handtuchständer', 'Handtuchablage',
    'Handtuchleiter', 'Hakenleiste', 'Haken', 'Doppelhaken', 'Einzelhaken', 'Kleiderhaken'], ['MAP', 'Handtuchhalter', WASHBASIN]);
put(['Glashalter', 'Doppelglashalter', 'Glastablar', 'Glasablage', 'Tablar', 'Schale', 'Ablage', 'Ablageboard', 'Holzablage',
    'Ablagekorb', 'Becher', 'Becherhalter', 'Zahnputzbecher', 'Zahnbecher', 'Glasbecher', 'Glas', 'Kristallglas',
    'Bleikristallglas', 'Schwammhalter'], ['MAP', 'Ablage', WASHBASIN]);
put(['Seifenspender', 'Seifenhalter', 'Drahtseifenhalter', 'Seifenschale', 'Seifen-', 'Lotionspender',
    'Handlotionspender', 'Schaumseifenspender', 'Spenderkombination', 'Spülmitteldispenser', 'Kombination', 'Elektronischer'], ['MAP', 'Seifenspender', WASHBASIN]);
put(['Kosmetiktuchbox', 'Kleenexhalter', 'Feuchtpapierbox'], ['MAP', 'Kosmetiktuchbox', WASHBASIN]);
put(['Föhnhalter'], ['MAP', 'Föhnhalter', WASHBASIN]);
put(['Spiegel', 'Kosmetikspiegel', 'Rasierspiegel', 'Wandspiegel', 'Kippspiegel'], ['MAP', 'Kosmetikspiegel', MIRROR]);
put(['Badetuchstange', 'Badetuchablage', 'Bademantelhaken'], ['MAP', 'Badetuchstange', BATHTOWEL]);
// Gleitstange is a STANDARD dropdown component of the mischer (not a free accessory) — own
// productType, kept in the pool (DM+BM) for the finish-matched dropdown; excluded from the
// Accessoires toggle (see DROPDOWN_TYPES in the configurators' populateAccessoires).
put(['Duschgleitstange', 'Duschengleitstange'], ['MAP', 'Duschgleitstange', SHOWER_BM]);
put(['Duschablage', 'Duschkorb', 'Brausenschieber',
    'Brausehalter', 'Handbrausehalterung'], ['MAP', 'Duschablage', SHOWER]);
put(['Klappsitz', 'Duschklappsitz'], ['MAP', 'Duschklappsitz', SHOWER_BM]);
put(['Wandnische'], ['MAP', 'Wandnische', SHOWER_BM]);
put(['Duschwischer', 'Duschabzieher', 'Duschspritzschutzhalter', 'Duschspritzschutz', 'Duschtürgriff', 'Griff-'], ['MAP', 'Duschwischer', GLASS]);
put(['Duschvorhang', 'Duschvorhangstange'], ['MAP', 'Duschvorhang', SHOWERCURT]);
put(['Papierhalter', 'Reserverollenhalter', 'Klosettbürstenhalter', 'Toilettenpapierhalter', 'Doppelpapierhalter',
    'Toilettenpapierspender', 'WC-Bürste', 'WC-Set', 'Klosettsitzreiniger', 'Hygienebeutelspender',
    'Hygieneabfallbehälter', 'Hygienekombination', 'Papierabfallbehälter', 'Papierhandtuchspender-Abfallbehälter',
    'Tampon-', 'Putztuchspender'], ['MAP', 'WC-Zubehör', WC]);
put(['Klappgriff'], ['MAP', 'Klappgriff', WC]);
put(['Papierhandtuchspender', 'Papierkorb', 'Abfallbehälter', 'Stoffhandtuchspender', 'Papierrollenspender',
    'Rollenpapierhandtuchspender'], ['MAP', 'Papierhandtuchspender', TOWELDISP]);
put(['Badewannenkissen', 'Badewannenablage', 'Sitzkissen', 'Multifunktionskissen'], ['MAP', 'Badewannenzubehör', BATH]);
put(['Badheizkörper', 'Handtuchwärmer'], ['MAP', 'Badheizkörper', HEAT]);

put(['Ablagekorb'], ['MAP', 'Duschablage', SHOWER]); // shower basket (after Ablage/washbasin so it wins)

put(['Haltegriff', 'Winkelgriff', 'Eckhaltegriff', 'Stützklappgriff', 'Duschhandlauf', 'Dusch-', 'Rückenstütze',
    'Einhängesitz', 'Einhänge-Duschsitz', 'Seitenwandgriff', 'Mobiler', 'Duschhocker', 'Badstuhl', 'Bad-Hocker', 'Wannengriff',
    'Badewannenhaltegriff', 'Badewannensitz', 'Wanneneinsteighilfe', 'Fussstütze', 'Armlehne', 'Stand'], ['HOLD']);

put(['Reinigungsmittelspender', 'Abtropfschale', 'Flüssigseife', 'Seifenkonzentrat', 'Seifencrème', 'Handseife',
    'Schaumseife', 'Schaumseifenkonzentrat', 'Desinfektionsmittel', 'Handdesinfektionsmittel', 'Reinigungsmittel',
    'Oberflächenreiniger', 'Ätherisches', 'Duftdose', 'Dufttab', 'Shampoo', 'Papierrolle', 'Falthandtücher', 'Hygienebeutel',
    'Vase', 'Kerzenständer', 'Kerzenhalter', 'Kleiderständer', 'Kleiderbügel', 'Kleiderboy', 'Türstopper',
    'Türschild', 'Piktogramm', 'Wandstange', 'Duftspender', 'Desinfektionssäule', 'Desinfektionsmittelspender',
    'Transportsystem', 'Händetrockner', 'Haartrockner', 'Duschgriff', 'Lufterfrischer'], ['EXCLUDE']);

put(['Befestigungsmaterial', 'Montageplatte', 'Abdeckung', 'Abdeckplatte', 'Adapterplatte', 'Deckenstütze',
    'Klebeset', 'Befestigungsset', 'Panel', 'Wandhalterung', 'Rahmen', 'Wandflansch', 'Rosette', 'Innenbehälter',
    'Klappdeckelaufsatz', 'Sackhalterung', 'Deckel', 'Batteriepack', 'Lochbohrung', 'Tablarhalter',
    'Seifenspenderhalter', 'Schallschutzset', 'Abfall-Abwurfklappe', 'Abfall-Abwurfhülse', 'Aufrüstsatz',
    'Höhenverstellung', 'Gleitgelenkhalter', 'Stabilisierungsstrebe', 'Ablagekorbdeckel', 'Coverbox',
    'Papierhandtuch-', 'Steuergerät', 'Einhängesäcke'], ['COMPANION']);

// Full-text EXCLUDE override: device/consumable terms that can hide behind an adjective leading token
// (e.g. "Elektronischer Desinfektionsmittelspender"). Keeps the GLOBAL full-text-classification rule.
const EXCLUDE_KW = ['Desinfektionsmittelspender', 'Desinfektionssäule', 'Duftspender', 'Reinigungsmittelspender',
    'Händetrockner', 'Haartrockner', 'Lufterfrischer'];

function classify(mainDesc) {
    const t = mainDesc || '';
    if (EXCLUDE_KW.some(k => t.includes(k))) return ['EXCLUDE'];
    const first = t.split(',')[0].trim().split(' ')[0];
    return FAM[first] || ['UNMAPPED'];
}

// ---- enrichment helpers ----
const getSanitasImgUrl = (artNr) => {
    if (!artNr) return '';
    const cleanArt = String(artNr).replace(/[^0-9.]/g, '');
    if (!cleanArt) return '';
    const parts = cleanArt.split('.');
    let p1 = parts[0];
    if (p1.length === 7) p1 = '0' + p1;
    if (parts.length >= 3) return `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/${p1}_${parts[1]}_${parts[2]}.png`;
    return `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/${p1}.png`;
};
const BRANDS = ['Keuco', 'Hewi', 'CWS', 'KWC', 'Hygolet', 'Hansgrohe', 'Frost', 'Bodenschatz', 'Nosag', 'Emco',
    'Inda', 'Gessi', 'Bobrick', 'Proox', 'Laufen', 'Geberit', 'Kartell', 'Alterna', 'Franke', 'Diaqua', 'Zack',
    'Cosmic', 'Giese', 'Smedbo', 'Keuco', 'Normbau', 'Damixa', 'Similor', 'Steinberg', 'Avenarius'];
const brandOf = (t) => BRANDS.find(b => t.includes(b)) || 'Andere';
const SIZE_RE = [/Ø ?\d+([.,]\d+)? ?cm/, /\d+ ?x ?\d+(?: ?x ?\d+)? ?(?:cm|mm)/, /Breite ?\d+([.,]\d+)? ?(?:cm|mm)/,
    /\d+([.,]\d+)? ?cm/, /\d+ ?mm/];
const sizeOf = (t) => { for (const re of SIZE_RE) { const m = t.match(re); if (m) return m[0].trim(); } return 'Standard'; };

// ---- build ----
const scrape = JSON.parse(fs.readFileSync(SCRAPE, 'utf8'));
const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const pricesFile = JSON.parse(fs.readFileSync(PRICES, 'utf8'));
const prices = pricesFile.prices;
const pool = data.zubehoer_pool;
const existingArt = new Set(pool.trays.map(t => t && t.artNr).filter(Boolean));
const poolByArt = new Map(); pool.trays.forEach(t => { if (t && t.artNr) poolByArt.set(t.artNr, t); });

const bucketCounts = { MAP: 0, HOLD: 0, EXCLUDE: 0, COMPANION: 0, UNMAPPED: 0 };
const ptypeCounts = {}, skuUnmapped = {};
const newTrays = []; let pricesAdded = 0, skipDup = 0, retagged = 0;

for (const [base, rec] of Object.entries(scrape)) {
    if (rec.status !== 'done') continue;
    const mainDesc = rec.mainDesc || '';
    if (!mainDesc) continue;
    const disp = classify(mainDesc);
    bucketCounts[disp[0]] = (bucketCounts[disp[0]] || 0) + 1;
    if (disp[0] === 'UNMAPPED') { skuUnmapped[mainDesc.split(',')[0]] = (skuUnmapped[mainDesc.split(',')[0]] || 0) + 1; continue; }
    if (disp[0] !== 'MAP') continue;
    const [, productType, codes] = disp;
    const targetSubcats = keys(codes);
    ptypeCounts[productType] = ptypeCounts[productType] || { bases: 0, skus: 0 };
    ptypeCounts[productType].bases++;
    for (const [artNr, v] of Object.entries(rec.variants || {})) {
        const label = v.desc || mainDesc;
        const digits = artNr.replace(/[^0-9]/g, '');
        if (existingArt.has(artNr)) {
            // Pre-existing pool entry (older import) — re-tag it in place so it surfaces in the
            // Accessoires toggle alongside its injected siblings (e.g. the Verchromt sabo variants).
            const ex = poolByArt.get(artNr);
            if (ex && !ex.productType) {
                if (APPLY) {
                    ex.productType = productType;
                    ex.targetSubcats = targetSubcats;
                    if (!ex.manufacturer || ex.manufacturer === 'Andere') ex.manufacturer = brandOf(label);
                    if (!ex.size || ex.size === 'Standard') ex.size = sizeOf(label);
                    if (!ex.imgUrl) ex.imgUrl = getSanitasImgUrl(artNr);
                }
                retagged++;
            } else { skipDup++; }
            continue;
        }
        existingArt.add(artNr);
        newTrays.push({
            id: 'ch4_' + digits,
            manufacturer: brandOf(label),
            form: 'Standard',
            size: sizeOf(label),
            artNr,
            label,
            description: label,
            menge: 1,
            imgUrl: getSanitasImgUrl(artNr),
            productType,
            targetSubcats,
        });
        ptypeCounts[productType].skus++;
        if (v.price != null && prices[artNr] == null) { if (APPLY) prices[artNr] = v.price; pricesAdded++; }
    }
}

// ---- report ----
console.log('=== Ch4 accessory injection ' + (APPLY ? '(APPLY)' : '(DRY RUN)') + ' ===');
console.log('bases by bucket:', bucketCounts);
if (Object.keys(skuUnmapped).length) console.log('UNMAPPED families:', skuUnmapped);
console.log('\nMAP productTypes (bases / SKUs):');
for (const [pt, c] of Object.entries(ptypeCounts).sort((a, b) => b[1].skus - a[1].skus))
    console.log(`  ${pt.padEnd(22)} ${String(c.bases).padStart(4)} / ${c.skus}`);
console.log(`\nnew pool trays: ${newTrays.length} | re-tagged existing: ${retagged} | duplicate skipped: ${skipDup} | prices to add: ${pricesAdded}`);
console.log(`pool.trays: ${pool.trays.length} -> ${pool.trays.length + newTrays.length}`);
console.log('\nsample trays:');
newTrays.slice(0, 6).forEach(t => console.log('  ' + JSON.stringify(t)));

if (APPLY) {
    pool.trays.push(...newTrays);
    pricesFile.meta.entries = Object.keys(prices).length;
    fs.writeFileSync(DATA, JSON.stringify(data));
    fs.writeFileSync(PRICES, JSON.stringify(pricesFile));
    console.log(`\nWROTE custom-data.json (${pool.trays.length} trays) + prices.json (${Object.keys(prices).length} prices).`);
} else {
    console.log('\nDRY RUN — nothing written. Re-run with --apply to commit.');
}
