const fs = require('fs');

const data = JSON.parse(fs.readFileSync('custom-data.json', 'utf8'));

const basins = data.waschtisch.trays;
const zubehoer = data.zubehoer_pool.trays;

const moebel = zubehoer.filter(t => (t.label || '').toLowerCase().includes('möbel') || (t.label || '').toLowerCase().includes('meuble'));

console.log("Total moebel found in zubehoer_pool:", moebel.length);

if (moebel.length > 0) {
    const t = moebel[0];
    console.log("Testing with moebel:", t.artNr, t.label);
    
    const zuMatch = t.label.match(/zu\s+([\d\s\/]+)/i);
    let validIds = [];
    if (zuMatch) {
        console.log("zuMatch found:", zuMatch[1]);
        const parts = zuMatch[1].split('/');
        let lastPrefix = "";
        parts.forEach(p => {
            const clean = p.replace(/[^\d]/g, '');
            if (clean.length === 7) {
                validIds.push(clean);
                lastPrefix = clean.substring(0, 4);
            } else if (clean.length === 3 && lastPrefix) {
                validIds.push(lastPrefix + clean);
            } else if (clean.length > 7) {
                validIds.push(clean.substring(0,7));
            }
        });
        console.log("validIds:", validIds);
    }
    
    // Find a matching basin
    if (validIds.length > 0) {
        const matchingBasins = basins.filter(b => {
            const basinId7 = (b.artNr || '').replace(/[^\d]/g, '').substring(0, 7);
            return validIds.includes(basinId7);
        });
        console.log(`Found ${matchingBasins.length} matching basins in Waschtisch array.`);
        if (matchingBasins.length > 0) {
            console.log("Example matching basin:", matchingBasins[0].artNr, matchingBasins[0].label);
        } else {
            // Check if ANY basin in the catalog has these IDs
            console.log("Searching for any basin with prefix", validIds[0]);
            const potential = basins.filter(b => (b.artNr || '').replace(/[^\d]/g, '').startsWith(validIds[0].substring(0,4)));
            console.log("Basins starting with", validIds[0].substring(0,4), ":", potential.length);
            if (potential.length > 0) {
                console.log("Example:", potential[0].artNr);
            }
        }
    }
}
