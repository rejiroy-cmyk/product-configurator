const fs = require('fs');

const dataPath = './custom-data.json';
const csvPath = './dm_acc.csv';

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const csvText = fs.readFileSync(csvPath, 'utf8');

// Parse CSV to get exact labels
const accMap = {};
csvText.split('\n').forEach(line => {
    // split by first comma or quote handling
    const parts = line.split(',');
    if (parts.length > 1) {
        const artNr = parts[0].trim();
        let label = parts[1].trim();
        if (label.startsWith('"') && label.endsWith('"')) {
            label = label.slice(1, -1);
        } else if (label.startsWith('"')) {
            // handle comma inside quote
            const match = line.match(/^([^,]+),"([^"]+)"/);
            if (match) label = match[2];
        }
        if (artNr && !artNr.includes('ArtNr')) {
            const cleanArtNr = artNr.replace(/\s/g, '').replace(/\./g, '_');
            const imgUrl = `https://profishop.sanitastroesch.ch/multimedia/Web/PG1/0${cleanArtNr}.png`;
            accMap[artNr] = { artNr, label, imgUrl };
        }
    }
});

let replaceCount = 0;

function updateOption(opt, newArtNr) {
    if (accMap[newArtNr]) {
        opt.artNr = accMap[newArtNr].artNr;
        opt.label = accMap[newArtNr].label;
        opt.imgUrl = accMap[newArtNr].imgUrl;
        replaceCount++;
    }
}

function processCat(cat) {
    if (!data[cat] || !data[cat].trays) return;
    
    data[cat].trays.forEach(t => {
        if (!t.mountingMaterials) return;
        
        const label = (t.label || '').toLowerCase();
        const manu = (t.manufacturer || '').toLowerCase();
        
        t.mountingMaterials.forEach(mat => {
            const matName = mat.name.toLowerCase();
            
            // 1. Anschlussbogen & Brausehalter Replacements
            if (matName.includes('anschlussbogen') || matName.includes('brausehalter')) {
                mat.options.forEach(opt => {
                    // Skip 'ohne' options
                    if (opt.artNr.startsWith('ohne')) return;

                    // Alterna Niù eckig (6211 617.501.000)
                    if (t.artNr === '6211 617.501.000') {
                        if (opt.label.includes('integriertem Brausehalter')) {
                            updateOption(opt, '6252 349.501.000');
                        }
                    }
                    
                    // Laufen The New Classic
                    else if (label.includes('new classic')) {
                        if (matName.includes('anschlussbogen')) {
                            if (opt.label.includes('integriertem Brausehalter')) {
                                updateOption(opt, '6152 256.501.000');
                            } else {
                                updateOption(opt, '6152 254.501.000');
                            }
                        } else if (matName.includes('brausehalter')) {
                            updateOption(opt, '6152 250.501.000');
                        }
                    }
                    
                    // Laufen Quadriga
                    else if (label.includes('quadriga')) {
                        if (matName.includes('anschlussbogen')) {
                            if (opt.label.includes('integriertem Brausehalter')) {
                                updateOption(opt, '6544 170.501.000');
                            } else {
                                updateOption(opt, '6544 168.501.000');
                            }
                        }
                    }
                    
                    // Hansgrohe
                    else if (manu === 'hansgrohe') {
                        if (matName.includes('anschlussbogen')) {
                            if (label.includes('metropol') || label.includes('finoris') || label.includes('vivenis')) {
                                updateOption(opt, '6544 186.501.000'); // Fixfit Square
                            } else {
                                updateOption(opt, '6544 181.501.000'); // Fixfit S
                            }
                        }
                    }
                    
                    // KWC
                    else if (manu === 'kwc') {
                        if (matName.includes('anschlussbogen')) {
                            updateOption(opt, '6544 121.501.000');
                        } else if (matName.includes('brausehalter')) {
                            if (label.includes('homebox')) {
                                updateOption(opt, '6111 378.501.000');
                            } else {
                                updateOption(opt, '6113 432.501.000');
                            }
                        }
                    }
                });
            }
            
            // 2. Brauseschlauch Replacements
            if (matName.includes('brauseschlauch') || matName.includes('schlauch')) {
                if (manu === 'laufen') {
                    mat.options.forEach(opt => {
                        if (opt.artNr.startsWith('ohne')) return;
                        if (opt.artNr === '6542 317.501.000') {
                            updateOption(opt, '6542 532.501.000'); // Laufen Simiflex 1500mm
                        } else if (opt.artNr === '6542 318.501.000') {
                            updateOption(opt, '6542 534.501.000'); // Laufen 1800mm
                        }
                    });
                }
            }
            
            // 3. Abstellverschraubung Replacements
            if (matName.includes('abstellverschraubung')) {
                if (manu === 'laufen') {
                    mat.options.forEach(opt => {
                        if (opt.artNr.startsWith('ohne')) return;
                        updateOption(opt, '6521 103.501.000'); // Laufen 1/2" x 1/2"
                    });
                }
            }
            
            // 4. Handbrause Replacements
            if (matName.includes('handbrause') && manu === 'laufen') {
                mat.options.forEach(opt => {
                    if (opt.artNr.startsWith('ohne')) return;
                    // Replace generic Alterna easyline with Laufen My-Twin 100
                    if (opt.artNr === '6541 326.501.000') {
                        updateOption(opt, '6541 654.501.000'); 
                    }
                });
            }
            
        });
    });
}

processCat('duschenmischer');
processCat('bademischer');

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
console.log(`Successfully completed ${replaceCount} accessory replacements based on dm_acc.csv`);

const dataJsPath = './modules/data.js';
let dataJs = fs.readFileSync(dataJsPath, 'utf8');
dataJs = dataJs.replace(/export const DATA_VERSION = '(.*?)';/, (match, p1) => {
    let parts = p1.split('.');
    parts[2] = parseInt(parts[2]) + 1;
    return `export const DATA_VERSION = '${parts.join('.')}';`;
});
fs.writeFileSync(dataJsPath, dataJs);
console.log('Incremented DATA_VERSION in modules/data.js');
