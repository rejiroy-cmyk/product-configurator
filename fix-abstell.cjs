const fs = require('fs');
const dataFile = 'custom-data.json';
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

let count = 0;

function extractMontage(r) {
  const e = (r.label || '').toLowerCase();
  return (e.includes('standmodell') || e.includes('freistehend')) ? 'Standmodell' :
         (e.includes('unterputz') || e.includes(' up ') || e.includes('einbau') || e.includes('endmontageset') || e.includes('grundkörper') || e.includes('grundkoerper')) ? 'Unterputz' :
         'Aufputz';
}

if (data.bademischer && data.bademischer.trays) {
  data.bademischer.trays.forEach(t => {
    if (extractMontage(t) === 'Aufputz' && t.mountingMaterials) {
      const abs = t.mountingMaterials.find(m => m.name && m.name.toLowerCase().includes('abstellverschraubung'));
      if (abs) {
        abs.options.forEach(o => {
          if (o.artNr === '6521 108.501.000') {
            o.artNr = '6521 109.501.000';
            o.label = 'Abstellverschraubung, ½" x ¾", mit flacher Rosette, Verchromt';
            o.imgUrl = 'https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06521109_501_000.png';
            count++;
          }
        });
      }
    }
  });
}

// Ensure the same is checked for duschenmischer if applicable, but user only mentioned Bademischer
if (data.duschenmischer && data.duschenmischer.trays) {
  data.duschenmischer.trays.forEach(t => {
    if (extractMontage(t) === 'Aufputz' && t.mountingMaterials) {
      const abs = t.mountingMaterials.find(m => m.name && m.name.toLowerCase().includes('abstellverschraubung'));
      if (abs) {
        abs.options.forEach(o => {
          if (o.artNr === '6521 108.501.000' && t.label.includes('½" x ¾"')) {
            o.artNr = '6521 109.501.000';
            o.label = 'Abstellverschraubung, ½" x ¾", mit flacher Rosette, Verchromt';
            o.imgUrl = 'https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06521109_501_000.png';
            count++;
          }
        });
      }
    }
  });
}

fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
console.log(`Successfully updated Abstellverschraubung in ${count} places.`);
