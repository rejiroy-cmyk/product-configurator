const fs = require('fs');
let content = fs.readFileSync('modules/factories.js', 'utf8');

const targetStr = 'const typeKeywords = ["aufputz-duschenmischer", "unterputz-duschenmischer", "duschenmischer", "duschmischer", "aufputz-bademischer", "unterputz-bademischer", "bademischer", "waschtischmischer", "thermostatmischer", "thermostat-duschenmischer", "einhebelmischer", "einlochmischer", "mischer"];';

const replacementStr = `            let typeKeywords = ["aufputz-duschenmischer", "unterputz-duschenmischer", "duschenmischer", "duschmischer", "aufputz-bademischer", "unterputz-bademischer", "bademischer", "waschtischmischer", "thermostatmischer", "thermostat-duschenmischer", "einhebelmischer", "einlochmischer", "mischer"];
            if (title && title.toLowerCase().includes('wanne')) {
                typeKeywords.push("duschenwanne", "duschwanne", "badewanne", "duschfläche", "wanne");
            }`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync('modules/factories.js', content);
