// ============================================================================
//  custom-data.json is stored INTERNED — expand it before anything reads it.
//
//  29,779 mountingMaterials options are copies of 1,894 distinct objects, and
//  16,956 services are copies of 279: every tray carried its own full copy of the
//  same Alterna hose / hand-shower / holder rows. Stored once in a shared table and
//  referenced by key, that is ~20 MB off a file already past GitHub's 50 MB warning.
//
//  On disk:   { _options: {o0:{…}}, bademischer: { trays: [ { mountingMaterials:
//               [ { name, options: ["o0","o7"] } ], services: ["s3"] } ] } }
//  In memory: exactly the shape every factory already expects.
//
//  TOLERANT BY DESIGN: an entry that is already an object is passed through
//  untouched, so an un-interned file, an IndexedDB backup written before this
//  existed, and a half-migrated file all still load. Expanding twice is a no-op.
//
//  Each reference is expanded into its OWN copy. Handing every tray the same object
//  would make an in-place edit of one option leak into every other tray that shares
//  it — the factories clone their standard options (_cloneOpts) precisely because
//  that class of bug is hard to see and easy to write.
//
//  The interning half lives in st-scraper/_dataFile.cjs (CommonJS, for the
//  injectors). tests/verify-data-intern.js pins the two against each other.
// ============================================================================

const copy = (o) => (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));

/**
 * Replace every interned reference with its own copy of the shared object.
 * Mutates `data` and returns it. Safe to call on already-expanded data.
 */
export function expandData(data) {
    if (!data || typeof data !== 'object') return data;
    const options = data._options || {};
    const services = data._services || {};
    if (!Object.keys(options).length && !Object.keys(services).length) {
        delete data._options; delete data._services;
        return data;
    }

    const deref = (table) => (entry) => {
        if (typeof entry !== 'string') return entry;    // already an object
        const hit = table[entry];
        return hit ? copy(hit) : entry;                 // unknown key: leave it, never invent one
    };

    for (const key of Object.keys(data)) {
        if (key === '_options' || key === '_services') continue;
        const pool = data[key];
        const trays = (pool && pool.trays) || (Array.isArray(pool) ? pool : null);
        if (!Array.isArray(trays)) continue;
        for (const t of trays) {
            if (!t || typeof t !== 'object') continue;
            if (Array.isArray(t.services)) t.services = t.services.map(deref(services));
            for (const g of t.mountingMaterials || []) {
                if (g && Array.isArray(g.options)) g.options = g.options.map(deref(options));
            }
        }
    }
    // Expanded data does not carry the tables — and dropping them is what keeps this
    // in step with the CommonJS twin (tests/verify-data-intern.js compares the two).
    delete data._options;
    delete data._services;
    return data;
}

export default expandData;
