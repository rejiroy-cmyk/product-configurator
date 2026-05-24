const fs = require('fs');
const dataFile = 'custom-data.json';
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
let count = 0;

if (data.bademischer && data.bademischer.trays) {
  data.bademischer.trays.forEach(t => {
    if (t.mountingMaterials) {
      const gleitIndex = t.mountingMaterials.findIndex(m => m.name === 'Duschgleitstange (Optional)');
      if (gleitIndex >= 0) {
        // Move it to the very end of the array
        const gleitMat = t.mountingMaterials.splice(gleitIndex, 1)[0];
        t.mountingMaterials.push(gleitMat);
        count++;
      }
    }
  });
}

fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
console.log(`Moved Duschgleitstange to the bottom for ${count} trays.`);
