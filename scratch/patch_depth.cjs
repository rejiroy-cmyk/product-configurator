const fs = require('fs');

function applyDepthLogic(code) {
    const oldCode = `                    if (smMatch) {
                        let ew = parseInt(smMatch[1]), eh = parseInt(smMatch[2]);
                        if (lbl.includes('mm') || ew > 300) { ew /= 10; eh /= 10; }`;

    const newCode = `                    if (smMatch) {
                        let ew = parseInt(smMatch[1]), eh = parseInt(smMatch[2]);
                        if (lbl.includes('mm') || ew > 300) { ew /= 10; eh /= 10; }
                        
                        // Strict Depth Matching for Alterna Ecoplan
                        const trayDepthMatch = tray.label.match(/x\\s*(\\d+)\\s*mm/);
                        const itemDepthMatch = lbl.match(/x\\s*(\\d+)\\s*mm/);
                        if (manufacturer === 'alterna' && labelLower.includes('ecoplan') && trayDepthMatch && itemDepthMatch) {
                            const tDepth = parseInt(trayDepthMatch[1]);
                            const iDepth = parseInt(itemDepthMatch[1]);
                            if (tDepth !== iDepth) return false;
                        }`;
                        
    return code.replace(oldCode, newCode);
}

const adminPath = 'modules/admin.js';
const scriptPath = 'scripts/patch-shower-data.cjs';

let adminCode = fs.readFileSync(adminPath, 'utf8');
adminCode = applyDepthLogic(adminCode);
fs.writeFileSync(adminPath, adminCode);

let scriptCode = fs.readFileSync(scriptPath, 'utf8');
scriptCode = applyDepthLogic(scriptCode);
fs.writeFileSync(scriptPath, scriptCode);

console.log('Depth matching applied successfully.');
