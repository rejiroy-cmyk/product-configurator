const fs = require('fs');
const path = require('path');

const enrichedPath = path.resolve(__dirname, '../enriched_auflege.csv');
const finalPath = path.resolve(__dirname, '../final_auflege.csv');

let content;
try {
    content = fs.readFileSync(enrichedPath, 'utf8');
} catch (e) {
    console.log("Could not read enriched_auflege.csv");
    process.exit(1);
}

const lines = content.split('\n').filter(l => l.trim().length > 0);
const header = lines[0];

const newLines = [];
// Original headers: ArtNr,Label,Hersteller,Size,Hahnloch,Ueberlauf,Ablage
// Enriched headers appended: ,Scraped_Ablaufventil_ArtNr,Scraped_Ablaufventil_Label,Scraped_Hahnloch

// We want to rewrite the Hahnloch column intelligently.
newLines.push(header);

for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Split carefully by comma taking quotes into account
    let inQuotes = false;
    let cols = [];
    let curCol = '';
    for(let j=0; j<line.length; j++) {
        const c = line[j];
        if(c === '"') {
            inQuotes = !inQuotes;
            curCol += c;
        } else if(c === ',' && !inQuotes) {
            cols.push(curCol);
            curCol = '';
        } else {
            curCol += c;
        }
    }
    cols.push(curCol);

    const artNr = cols[0];
    const label = cols[1] ? cols[1].toLowerCase() : '';
    let hahnloch = cols[4] || '';
    
    const scrapedHahnloch = cols[9] ? cols[9].toLowerCase() : '';

    // Logic: Look at Label first
    if (label.includes('ohne hahnloch')) {
        hahnloch = 'ohne';
    } else if (label.includes('mit hahnloch')) {
        hahnloch = 'mit';
    } else if (scrapedHahnloch.includes('ohne hahnloch')) {
        hahnloch = 'ohne';
    } else if (scrapedHahnloch.includes('mit hahnloch')) {
        hahnloch = 'mit';
    }

    cols[4] = hahnloch;

    newLines.push(cols.join(','));
}

fs.writeFileSync(finalPath, newLines.join('\n'));
console.log(`Successfully compiled and cross-referenced ${lines.length - 1} items into final_auflege.csv!`);
