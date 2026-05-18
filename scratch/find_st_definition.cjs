const fs = require('fs');

const html = fs.readFileSync('/Users/jenistonsellathamby/Desktop/product-configurator/old_dist/dist/index.html', 'utf8');

const target = 'default:st';
const idx = html.indexOf(target);
if (idx !== -1) {
    console.log("Found default:st at", idx);
    
    // Search backward from idx for "const st=" or ",st=" or similar
    const sub = html.substring(0, idx);
    const patterns = [
        'const st=',
        ',st=',
        'st={',
        'st=['
    ];
    for (const pat of patterns) {
        const lastIdx = sub.lastIndexOf(pat);
        if (lastIdx !== -1) {
            console.log(`Pattern '${pat}' found at ${lastIdx}`);
            console.log(html.substring(lastIdx, lastIdx + 300));
        }
    }
}
