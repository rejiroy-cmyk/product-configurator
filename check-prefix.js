const data = require('./custom-data.json');

const prefixSet = { 
    main: new Set(),
    acc: new Set()
};

function process(obj) {
    if (obj.trays) {
        obj.trays.forEach(t => {
            if (t.artNr) prefixSet.main.add(t.artNr.substring(0, 2));
            if (t.mountingMaterials) {
                t.mountingMaterials.forEach(m => {
                    if (m.options) {
                        m.options.forEach(o => {
                            if (o.artNr) prefixSet.acc.add(o.artNr.substring(0, 2));
                        });
                    }
                });
            }
        });
    }
}

process(data.bademischer || {});
process(data.duschenmischer || {});

console.log("Main product prefixes: ", Array.from(prefixSet.main).sort());
console.log("Accessory product prefixes: ", Array.from(prefixSet.acc).sort());
