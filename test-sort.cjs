const fs = require('fs');

const data = JSON.parse(fs.readFileSync('custom-data.json', 'utf8'));

// Re-create the getPri and sort logic exactly as in factories.js to see if it throws!
let crash = false;
data.duschenwanne.trays.forEach((tray, i) => {
  if (!tray.mountingMaterials) return;
  try {
    const sortedMaterials = [...tray.mountingMaterials].sort((a, b) => {
      const getPri = (mat) => {
          const lbl = (mat.name || '').toLowerCase();
          if (lbl.includes('deckel') || lbl.includes('haube') || lbl.includes('sitz')) return 2;
          if (lbl.includes('ablauf') || lbl.includes('garnitur') || lbl.includes('siphon') || lbl.includes('sifon')) return 3;
          if (lbl.includes('band') || lbl.includes('dicht')) return 4;
          if (lbl.includes('rahmen') || lbl.includes('träger')) return 5;
          if (lbl.includes('platte') || lbl.includes('betätigung')) return 6;
          if (lbl.includes('schaum') || lbl.includes('fuss') || lbl.includes('füsse') || lbl.includes('stütz')) return 7;
          if (lbl.includes('schall') || lbl.includes('isolation')) return 8;
          if (lbl.includes('manschette')) return 9;
          return 99;
      };
      return getPri(a) - getPri(b);
    });
  } catch(e) {
    console.log(`Crash at tray index ${i}:`, e.message);
    crash = true;
  }
});
if (!crash) console.log("Sort logic didn't crash.");
