const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const pricesJson = JSON.parse(fs.readFileSync(path.resolve('prices.json'), 'utf8')).prices;

const gessiBases = new Set();
Object.keys(pricesJson).forEach(artNr => {
  const parts = artNr.split('.');
  const base = parts[0].replace(/\s+/g, '');
  if (artNr.startsWith('6241') || artNr.startsWith('6252')) {
    if (base.length === 7) gessiBases.add(base);
  }
});

const basesList = [...gessiBases].sort().join(',');
console.log(`🚀 Launching 8-Agent Headless=false Scraper for Gessi & Emporio/Alterna (${gessiBases.size} base numbers)...`);

const env = Object.assign({}, process.env, {
  AGENTS: '8',
  CHAPTER: '6',
  ONLY_BASES: basesList,
  OUT_FILE: 'gessi-anschlussbogen-variants.json'
});

const scraperScript = path.resolve(__dirname, 'scrape-armaturen-variants.js');

const child = spawn('node', [scraperScript], {
  env,
  cwd: __dirname,
  stdio: 'inherit'
});

child.on('exit', (code) => {
  console.log(`\n🏁 Scraper process exited with code ${code}`);
});
