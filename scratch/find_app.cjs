const fs = require('fs');
const data = JSON.parse(fs.readFileSync('custom-data.json', 'utf8'));

Object.keys(data).forEach(appId => {
    const items = data[appId].trays || data[appId].basinTrays || data[appId].faucets || [];
    const found = items.find(t => t.artNr === "6417 554.501.000");
    if (found) {
        console.log(`Found in App: ${appId}`);
        console.log(JSON.stringify(found, null, 2));
    }
});
