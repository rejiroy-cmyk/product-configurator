const fs = require('fs');

const dataFile = 'custom-data.json';
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

let count = 0;
if (data.duschenmischer && data.duschenmischer.trays) {
  data.duschenmischer.trays.forEach(t => {
    if (t.mountingMaterials) {
      t.mountingMaterials.forEach(m => {
        if (m.name && m.name.toLowerCase().includes('brausehalter')) {
          m.name = "Duschgleitstange";
          m.options = [
            {
              artNr: "6531 404.501.000",
              label: "Duschengleitstange Alterna fit Gelenkhalter Arretierungshebel, 1100 mm Verchromt",
              menge: 1,
              type: "Zubehör",
              imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06531404_501_000.png"
            },
            {
              artNr: "6531 403.501.000",
              label: "Duschengleitstange Alterna fit Gelenkhalter Arretierungshebel, 610 mm Verchromt",
              menge: 1,
              type: "Zubehör",
              imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06531403_501_000.png"
            }
          ];
          count++;
        }
      });
    }
  });
}

fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
console.log(`Successfully replaced Brausehalter with Duschgleitstange in ${count} Duschenmischer trays.`);
