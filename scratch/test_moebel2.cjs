const fs = require('fs');

const data = JSON.parse(fs.readFileSync('custom-data.json', 'utf8'));

const basins = data.waschtisch.trays;
const zubehoer = data.zubehoer_pool.trays;

const realMoebel = zubehoer.find(t => t.artNr === "2112 030.379.000");

if (realMoebel) {
    console.log("Found real moebel:", realMoebel.label);
    const zuMatch = realMoebel.label.match(/zu\s+([\d\s\/]+)/i);
    if (zuMatch) {
        console.log("zuMatch:", zuMatch[1]);
        const parts = zuMatch[1].split('/');
        let validIds = [];
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
        console.log("validIds extracted:", validIds);
        
        // Find matching basins
        const matchingBasins = basins.filter(b => {
            const basinId7 = (b.artNr || '').replace(/[^\d]/g, '').substring(0, 7);
            return validIds.includes(basinId7);
        });
        console.log(`Found ${matchingBasins.length} matching basins.`);
        if (matchingBasins.length > 0) {
            console.log("Example:", matchingBasins[0].artNr, matchingBasins[0].label);
        } else {
            console.log("No matching basins found. Let's see what basins exist with prefix 2112");
            const prefix = validIds[0].substring(0,4);
            const some = basins.filter(b => (b.artNr || '').replace(/[^\d]/g, '').startsWith(prefix)).slice(0, 5);
            some.forEach(s => console.log(s.artNr, s.label));
        }
    }
}
