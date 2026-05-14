const fs = require('fs');
const html = fs.readFileSync('dump.html', 'utf8');

const items = html.split('class="list-group-item"');
if (items.length > 1) {
    const itemHtml = items[1];
    
    // Look for any string that looks like an ST article number (e.g. 1 234 567 890 123)
    const matches1 = itemHtml.match(/(\d{1,4}[\s\.]+\d{3}[\s\.]+\d{3}[\s\.]+\d{3})/g);
    // Look for plain 13 digit numbers
    const matches2 = itemHtml.match(/\b\d{13}\b/g);
    
    console.log("Formatted 13-digit matches:", matches1);
    console.log("Plain 13-digit matches:", matches2);
    
    // If we take the first 13 digit match and format it as 7 chars + 6 chars?
    // Wait, the user said "13 charachter number with spaces and dots".
    // Let me find anything inside the HTML that matches 13 chars containing spaces and dots.
    const allText = itemHtml.replace(/<[^>]+>/g, ' '); // Strip HTML to see text
    const fuzzy = allText.match(/[A-Z0-9\.\s-]{12,20}/g);
    console.log("Fuzzy possible article numbers from text: ");
    console.log(fuzzy ? fuzzy.slice(0, 10) : "none");
}
