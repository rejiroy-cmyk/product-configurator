const fs = require('fs');
const dataFile = 'custom-data.json';
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

function getShape(label) {
  const l = label.toLowerCase();
  if (l.includes('eckig') || 
      l.match(/\be\b/) || 
      l.includes('metropol') || 
      l.includes('tablet') || 
      l.includes('vivenis') ||
      l.includes('square')) {
    return 'Square';
  }
  return 'Round';
}

let count = 0;

['bademischer', 'duschenmischer'].forEach(cat => {
  if (data[cat] && data[cat].trays) {
    data[cat].trays.forEach(t => {
      if (t.label.includes('Hansgrohe') && t.mountingMaterials) {
        const hb = t.mountingMaterials.find(m => m.name.toLowerCase().includes('handbrause'));
        if (hb && hb.options && hb.options.length > 1) {
          const shape = getShape(t.label);
          const targetArtNr = shape === 'Square' ? '6541 871.501.000' : '6541 873.501.000';
          
          const optionIndex = hb.options.findIndex(o => o.artNr === targetArtNr);
          if (optionIndex > 0) {
            // Remove it from its current position
            const option = hb.options.splice(optionIndex, 1)[0];
            // Insert it at the front (index 0)
            hb.options.unshift(option);
            count++;
          }
        }
      }
    });
  }
});

fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
console.log(`Successfully updated defaults for ${count} Hansgrohe trays.`);
