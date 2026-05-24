const fs = require('fs');

const dataFile = 'custom-data.json';
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

let modifiedCount = 0;

if (data.duschenwanne && data.duschenwanne.trays) {
    data.duschenwanne.trays.forEach(t => {
        if (t.manufacturer === 'Schmidlin') {
            let label = t.label || '';
            const match = label.match(/^(.*?)(?:\s+\d+\s*[xX]\s*\d+)/);
            let prefix = match ? match[1].toLowerCase() : label.toLowerCase();
            prefix = prefix.replace('duschenwanne', '').replace('duschwanne', '').replace('schmidlin', '').replace(',', '').trim();
            
            // If prefix is empty or just generic, it has no series name. Or if we manually set it to Superflach previously.
            if (prefix === '' || t.serie === 'Superflach') {
                const sizeMatch = label.match(/\d+(?:[.,]\d+)?\s*x\s*\d+(?:[.,]\d+)?\s*x\s*(\d+(?:[.,]\d+)?)/i);
                if (sizeMatch) {
                    let depth = parseFloat(sizeMatch[1].replace(',', '.'));
                    let newSerie = null;
                    if (depth === 2.5) newSerie = 'Superflach 2.5';
                    else if (depth === 3.5) newSerie = 'Superflach 3.5';
                    else if (depth === 6.5) newSerie = 'Tief 6.5';
                    else if (depth === 15) newSerie = 'Sehr tief 15';
                    
                    if (newSerie) {
                        t.serie = newSerie;
                        modifiedCount++;
                    }
                }
            }
        }
    });
}

fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
console.log('Successfully updated ' + modifiedCount + ' trays.');
