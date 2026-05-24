const fs = require('fs');

const dataFile = 'custom-data.json';
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

// ── Build a size → Omnia frame lookup from the pool ──────────────────────────
const omniaFrames = data.zubehoer_pool.trays.filter(z =>
  z.label && z.label.toLowerCase().includes('omnia') && z.artNr.startsWith('1435')
);

const aufMassFrame = omniaFrames.find(f => f.label.toLowerCase().includes('auf mass'));
const frameSizeMap = new Map(); // "WxH" or "HxW" → frame object

omniaFrames.forEach(f => {
  const m = f.label.match(/(\d{2,3})\s*x\s*(\d{2,3})\s*cm/i);
  if (m) {
    const a = parseInt(m[1]), b = parseInt(m[2]);
    frameSizeMap.set(`${a}x${b}`, f);
    frameSizeMap.set(`${b}x${a}`, f); // both orientations
  }
});
console.log(`Omnia frames indexed: ${frameSizeMap.size / 2} unique sizes`);
console.log(`Auf Mass frame: ${aufMassFrame ? aufMassFrame.artNr : 'NOT FOUND'}`);

// ── Standard accessories template (siphon + deckel + tape) ───────────────────
const STANDARD_ACCESSORIES = [
  {
    id: "mat_deckel",
    name: "Ablaufdeckel",
    options: [
      {
        artNr: "1311 698.100.000",
        label: "Ablaufhaube zu Tempoplex / Floor / Contura, zu Duschenwannengarnitur 1311 701 / 1422 223 / 1422 213 Weiss",
        imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/01311698_100_000.png",
        type: "Zubehör",
        menge: 1
      },
      {
        artNr: "1311 698.501.000",
        label: "Ablaufhaube zu Tempoplex / Floor/ Contura, zu Duschenwannengarnitur 1311 701 / 1422 223 / 1422 213 Verchromt",
        imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/01311698_501_000.png",
        type: "Zubehör",
        menge: 1
      },
      {
        artNr: "1311 699.100.000",
        label: "Ablaufdeckel Schmidlin 90 ohne Ablaufgarnitur, Stahl, emailliert, zu Ablaufgarnitur Schmidlin FLOW, Viega Tempoplex, Tempoplex Plus Weiss",
        imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/01311699_100_000.png",
        type: "Zubehör",
        menge: 1
      },
      {
        artNr: "1422 118.100.000",
        label: "Ablaufdeckel Geberit, zu Duschwannenablauf Ø 90 mm (1422 117) Weiss",
        imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/01422118_100_000.png",
        type: "Zubehör",
        menge: 1
      },
      {
        artNr: "1422 118.501.000",
        label: "Ablaufdeckel Geberit zu Duschwannenablauf Ø 90 mm 1422 117 Verchromt",
        imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/01422118_501_000.png",
        type: "Zubehör",
        menge: 1
      }
    ]
  },
  {
    id: "mat_siphon",
    name: "Ablaufgarnitur",
    options: [
      {
        artNr: "1311 701.000.000",
        label: "Ablaufgarnitur Schmidlin Flow 50, Ø 90 mm Ablaufleistung 0,55 l/s ohne Ablaufdeckel",
        imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/01311701_000_000.png",
        type: "Zubehör",
        menge: 1
      },
      {
        artNr: "1422 117.000.000",
        label: "Duschwannenablauf Geberit 90 Ø Abgang Ø 56 mm direkt verschweissbar für Duschwannen mit Ablaufloch Ø 90 mm Ablaufleistung 0,65 l/s ohne Ablaufdeckel 1422 118",
        imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/01422117_000_000.png",
        type: "Zubehör",
        menge: 1
      }
    ],
    dependsOn: "mat_deckel",
    optionRules: [
      { whenArtNr: "1311 698.100.000", optionArtNrs: ["1311 701.000.000"] },
      { whenArtNr: "1311 698.501.000", optionArtNrs: ["1311 701.000.000"] },
      { whenArtNr: "1311 699.100.000", optionArtNrs: ["1311 701.000.000"] },
      { whenArtNr: "1422 118.100.000", optionArtNrs: ["1422 117.000.000"] },
      { whenArtNr: "1422 118.501.000", optionArtNrs: ["1422 117.000.000"] }
    ],
    blockedMessage: "Bitte zuerst einen Ablaufdeckel wählen.",
    noOptionsMessage: "Keine passenden Ablaufgarnituren für diesen Deckel gefunden."
  },
  {
    id: "mat_tape",
    name: "Zargen-Wannendichtband",
    options: [{
      artNr: "1461 001.000.000",
      label: "Zargen- Wannendichtband Alterna, Länge 2 m, 2 Wannen- Eckdichtungen Butyl, integrierte Schallisolierung, Schall- und Schnittbeschädigungsschutz, selbstklebend, für alle Einbauvarianten geeignet, Wannenoberflächen - Schutzband, 1 Anpressschaber, 1 Messer, erfüllt die Anforderungen gemäss der SIA- Norm 271/1 (für L- und U-Variante geeignet)",
      type: "Zubehör",
      imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/01461001_000_000.png",
      menge: 1
    }]
  }
];

// Fussset bundle
const FUSSSET = {
  artNr: "1435 191.000.000",
  label: "Duschwannen-Fussset Schmidlin, Omnia 8 Fussstützen schallisoliert Montagehöhe 4,5 -11 cm",
  type: "Zubehör",
  imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/01435191_000_000.png",
  menge: 1
};

function buildFrameMaterial(frame) {
  return {
    id: "mat_frame",
    name: "Montagerahmen System",
    options: [{
      artNr: frame.artNr,
      label: frame.label,
      imgUrl: frame.imgUrl || "https://profishop.sanitastroesch.ch/multimedia/Web/PS1/01435167.png",
      type: "Zubehör",
      menge: 1
    }],
    bundle: [],
    bundleRules: [{
      optionArtNrs: [frame.artNr],
      bundle: [FUSSSET]
    }]
  };
}

let linked = 0, noFrame = 0, skipped = 0;
const noFrameList = [];

data.duschenwanne.trays.forEach(t => {
  if (t.manufacturer !== 'Schmidlin') return;
  t.mountingMaterials = []; // Clear any existing accessories first to avoid duplicates or leftovers

  const label = t.label || '';
  const isVario = label.toLowerCase().includes('vario');

  // Extract 2D footprint: first two dimensions from size field or label
  // Size field format: "90 x 75 x 6.5" → footprint = 90 x 75
  let w = null, h = null;
  const sizeField = t.size || '';
  const size3D = sizeField.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*\d+/);
  if (size3D) {
    w = Math.round(parseFloat(size3D[1]));
    h = Math.round(parseFloat(size3D[2]));
  } else {
    // Fallback: parse from label
    const lm = label.match(/(\d{2,3})\s*[xX]\s*(\d{2,3})\s*[xX]/);
    if (lm) { w = parseInt(lm[1]); h = parseInt(lm[2]); }
  }

  let frame = null;
  if (isVario && aufMassFrame) {
    frame = aufMassFrame;
  } else if (w && h) {
    frame = frameSizeMap.get(`${w}x${h}`) || frameSizeMap.get(`${h}x${w}`);
  }

  if (!frame && aufMassFrame) {
    frame = aufMassFrame; // Fallback to "auf Mass" frame for custom or unmatched sizes
  }

  if (!frame) {
    noFrame++;
    noFrameList.push({ artNr: t.artNr, label: t.label, size: t.size });
    return;
  }

  t.mountingMaterials = [...STANDARD_ACCESSORIES, buildFrameMaterial(frame)];
  linked++;
});

fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
console.log(`\n✅ Linked: ${linked} trays`);
console.log(`⏭️  Skipped (already had accessories): ${skipped}`);
console.log(`❌ No matching frame found: ${noFrame}`);
if (noFrameList.length > 0) {
  console.log('\nUnmatched trays:');
  noFrameList.forEach(t => console.log(`  ${t.artNr} | size: ${t.size} | ${t.label.substring(0,60)}`));
}
