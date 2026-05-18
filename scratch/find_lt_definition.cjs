const fs = require('fs');

const html = fs.readFileSync('/Users/jenistonsellathamby/Desktop/product-configurator/old_dist/dist/index.html', 'utf8');

// Search backward for lt definition like "const lt=" or "lt="
// Let's do a search for variable declarations in the last 2,000,000 characters
const sub = html.substring(0, 4663620);
// Let's search for "const lt=" or ",lt=" or "function lt" or similar
const patterns = [
    'const lt=',
    '=lt',
    ',lt=',
    'lt={',
    'lt=['
];

for (const pat of patterns) {
    const lastIdx = sub.lastIndexOf(pat);
    if (lastIdx !== -1) {
        console.log(`Pattern '${pat}' found at ${lastIdx}`);
        console.log(html.substring(lastIdx, lastIdx + 200));
    }
}

// Let's find any large JSON strings or objects assigned to lt in the entire file
// Let's search for "lt=" or similar in a broader range
const regex = /\b(lt)\s*=\s*/g;
let match;
while ((match = regex.exec(html)) !== null) {
    console.log(`Found 'lt =' match at index ${match.index}:`);
    console.log(html.substring(match.index - 50, match.index + 200));
}
