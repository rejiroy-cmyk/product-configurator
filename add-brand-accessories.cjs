const fs = require('fs');
const dataFile = 'custom-data.json';
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

// Standard Alterna accessories
const alternaAccessories = JSON.parse(fs.readFileSync('alterna-accessories.json', 'utf8'));
const abstell = alternaAccessories.find(m => m.name.toLowerCase().includes('abstell'));
const schlauch = alternaAccessories.find(m => m.name.toLowerCase().includes('schlauch'));
const halter = alternaAccessories.find(m => m.name.toLowerCase().includes('halter'));
const gleitstange = alternaAccessories.find(m => m.name.toLowerCase().includes('gleitstange'));

// Brand specific Handbrausen
const brandHandbrausen = JSON.parse(fs.readFileSync('brand-handbrausen.json', 'utf8'));

let count = 0;

function extractMontage(r) {
  const e = (r.label || '').toLowerCase();
  return (e.includes('standmodell') || e.includes('freistehend')) ? 'Standmodell' :
         (e.includes('unterputz') || e.includes(' up ') || e.includes('einbau') || e.includes('endmontageset') || e.includes('grundkörper') || e.includes('grundkoerper')) ? 'Unterputz' :
         'Aufputz';
}

if (data.bademischer && data.bademischer.trays) {
  data.bademischer.trays.forEach(t => {
    if (extractMontage(t) === 'Aufputz' && !t.label.includes('Alterna')) {
      // Check if it is missing accessories
      if (!t.mountingMaterials || t.mountingMaterials.length === 0 || (t.mountingMaterials.length === 1 && t.mountingMaterials[0].name.includes('Automatisch'))) {
        
        let brand = '';
        if (t.label.includes('Hansgrohe')) brand = 'Hansgrohe';
        else if (t.label.includes('KWC')) brand = 'KWC';
        else if (t.label.includes('Laufen')) brand = 'Laufen';

        let handbrauseOptions = brandHandbrausen[brand];
        if (!handbrauseOptions) {
          // If no brand specific Handbrause, use Alterna as fallback
          handbrauseOptions = alternaAccessories.find(m => m.name.toLowerCase().includes('handbrause')).options;
        } else {
          // ensure 'Ohne Handbrause' is at the end of options
          if (!handbrauseOptions.find(o => o.label.toLowerCase().includes('ohne handbrause'))) {
             handbrauseOptions.push({
               artNr: 'ohne_handbrause',
               label: 'Ohne Handbrause',
               type: 'Option',
               menge: 0,
               imgUrl: ''
             });
          }
        }

        const handbrause = {
          id: 'mat_handbrause_' + Math.random().toString(36).substr(2, 5),
          name: 'Handbrause',
          options: handbrauseOptions
        };

        // Create deep copies to avoid reference issues
        const newAbstell = JSON.parse(JSON.stringify(abstell));
        newAbstell.id = 'mat_abstell_' + Math.random().toString(36).substr(2, 5);
        
        const newSchlauch = JSON.parse(JSON.stringify(schlauch));
        newSchlauch.id = 'mat_schlauch_' + Math.random().toString(36).substr(2, 5);
        
        const newHalter = JSON.parse(JSON.stringify(halter));
        newHalter.id = 'mat_halter_' + Math.random().toString(36).substr(2, 5);
        
        const newGleitstange = JSON.parse(JSON.stringify(gleitstange));
        newGleitstange.id = 'mat_gleitstange_' + Math.random().toString(36).substr(2, 5);

        // Fix dependencies
        newHalter.dependsOn = newGleitstange.id;
        newSchlauch.dependsOn = newGleitstange.id;

        // Set the mounting materials in the exact order requested by user:
        // 1. Abstellverschraubungen
        // 2. Brauseschlauch
        // 3. Handbrause
        // 4. Brausehalter
        // 5. Duschgleitstange
        
        t.mountingMaterials = [
          newAbstell,
          newSchlauch,
          handbrause,
          newHalter,
          newGleitstange
        ];
        
        count++;
      }
    }
  });
}

fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
console.log(`Successfully added brand-specific accessories to ${count} trays.`);
