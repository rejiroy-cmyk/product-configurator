const fs = require('fs');
const pdfParse = require('pdf-parse');

const pdfPath = 'sifon.pdf';

async function parseSifon() {
  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdfParse(dataBuffer);
  
  const lines = data.text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  const items = [];
  let currentItem = null;
  
  // Example line: "101.01421 111.501.000URP157.00157.00"
  const ART_NR_RE = /^\d+(?:\.\d+)?(\d{4}\s\d{3}\.\d{3}\.\d{3})\s*URP/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.includes('Seite ') || line.includes('Position') || line.includes('Menge') || line.includes('Artikelbezeichnung') || line.includes('exkl. MwSt.') || line.includes('Preisübersicht') || line.includes('Unverbindliche Richtpreise') || line.includes('Total') || line.includes('geschätzte Transportkosten') || line.includes('MWSt') || line.includes('Rundungsdifferenz') || line.includes('Gesamtbetrag') || line.includes('Preisänderung') || line.includes('Bei den Preisangaben') || line.includes('Sanitas Troesch') || line.includes('für Installateur')) {
      if (line.startsWith('101.0') || line.match(ART_NR_RE)) {
         // Do not skip if it's the article number line that happens to have the word "Total" in it!
      } else {
         if(line === 'Total157.00') {
           // Skip
         } else {
           continue;
         }
      }
    }
    
    let match = line.match(ART_NR_RE);
    if (match) {
      if (currentItem) items.push(currentItem);
      currentItem = {
        artNr: match[1],
        description: '',
      };
      
    } else if (currentItem) {
      if (line === 'ST' || line === 'PA' || line === 'SET' || line.includes('https://') || line.includes('Bild') || line.includes('Total157.00')) {
        continue;
      }
      currentItem.description += (currentItem.description ? ' ' : '') + line;
    }
  }
  
  if (currentItem) items.push(currentItem);
  
  // Format as CSV
  let csv = 'ArtNr,Label\n';
  items.forEach(item => {
    let label = item.description.replace(/"/g, '""').trim();
    // Clean up trailing garbage text from the PDF parsing
    label = label.replace(/\s*180\.40.*$/, '');
    csv += `${item.artNr},"${label}"\n`;
  });
  
  fs.writeFileSync('sifon.csv', csv);
  console.log('Successfully extracted ' + items.length + ' sifon(s) to sifon.csv');
  console.log('Sample:', items.slice(0, 3));
}

parseSifon().catch(console.error);
