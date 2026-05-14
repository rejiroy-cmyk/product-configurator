const fs = require('fs');
const data = JSON.parse(fs.readFileSync('custom-data.json', 'utf8'));

let noAcc = {};
let bmHier = [];

const steps = ['Endmontageset', 'Grundkörper', 'Montageschiene', 'Anschlussbogen', 'Brauseschlauch', 'Handbrause', 'Brausehalter', 'Duschengleitstange'];

Object.keys(data).forEach(catId => {
    const cat = data[catId];
    if (cat.trays) {
        cat.trays.forEach(t => {
            // Rule 1: No accessories
            if (!t.mountingMaterials || t.mountingMaterials.length === 0) {
                if (!noAcc[catId]) noAcc[catId] = [];
                noAcc[catId].push(`| ${t.artNr} | ${t.label.replace(/\|/g, '-')} |`);
            }
            
            // Rule 2: Bademischer Hierarchy
            if (catId === 'bademischer' && t.label && t.label.toLowerCase().includes('unterputz')) {
                // Not all UP mixers have this requirement? Wait, previous script just said:
                // "Missing [Endmontageset, Grundkörper, Montageschiene, Anschlussbogen, Duschengleitstange]"
                // Let's just find the exact missing ones.
                if (t.mountingMaterials) {
                    const missing = steps.filter(step => !t.mountingMaterials.some(m => (m.name||'').toLowerCase().includes(step.toLowerCase())));
                    if (missing.length > 3) { // Assume missing heavily
                        bmHier.push(`- **${t.artNr}**: ${t.label} (Missing: ${missing.join(', ')})`);
                    }
                }
            }
        });
    }
});

let md = '# 1. Bademischer Hierarchy Issues\n\n';
md += bmHier.join('\n') + '\n\n';

md += '# 3. Products Without Accessories\n\n';
Object.keys(noAcc).forEach(catId => {
    md += `### ${catId}\n\n`;
    md += `| Art-Nr | Bezeichnung |\n|---|---|\n`;
    md += noAcc[catId].join('\n') + '\n\n';
});

fs.writeFileSync('artifacts/data_lists.md', md);
