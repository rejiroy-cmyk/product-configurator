const fs = require('fs');

const html = fs.readFileSync('/Users/jenistonsellathamby/Desktop/product-configurator/old_dist/dist/index.html', 'utf8');

const target = '"./custom-data.json":';
const idx = html.indexOf(target);
if (idx !== -1) {
    console.log("Found target at", idx);
    console.log(html.substring(idx - 100, idx + 100));
} else {
    console.log("Not found target");
}
