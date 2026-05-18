const fs = require('fs');

const data = JSON.parse(fs.readFileSync('/Users/jenistonsellathamby/Desktop/product-configurator/custom-data.json', 'utf8'));

['duschenwanne', 'badewanne'].forEach(cat => {
    const trays = data[cat].trays || [];
    const withMaterials = trays.filter(t => t.mountingMaterials && t.mountingMaterials.length > 0);
    const withoutMaterials = trays.filter(t => !t.mountingMaterials || t.mountingMaterials.length === 0);
    
    console.log(`\n=== ${cat} ===`);
    console.log(`Total trays: ${trays.length}`);
    console.log(`Trays WITH mountingMaterials: ${withMaterials.length}`);
    console.log(`Trays WITHOUT mountingMaterials: ${withoutMaterials.length}`);
    
    if (withoutMaterials.length > 0) {
        console.log("Sample tray without mountingMaterials:", JSON.stringify(withoutMaterials[0]).substring(0, 300));
    }
});
