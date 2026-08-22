/**
 * _ourArticles.cjs — every art-Nr this app can put in a Stückliste, and where.
 *
 * ONE walk, shared by catalog-diff.cjs and flag-discontinued.cjs. Both need the
 * same answer to the same question and every filter in this toolkit that was
 * copied instead of imported has drifted (see _imagePick.cjs).
 *
 * It walks the WHOLE tree, not just `trays`: a mountingMaterials option and a
 * service are order lines too — and an option is exactly the kind of article that
 * gets discontinued without anyone opening the configurator that offers it.
 * Interned option keys are already expanded by readData(), so the objects are real.
 *
 * Also picks up art-Nr-KEYED maps (a variant matrix stored `{ "1111 600.100.000":
 * {...} }`), which is how some pools carry their colour range.
 */
'use strict';

const ART = /^\d{4} \d{3}\.\d{3}\.\d{3}$/;

/** @returns Map<artNr, { where:Set<pool>, label:string }> */
function ourArticles(data) {
    const out = new Map();
    const note = (a, pool, label) => {
        if (typeof a !== 'string' || !ART.test(a)) return;
        let r = out.get(a);
        if (!r) out.set(a, (r = { where: new Set(), label: '' }));
        r.where.add(pool);
        if (!r.label && label) r.label = String(label).slice(0, 110);
    };
    for (const [pool, v] of Object.entries(data)) {
        if (!v || typeof v !== 'object' || pool === '_options' || pool === '_services') continue;
        (function walk(o, label) {
            if (Array.isArray(o)) return o.forEach(x => walk(x, label));
            if (!o || typeof o !== 'object') return;
            const lbl = o.label || o.name || label;
            note(o.artNr, pool, lbl);
            for (const k of Object.keys(o)) {
                if (k === 'artNr') continue;
                if (ART.test(k) && o[k] && typeof o[k] === 'object') note(k, pool, o[k].label || lbl);
                walk(o[k], lbl);
            }
        })(v, '');
    }
    return out;
}

module.exports = { ourArticles, ART };
