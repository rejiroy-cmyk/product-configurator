/**
 * import-duschtrennwand.js
 * Enriches and injects Alterna liva/costa/primo Duschtrennwand CSV data
 * into custom-data.json, matching the existing lin.3 data structure.
 *
 * Usage: node st-scraper/import-duschtrennwand.js
 */

const fs   = require('fs');
const path = require('path');

const DATA_PATH = path.resolve(__dirname, '../custom-data.json');

// ─── CSV FILES TO IMPORT ────────────────────────────────────────────────────
const SOURCES = [
    { file: path.resolve(__dirname, '../DT_liva.csv'),   serie: 'liva'  },
    { file: path.resolve(__dirname, '../DT_costa.csv'),  serie: 'costa' },
    { file: path.resolve(__dirname, '../DT_primo.csv'),  serie: 'primo' },
    { file: path.resolve(__dirname, '../geklebt.csv'),  serie: 'lin.3' },
];

// ─── SERVICE ARTNER PATTERNS (these are services, not products) ─────────────
const SERVICE_KEYWORDS = [
    'montagepauschale', 'massaufnahme', 'anfahrtspauschale',
    'demontage', 'entsorgung', 'nettobetrag', 'ronal', 'duscholux', 'duka'
];

function isServiceItem(label) {
    const l = label.toLowerCase();
    return SERVICE_KEYWORDS.some(k => l.includes(k));
}

// ─── CSV PARSER (handles quoted fields with commas) ─────────────────────────
function parseCSV(content) {
    const rows = [];
    let row = [], field = '', inQ = false;
    for (let i = 0; i < content.length; i++) {
        const c = content[i];
        if (c === '"') { inQ = !inQ; }
        else if (c === ',' && !inQ) { row.push(field.trim()); field = ''; }
        else if ((c === '\n' || c === '\r') && !inQ) {
            if (field.trim() || row.length) { row.push(field.trim()); rows.push(row); }
            row = []; field = '';
        } else { field += c; }
    }
    if (field.trim() || row.length) { row.push(field.trim()); rows.push(row); }
    return rows;
}

// ─── EINBAUART DETECTION (for `form` field) ─────────────────────────────────
function detectEinbauart(label) {
    const l = label.toLowerCase();
    if (l.includes('eckeinstieg'))                              return 'Eckeinstieg';
    if (l.includes('freistehend'))                              return 'Freistehend';
    if (l.includes('nische'))                                   return 'Nische';
    if (l.includes('mit seitenwand') || l.includes('seitenwand')) return 'mit Seitenwand';
    return 'Standard';
}

// ─── SIZE EXTRACTION ────────────────────────────────────────────────────────
function extractSize(label) {
    // Match patterns like "90 x 90 cm", "Breite 120 cm", "(88 - 91 cm)", "120 x 90"
    const m1 = label.match(/(\d{2,3})\s*x\s*(\d{2,3})\s*cm/i);
    if (m1) return `${m1[1]} x ${m1[2]}`;

    const m2 = label.match(/(\d{2,3})\s*x\s*(\d{2,3})/);
    if (m2) return `${m2[1]} x ${m2[2]}`;

    // Single width: "Breite 120 cm" or "Breite bis 120 cm"
    const m3 = label.match(/breite\s+(?:bis\s+)?(\d{2,3}(?:[,.]\d+)?)\s*cm/i);
    if (m3) return `${m3[1]} cm`;

    return '';
}

// ─── IMAGE URL ───────────────────────────────────────────────────────────────
function buildImgUrl(artNr) {
    const clean = '0' + artNr.replace(/\s/g, '').replace(/\./g, '_');
    // Format: 01541756_591_118
    const base = artNr.replace(/\s/g, '');
    const formatted = '0' + base.replace(/(\d{7})(\d{3})\.(\d{3})\.(\d{3})/, '$1_$2.$3.$4')
                              .replace(/(\d+)\.(\d{3})\.(\d{3})/, '$1_$2_$3');
    return `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/0${artNr.replace(/\s/g,'').replace(/\./g,'_')}.png`;
}

// ─── MAIN IMPORT ────────────────────────────────────────────────────────────
let data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

if (!data.duschtrennwand) data.duschtrennwand = { trays: [] };
const existing = data.duschtrennwand.trays;

const existingArtNrs = new Set(existing.map(t => t.artNr));
let totalAdded = 0, totalSkipped = 0, totalDupes = 0;

SOURCES.forEach(({ file, serie }) => {
    if (!fs.existsSync(file)) {
        console.log(`⚠️  File not found: ${file} — skipping.`);
        return;
    }

    const rows = parseCSV(fs.readFileSync(file, 'utf8')).slice(1); // skip header
    console.log(`\n📂 Processing ${path.basename(file)} (serie: ${serie}) — ${rows.length} rows`);

    // Group rows into [product + its services]
    const clusters = [];
    let current = null;

    rows.forEach(r => {
        const [artNr, label, brand] = r;
        if (!artNr || !label) return;

        const lbl = label.toLowerCase();
        const isService = isServiceItem(label);

        if (!isService && brand === 'Alterna') {
            // New product — save previous cluster, start new
            if (current) clusters.push(current);
            current = { artNr, label, brand, services: [] };
        } else if (current) {
            // Service item belonging to current product
            current.services.push({ artNr, label, qty: 1 });
        }
    });
    if (current) clusters.push(current); // push last

    console.log(`   → ${clusters.length} product clusters found`);

    // Deduplicate within this file by artNr
    const seenInFile = new Set();
    const unique = clusters.filter(c => {
        if (seenInFile.has(c.artNr)) { totalDupes++; return false; }
        seenInFile.add(c.artNr);
        return true;
    });
    console.log(`   → ${unique.length} unique products (${clusters.length - unique.length} duplicates removed)`);

    // Build enriched objects and inject
    unique.forEach(c => {
        if (existingArtNrs.has(c.artNr)) {
            totalSkipped++;
            return; // Already in DB — don't overwrite
        }

        const einbauart = detectEinbauart(c.label);
        const size      = extractSize(c.label);
        const id        = `${serie}_${c.artNr.replace(/\s/g, '_').replace(/\./g, '')}`;

        const product = {
            id,
            label:        c.label,
            artNr:        c.artNr,
            manufacturer: 'Alterna',
            serie,
            form:         einbauart,
            size,
            services:     c.services,
            imgUrl:       buildImgUrl(c.artNr),
            variants:     [],
            mountingMaterials: []
        };

        existing.push(product);
        existingArtNrs.add(c.artNr);
        totalAdded++;
    });

    console.log(`   ✅ Added ${totalAdded} so far`);
});

// Save
fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 4));

console.log(`
════════════════════════════════════════
✅ Import complete!
   Added:    ${totalAdded} new products
   Skipped:  ${totalSkipped} (already in DB)
   Dupes:    ${totalDupes} (removed within files)
   Total duschtrennwand in DB: ${data.duschtrennwand.trays.length}
════════════════════════════════════════
`);

// Preview enrichment quality
const newProds = data.duschtrennwand.trays.filter(t => ['liva','costa','primo'].includes(t.serie));
const byForm = {};
const bySerie = {};
newProds.forEach(t => {
    byForm[t.form]   = (byForm[t.form]||0)+1;
    bySerie[t.serie] = (bySerie[t.serie]||0)+1;
});
console.log('Series breakdown:', JSON.stringify(bySerie));
console.log('Einbauart (form) breakdown:', JSON.stringify(byForm));
