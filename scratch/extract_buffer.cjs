const fs = require('fs');
const buffer = fs.readFileSync('/Users/jenistonsellathamby/Desktop/product-configurator/old_dist/dist/index.html');

const startTag = Buffer.from('{"dusche":');
const endTag = Buffer.from('"vorlagen":{"trays":[]}');

const startIdx = buffer.indexOf(startTag);
const endIdx = buffer.lastIndexOf(endTag);

if (startIdx !== -1 && endIdx !== -1) {
    const jsonBuffer = buffer.slice(startIdx, endIdx + endTag.length + 1); // +1 for the last }
    fs.writeFileSync('scratch/recovered_data.json', jsonBuffer);
    console.log('Successfully recovered data! Length:', jsonBuffer.length);
} else {
    console.log('Start or End tag not found. Start:', startIdx, 'End:', endIdx);
}
