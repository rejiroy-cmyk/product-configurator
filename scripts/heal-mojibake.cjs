#!/usr/bin/env node
/**
 * heal-mojibake.cjs — recover the German characters lost to U+FFFD in custom-data.json.
 *
 * Somewhere upstream a latin-1/utf-8 mix-up replaced single characters with the Unicode
 * replacement char. It is not always 1:1 — a single lost character can appear as a RUN
 * of them ("f�…�r" for "für", up to 14 in one case) — so each RUN is collapsed
 * back to exactly one character.
 *
 * Recovery is evidence-based, never spelling-guesswork:
 *   1. Build a token dictionary from every INTACT string in custom-data.json plus the
 *      profishop API dumps (catalogue-inspection/ch*-api.json). This is the same domain
 *      vocabulary, so "Pendelt��re" has thousands of intact "Pendeltüre" witnesses.
 *   2. For each broken token, substitute each candidate character and keep the variants
 *      the dictionary actually knows. One survivor -> heal. Several -> take the one with
 *      overwhelmingly more witnesses (>=10x), else leave it and report.
 *   3. A short OVERRIDES table for tokens no dictionary can settle, each with the
 *      evidence that settled it.
 *
 * Self-check: commit 4847a441 (branch claude/unruffled-liskov-bc876e) healed 20 records
 * by hand against spelling and reference catalogs, and that fix never reached main. This
 * script must reproduce all 20 exactly — run with --verify.
 *
 * Usage:
 *   node scripts/heal-mojibake.cjs             # dry run: show every proposed repair
 *   node scripts/heal-mojibake.cjs --verify    # also check against the 4847a441 fix
 *   node scripts/heal-mojibake.cjs --apply     # write custom-data.json
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'custom-data.json');
const INSPECT = path.join(ROOT, 'st-scraper', 'catalogue-inspection');

const APPLY = process.argv.includes('--apply');
const VERIFY = process.argv.includes('--verify');

const BAD = '�';
const RUN = /�+/g;                       // a run stands for ONE lost character
const SPLIT = /[\s,;:()\[\]\/]+/;

// Characters a Swiss-German sanitary catalogue actually loses to a latin-1 round-trip.
const CANDIDATES = ['ü', 'ö', 'ä', 'Ü', 'Ö', 'Ä', 'ß', 'Ø', 'é', 'è', 'à', '°', '¼', '½', '¾', '–', '"'];

/**
 * Tokens no corpus can decide, with the evidence that did. Both were checked against the
 * profishop API and an intact sibling SKU before being written here.
 */
const OVERRIDES = {
    // "Papierhalter KWC �� 37 cm, für Papierrollen bis Ø 35 cm" — the SAME string
    // carries an intact "Ø 35 cm", so the broken one is the diameter symbol too.
    '��': 'Ø',
    // "Sifon Gessi 1��\" x 32 mm" — API 3163401 says 'Siphon Gessi, 1¼" x 32 mm'
    // and the intact sibling 3163 401.501.000 in this very file says 1¼".
    '1��"': '1¼"',
};

// ---------------------------------------------------------------- dictionary
const dict = new Map();
const addText = (s) => {
    if (typeof s !== 'string' || s.includes(BAD)) return;
    for (const tok of s.split(SPLIT)) if (tok) dict.set(tok, (dict.get(tok) || 0) + 1);
};
const walkStrings = (o, fn) => {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) return o.forEach(x => walkStrings(x, fn));
    for (const v of Object.values(o)) {
        if (typeof v === 'string') fn(v);
        else if (v && typeof v === 'object') walkStrings(v, fn);
    }
};

const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
walkStrings(data, addText);
if (fs.existsSync(INSPECT)) {
    for (const f of fs.readdirSync(INSPECT).filter(f => /^ch\d-api\.json$/.test(f))) {
        const api = JSON.parse(fs.readFileSync(path.join(INSPECT, f), 'utf8'));
        for (const e of Object.values(api)) {
            if (!e) continue;
            addText(e.maktx);
            addText(String(e.description || '').replace(/<br\s*\/?>/gi, ' '));
            (e.tech || []).forEach(addText);
        }
    }
}

// ---------------------------------------------------------------- repair
const unresolved = new Map();

function healToken(tok) {
    if (OVERRIDES[tok]) return OVERRIDES[tok];
    const runs = tok.match(RUN);
    if (!runs) return tok;

    // Substitute one candidate for ALL runs in the token (a token never loses two
    // different characters in this data — asserted by the unresolved report).
    const hits = [];
    for (const c of CANDIDATES) {
        const cand = tok.replace(RUN, c);
        const n = dict.get(cand);
        if (n) hits.push([cand, n]);
    }
    if (hits.length === 1) return hits[0][0];
    if (hits.length > 1) {
        hits.sort((a, b) => b[1] - a[1]);
        if (hits[0][1] >= hits[1][1] * 10) return hits[0][0];   // one is the clear witness
        unresolved.set(tok, `ambiguous: ${hits.map(h => h[0] + '(' + h[1] + ')').join(', ')}`);
        return tok;
    }
    unresolved.set(tok, 'no dictionary witness');
    return tok;
}

function healString(s) {
    if (typeof s !== 'string' || !s.includes(BAD)) return s;
    return s.split(/(\s+)/).map(chunk => {
        if (!chunk.includes(BAD)) return chunk;
        // keep punctuation attached to the token, matching how the dictionary was built
        return chunk.split(/([,;:()\[\]\/]+)/).map(p => p.includes(BAD) ? healToken(p) : p).join('');
    }).join('');
}

const repairs = [];
const keyRepairs = [];
function healObject(o, cat) {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) return o.forEach(x => healObject(x, cat));

    for (const [k, v] of Object.entries(o)) {
        if (typeof v === 'string' && v.includes(BAD)) {
            const fixed = healString(v);
            if (fixed !== v) repairs.push({ cat, field: k, artNr: o.artNr || o.id || '?', before: v, after: fixed });
            o[k] = fixed;
        } else if (v && typeof v === 'object') healObject(v, cat);
    }

    // Spec KEYS are damaged too ("Auspr��gung"). Renaming them is safe because every
    // reader goes through createGlassApp#getSpec, which strips all non-a-z from both the
    // key and the lookup term — "Ausführung" and "Ausf��hrung" both normalise to
    // "ausfhrung". Rebuild the object so key ORDER is preserved (it drives spec display).
    const broken = Object.keys(o).filter(k => k.includes(BAD));
    if (!broken.length) return;
    const rebuilt = {};
    for (const [k, v] of Object.entries(o)) {
        if (!k.includes(BAD)) { rebuilt[k] = v; continue; }
        const nk = healToken(k);
        if (nk === k) { rebuilt[k] = v; continue; }             // unresolved -> leave as is
        if (Object.prototype.hasOwnProperty.call(rebuilt, nk) || (o[nk] !== undefined && o[nk] !== v)) {
            // A healed twin already exists — keep the intact one, drop the broken duplicate.
            keyRepairs.push({ cat, artNr: o.artNr || o.id || '?', from: k, to: nk, note: 'merged into existing key' });
            continue;
        }
        keyRepairs.push({ cat, artNr: o.artNr || o.id || '?', from: k, to: nk });
        rebuilt[nk] = v;
    }
    for (const k of Object.keys(o)) delete o[k];
    Object.assign(o, rebuilt);
}
for (const [cat, v] of Object.entries(data)) healObject(v, cat);

// ---------------------------------------------------------------- report
// Count over the SERIALISED file, so damaged object keys are counted too — the
// value-only walk reported "0 remaining" while 7 broken keys were still on disk.
const remaining = (JSON.stringify(data).match(/�/g) || []).length;

console.log(`repairs: ${repairs.length} values, ${keyRepairs.length} keys`);
const byCat = {};
repairs.forEach(r => { byCat[r.cat] = (byCat[r.cat] || 0) + 1; });
Object.entries(byCat).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(`  ${String(n).padStart(3)} ${c}`));

console.log('\nsample repairs:');
repairs.slice(0, 12).forEach(r => {
    const i = [...r.before].findIndex(ch => ch === BAD);
    const w = (s) => s.slice(Math.max(0, i - 28), i + 32).replace(/\n/g, ' ');
    console.log(`  ${r.cat} · ${r.field} · ${r.artNr}\n     - ${w(r.before)}\n     + ${w(r.after)}`);
});

if (keyRepairs.length) {
    console.log('\nkey repairs:');
    const seen = new Map();
    keyRepairs.forEach(k => {
        const s = `${k.cat} · ${JSON.stringify(k.from)} -> ${JSON.stringify(k.to)}${k.note ? ' (' + k.note + ')' : ''}`;
        seen.set(s, (seen.get(s) || 0) + 1);
    });
    for (const [s, n] of seen) console.log(`  ${String(n).padStart(3)}x ${s}`);
}

if (unresolved.size) {
    console.log(`\nUNRESOLVED (${unresolved.size}) — left untouched:`);
    for (const [tok, why] of unresolved) console.log(`  ${JSON.stringify(tok)} — ${why}`);
}
console.log(`\nU+FFFD remaining after repair: ${remaining}`);

// ---------------------------------------------------------------- self-check
if (VERIFY) {
    console.log('\n--- verify against commit 4847a441 (the hand-checked heal) ---');
    const healed = JSON.parse(execSync('git show 4847a441:custom-data.json', { cwd: ROOT, maxBuffer: 1 << 30 }).toString());
    const idx = (d) => {
        const m = new Map();
        for (const [k, v] of Object.entries(d)) {
            const walk = (o) => {
                if (!o || typeof o !== 'object') return;
                if (Array.isArray(o)) return o.forEach(walk);
                if (o.artNr && typeof o.label === 'string' && !m.has(k + '|' + o.artNr)) m.set(k + '|' + o.artNr, o.label);
                Object.values(o).forEach(walk);
            };
            walk(v);
        }
        return m;
    };
    const parent = idx(JSON.parse(execSync('git show 4847a441^:custom-data.json', { cwd: ROOT, maxBuffer: 1 << 30 }).toString()));
    const ref = idx(healed), mine = idx(data);
    let same = 0, diff = 0;
    for (const [key, refLabel] of ref) {
        if (!refLabel || refLabel.includes(BAD)) continue;
        const got = mine.get(key);
        if (got === undefined) continue;
        // only compare the records the reference actually healed
        const before = parent.get(key);
        if (before === undefined || !before.includes(BAD)) continue;
        if (got === refLabel) same++;
        else { diff++; console.log(`  MISMATCH ${key}\n     ref: ${refLabel.slice(0, 90)}\n     got: ${String(got).slice(0, 90)}`); }
    }
    console.log(`  matches the hand-checked fix: ${same}   mismatches: ${diff}`);
}

if (!APPLY) { console.log('\nDry run — pass --apply to write custom-data.json.'); process.exit(0); }

fs.writeFileSync(DATA + '.bak-mojibake', fs.readFileSync(DATA));
fs.writeFileSync(DATA, JSON.stringify(data, null, 2));
console.log(`\nApplied to custom-data.json (backup .bak-mojibake).`);
