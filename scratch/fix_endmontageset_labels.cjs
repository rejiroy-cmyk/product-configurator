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
    }
}

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
let changed = 0;

Object.keys(data).forEach(cat => {
    if (data[cat].trays) {
        data[cat].trays.forEach(tray => {
            if (tray.label) {
                const oldLabel = tray.label;
                let newLabel = tray.label;

                if (newLabel.startsWith('Bademischer-Endmontageset ')) {
                    newLabel = newLabel.replace(/^Bademischer-Endmontageset\s+([^,]+)/, 'Bademischer $1 Endmontageset');
                } else if (newLabel.startsWith('Duschenmischer-Endmontageset ')) {
                    newLabel = newLabel.replace(/^Duschenmischer-Endmontageset\s+([^,]+)/, 'Duschenmischer $1 Endmontageset');
                }

                if (newLabel !== oldLabel) {
                    tray.label = newLabel;
                    console.log(`Renamed: \n  From: ${oldLabel}\n  To:   ${newLabel}`);
                    changed++;
                }
            }
        });
    }
});

if (changed > 0) {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');
    bumpDataVersion();
    console.log(`Fixed ${changed} Endmontageset labels.`);
} else {
    console.log('No labels needed fixing.');
}
