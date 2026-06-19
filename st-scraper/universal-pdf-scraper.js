/**
 * universal-pdf-scraper.js
 * A modular PDF scraper for Sanitas Troesch profishop PDFs.
 * 
 * Usage: node st-scraper/universal-pdf-scraper.js <path-to-pdf> --type=<waschtisch|mischer|wanne>
 * 
 * This file is a test drive of Possibility 1 (Category Profiles). 
 * It is completely separated from the existing pdf-to-csv.js and the UI.
 */

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

const PAGE_HEADER_RE = /https?:\/\/\S+\d{2}\.\d{2}\.\d{4}/;
// Note: This regex assumes the pricing structure: "01.00000 000.000.000URP00.00..."
const ART_NR_LINE_RE = /^\d+01\.(\d{5}\s+\d{3}\.\d{3}\.\d{3})URP([\d'.]+)[\d'.]+$/;

// ============================================
// MODULAR EXTRACTORS BASED ON CATEGORY TYPE
// ============================================
const categoryProfiles = {
    waschtisch: (fullDesc) => {
        const descLower = fullDesc.toLowerCase();
        
        let ablage = '';
        if (descLower.includes('ablage links') || descLower.includes('abstellfläche links') || descLower.includes('armaturenloch links')) ablage = 'links';
        else if (descLower.includes('ablage rechts') || descLower.includes('abstellfläche rechts') || descLower.includes('armaturenloch rechts')) ablage = 'rechts';
        else if (descLower.includes('ablage beidseitig') || descLower.includes('abstellfläche beidseitig')) ablage = 'beidseitig';

        let hahnloch = '';
        if (descLower.includes('ohne armaturenloch')) hahnloch = 'ohne';
        else {
            const multiMatch = descLower.match(/(\d+)\s+armaturenlöcher?/);
            if (multiMatch) hahnloch = multiMatch[1];
            else if (descLower.includes('armaturenloch')) hahnloch = '1';
        }

        let ueberlauf = '';
        if (descLower.includes('ohne überlauf') || descLower.includes('ohne ueberlauf')) ueberlauf = 'ohne';
        else if (descLower.includes('mit überlauf') || descLower.includes('überlauf')) ueberlauf = 'mit';

        let size = extractSize(fullDesc);

        return { size, hahnloch, ueberlauf, ablage };
    },

    mischer: (fullDesc) => {
        const descLower = fullDesc.toLowerCase();
        
        let finish = '';
        if (descLower.includes('schwarz matt') || descLower.includes('matt schwarz') || descLower.includes('nero')) finish = 'Schwarz matt';
        else if (descLower.includes('edelstahl') || descLower.includes('steel')) finish = 'Edelstahl';
        else if (descLower.includes('weiss matt') || descLower.includes('matt weiss')) finish = 'Weiss matt';
        else if (descLower.includes('chrom')) finish = 'Chrom';
        else finish = 'Chrom'; // common fallback for mischers

        let montage = '';
        if (descLower.includes('aufputz') || descLower.includes(' ap ') || descLower.includes('wandbatterie') || descLower.includes('wandmischer') || descLower.match(/\bap\b/)) montage = 'Aufputz';
        else if (descLower.includes('unterputz') || descLower.includes(' up ') || descLower.includes('einbau') || descLower.match(/\bup\b/)) montage = 'Unterputz';
        else if (descLower.includes('stand')) montage = 'Standmodell';

        return { finish, montage };
    },

    wanne: (fullDesc) => {
        const descLower = fullDesc.toLowerCase();
        
        let size = extractSize(fullDesc);
        
        let material = '';
        if (descLower.includes('acryl')) material = 'Acryl';
        else if (descLower.includes('stahl-email') || descLower.includes('stahl')) material = 'Stahl-Email';
        else if (descLower.includes('quaryl')) material = 'Quaryl';
        else if (descLower.includes('marbond')) material = 'Marbond';
        else if (descLower.includes('solidlite')) material = 'SolidLite';

        let form = '';
        if (descLower.includes('rechteck')) form = 'Rechteckig';
        else if (descLower.includes('oval')) form = 'Oval';
        else if (descLower.includes('viertelkreis')) form = 'Viertelkreis';
        else if (descLower.includes('sechseck')) form = 'Sechseckig';
        else if (descLower.includes('quadrat')) form = 'Quadratisch';
        
        // Auto-detect form from size if still unknown
        if ((!form || form === '-') && size) {
            const [w, h] = size.split('x').map(s => parseInt(s.trim()));
            if (w === h) form = 'Quadratisch';
            else if (w && h) form = 'Rechteckig';
        }

        return { size, material, form };
    },

    duschtrennwand: (fullDesc) => {
        const descLower = fullDesc.toLowerCase();
        
        let size = extractSize(fullDesc);
        
        let form = 'Standard';
        if (descLower.includes('eckeinstieg')) form = 'Eckeinstieg';
        else if (descLower.includes('freistehend')) form = 'Freistehend';
        else if (descLower.includes('nische')) form = 'Nische';
        else if (descLower.includes('mit seitenwand') || descLower.includes('seitenwand')) form = 'mit Seitenwand';
        else if (descLower.includes('viertelkreis')) form = 'Viertelkreis';
        
        let glasart = 'Echtglas klar';
        if (descLower.includes('teilflächig mattiert') || descLower.includes('teilflächig matt') || descLower.includes('sichtschutz')) glasart = 'Echtglas mit Sichtschutz';
        else if (descLower.includes('matt') || descLower.includes('satiniert')) glasart = 'Echtglas satiniert';
        else if (descLower.includes('duschguard')) glasart = 'Echtglas klar Duschguard';
        else if (descLower.includes('glasplus')) glasart = 'Echtglas klar Glasplus';
        else if (descLower.includes('caretec pro')) glasart = 'Echtglas klar CareTec Pro';
        else if (descLower.includes('caretec')) glasart = 'Echtglas klar CareTec';
        else if (descLower.includes('procare')) glasart = 'Echtglas klar ProCare';
        else if (descLower.includes('aquaperl')) glasart = 'Echtglas klar Aquaperl';
        else if (descLower.includes(' plus')) glasart = 'Echtglas klar Plus';
        
        let farbe = 'Verchromt';
        if (descLower.includes('schwarz matt') || descLower.includes('schwarz') || descLower.includes('nero')) farbe = 'Schwarz';
        else if (descLower.includes('silber matt') || descLower.includes('silber')) farbe = 'Silber';
        else if (descLower.includes('weiss matt') || descLower.includes('weiss')) farbe = 'Weiss';
        else if (descLower.includes('edelstahl')) farbe = 'Edelstahloptik';

        let band = 'Universal';
        if (descLower.includes('band links') || descLower.includes('anschlag links') || descLower.includes('linksanschlag') || descLower.includes('linksband') || descLower.includes(' links')) band = 'links';
        else if (descLower.includes('band rechts') || descLower.includes('anschlag rechts') || descLower.includes('rechtsanschlag') || descLower.includes('rechtsband') || descLower.includes(' rechts')) band = 'rechts';

        let isService = false;
        if (descLower.includes('montagepauschale') || descLower.includes('massaufnahme') || descLower.includes('anfahrt') || descLower.includes('demontage')) {
            isService = true;
            form = ''; size = ''; glasart = ''; farbe = ''; band = '';
        }
        return { isService, form, size, glasart, farbe, band };
    }
};

// Helper function to extract size format "W x H cm" or "L x W x H cm"
function extractSize(fullDesc) {
    // Matches "W x H cm/mm" or "W x H x D cm/mm"
    const sizeMatch = fullDesc.match(/(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)(?:\s*x\s*\d+(?:[.,]\d+)?)?\s*(cm|mm)/i);
    if (sizeMatch) {
        let w = parseFloat(sizeMatch[1].replace(',', '.'));
        let h = parseFloat(sizeMatch[2].replace(',', '.'));
        const unit = (sizeMatch[3] || 'cm').toLowerCase();
        
        if (unit === 'mm') {
            w = w / 10;
            h = h / 10;
        }

        if (h > w) [w, h] = [h, w]; // ensure L x W
        const fmt = n => Number.isInteger(n) ? `${n}` : `${n.toFixed(1)}`;
        return `${fmt(w)} x ${fmt(h)}`;
    }
    return '';
}

// Universal brand extractor across all categories
function extractBrand(fullDesc) {
    let brand = 'Andere';
    const brands = ['Laufen', 'Catalano', 'Alterna', 'Keramag', 'Geberit', 'Duravit', 'Villeroy & Boch', 'Toto', 'Ideal Standard', 'Burgbad', 'Alape', 'Kaldewei', 'Keuco', 'KWC', 'Similor', 'Hansgrohe', 'Gessi', 'Bette', 'Koralle', 'Duscholux', 'Duka'];
    
    for (const b of brands) {
        if (fullDesc.toLowerCase().includes(b.toLowerCase())) {
            brand = b;
            break;
        }
    }

    if (brand === 'Andere') {
        const brandMatch = fullDesc.match(/(?:Waschtisch|Mischer|Batterie|Wanne|Duschwanne|Badewanne|Duschtrennwand|Pendeltür|Gleittür|Schiebetür|Seitenwand|Eckeinstieg)\s+(\w+)/i);
        if (brandMatch) brand = brandMatch[1];
    }
    return brand;
}


function parseProducts(text, type) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const products = [];
    let i = 0;

    const extractor = categoryProfiles[type] || categoryProfiles['waschtisch'];

    while (i < lines.length) {
        const line = lines[i];

        // Skip headers
        if (PAGE_HEADER_RE.test(line) ||
            line.startsWith('Seite ') ||
            ['Position', 'Menge', 'Artikelnummer', 'BetragTotal', 'ME', 'Artikelbezeichnung', 'exkl. MwSt.exkl. MwSt.', 'Bild'].includes(line)) {
            i++;
            continue;
        }

        const artNrMatch = line.match(ART_NR_LINE_RE);
        if (artNrMatch) {
            const rawArtNr = artNrMatch[1].trim();
            const artNr = rawArtNr.replace(/^0+/, '').replace(/\s+/g, ' ').trim();
            const price = artNrMatch[2].replace(/'/g, '');

            i++;
            if (lines[i] === 'ST') i++;

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
            const brand = extractBrand(fullDesc);
            
            // MAGIC: Use the modular profile to extract custom attributes
            const customAttributes = extractor(fullDesc);
            if (customAttributes.isService !== undefined) {
                // allow it to be included
            }

            products.push({
                artNr,
                label: fullDesc,
                brand,
                price,
                ...customAttributes // merge custom properties (size, finish, etc) directly into the object
            });

        } else {
            i++;
        }
    }

    return products;
}

function toCsv(products) {
    if (products.length === 0) return "";
    
    // Dynamically generate headers based on the first extracted product's keys
    // Avoid printing 'price' if not strictly needed in the CSV, but let's include it anyway or omit it.
    // The previous script didn't include price, but let's exclude it to match old format
    const excludeKeys = ['price'];
    
    const rawHeaders = Object.keys(products[0]).filter(k => !excludeKeys.includes(k));
    
    // Capitalize headers for output
    const csvHeaders = rawHeaders.map(h => h.charAt(0).toUpperCase() + h.slice(1));
    
    const rows = products.map(p => {
        return rawHeaders.map(key => {
            let val = (p[key] || '');
            // escape quotes and wrap in quotes if there is a space/comma
            if (key === 'label') return `"${val.replace(/"/g, '""')}"`;
            return val;
        }).join(',');
    });

    return [csvHeaders.join(','), ...rows.join('\n\n').split('\n')].join('\n');
}

async function run() {
    const args = process.argv.slice(2);
    const typeArg = args.find(a => a.startsWith('--type='));
    const pdfPath = args.find(a => !a.startsWith('--'));
    
    if (!pdfPath) {
        console.error('Usage: node st-scraper/universal-pdf-scraper.js <path.pdf> --type=<waschtisch|mischer|wanne> [output.csv]');
        process.exit(1);
    }

    const type = typeArg ? typeArg.split('=')[1].toLowerCase() : 'waschtisch';
    
    if (!categoryProfiles[type]) {
       console.log(`⚠️ Warning: Type "${type}" not recognized. Falling back to "waschtisch"`);
    }

    const outPath = args[2] && !args[2].startsWith('--') ? args[2] : pdfPath.replace(/\.pdf$/i, `_${type}.csv`);
    const absPath = path.resolve(pdfPath);
    
    if (!fs.existsSync(absPath)) {
        console.error(`File not found: ${absPath}`);
        process.exit(1);
    }

    console.log(`\n📄 Parsing [${type.toUpperCase()}] PDF: ${absPath}`);
    const buffer = fs.readFileSync(absPath);
    const data = await pdfParse(buffer);

    const products = parseProducts(data.text, type);
    console.log(`✅ Found ${products.length} products\n`);

    if (products.length > 0) {
        console.log('PREVIEW (first 5):');
        console.log('─'.repeat(100));
        products.slice(0, 5).forEach(p => {
            // print dynamic properties
            const propsExtract = Object.entries(p)
                .filter(([k,v]) => !['artNr', 'label', 'price', 'brand'].includes(k))
                .map(([k,v]) => `${k}:${v || '-'}`)
                .join(' | ');
                
            console.log(`  ${p.artNr.padEnd(20)} | ${p.brand.padEnd(10)} | ${propsExtract}`);
            console.log(`    ${p.label.substring(0, 90)}`);
            console.log();
        });

        // Write CSV
        const csv = toCsv(products);
        const absOut = path.resolve(outPath);
        fs.writeFileSync(absOut, csv, 'utf8');
        console.log(`💾 CSV saved to: ${absOut}`);
        console.log(`   ${products.length} rows exported successfully!\n`);
    } else {
        console.log("No products found to export.");
    }
}

run().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
