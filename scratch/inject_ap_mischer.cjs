const fs = require('fs');
const data = JSON.parse(fs.readFileSync('custom-data.json', 'utf8'));

// 1. Get Reference Accessories
let refMat = null;
Object.values(data).forEach(cat => {
    cat.trays?.forEach(t => {
        if (t.artNr === '6211 321.501.000') refMat = t.mountingMaterials;
    });
});

if (!refMat) {
    console.error("Reference product not found!");
    process.exit(1);
}

// 2. Identify and Inject
let count = 0;
data.duschenmischer.trays.forEach(t => {
    const l = t.label.toLowerCase();
    // Logic for Aufputz: AD 153 mm and not UP/Endmontageset
    if (l.includes('ad 153 mm') && !l.includes('endmontageset') && !l.includes('grundkörper')) {
        
        // Filter refMat to only include what's actually missing
        const filteredMat = JSON.parse(JSON.stringify(refMat)).filter(mat => {
            const name = mat.name.toLowerCase();
            
            // If it explicitly says "ohne", we definitely need it
            if (name.includes('abstell') && l.includes('ohne abstell')) return true;
            if (name.includes('schlauch') && (l.includes('ohne brauseschlauch') || l.includes('ohne schlauch'))) return true;
            if (name.includes('handbrause') && (l.includes('ohne handbrause') || l.includes('ohne brause'))) return true;
            
            // If it explicitly says "mit" or "inkl.", we definitely DON'T need it
            if (name.includes('abstell') && (l.includes('inkl. abstell') || l.includes('mit abstell'))) return false;
            if (name.includes('schlauch') && (l.includes('inkl. brauseschlauch') || l.includes('mit brauseschlauch'))) return false;
            if (name.includes('handbrause') && (l.includes('inkl. handbrause') || l.includes('mit handbrause'))) return false;
            
            // Default: If it's a Gleitstange, always add it
            if (name.includes('gleitstange') || name.includes('stange')) return true;

            // Default: If the item isn't mentioned as "mit" or "inkl.", add it
            // (matching the behavior of the reference product 6211 321.501.000)
            return true;
        });

        if (filteredMat.length > 0) {
            t.mountingMaterials = filteredMat;
            count++;
        }
    }
});

fs.writeFileSync('custom-data.json', JSON.stringify(data, null, 2));
console.log(`Injected accessories into ${count} Aufputz mixers.`);
