const fs = require('fs');

const dataFile = 'custom-data.json';
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

let count = 0;

if (data.bademischer && data.bademischer.trays) {
  data.bademischer.trays.forEach(t => {
    if (t.mountingMaterials) {
      const gleits = t.mountingMaterials.filter(m => (m.name||'').toLowerCase().includes('gleitstange'));
      if (gleits.length > 1) {
        // Find the one I added: "Duschgleitstange (Optional)"
        const addedIndex = t.mountingMaterials.findIndex(m => m.name === 'Duschgleitstange (Optional)');
        if (addedIndex >= 0) {
          t.mountingMaterials.splice(addedIndex, 1);
          count++;
          
          // Fix Brausehalter and Brauseschlauch optionRules
          let brausehalter = t.mountingMaterials.find(m => m.name && m.name.toLowerCase().includes('brausehalter'));
          let brauseschlauch = t.mountingMaterials.find(m => m.name && m.name.toLowerCase().includes('brauseschlauch'));
          const origGleit = t.mountingMaterials.find(m => (m.name||'').toLowerCase().includes('gleitstange'));
          
          if (brausehalter && origGleit) {
            brausehalter.dependsOn = origGleit.id;
          }
          if (brauseschlauch && origGleit) {
            brauseschlauch.dependsOn = origGleit.id;
          }
        }
      }
    }
  });
}

fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
console.log(`Successfully removed duplicate Duschgleitstange from ${count} Bademischer trays.`);
