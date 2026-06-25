const fs = require('fs');
const https = require('https');
const path = require('path');

const DATA_PATH = path.resolve(__dirname, '../custom-data.json');
const d = require(DATA_PATH);
const dt = d.duschtrennwand.trays;

function check(url) {
  return new Promise(r => {
    https.get(url, res => {
        r(res.statusCode);
        res.resume();
    }).on('error', () => r(0));
  });
}

async function fix() {
  console.log('🔍 Starting fast image heal...');
  let count = 0;
  
  for (const t of dt) {
    if (t.imgUrl && !t.imgUrl.includes('_nV.png') && !t.imgUrl.includes('_nV_nV.png')) {
       let code = await check(t.imgUrl);
       if (code === 404) {
           let idx = t.imgUrl.lastIndexOf('/');
           let filename = t.imgUrl.substring(idx+1);
           let base = filename.split('_')[0];
           let noZeroBase = base.startsWith('0') ? base.substring(1) : base;
           
           const attempts = [
               base + '_nV_nV.png',
               base + '_nV.png',
               base + '_000_000.png',
               noZeroBase + '_nV_nV.png',
               noZeroBase + '_nV.png',
               noZeroBase + '_000_000.png',
               noZeroBase + '.png'
           ];
           
           for (const attempt of attempts) {
               let url = 'https://profishop.sanitastroesch.ch/multimedia/Web/PG1/' + attempt;
               if (await check(url) === 200) {
                   console.log('✅ Fixed:', filename, '=>', attempt);
                   t.imgUrl = url;
                   count++;
                   break;
               }
           }
       }
    }
  }
  
  console.log(`\n🎉 Total images fast-healed: ${count}`);
  fs.writeFileSync(DATA_PATH, JSON.stringify(d, null, 2));
  console.log('💾 custom-data.json updated successfully!');
}

fix();
