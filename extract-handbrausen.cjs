const fs = require('fs');
const data = JSON.parse(fs.readFileSync('custom-data.json', 'utf8'));

function getOptions(brand) {
  for (let cat of ['bademischer', 'duschenmischer']) {
    for (let t of data[cat].trays) {
      if (t.label.includes(brand) && t.mountingMaterials) {
        let hb = t.mountingMaterials.find(m => m.name.toLowerCase().includes('handbrause'));
        if (hb && hb.options && hb.options.length > 1) {
          // ensure it doesn't just have Alterna
          if (hb.options.some(o => o.label.includes(brand))) {
            return hb.options;
          }
        }
      }
    }
  }
  return null;
}

const hansgrohe = getOptions('Hansgrohe');
const kwc = getOptions('KWC');
const laufen = getOptions('Laufen');

console.log('Hansgrohe:', hansgrohe ? hansgrohe.length : 'null');
console.log('KWC:', kwc ? kwc.length : 'null');
console.log('Laufen:', laufen ? laufen.length : 'null');

fs.writeFileSync('brand-handbrausen.json', JSON.stringify({Hansgrohe: hansgrohe, KWC: kwc, Laufen: laufen}, null, 2));
