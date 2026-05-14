const fs = require('fs');
const path = require('path');

const dataPath = '/Users/jenistonsellathamby/Desktop/product-configurator/custom-data.json';

const BADEMISCHER_STEPS = [
    'Endmontageset',
    'Grundkörper',
    'Montageschiene',
    'Anschlussbogen',
    'Brauseschlauch',
    'Handbrause',
    'Brausehalter',
    'Duschengleitstange'
];

try {
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const categories = Object.keys(data);

    console.log(`--- DATA AUDIT START ---`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Categories found: ${categories.join(', ')}\n`);

    const audit = {
        missingAccessories: [],
        missingArtNr: [],
        missingImages: [],
        bademischerIncomplete: [],
        waschtischIncomplete: [],
        generalMismatches: []
    };

    categories.forEach(cat => {
        if (cat === 'finishes') return;
        const products = data[cat].trays || [];

        products.forEach(p => {
            const label = p.label || 'Unknown';
            const artNr = p.artNr || 'No-ArtNr';
            const pid = p.id || 'No-ID';

            // 1. Missing Accessories (unless it's zubehoer_pool or specific small categories)
            if (['bademischer', 'waschtischmischer', 'waschtisch', 'duschenwanne', 'badewanne'].includes(cat)) {
                if (!p.mountingMaterials || p.mountingMaterials.length === 0) {
                    audit.missingAccessories.push({ cat, artNr, label });
                }
            }

            // 2. Check each accessory group
            if (p.mountingMaterials) {
                p.mountingMaterials.forEach(mat => {
                    if (!mat.options || mat.options.length === 0) {
                        audit.generalMismatches.push({ cat, artNr, label, issue: `Empty accessory group: ${mat.name}` });
                    } else {
                        mat.options.forEach(opt => {
                            if (!opt.artNr) {
                                audit.missingArtNr.push({ cat, mainArtNr: artNr, accessory: opt.label });
                            }
                            if (!opt.imgUrl || opt.imgUrl.includes('00000000.png')) {
                                audit.missingImages.push({ cat, mainArtNr: artNr, accessory: opt.label });
                            }
                        });
                    }
                });
            }

            // 3. Bademischer Specific Check
            if (cat === 'bademischer') {
                if (p.mountingMaterials) {
                    const groupNames = p.mountingMaterials.map(m => (m.name || '').toLowerCase());
                    const missingSteps = BADEMISCHER_STEPS.filter(step => 
                        !groupNames.some(name => name.includes(step.toLowerCase()))
                    );
                    
                    if (missingSteps.length > 0 && p.mountingMaterials.length > 0) {
                         audit.bademischerIncomplete.push({ artNr, label, missingSteps });
                    }
                }
            }

            // 4. Waschtisch Specific Check
            if (cat === 'waschtisch') {
                const groupNames = (p.mountingMaterials || []).map(m => (m.name || '').toLowerCase());
                const hasSchall = groupNames.some(n => n.includes('schallschutz'));
                const hasBefestigung = groupNames.some(n => n.includes('befestigung') || n.includes('schraube'));
                
                if (!hasSchall || !hasBefestigung) {
                    audit.waschtischIncomplete.push({ artNr, label, hasSchall, hasBefestigung });
                }
            }

            // 5. Main Product Image Check
            if (!p.imgUrl || p.imgUrl.includes('00000000.png')) {
                audit.missingImages.push({ cat, mainArtNr: artNr, label: 'Main Product' });
            }
        });
    });

    // --- REPORTING ---

    console.log(`\n1. MAIN PRODUCTS WITHOUT ACCESSORIES: ${audit.missingAccessories.length}`);
    if (audit.missingAccessories.length > 0) {
        audit.missingAccessories.slice(0, 10).forEach(i => console.log(`   - [${i.cat}] ${i.artNr}: ${i.label.substring(0, 50)}`));
        if (audit.missingAccessories.length > 10) console.log(`     ... and ${audit.missingAccessories.length - 10} more.`);
    }

    console.log(`\n2. BADEMISCHER HIERARCHY ISSUES (Missing steps): ${audit.bademischerIncomplete.length}`);
    if (audit.bademischerIncomplete.length > 0) {
        audit.bademischerIncomplete.slice(0, 10).forEach(i => console.log(`   - ${i.artNr}: Missing [${i.missingSteps.join(', ')}]`));
    }

    console.log(`\n3. WASCHTISCH COMPLETENESS ISSUES (Missing Schallschutz/Befestigung): ${audit.waschtischIncomplete.length}`);
    if (audit.waschtischIncomplete.length > 0) {
        audit.waschtischIncomplete.slice(0, 10).forEach(i => {
            const issues = [];
            if (!i.hasSchall) issues.push('Schallschutz');
            if (!i.hasBefestigung) issues.push('Befestigung');
            console.log(`   - ${i.artNr}: Missing [${issues.join(', ')}]`);
        });
    }

    console.log(`\n4. MISSING ART-NR IN ACCESSORIES: ${audit.missingArtNr.length}`);
    if (audit.missingArtNr.length > 0) {
        audit.missingArtNr.slice(0, 5).forEach(i => console.log(`   - [${i.cat}] Main ${i.mainArtNr} -> Acc: ${i.accessory}`));
    }

    console.log(`\n5. MISSING/PLACEHOLDER IMAGES: ${audit.missingImages.length}`);
    if (audit.missingImages.length > 0) {
        audit.missingImages.slice(0, 5).forEach(i => console.log(`   - [${i.cat}] ArtNr ${i.mainArtNr || i.artNr} (${i.accessory || i.label})`));
    }

    console.log(`\n6. GENERAL DATA MISMATCHES: ${audit.generalMismatches.length}`);
    if (audit.generalMismatches.length > 0) {
        audit.generalMismatches.slice(0, 5).forEach(i => console.log(`   - ${i.artNr}: ${i.issue}`));
    }

    console.log(`\n--- DATA AUDIT END ---`);

} catch (err) {
    console.error('Audit failed:', err);
}
