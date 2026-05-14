/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Cayonoplan Smart Linker (Offline)
 * 
 * Since the Sanitas /business/ portal requires authentication, this script
 * performs the accessory linking OFFLINE using the zubehoer_pool data.
 * 
 * It precisely matches each Cayonoplan tray to its correct:
 *   • Wannenträger  → by exact size match (mm dimensions in label vs cm in tray)
 *   • Montagerahmen → by size range match (FR 5300 "bis X x Y" logic)
 *
 * DOES NOT change BOM order, does not add new categories.
 * ONLY updates the options within existing mountingMaterials groups.
 * ONLY processes Kaldewei Cayonoplan trays.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const fs = require('fs');
const path = require('path');

const dataPath = path.resolve(__dirname, '../custom-data.json');

// ── Normalise artNr for comparison ───────────────────────────────────────────
function normArt(artNr) {
    return (artNr || '').replace(/[\s.\-]/g, '').toLowerCase();
}

// ── Parse size dimensions from a label string → [w, h] in cm ─────────────────
// Handles both "1000 x 800 x 18 mm" (mm) and "100 x 80" (cm assumed)
function parseDimsFromLabel(lbl) {
    // Pattern: NNN x NNN x NNN mm  (first two nums are LxW in mm)
    const mmMatch = lbl.match(/(\d{3,4})\s*x\s*(\d{3,4})\s*x\s*\d+\s*mm/i);
    if (mmMatch) {
        let w = parseInt(mmMatch[1]) / 10;
        let h = parseInt(mmMatch[2]) / 10;
        return [w, h];
    }
    // Pattern: "bis NNN x NNN cm" or "NNN x NNN cm"
    const cmMatch = lbl.match(/(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)\s*cm/i);
    if (cmMatch) {
        return [parseFloat(cmMatch[1].replace(',', '.')), parseFloat(cmMatch[2].replace(',', '.'))];
    }
    return null;
}

// ── Size match: does a carrier/frame support this tray? ───────────────────────
function sizeMatches(trayW, trayH, itemLabel, isFrame) {
    const lbl = itemLabel.toLowerCase();

    if (isFrame) {
        // Frames use "bis X x Y cm" (maximum supported size)
        const bisMatch = lbl.match(/bis\s+(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)\s*cm/i);
        if (bisMatch) {
            const fw = parseFloat(bisMatch[1].replace(',', '.'));
            const fh = parseFloat(bisMatch[2].replace(',', '.'));
            const trayLong  = Math.max(trayW, trayH);
            const trayShort = Math.min(trayW, trayH);
            const frameLong  = Math.max(fw, fh);
            const frameShort = Math.min(fw, fh);
            return trayLong <= frameLong + 0.5 && trayShort <= frameShort + 0.5;
        }
        return false;
    } else {
        // Carriers use exact mm dimensions in label
        const dims = parseDimsFromLabel(lbl);
        if (!dims) return false;
        const [cw, ch] = dims;
        const TOLERANCE = 1.5; // cm
        const matchNormal  = Math.abs(trayW - cw) <= TOLERANCE && Math.abs(trayH - ch) <= TOLERANCE;
        const matchRotated = Math.abs(trayW - ch) <= TOLERANCE && Math.abs(trayH - cw) <= TOLERANCE;
        return matchNormal || matchRotated;
    }
}

// ── Main ──────────────────────────────────────────────────────────────────────
(function main() {
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    const pool       = data.zubehoer_pool?.trays || [];
    const allTrays   = data.duschenwanne?.trays  || [];

    // Filter: ONLY Cayonoplan
    const cayonoplanTrays = allTrays.filter(t =>
        (t.label || '').toLowerCase().includes('cayonoplan')
    );

    console.log(`\n🚿 Cayonoplan Smart Linker (Offline)`);
    console.log(`   Trays to process: ${cayonoplanTrays.length}`);

    // Pre-filter pool to Cayonoplan-relevant items only
    const cayoCarriers = pool.filter(p =>
        p.label.toLowerCase().includes('cayonoplan') &&
        p.label.toLowerCase().includes('wannenträger')
    );
    const fr5300Frames = pool.filter(p =>
        p.label.toLowerCase().includes('fr 5300') &&
        p.label.toLowerCase().includes('cayonoplan')
    );

    console.log(`   Carriers in pool (Cayonoplan): ${cayoCarriers.length}`);
    console.log(`   FR 5300 Frames in pool:        ${fr5300Frames.length}\n`);

    let updatedCount = 0;
    const report = [];

    for (const tray of cayonoplanTrays) {
        // Parse tray size (stored as "W x H" in cm, e.g. "110 x 80")
        const sizeMatch = (tray.size || '').match(/(\d+)\s*x\s*(\d+)/);
        if (!sizeMatch) {
            console.log(`⚠️  ${tray.artNr}: Could not parse size "${tray.size}" – skipping`);
            continue;
        }
        const tw = parseInt(sizeMatch[1]); // Long side first as stored
        const th = parseInt(sizeMatch[2]);

        let linked = { carrier: false, frame: false };

        // ── 1. Match Wannenträger ─────────────────────────────────────────────
        const carrierMat = tray.mountingMaterials?.find(m => m.name === 'Wannenträger');
        if (carrierMat) {
            const matchedCarriers = cayoCarriers.filter(c =>
                sizeMatches(tw, th, c.label, false)
            );

            if (matchedCarriers.length > 0) {
                // Best match: prefer exact, take first
                const best = matchedCarriers[0];
                const alreadyCorrect = carrierMat.options.length === 1 &&
                    normArt(carrierMat.options[0].artNr) === normArt(best.artNr);

                if (!alreadyCorrect) {
                    carrierMat.options = [{
                        artNr:  best.artNr,
                        label:  best.label,
                        menge:  1,
                        type:   'wannenträger',
                        imgUrl: best.imgUrl
                    }];
                    linked.carrier = true;
                    console.log(`✅ ${tray.artNr} (${tray.size}) → Wannenträger: ${best.artNr}`);
                    if (matchedCarriers.length > 1) {
                        console.log(`   ℹ️  ${matchedCarriers.length - 1} additional size matches ignored`);
                    }
                } else {
                    console.log(`⚪ ${tray.artNr} (${tray.size}) → Wannenträger already correct`);
                }
            } else {
                console.log(`⚠️  ${tray.artNr} (${tray.size}) → NO Wannenträger match in pool!`);
            }
        }

        // ── 2. Match Montagerahmen (FR 5300) ──────────────────────────────────
        const frameMat = tray.mountingMaterials?.find(m => m.name === 'Montagerahmen');
        if (frameMat && fr5300Frames.length > 0) {
            const matchedFrames = fr5300Frames.filter(f =>
                sizeMatches(tw, th, f.label, true)
            );

            if (matchedFrames.length > 0) {
                // Prefer the tightest-fitting frame (smallest max dimension)
                matchedFrames.sort((a, b) => {
                    const getDim = lbl => {
                        const m = lbl.match(/bis\s+(\d+)\s*x\s*(\d+)/i);
                        return m ? Math.max(parseInt(m[1]), parseInt(m[2])) : 9999;
                    };
                    return getDim(a.label) - getDim(b.label);
                });
                const bestFrame = matchedFrames[0];

                // Build all eligible frame options (sorted smallest→largest)
                const newOptions = matchedFrames.map(f => ({
                    artNr:  f.artNr,
                    label:  f.label,
                    menge:  1,
                    type:   'montagerahmen',
                    imgUrl: f.imgUrl
                }));

                frameMat.options = newOptions;
                linked.frame = true;
                console.log(`   ✅ Montagerahmen (${newOptions.length} option${newOptions.length > 1 ? 's' : ''}): ${newOptions.map(o => o.artNr).join(', ')}`);
            } else {
                console.log(`   ℹ️  No FR 5300 frame fits ${tw}x${th} cm`);
            }
        }

        if (linked.carrier || linked.frame) {
            updatedCount++;
        }

        report.push({
            artNr: tray.artNr,
            size:  tray.size,
            carrier: linked.carrier,
            frame: linked.frame
        });
        console.log('');
    }

    // ── Save ──────────────────────────────────────────────────────────────────
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

    console.log('═'.repeat(60));
    console.log(`✅ DONE — ${updatedCount}/${cayonoplanTrays.length} trays updated`);
    console.log('═'.repeat(60));

    const carrierOk = report.filter(r => r.carrier).length;
    const frameOk   = report.filter(r => r.frame).length;
    const noCarrier = report.filter(r => !r.carrier);

    console.log(`\n   Wannenträger linked : ${carrierOk}`);
    console.log(`   Montagerahmen linked: ${frameOk}`);

    if (noCarrier.length > 0) {
        console.log(`\n⚠️  Trays with no carrier match:`);
        noCarrier.forEach(r => console.log(`   ${r.artNr} (${r.size})`));
    }

    console.log('\n⚠️  Hard Refresh (Cmd+Shift+R) the configurator to see changes!\n');
})();
