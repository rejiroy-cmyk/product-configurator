const fs = require('fs');
const html = fs.readFileSync('dump.html', 'utf8');

const items = html.split('class="list-group-item"');
if (items.length > 1) {
    let itemHtml = items[1].substring(0, 1000); // just grab first 1000 chars of item 1
    // let's look for "Artikel"
    const match = items[1].match(/.{0,50}Artikelnummer.{0,100}/i);
    console.log("Context around 'Artikelnummer':");
    console.log(match ? match[0] : "Not found");
    
    // Attempt another context lookup
    const digits = items[1].match(/.{0,50}\d{4,}.{0,50}/i);
    console.log("Context around numbers:");
    console.log(digits ? digits[0] : "Not found");

    // Also look for something matching 13 characters with spaces and dots
    // Something like \d[\d\.\s]{11}\d
    const pattern13 = items[1].match(/\b\d[\d\.\s]{11}\d\b/);
    console.log("13 char pattern:");
    console.log(pattern13 ? pattern13[0] : "Not found");
}
