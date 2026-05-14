import fs from 'fs';

const dataPath = './custom-data.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

let count = 0;

function cleanLabel(label) {
    if (!label) return label;
    const marker = 'Preisübersicht Unverbindliche';
    if (label.includes(marker)) {
        count++;
        return label.split(marker)[0].trim();
    }
    return label;
}

function processItems(items) {
    if (!items || !Array.isArray(items)) return;
    items.forEach(item => {
        item.label = cleanLabel(item.label);
        if (item.variants) processItems(item.variants);
        if (item.mountingMaterials) {
            item.mountingMaterials.forEach(mat => {
                if (mat.options) processItems(mat.options);
            });
        }
    });
}

Object.keys(data).forEach(appId => {
    const app = data[appId];
    if (app.trays) processItems(app.trays);
    if (app.parts) processItems(app.parts);
    if (app.finishes) processItems(app.finishes);
    if (app.basinTrays) processItems(app.basinTrays);
});

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
console.log(`Cleaned up ${count} descriptions.`);
