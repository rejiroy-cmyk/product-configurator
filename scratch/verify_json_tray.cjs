const fs = require('fs');
const data = JSON.parse(fs.readFileSync('/Users/jenistonsellathamby/Desktop/product-configurator/custom-data.json', 'utf8'));

const trayArtNr = "1317 154.100.000";
const targetTray = data.duschenwanne.trays.find(t => t.artNr === trayArtNr);

if (targetTray) {
    console.log("Tray Found:", targetTray.label);
    console.log("Mounting Materials:", JSON.stringify(targetTray.mountingMaterials, null, 2));
} else {
    console.log("Tray not found in JSON!");
    // Check if it's there with a different identifier
    const anyTray = data.duschenwanne.trays.find(t => t.label.includes("154.100.000") || t.artNr.includes("154.100.000"));
    if (anyTray) console.log("Found similar tray:", anyTray.artNr);
}
