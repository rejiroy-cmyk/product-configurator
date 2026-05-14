const fs = require('fs');
const data = JSON.parse(fs.readFileSync('custom-data.json', 'utf8'));

const targets = ['6544 164.501.000', '6544 166.501.000'];
const replacements = [
    {
        "artNr": "6544 100.501.000",
        "label": "Anschlussbogen",
        "imgUrl": "https://profishop.sanitastroesch.ch/multimedia/Web/PS1/06118116_000_000.png",
        "menge": 1
    },
    {
        "artNr": "6544 102.501.000",
        "label": "Anschlussbogen mit integriertem Brausehalter",
        "imgUrl": "https://profishop.sanitastroesch.ch/multimedia/Web/PS1/06118117_000_000.png",
        "menge": 1
    }
];

let changedCount = 0;

Object.keys(data).forEach(appId => {
    if (appId === 'bademischer' || appId === 'duschenmischer') return;

    const app = data[appId];
    if (app.trays) {
        app.trays.forEach(tray => {
            if (tray.mountingMaterials) {
                tray.mountingMaterials.forEach(mat => {
                    if (mat.options) {
                        const hasOld = mat.options.some(opt => targets.includes(opt.artNr));
                        if (hasOld) {
                            // Filter out old ones and add new ones
                            const filtered = mat.options.filter(opt => !targets.includes(opt.artNr));
                            mat.options = [...filtered, ...replacements];
                            changedCount++;
                        }
                    }
                });
            }
        });
    }

    // Also check parts for generic apps
    if (app.parts) {
        app.parts.forEach(part => {
            if (part.options) {
                const hasOld = part.options.some(opt => targets.includes(opt.artNr));
                if (hasOld) {
                    const filtered = part.options.filter(opt => !targets.includes(opt.artNr));
                    part.options = [...filtered, ...replacements];
                    changedCount++;
                }
            }
        });
    }
});

if (changedCount > 0) {
    fs.writeFileSync('custom-data.json', JSON.stringify(data, null, 2));
    console.log(`Successfully replaced Anschlussbogen in ${changedCount} locations.`);
} else {
    console.log('No Anschlussbogen found to replace (excluding bademischer and duschenmischer).');
}
