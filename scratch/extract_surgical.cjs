const fs = require('fs');
const html = fs.readFileSync('/Users/jenistonsellathamby/Desktop/product-configurator/old_dist/dist/index.html', 'utf8');

const startTag = '{"dusche":';
const endTag = '"vorlagen":{"trays":[]}}';

const startIdx = html.indexOf(startTag);
const endIdx = html.indexOf(endTag);

if (startIdx !== -1 && endIdx !== -1) {
    const jsonStr = html.substring(startIdx, endIdx + endTag.length);
    try {
        const parsed = JSON.parse(jsonStr);
        fs.writeFileSync('scratch/recovered_data.json', JSON.stringify(parsed, null, 2));
        console.log('Successfully recovered data! Length:', jsonStr.length);
    } catch (e) {
        console.log('Found block but JSON.parse failed. Saving raw fragment.');
        fs.writeFileSync('scratch/failed_json_fragment.txt', jsonStr);
    }
} else {
    console.log('Start or End tag not found. Start:', startIdx, 'End:', endIdx);
}
