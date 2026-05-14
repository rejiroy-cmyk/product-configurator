const fs = require('fs');
const lines = fs.readFileSync('st-scraper/auto-import.csv', 'utf8').split(/\r?\n|\r/);
const parseCsvLine = (line, delimiter) => {
    const cols = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (inQuotes) {
            if (char === '"') {
                if (line[i+1] === '"') { current += '"'; i++; } // Escaped quote
                else inQuotes = false;
            } else current += char;
        } else {
            if (char === '"') inQuotes = true;
            else if (char === delimiter) { cols.push(current); current = ''; }
            else current += char;
        }
    }
    cols.push(current);
    return cols.map(c => c.trim());
};
let del = lines[0].includes('\t') ? '\t' : (lines[0].includes(';') ? ';' : ',');
let added = 0;
for (let i = 0; i < 20; i++) {
    const line = lines[i].trim();
    let cols = parseCsvLine(line, del);
    console.log(cols);
}
