const fs = require('fs');

const dataPath = '/Users/jenistonsellathamby/Desktop/product-configurator/custom-data.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const artNrToUpdate = '6323 912.501.000'; // Bademischer-Endmontageset Laufen Quadriga

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
                artNr: "6544 168.501.000",
                label: "Anschlussbogen Laufen Quadriga ½\", A 40 mm, Rückflussverhinderer, Rosette eckig, für Handbrause Geräuschgruppe NT Verchromt",
                type: "Zubehör",
                imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06544168_501_000.png",
                menge: 1
            },
            {
                artNr: "6544 170.501.000",
                label: "Anschlussbogen Laufen Quadriga ½\" A 40 mm mit integriertem Brausehalter Rückflussverhinderer Rosette eckig Geräuschgruppe NT Verchromt",
                type: "Option",
                imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06544170_501_000.png",
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
                artNr: "6543 388.501.000",
                label: "Brausehalter Laufen Quadriga A 44 mm, Rosette eckig Verchromt",
                type: "Zubehör",
                imgUrl: "https://profishop.sanitastroesch.ch/multimedia/Web/PG1/06543388_501_000.png",
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
    console.log(`Successfully updated ${artNrToUpdate} with 8-step hierarchy and Quadriga accessories!`);
} else {
    console.log(`Could not find ${artNrToUpdate}`);
}
