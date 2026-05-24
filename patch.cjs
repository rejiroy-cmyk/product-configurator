const fs = require('fs');
let content = fs.readFileSync('app.js', 'utf8');
content = content.replace(
    /(\/\/ 3\. Fallback: load from IndexedDB\n\s*try \{)/g,
    "// 3. Fallback: load from IndexedDB\n    if (!dataLoaded) {\n    try {"
);
content = content.replace(
    /(console\.warn\('\[Konfigurator\] IndexedDB backup unavailable:', e\.message\);\n\s*\})/g,
    "$1\n    }"
);
fs.writeFileSync('app.js', content);
