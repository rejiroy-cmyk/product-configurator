/**
 * pdf-preview.js
 * Extracts raw text from a Sanitas Troesch PDF and shows the first 150 lines.
 * Usage: node st-scraper/pdf-preview.js <path-to-pdf>
 */

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

async function previewPdf(pdfPath) {
    if (!pdfPath) {
        console.error('Usage: node st-scraper/pdf-preview.js <path-to-pdf>');
        process.exit(1);
    }

    const absPath = path.resolve(pdfPath);
    if (!fs.existsSync(absPath)) {
        console.error(`File not found: ${absPath}`);
        process.exit(1);
    }

    console.log(`\n📄 Reading PDF: ${absPath}\n`);
    const buffer = fs.readFileSync(absPath);
    const data = await pdfParse(buffer);

    console.log(`📊 Total pages: ${data.numpages}`);
    console.log(`📝 Total characters extracted: ${data.text.length}\n`);
    console.log('─'.repeat(80));
    console.log('FIRST 150 LINES OF EXTRACTED TEXT:');
    console.log('─'.repeat(80));

    const lines = data.text.split('\n');
    lines.slice(0, 150).forEach((line, i) => {
        // Mark lines that look like article numbers
        const isArtNr = /\d{4}\s+\d{3}\.\d{3}\.\d{3}/.test(line);
        const prefix = isArtNr ? '🔵 ' : '   ';
        console.log(`${String(i + 1).padStart(4, ' ')}${prefix}| ${line}`);
    });

    console.log('\n' + '─'.repeat(80));
    console.log(`... (${Math.max(0, lines.length - 150)} more lines not shown)`);
    console.log('─'.repeat(80));
    console.log('\nLines marked with 🔵 contain Sanitas Troesch article numbers.');
    console.log('Share this output so we can build the right parser!\n');
}

previewPdf(process.argv[2]).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
