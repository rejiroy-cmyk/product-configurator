/**
 * pdf-to-csv.js
 * Parses a Sanitas Troesch PDF (from profishop) into a clean CSV.
 * Auto-detects: ArtNr, Label, Size, Ablage (links/rechts/beidseitig), Hahnloch, Überlauf
 *
 * Usage: node st-scraper/pdf-to-csv.js <path-to-pdf> [output.csv]
 */

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

const PAGE_HEADER_RE = /https?:\/\/\S+\d{2}\.\d{2}\.\d{4}/;
const ART_NR_LINE_RE = /^\d+0(\d+)\.(\d{5}\s+\d{3}\.\d{3}\.\d{3})URP([\d'.]+)[\d'.]+$/;

function parseProducts(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    const products = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        // Skip page headers / footers
        if (PAGE_HEADER_RE.test(line) ||
            line.startsWith('Seite ') ||
            ['Position', 'Menge', 'Artikelnummer', 'BetragTotal', 'ME', 'Artikelbezeichnung', 'exkl. MwSt.exkl. MwSt.', 'Bild'].includes(line)) {
            i++;
            continue;
        }

        const artNrMatch = line.match(ART_NR_LINE_RE);
        if (artNrMatch) {
            // Found a product line
            const rawArtNr = artNrMatch[2].trim();
            // Strip leading zeros from prefix: "02113 261.100.000" → "2113 261.100.000"
            const artNr = rawArtNr.replace(/^0+/, '').replace(/\s+/g, ' ').trim();
            const price = artNrMatch[3].replace(/'/g, '');

            // Skip "ST" unit line
            i++;
            if (lines[i] === 'ST') i++;

            // Collect description lines until "no variation" or next product
            const descLines = [];
            while (i < lines.length) {
                const dl = lines[i];
                if (dl === 'no variation') { i++; break; }
                if (ART_NR_LINE_RE.test(dl)) break;
                if (PAGE_HEADER_RE.test(dl)) break;
                if (['Position', 'Menge', 'Artikelnummer'].includes(dl)) break;
                descLines.push(dl);
                i++;
            }

            const fullDesc = descLines.join(' ').trim();

            // --- Extract structured fields from description ---
            const descLower = fullDesc.toLowerCase();

            // 1. Ablage (shelf position) — covers both "Ablage" and "Abstellfläche"
            let ablage = '';
            if (descLower.includes('ablage links') || descLower.includes('abstellfläche links') || descLower.includes('armaturenloch links')) ablage = 'links';
            else if (descLower.includes('ablage rechts') || descLower.includes('abstellfläche rechts') || descLower.includes('armaturenloch rechts')) ablage = 'rechts';
            else if (descLower.includes('ablage beidseitig') || descLower.includes('abstellfläche beidseitig')) ablage = 'beidseitig';

            // 2. Hahnloch (faucet holes)
            let hahnloch = '';
            if (descLower.includes('ohne armaturenloch')) {
                hahnloch = 'ohne';
            } else {
                const multiMatch = descLower.match(/(\d+)\s+armaturenlöcher?/);
                if (multiMatch) {
                    hahnloch = multiMatch[1]; // e.g. "3"
                } else if (descLower.includes('armaturenloch')) {
                    hahnloch = '1'; // covers "Armaturenloch", "Armaturenloch rechts", "Armaturenloch links"
                }
            }

            // 3. Überlauf
            let ueberlauf = '';
            if (descLower.includes('ohne überlauf') || descLower.includes('ohne ueberlauf')) ueberlauf = 'ohne';
            else if (descLower.includes('mit überlauf') || descLower.includes('überlauf')) ueberlauf = 'mit';

            // 4. Size (e.g. "55 x 46 cm" or "90 x 75 x 6,5 cm")
            let size = '';
            const sizeMatch3D = fullDesc.match(/(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)\s*cm/i);
            const sizeMatch2D = fullDesc.match(/(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)\s*cm/i);
            const fmt = n => Number.isInteger(n) ? `${n}` : `${n.toFixed(1)}`;

            if (sizeMatch3D) {
                let d1 = parseFloat(sizeMatch3D[1].replace(',', '.'));
                let d2 = parseFloat(sizeMatch3D[2].replace(',', '.'));
                let d3 = parseFloat(sizeMatch3D[3].replace(',', '.'));
                // Sort d1 and d2 so larger is first, keep d3 as depth
                if (d2 > d1) [d1, d2] = [d2, d1];
                size = `${fmt(d1)} x ${fmt(d2)} x ${fmt(d3)}`;
            } else if (sizeMatch2D) {
                let w = parseFloat(sizeMatch2D[1].replace(',', '.'));
                let h = parseFloat(sizeMatch2D[2].replace(',', '.'));
                if (h > w) [w, h] = [h, w]; // ensure larger first
                size = `${fmt(w)} x ${fmt(h)}`;
            }

            // 5. Brand — look for known brands in description
            let brand = 'Andere';
            const brands = ['Laufen', 'Catalano', 'Alterna', 'Keramag', 'Geberit', 'Duravit', 'Villeroy & Boch', 'Villeroy', 'Toto', 'Ideal Standard', 'Burgbad', 'Alape', 'Kaldewei', 'Keuco'];
            
            // Try to find a known brand first
            for (const b of brands) {
                if (fullDesc.toLowerCase().includes(b.toLowerCase())) {
                    brand = b;
                    break;
                }
            }

            // Fallback to pattern match if no brand found yet
            if (brand === 'Andere') {
                const brandMatch = fullDesc.match(/(?:Waschtisch|Auflegewaschtisch|Doppelwaschtisch|Handwaschbecken|Einbaubecken)\s+(\w+)/i);
                if (brandMatch) brand = brandMatch[1];
            }
            
            // Special case for Laufen if no match and it's likely a Laufen PDF (heuristic)
            if (brand === 'Andere' && (fullDesc.includes('Meda') || fullDesc.includes('Pro S'))) {
                brand = 'Laufen';
            }

            products.push({
                artNr,
                label: fullDesc,
                brand,
                size,
                hahnloch,
                ueberlauf,
                ablage,
                price
            });

        } else {
            i++;
        }
    }

    return products;
}

function toCsv(products) {
    const headers = ['ArtNr', 'Label', 'Hersteller', 'Size', 'Hahnloch', 'Ueberlauf', 'Ablage'];
    const rows = products.map(p => [
        p.artNr,
        `"${p.label.replace(/"/g, '""')}"`,
        p.brand,
        p.size,
        p.hahnloch,
        p.ueberlauf,
        p.ablage
    ].join(','));
    // Add blank line between each product so admin importer treats them as separate items
    return [headers.join(','), ...rows.join('\n\n').split('\n')].join('\n');
}

async function run() {
    const pdfPath = process.argv[2];
    const outPath = process.argv[3] || pdfPath.replace(/\.pdf$/i, '.csv');

    if (!pdfPath) {
        console.error('Usage: node st-scraper/pdf-to-csv.js <path.pdf> [output.csv]');
        process.exit(1);
    }

    const absPath = path.resolve(pdfPath);
    if (!fs.existsSync(absPath)) {
        console.error(`File not found: ${absPath}`);
        process.exit(1);
    }

    console.log(`\n📄 Parsing: ${absPath}`);
    const buffer = fs.readFileSync(absPath);
    const data = await pdfParse(buffer);

    const products = parseProducts(data.text);
    console.log(`✅ Found ${products.length} products\n`);

    // Print preview
    console.log('PREVIEW (first 10):');
    console.log('─'.repeat(100));
    products.slice(0, 10).forEach(p => {
        console.log(`  ${p.artNr.padEnd(22)} | ${p.brand.padEnd(10)} | ${p.size.padEnd(10)} | HL:${p.hahnloch.padEnd(4)} | UL:${p.ueberlauf.padEnd(5)} | Ablage:${p.ablage || '-'}`);
        console.log(`    ${p.label.substring(0, 90)}`);
        console.log();
    });

    // Write CSV
    const csv = toCsv(products);
    const absOut = path.resolve(outPath);
    fs.writeFileSync(absOut, csv, 'utf8');
    console.log(`\n💾 CSV saved to: ${absOut}`);
    console.log(`   ${products.length} rows, ready for admin upload!\n`);
}

run().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
