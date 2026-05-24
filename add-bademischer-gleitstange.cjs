const fs = require('fs');

const dataFile = 'custom-data.json';
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

let count = 0;

const GleitstangeOptions = [
  {
    artNr: "ohne_gleitstange",
    label: "Ohne Duschgleitstange",
    type: "Option",
    menge: 0,
    imgUrl: ""
  },
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
    type: "Option",
    imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06531403_501_000.png"
  }
];

if (data.bademischer && data.bademischer.trays) {
  data.bademischer.trays.forEach(t => {
    if (t.mountingMaterials) {
      let brausehalter = t.mountingMaterials.find(m => m.name && m.name.toLowerCase().includes('brausehalter'));
      let brauseschlauch = t.mountingMaterials.find(m => m.name && m.name.toLowerCase().includes('brauseschlauch'));
      
      if (brausehalter && brauseschlauch) {
        // Add Ohne to Brausehalter if not exists
        if (!brausehalter.options.some(o => o.artNr === 'ohne_halter')) {
          brausehalter.options.push({
            artNr: "ohne_halter",
            label: "Ohne Brausehalter",
            type: "Option",
            menge: 0,
            imgUrl: ""
          });
        }

        // Add Duschgleitstange as a new material
        const gleitstangeMat = {
          id: "mat_gleitstange_" + Math.random().toString(36).substr(2, 5),
          name: "Duschgleitstange (Optional)",
          options: GleitstangeOptions
        };
        
        // Add to mountingMaterials (e.g. before Brauseschlauch)
        const schlauchIndex = t.mountingMaterials.indexOf(brauseschlauch);
        t.mountingMaterials.splice(schlauchIndex, 0, gleitstangeMat);

        // Update Brausehalter to depend on Gleitstange
        const originalHalterArtNrs = brausehalter.options.filter(o => o.artNr !== 'ohne_halter').map(o => o.artNr);
        brausehalter.dependsOn = gleitstangeMat.id;
        brausehalter.optionRules = [
          {
            whenArtNr: "ohne_gleitstange",
            optionArtNrs: originalHalterArtNrs
          },
          {
            whenArtNr: "6531 404.501.000",
            optionArtNrs: ["ohne_halter"]
          },
          {
            whenArtNr: "6531 403.501.000",
            optionArtNrs: ["ohne_halter"]
          }
        ];
        brausehalter.blockedMessage = "Durch Duschgleitstange ersetzt";

        // Update Brauseschlauch to depend on Gleitstange
        const originalSchlauchArtNrs = brauseschlauch.options.map(o => o.artNr);
        brauseschlauch.dependsOn = gleitstangeMat.id;
        brauseschlauch.optionRules = [
          {
            whenArtNr: "ohne_gleitstange",
            optionArtNrs: originalSchlauchArtNrs
          },
          {
            whenArtNr: "6531 404.501.000",
            optionArtNrs: ["6542 318.501.000", "ohne_schlauch"] // 180cm schlauch
          },
          {
            whenArtNr: "6531 403.501.000",
            optionArtNrs: ["6542 318.501.000", "ohne_schlauch"] // 180cm schlauch
          }
        ];

        count++;
      }
    }
  });
}

fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
console.log(`Successfully added Duschgleitstange rules to ${count} Bademischer trays.`);
