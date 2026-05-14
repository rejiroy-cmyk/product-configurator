const fs = require('fs');
const data = JSON.parse(fs.readFileSync('/Users/jenistonsellathamby/Desktop/product-configurator/custom-data.json', 'utf8'));

const library = [];
const seen = new Set();

const norm = (v) => (!v ? null : (v < 400 ? v * 10 : v));
const extract3D = (label) => {
    if (!label) return {w:null, h:null, d:null};
    const m = label.match(/(\d{2,4})\s*[xX]\s*(\d{2,4})\s*[xX]\s*(\d{2,4})/);
    if (m) return {w: norm(parseInt(m[1])), h: norm(parseInt(m[2])), d: norm(parseInt(m[3]))};
    const m2 = label.match(/(\d{2,4})\s*[xX]\s*(\d{2,4})/);
    if (m2) return {w: norm(parseInt(m2[1])), h: norm(parseInt(m2[2])), d: null};
    return {w:null, h:null, d:null};
};

function processItem(item) {
    if (!item || !item.artNr || seen.has(item.artNr)) return;
    if (item.artNr === '0000 001.000.000' || item.artNr === '0000 002.000.000') return;
    
    seen.add(item.artNr);
    const dims = extract3D(item.label);
    library.push({
        artNr: item.artNr,
        label: item.label,
        manufacturer: item.manufacturer || 'Andere',
        w: dims.w,
        h: dims.h,
        depth: dims.d,
        imgUrl: item.imgUrl
    });
}

Object.values(data).forEach(app => {
    if (app.trays && Array.isArray(app.trays)) {
        app.trays.forEach(tray => {
            // Process the tray itself (it might be an accessory from the pool)
            processItem(tray);

            // Process existing materials
            if (tray.mountingMaterials && Array.isArray(tray.mountingMaterials)) {
                tray.mountingMaterials.forEach(mat => {
                    if (mat.options && Array.isArray(mat.options)) {
                        mat.options.forEach(opt => processItem(opt));
                    }
                });
            }
        });
    }
    if (app.pool && Array.isArray(app.pool)) {
        app.pool.forEach(item => processItem(item));
    }
});

fs.writeFileSync('/Users/jenistonsellathamby/Desktop/product-configurator/scratch/shower_accessory_library.json', JSON.stringify(library, null, 2));
console.log(`Library rebuilt with ${library.length} unique accessories.`);
