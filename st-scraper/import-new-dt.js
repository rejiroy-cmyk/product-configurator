const fs = require('fs');
const path = require('path');
// custom-data.json is stored INTERNED (repeated mountingMaterials options and
// services live once in a shared table) — readData/writeData hide that. Reading it
// with fs directly yields the STRING "o412" where an option object is expected.
const { readData, writeData } = require('./_dataFile.cjs');

const DATA_PATH = path.resolve(__dirname, '../custom-data.json');
const CSV_FILE = process.argv[2];

if (!CSV_FILE || !fs.existsSync(CSV_FILE)) {
    console.error('Usage: node import-new-dt.js <path-to-csv>');
    process.exit(1);
}

const csvContent = fs.readFileSync(CSV_FILE, 'utf8');

// Simple CSV parser
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

const rawRows = parseCSV(csvContent);
const headers = rawRows[0].map(h => h.toLowerCase());
const records = rawRows.slice(1).map(r => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = r[i]);
    return obj;
});

let data = readData();
if (!data.duschtrennwand) data.duschtrennwand = { trays: [] };
const existing = data.duschtrennwand.trays;
const existingArtNrs = new Set(existing.map(t => t.artNr));

let clusters = [];
let current = null;

records.forEach(r => {
    if (r.isservice === 'true') {
        if (current) current.services.push({ artNr: r.artnr, label: r.label, qty: 1 });
    } else {
        if (current) clusters.push(current);
        current = {
            artNr: r.artnr,
            label: r.label,
            brand: r.brand,
            form: r.form,
            size: r.size,
            glasart: r.glasart,
            farbe: r.farbe,
            band: r.band,
            services: []
        };
    }
});
if (current) clusters.push(current);

let added = 0;
let skipped = 0;

clusters.forEach(c => {
    if (existingArtNrs.has(c.artNr)) {
        const ext = existing.find(t => t.artNr === c.artNr);
        ext.form = c.form || ext.form;
        ext.montageart = "alle";
        if (!ext.specs) ext.specs = {};
        if (c.farbe) ext.specs["Farbe"] = c.farbe;
        if (c.glasart) ext.specs["Ausführung"] = c.glasart;
        if (c.band) ext.specs["Ausprägung"] = c.band;
        if (c.size) ext.specs["Breite"] = c.size;
        
        const extServSet = new Set((ext.services||[]).map(s=>s.artNr));
        c.services.forEach(s => {
            if (!extServSet.has(s.artNr)) {
                if(!ext.services) ext.services = [];
                ext.services.push(s);
            }
        });
        skipped++;
    } else {
        const id = 'csv_' + Math.random().toString(36).substring(2, 9);
        const product = {
            id,
            label: c.label,
            artNr: c.artNr,
            manufacturer: c.brand || 'Alterna',
            form: c.form,
            montageart: "alle",
            menge: 1,
            variants: [],
            services: c.services,
            mountingMaterials: [],
            specs: {
                "Farbe": c.farbe,
                "Ausführung": c.glasart,
                "Ausprägung": c.band,
                "Breite": c.size
            }
        };
        existing.push(product);
        added++;
    }
});

writeData(data, { backup: false });
console.log(`Updated JSON! Added ${added} new products, updated ${skipped} existing products.`);
