const fs = require('fs');

const correctCatalog = [
    {
        id: "dusche",
        name: "Dusche",
        thumbnail: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/01311872_100_181.png",
        subcategories: [
            { id: "duschenwanne", name: "Duschenwanne", appId: "duschenwanne", hasApp: true },
            { id: "duschenmischer", name: "Duschenmischer", appId: "duschenmischer", hasApp: true },
            { id: "duschtrennwand", name: "Duschtrennwand", appId: "duschtrennwand", hasApp: true }
        ]
    },
    {
        id: "bad",
        name: "Bad",
        thumbnail: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/01113324.png",
        subcategories: [
            { id: "badewanne", name: "Badewanne", appId: "badewanne", hasApp: true },
            { id: "bademischer", name: "Bademischer", appId: "bademischer", hasApp: true }
        ]
    },
    {
        id: "waschplatz",
        name: "Waschplatz",
        thumbnail: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/02111166_000_000.png",
        subcategories: [
            { id: "waschtisch", name: "Waschtisch", appId: "waschtisch", hasApp: true },
            { id: "waschtischmischer", name: "Waschtischmischer", appId: "waschtischmischer", hasApp: true },
            { id: "spiegelschrank", name: "Spiegelschrank", appId: "spiegelschrank", hasApp: false }
        ]
    },
    {
        id: "wc",
        name: "WC",
        thumbnail: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/04111319_000_000.png",
        subcategories: [
            { id: "wandklosett", name: "Wandklosett", appId: "wandklosett", hasApp: true },
            { id: "standklosett", name: "Standklosett", appId: "standklosett", hasApp: true }
        ]
    }
];

let dataJs = fs.readFileSync('modules/data.js', 'utf8');
dataJs = dataJs.replace(/export const catalog = .*;?\s*$/s, `export const catalog = ${JSON.stringify(correctCatalog, null, 4)};\n`);
fs.writeFileSync('modules/data.js', dataJs);
console.log('Fixed catalog in data.js');
