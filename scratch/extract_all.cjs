const fs = require('fs');

const prettyCode = fs.readFileSync('/Users/jenistonsellathamby/Desktop/product-configurator/scratch/old_code_pretty.txt', 'utf8');

const extract = (startRegex, endRegex, outFile) => {
    const startIdx = prettyCode.search(startRegex);
    if (startIdx === -1) {
        console.error("Could not find start for regex: " + startRegex);
        return;
    }
    
    // Find matching ending regex after startIdx
    const substring = prettyCode.substring(startIdx);
    const endMatch = substring.match(endRegex);
    if (!endMatch) {
        console.error("Could not find end match for: " + endRegex);
        return;
    }
    
    const endIdx = startIdx + substring.indexOf(endMatch[0]);
    const extracted = prettyCode.substring(startIdx, endIdx);
    fs.writeFileSync(outFile, extracted);
    console.log(`Saved ${outFile} (len: ${extracted.length})`);
};

extract(/function ut\(/, /function gt\(/, '/Users/jenistonsellathamby/Desktop/product-configurator/scratch/old_ut.js');
extract(/function gt\(/, /function pt\(/, '/Users/jenistonsellathamby/Desktop/product-configurator/scratch/old_gt.js');
extract(/function pt\(/, /function dt\(/, '/Users/jenistonsellathamby/Desktop/product-configurator/scratch/old_pt.js');
extract(/function dt\(/, /function bt\(/, '/Users/jenistonsellathamby/Desktop/product-configurator/scratch/old_dt.js');
extract(/function bt\(/, /const Ne=/, '/Users/jenistonsellathamby/Desktop/product-configurator/scratch/old_bt.js');

console.log("All target configurators extracted.");
