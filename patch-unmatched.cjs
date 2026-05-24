const fs = require('fs');
const dataFile = 'custom-data.json';
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

const FUSSSET = {
  artNr: "1435 191.000.000",
  label: "Duschwannen-Fussset Schmidlin, Omnia 8 Fussstützen schallisoliert Montagehöhe 4,5 -11 cm",
  type: "Zubehör",
  imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/01435191_000_000.png",
  menge: 1
};

const STANDARD_ACCESSORIES = [
  {
    id: "mat_siphon",
    name: "Ablaufgarnitur",
    options: [{ artNr: "1311 701.000.000", label: "ablaufgarnitur schmidlin flow 50, ø 90 mm, ablaufleistung 0,55 l/s, ohne", imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PS1/01311701.png", type: "Zubehör", menge: 1 }]
  },
  {
    id: "mat_deckel",
    name: "Farbiger Ablaufdeckel (Optional)",
    options: [
      { artNr: "none", label: "Ohne (Standardabdeckung der Ablaufgarnitur nutzen)", type: "Zubehör", menge: 0 },
      { artNr: "1311 699.100.000", label: "ablaufdeckel schmidlin 90, ohne ablaufgarnitur, stahl, emailliert, zu", imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PS1/01311699_nV_000.png", type: "Zubehör", menge: 1 },
      { artNr: "1311 698.100.000", label: "Ablaufhaube zu Tempoplex / Floor / Contura, zu Duschenwannengarnitur 1311 701 / 1422 213 Weiss", imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PS1/01311698.png", type: "Zubehör", menge: 1 }
    ],
    dependsOn: "mat_siphon",
    optionRules: [{ whenArtNr: "1311 701.000.000", optionArtNrs: ["1311 699.100.000", "1311 698.100.000"] }],
    blockedMessage: "Bitte zuerst eine Ablaufgarnitur wählen.",
    noOptionsMessage: "Keine passenden Deckel für diese Garnitur gefunden."
  },
  {
    id: "mat_tape",
    name: "Zargen-Wannendichtband",
    options: [{ artNr: "1461 001.000.000", label: "Zargen- Wannendichtband Alterna, Länge 2 m...", type: "Zubehör", imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/01461001_000_000.png", menge: 1 }]
  }
];

// Frame: "auf Mass" up to 129x125 for 120x110; "ab 130x76" for 130x130
const FRAME_AUF_MASS_SMALL = {
  artNr: "1435 199.000.000",
  label: "Montagerahmen Schmidlin Omnia auf Mass, bis 129 x 125 cm zu allen Schmidlin Duschenwannen und Duschflächen Floor und Viva ohne Fussset",
  imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PS1/01435167.png",
  type: "Zubehör", menge: 1
};
const FRAME_AUF_MASS_LARGE = {
  artNr: "1435 200.000.000",
  label: "Montagerahmen Schmidlin Omnia auf Mass, ab 130 x 76 cm zu allen Schmidlin Duschenwannen ohne Fussset",
  imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PS1/01435167.png",
  type: "Zubehör", menge: 1
};

function buildFrameMat(frameOption) {
  return {
    id: "mat_frame",
    name: "Montagerahmen System",
    options: [frameOption],
    bundle: [],
    bundleRules: [{ optionArtNrs: [frameOption.artNr], bundle: [FUSSSET] }]
  };
}

const PATCH_MAP = {
  "1311 253.100.000": buildFrameMat(FRAME_AUF_MASS_SMALL), // 120x110
  "1311 274.100.000": buildFrameMat(FRAME_AUF_MASS_LARGE), // 130x130
  "1311 455.100.000": buildFrameMat(FRAME_AUF_MASS_LARGE), // 130x130
};

let patched = 0;
data.duschenwanne.trays.forEach(t => {
  if (PATCH_MAP[t.artNr]) {
    t.mountingMaterials = [...STANDARD_ACCESSORIES, PATCH_MAP[t.artNr]];
    patched++;
    console.log(`✅ Patched: ${t.artNr}`);
  }
});

fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
console.log(`\nDone. ${patched} trays patched.`);
