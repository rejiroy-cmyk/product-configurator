const fs = require('fs');

const dataFile = 'custom-data.json';
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

const TARGET_SERIES = ['Superflach 2.5', 'Superflach 3.5', 'Tief 6.5', 'Vario (Massgeschneidert)'];

const SiphonGeberit = {
  artNr: "1422 117.000.000",
  label: "Duschwannenablauf Geberit 90 Ø Abgang Ø 56 mm direkt verschweissbar für Duschwannen mit Ablaufloch Ø",
  imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PS1/01422117_000_000.png",
  type: "Zubehör", menge: 1
};

const SiphonSchmidlin = {
  artNr: "1311 701.000.000",
  label: "ablaufgarnitur schmidlin flow 50, ø 90 mm, ablaufleistung 0,55 l/s, ohne",
  imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PS1/01311701.png",
  type: "Zubehör", menge: 1
};

const DeckelGeberit = {
  artNr: "1422 118.501.000",
  label: "ablaufdeckel geberit, zu duschwannenablauf ø 90 mm (1422 117),",
  imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PS1/01422118_501_000.png",
  type: "Zubehör", menge: 1
};

const DeckelSchmidlin = {
  artNr: "1311 698.501.000",
  label: "Ablaufhaube zu Tempoplex / Floor/ Contura, zu Duschenwannengarnitur 1311 701 / 1422 223 / 1422 213 V",
  imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PS1/01311698.png",
  type: "Zubehör", menge: 1
};

let updatedCount = 0;

data.duschenwanne.trays.forEach(t => {
  if (t.manufacturer === 'Schmidlin' && TARGET_SERIES.includes(t.serie)) {
    if (!t.mountingMaterials) return;
    
    // Remove existing siphon and deckel blocks
    t.mountingMaterials = t.mountingMaterials.filter(m => m.id !== 'mat_siphon' && m.id !== 'mat_deckel');
    
    // Re-add them as two separate dropdowns, but NO "none" option, so it auto-selects.
    // Order: Deckel comes FIRST, then Siphon.
    t.mountingMaterials.unshift(
      {
        id: "mat_deckel",
        name: "Ablaufdeckel",
        options: [DeckelGeberit, DeckelSchmidlin],
        dependsOn: "mat_siphon",
        optionRules: [
          {
            whenArtNr: SiphonGeberit.artNr,
            optionArtNrs: [DeckelGeberit.artNr] // Only 1 option -> Auto-selected by configurator UI!
          },
          {
            whenArtNr: SiphonSchmidlin.artNr,
            optionArtNrs: [DeckelSchmidlin.artNr]
          }
        ],
        blockedMessage: "Wird automatisch zugewiesen.",
        noOptionsMessage: "Wird automatisch zugewiesen."
      },
      {
        id: "mat_siphon",
        name: "Ablaufgarnitur",
        options: [SiphonGeberit, SiphonSchmidlin]
      }
    );
    updatedCount++;
  }
});

fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
console.log('Successfully reverted to 2 rules, Deckel first, for ' + updatedCount + ' trays.');
