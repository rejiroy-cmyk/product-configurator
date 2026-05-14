const fs = require('fs');
const html = fs.readFileSync('dump.html', 'utf8');

const items = html.split('class="list-group-item"');
console.log(`Found ${items.length - 1} list-group-items.`);
if (items.length > 1) {
    // Extract first item logic manually
    let itemHtml = items[1];
    
    // Attempt to parse out some interesting fields
    const artNrMatch = itemHtml.match(/Artikelnummer[^<]*<\/div>\s*<div[^>]*>\s*([0-9\.]+)\s*<\/div>/i) || itemHtml.match(/([0-9]{7})/);
    const titleMatch = itemHtml.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/) || itemHtml.match(/<a[^>]*class="text-dark[^>]*>([^<]+)<\/a>/);
    const imgMatch = itemHtml.match(/<img[^>]*src="([^"]+)"/);
    const priceMatch = itemHtml.match(/CHF\s*[0-9\.\']+/);
    
    console.log("Item 1 extracted via rough Regex:");
    console.log("Title: ", titleMatch ? titleMatch[1].trim() : "None");
    console.log("Article Number: ", artNrMatch ? artNrMatch[1].trim() : "None");
    console.log("Image: ", imgMatch ? imgMatch[1].trim() : "None");
    console.log("Price: ", priceMatch ? priceMatch[0].trim() : "None");
}
