const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../custom-data.json');
const dataJsPath = path.join(__dirname, '../modules/data.js');

function bumpDataVersion() {
    let content = fs.readFileSync(dataJsPath, 'utf8');
    const regex = /export const DATA_VERSION = '(\d+\.\d+\.)(\d+)';/;
    const match = content.match(regex);
    if (match) {
        const prefix = match[1];
        const currentRevision = parseInt(match[2], 10);
        const newVersion = `${prefix}${currentRevision + 1}`;
        content = content.replace(regex, `export const DATA_VERSION = '${newVersion}';`);
        fs.writeFileSync(dataJsPath, content, 'utf8');
        console.log(`Bumped DATA_VERSION to ${newVersion}`);
    } else {
        console.log('Could not find DATA_VERSION to bump.');
    }
}

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const artNrToUpdate = '6321 514.501.000'; // Bademischer-Endmontageset Laufen Citytherm

const bogenOhneHalter = {
    artNr: "6544 164.501.000",
    label: "Anschlussbogen Laufen City, mit Rückflussverhinderer, Rosette rund, für Handbrause Geräuschgruppe NT Verchromt"
};

const bogenMitHalter = {
    artNr: "6544 166.501.000",
    label: "Anschlussbogen Laufen City ½\" mit integriertem Brausehalter Rückflussverhinderer Rosette eckig Geräuschgruppe NT Verchromt"
};

const mountingMaterials = [
    {
        id: "mat_grundkoerper",
        name: "Grundkörper",
        options: [
            {
                artNr: "6158 110.000.000",
                label: "Einbaukörper Laufen Simibox Light ½\", mit Vorabstellung",
                type: "Zubehör",
                imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06158110_000_000.png",
                menge: 1
            }
        ]
    },
    {
        id: "mat_schiene",
        name: "Montageschiene",
        options: [
            {
                artNr: "6158 120.000.000",
                label: "Montageset Laufen Simibox 2 Montageschienen 560 mm Befestigungsmaterial",
                type: "Zubehör",
                imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06158120_000_000.png",
                menge: 1
            }
        ]
    },
    {
        id: "mat_bogen",
        name: "Anschlussbogen",
        options: [
            {
                artNr: bogenOhneHalter.artNr,
                label: bogenOhneHalter.label,
                type: "Zubehör",
                imgUrl: `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/0${bogenOhneHalter.artNr.replace(/ /g, '').replace(/\./g, '_')}.png`,
                menge: 1
            },
            {
                artNr: bogenMitHalter.artNr,
                label: bogenMitHalter.label,
                type: "Option",
                imgUrl: `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/0${bogenMitHalter.artNr.replace(/ /g, '').replace(/\./g, '_')}.png`,
                menge: 1
            }
        ]
    },
    {
        id: "mat_schlauch",
        name: "Brauseschlauch",
        options: [
            {
                artNr: "6542 316.501.000",
                label: "Brauseschlauch Alterna flexline, 1250 mm, ½\"x½\", Kunststoff mit Metalleffekt",
                type: "Zubehör",
                imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06542316_501_000.png",
                menge: 1
            },
            {
                artNr: "6542 317.501.000",
                label: "Brauseschlauch Alterna flexline, 1600 mm, ½\"x½\", Kunststoff mit Metalleffekt",
                type: "Option",
                imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06542317_501_000.png",
                menge: 1
            },
            {
                artNr: "6542 318.501.000",
                label: "Brauseschlauch Alterna flexline, 1800 mm, ½\"x½\", Kunststoff mit Metalleffekt",
                type: "Option",
                imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06542318_501_000.png",
                menge: 1
            }
        ]
    },
    {
        id: "mat_handbrause",
        name: "Handbrause",
        options: [
            {
                artNr: "6541 326.501.000",
                label: "Handbrause Alterna easyline, Ø 101 mm, 1-jet, SoftRain",
                type: "Zubehör",
                imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06541326_501_000.png",
                menge: 1
            }
        ]
    },
    {
        id: "mat_halter",
        name: "Brausehalter",
        options: [
            {
                artNr: "6543 131.501.000",
                label: "Brausehalter Alterna eco, Verchromt",
                type: "Zubehör",
                imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06543131_501_000.png",
                menge: 1
            },
            {
                artNr: "6543 132.501.000",
                label: "Brausehalter Alterna, Rosette rund, Verchromt",
                type: "Option",
                imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06543132_501_000.png",
                menge: 1
            },
            {
                artNr: "OHNE",
                label: "Ohne Brausehalter (Duschengleitstange verwenden)",
                type: "Option",
                imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/00000000.png",
                menge: 0
            }
        ]
    },
    {
        id: "mat_stange",
        name: "Duschengleitstange",
        options: [
            {
                artNr: "6531 404.501.000",
                label: "Duschengleitstange Alterna fit Gelenkhalter Arretierungshebel, 1100 mm",
                type: "Zubehör",
                imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06531404_501_000.png",
                menge: 1
            },
            {
                artNr: "6531 403.501.000",
                label: "Duschengleitstange Alterna fit Gelenkhalter Arretierungshebel, 610 mm",
                type: "Option",
                imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06531403_501_000.png",
                menge: 1
            }
        ]
    }
];

let found = false;
data.bademischer.trays.forEach(tray => {
    if (tray.artNr === artNrToUpdate) {
        tray.mountingMaterials = mountingMaterials;
        found = true;
    }
});

if (found) {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    console.log(`Successfully updated ${artNrToUpdate} with 8-step hierarchy and Therm accessories!`);
    bumpDataVersion();
} else {
    console.log(`Could not find ${artNrToUpdate}`);
}
