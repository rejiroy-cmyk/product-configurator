const fs = require('fs');

const adminCode = fs.readFileSync('modules/admin.js', 'utf8');
const startMatch = 'function autoLinkShowerAccessories(tray) {';
const startIdx = adminCode.indexOf(startMatch);
const endMatch = 'function syncProduct(tray, appId) {';
const endIdx = adminCode.indexOf(endMatch);

if (startIdx === -1 || endIdx === -1) {
    console.error("Could not find bounds");
    process.exit(1);
}

// Extract the function body
const funcBody = adminCode.substring(startIdx, endIdx);

const DATA_PATH = 'custom-data.json';
const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

// Mock the environment
const productApps = { zubehoer_pool: data.zubehoer_pool };
const window = { productApps };

// Evaluate the function into our script context
const codeToRun = `
    const window = { productApps: ${JSON.stringify(productApps)} };
    const productApps = window.productApps;
    
    ${funcBody}
    
    let patched = 0;
    const trays = ${JSON.stringify(data.duschenwanne.trays)};
    for (const tray of trays) {
        tray.mountingMaterials = [];
        autoLinkShowerAccessories(tray);
        patched++;
    }
    
    console.log("Successfully restored logic for " + patched + " trays.");
    require('fs').writeFileSync('custom-data.json', JSON.stringify({ ...${JSON.stringify(data)}, duschenwanne: { ...${JSON.stringify(data.duschenwanne)}, trays } }, null, 2));
`;

fs.writeFileSync('scratch/execute_restore.js', codeToRun);
console.log('Generated execute_restore.js');
