// ============================================================================
//  Product DISPLAY text — the presentation counterpart to productText()
//  ---------------------------------------------------------------------------
//  productText() (in _shared.js) produces lowercased text for CLASSIFICATION.
//  This module produces human-readable text for the UI:
//
//    fullLabel(p)               → the complete, de-duplicated product text
//    differentiatingChips(p, g) → the attribute chips that tell p apart from g
//
//  Both obey the GLOBAL full-text rule: read `label` AND `description`, never
//  the label alone. ERP labels are hard-truncated (often mid-word); the rest of
//  the sentence lives in `description`, usually repeating the tail of the label
//  so the two can be stitched back together.
//
//  Side-effect free on purpose (no window.*, no DOM) so it can be unit-tested
//  in plain node. Re-exported from _shared.js — import it from there.
// ============================================================================

import { COLOR_NAMES } from './_colorCodes.js';

// ── text normalisation ───────────────────────────────────────────────────────
const stripHtml = (s) => String(s == null ? '' : s)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();

// A "compact stream": the text reduced to bare alphanumerics, plus an index map
// back into the original string. Comparing compact streams makes the overlap
// search immune to the ERP's inconsistent spacing, hyphens and punctuation
// ("Kaltwasser- Positi" vs "Kaltwasser‐Position").
const compact = (s) => {
    const out = [];
    const idx = [];
    for (let i = 0; i < s.length; i++) {
        const c = s[i].toLowerCase();
        if (/[a-z0-9äöüàéèçñ]/.test(c)) { out.push(c); idx.push(i); }
    }
    return { str: out.join(''), idx };
};

const MIN_OVERLAP = 8;   // compact chars — below this an "overlap" is coincidence

const tokenize = (s) => String(s).split(/\s+/).filter(Boolean);
const normTok = (t) => t.toLowerCase().replace(/[‐‑‒–—―]/g, '-').replace(/[.,;:()"'`´]/g, '');

const joinParts = (a, b) => {
    const left = a.replace(/[\s,;:·]+$/, '');
    if (!left) return b;
    if (!b) return left;
    return /^[,;.]/.test(b) ? left + b : left + ', ' + b;
};

/**
 * The complete product text for display: label + whatever the description adds,
 * with the repeated overlap removed and any truncated tail of the label healed.
 *
 * Handles the three shapes the catalogue data actually comes in:
 *   1. description repeats the whole label and continues  → description wins
 *   2. description restates the label's tail and continues → stitched at the overlap
 *   3. description only echoes part of the label           → label wins
 */
export const fullLabel = (p) => {
    if (!p) return '';
    if (typeof p === 'string') return stripHtml(p);

    const L = stripHtml(p.label || p.name || '');
    const D = stripHtml(p.description || '');
    if (!D) return L;
    if (!L) return D;

    const cl = compact(L);
    const cd = compact(D);
    if (!cl.str || !cd.str) return L || D;

    // 3. the description adds nothing the label doesn't already say
    if (cl.str.includes(cd.str)) return L;
    // 1. the description IS the untruncated label
    if (cd.str.includes(cl.str)) return D;

    // 2. longest suffix-of-label that is a prefix-of-description. The overlap is
    //    by definition a prefix of D, so we keep the label only up to where the
    //    overlap starts and let the (complete, untruncated) description finish it.
    const max = Math.min(cl.str.length, cd.str.length);
    for (let o = max; o >= MIN_OVERLAP; o--) {
        if (cl.str.slice(-o) === cd.str.slice(0, o)) {
            const head = L.slice(0, cl.idx[cl.str.length - o]);
            return joinParts(head, D);
        }
    }

    const lset = new Set(tokenize(L).map(normTok));

    // 4. both texts restate the SAME sentence from the start — the ERP re-wraps and
    //    re-punctuates, so they diverge only at the very end (label ends "…Verchromt",
    //    description ends "…Umweltdeklaration EPD"). Keep the label's cleaner
    //    rendering and append only what the description adds after the shared part.
    let cp = 0;
    while (cp < cl.str.length && cp < cd.str.length && cl.str[cp] === cd.str[cp]) cp++;
    if (cp >= 12 && cp >= 0.6 * Math.min(cl.str.length, cd.str.length)) {
        const dTail = cp < cd.str.length ? D.slice(cd.idx[cp]) : '';
        const isNew = tokenize(dTail).some(t => !lset.has(normTok(t)));
        return isNew ? joinParts(L, dTail.replace(/^[\s,;:]+/, '')) : L;
    }

    // 5. the description restates the label with a GAP in the middle (the label
    //    carries a clause the description omits, e.g. a partner art-Nr). Appending
    //    it wholesale would print the same sentence twice.
    // Coverage is prefix-tolerant so a singular/plural or re-hyphenated restatement
    // ("Wandsteuerung" vs "Wandsteuerungen") still counts as already said.
    const lstems = new Set([...lset].filter(t => t.length >= 6).map(t => t.slice(0, 6)));
    const covered = (t) => {
        const n = normTok(t);
        return lset.has(n) || (n.length >= 6 && lstems.has(n.slice(0, 6)));
    };
    const dtok = tokenize(D);
    let i = 0;
    while (i < dtok.length && covered(dtok[i])) i++;
    if (i >= dtok.length) return L;                                  // says nothing new

    // Only drop a repeated prefix when it is long enough to be a real restatement —
    // a one-word coincidence ("mit", "für") must not swallow the first clause.
    const tail = i >= 3 ? dtok.slice(i) : dtok;
    const fresh = tail.filter(t => !lset.has(normTok(t)));
    // Mostly a repeat with a stray variance (an ERP typo in one number) — the extra
    // words aren't worth printing the clause twice.
    if (fresh.length < 2 || fresh.length / tail.length < 0.34) return L;
    return joinParts(L, tail.join(' '));
};

// ============================================================================
//  Differentiating attribute chips
// ============================================================================
// ERP families regularly ship a dozen articles whose LABELS are identical and
// whose only difference sits in the description tail (Energieeffizienzklasse,
// Höhe Mischdüse, Batterie vs Netzgerät …). These extractors turn that tail
// into short German chips; the engine below then shows a product only the
// chips that actually set it apart from the products listed next to it.

const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

// [family, regex, value builder]. Order = display priority.
const ATTR_RULES = [
    ['Ausladung', /\bA\s*(\d{2,3})\s*mm\b/i, m => `A ${m[1]} mm`],
    ['Auslauf', /\b(Auslauf fest|Schwenkauslauf|Auszugbrause|Auslauf schwenkbar)\b/i, m => cap(m[1])],
    ['Schwenkbereich', /(\d{2,3})\s*°/, m => `${m[1]}°`],
    ['Ablaufventil', /\b(ohne Ablaufventil|Ablaufventilhebel|Zugstangen-?Ablaufventil|Ablaufventil)\b/i, m => {
        const v = m[1].toLowerCase();
        if (v.startsWith('ohne')) return 'ohne Ablaufventil';
        if (v.includes('hebel')) return 'Ablaufventilhebel';
        return 'mit Ablaufventil';
    }],
    ['Bedienung', /\bKaltwasser\W{0,2}Position\b/i, () => 'Kaltwasser-Mitte'],
    ['Strom', /\b(Batteriebetrieb|Batterie\s*\d+\s*V|Netzgerät|Steckernetzteil|Netzteil|Netzbetrieb)\b/i, m => {
        const v = m[1].toLowerCase();
        return v.startsWith('batterie') ? 'Batteriebetrieb' : 'Netzbetrieb';
    }],
    ['Druck', /\b(Niederdruck\w*|Hochdruck\w*)\b/i, m => cap(m[1].toLowerCase().startsWith('nieder') ? 'Niederdruck' : 'Hochdruck')],
    ['Mischdüse', /\bH[öo]he\s+Mischdüse\s*(\d{2,4})\s*mm\b/i, m => `Mischdüse ${m[1]} mm`],
    ['Gesamthöhe', /\bGesamth[öo]he\s*(\d{2,4})\s*mm\b/i, m => `Gesamthöhe ${m[1]} mm`],
    // Retired: Abnehmbar (2 products) and Montage (4) — they never won a slot in
    // 1464 products. Not in AUTO_SUPPRESS: if either phrase ever IS the only
    // difference, the auto-diff backstop may still surface it, which is fine.
    // NOTE: no Energieeffizienzklasse and no Geräuschgruppe chip — neither is a
    // buying criterion here (user directive 2026-08-08). Both are also listed in
    // AUTO_SUPPRESS below, or the auto-diff backstop brings them straight back as
    // raw text the moment two products share a curated signature.
    ['Anschluss', /\bSchlauchanschl[üu]sse?\s*([⅜½¾⅝\d]+(?:\s*\/\s*\d+)?\s*["″']?)/i, m => `Anschluss ${m[1].trim()}`],
    // basins / ceramics
    ['Hahnloch', /\b(ohne Armaturenloch|mit\s*(\d)\s*Armaturenl[öo]cher|(\d)\s*Armaturenl[öo]cher|Armaturenloch)\b/i, m => {
        const v = m[1].toLowerCase();
        if (v.startsWith('ohne')) return 'ohne Hahnloch';
        const n = m[2] || m[3];
        return n ? `${n} Hahnlöcher` : '1 Hahnloch';
    }],
    ['Überlauf', /\b(ohne [ÜU]berlauf|mit [ÜU]berlauf|unsichtbarer [ÜU]berlauf)\b/i,
        m => m[1].toLowerCase().replace(/uberlauf|überlauf/, 'Überlauf')],
    ['Ablage', /\b(Ablage|Abstellfläche)\s+(links|rechts|beidseitig)\b/i, m => `${cap(m[1])} ${m[2]}`],
    ['Masse', /\b(\d{2,3})\s*x\s*(\d{2,3}(?:[.,]\d)?)\s*cm\b/i, m => `${m[1]} x ${m[2]} cm`],
];

const _attrCache = typeof WeakMap === 'function' ? new WeakMap() : null;

// Every curated attribute this product carries, as family → chip text.
export const productAttrs = (p) => {
    if (!p || typeof p !== 'object') return new Map();
    if (_attrCache && _attrCache.has(p)) return _attrCache.get(p);

    const text = fullLabel(p);
    const map = new Map();
    ATTR_RULES.forEach(([family, re, build]) => {
        const m = text.match(re);
        if (m) map.set(family, build(m));
    });

    // COLOUR RULE: the finish comes ONLY from the art-Nr finish-code triplet,
    // never from label text. See INSTRUCTIONS.md § Colour codes.
    const cm = String(p.artNr || '').match(/\.(\d{3})(?:\.|$)/);
    if (cm && COLOR_NAMES[cm[1]]) map.set('Farbe', COLOR_NAMES[cm[1]]);

    if (_attrCache) _attrCache.set(p, map);
    return map;
};

const ORDER = ATTR_RULES.map(r => r[0]).concat(['Farbe']);

// tokens of the full text, for the auto-diff fallback
const AUTO_STOP = new Set(['und', 'mit', 'ohne', 'für', 'zur', 'zum', 'der', 'die', 'das', 'des',
    'in', 'im', 'am', 'an', 'auf', 'aus', 'bis', 'von', 'vom', 'per', 'à', 'x', 'mm', 'cm', 'a']);
const tokensOf = (text) => tokenize(text).map(raw => ({ raw, norm: normTok(raw) }));

// Phrases the auto-diff must never surface as a chip, however well they happen to
// separate two products. Without this, dropping a curated rule just moves the same
// text back onto the tile in its raw ERP form.
const AUTO_SUPPRESS = new RegExp([
    /\bEnergie(effizienz)?klasse\s*[A-G]?\+*\b/.source,   // energy label
    /\bGeräuschgruppe\s*(I{1,3}|IV|[1-4])?\b/.source,     // acoustic class
    /\bUmweltdeklaration(\s+EPD)?\b|\bEPD\b/.source,      // environmental declaration
].join('|'), 'gi');

// Generic backstop for families the curated rules don't cover: phrases this product
// has that its look-alikes don't.
//
// This is a SET-COVER problem, not a "pick the best phrase" one. Hansgrohe Tecturis S
// is the case that proves it — 549 carries both EcoSmart+ and CoolStart, 548 only
// EcoSmart+, 551 only CoolStart. No single phrase separates 549 from both, so
// choosing one longest run leaves two tiles reading alike. We instead pick phrases
// greedily until every look-alike is accounted for.
const autoDiffChips = (product, clashes, maxChars, maxChips = 2) => {
    if (!clashes.length) return [];
    const mine = tokensOf(fullLabel(product));
    const otherSets = clashes.map(s => new Set(tokensOf(fullLabel(s)).map(t => t.norm)));

    // Which look-alikes a word sets us apart from (those that simply don't have it).
    const coverOf = (norm) => {
        const cover = [];
        otherSets.forEach((set, i) => { if (!set.has(norm)) cover.push(i); });
        return cover;
    };

    // Maximal runs of words that separate us from at least one look-alike, so the
    // chip reads as a phrase ("EcoSmart+, CoolStart") rather than a lone word.
    const runs = [];
    let run = [];
    mine.forEach(t => {
        const cover = t.norm ? coverOf(t.norm) : [];
        if (!cover.length) { if (run.length) { runs.push(run); run = []; } }
        else run.push({ ...t, cover });
    });
    if (run.length) runs.push(run);

    const candidates = runs.map(r => ({
        text: r.map(t => t.raw).join(' ')
            .replace(AUTO_SUPPRESS, ' ')
            .replace(/\s+/g, ' ')
            .replace(/^[\s,;:.-]+|[\s,;:.-]+$/g, ''),
        cover: new Set(r.flatMap(t => t.cover)),
    })).filter(c => c.text.length > 2
        // a bare number is a fragment of a measurement whose unit sits in a word the
        // look-alikes share ("46,5" out of "46,5 cm") — it reads as noise on a tile
        && !/^[\d\s.,x×/-]+$/.test(c.text)
        && c.text.split(/\s+/).some(w => !AUTO_STOP.has(w.toLowerCase().replace(/[.,]/g, ''))));

    const uncovered = new Set(otherSets.map((_, i) => i));
    const picked = [];
    while (uncovered.size && picked.length < maxChips) {
        let best = null, bestGain = 0;
        for (const c of candidates) {
            if (picked.includes(c)) continue;
            let gain = 0;
            for (const i of c.cover) if (uncovered.has(i)) gain++;
            // most look-alikes resolved; ties go to the shorter, more readable phrase
            if (gain > bestGain || (gain === bestGain && gain > 0 && best && c.text.length < best.text.length)) {
                bestGain = gain; best = c;
            }
        }
        if (!best) break;
        picked.push(best);
        for (const i of best.cover) uncovered.delete(i);
    }

    return picked.map(c => c.text.length > maxChars
        ? c.text.slice(0, maxChars - 1).replace(/[\s,;:.-]+$/, '') + '…'
        : c.text);
};

// How much work a family actually does inside a group:
//   2 CONTRASTIVE — a neighbour states a DIFFERENT value. Genuinely tells them apart.
//   1 PRESENCE    — every neighbour that states a value agrees with ours; some just
//                   have no data for it. Weak: it separates the tile from a gap in the
//                   catalogue, not from a different product.
//   0 SHARED      — every neighbour states exactly our value. Says nothing.
// Chip slots are scarce (4), so tier 1 must never crowd out tier 2 — that is how
// "Geräuschgr. I" and 'Anschluss ⅜"' used to occupy a slot they hadn't earned.
const CONTRASTIVE = 2, PRESENCE = 1, SHARED = 0;
const familyTier = (family, myVal, siblings) => {
    let sawGap = false;
    for (const s of siblings) {
        const v = productAttrs(s).get(family);
        if (v == null) sawGap = true;
        else if (v !== myVal) return CONTRASTIVE;
    }
    return sawGap ? PRESENCE : SHARED;
};

// Core = pinned families + contrastive ones. Memoised per (group, opts) render pass:
// deciding whether a tile is unique means computing its neighbours' cores too, and
// without the cache that is O(n³) on every filter click.
let _coreCache = null, _coreCacheKey = null, _coreCacheGroup = null;
const coreChips = (product, group, always, exclude, max) => {
    const key = `${always.join()}#${exclude.join()}#${max}`;
    if (_coreCacheGroup !== group || _coreCacheKey !== key) {
        _coreCacheGroup = group; _coreCacheKey = key; _coreCache = new Map();
    }
    if (_coreCache.has(product)) return _coreCache.get(product);

    const siblings = group.filter(g => g && g !== product);
    const mine = productAttrs(product);
    const chips = [];
    for (const family of ORDER) {
        if (exclude.includes(family)) continue;
        const v = mine.get(family);
        if (!v) continue;
        if (always.includes(family) || familyTier(family, v, siblings) === CONTRASTIVE) chips.push(v);
        if (chips.length >= max) break;
    }
    _coreCache.set(product, chips);
    return chips;
};

// Core + the presence-tier top-up. This is the tile's "render key": deciding whether
// a neighbour looks identical means computing ITS key too, so this must be
// non-recursive and memoised exactly like coreChips.
let _curatedCache = null, _curatedCacheKey = null, _curatedCacheGroup = null;
const curatedChips = (product, group, always, exclude, max) => {
    const key = `${always.join()}#${exclude.join()}#${max}`;
    if (_curatedCacheGroup !== group || _curatedCacheKey !== key) {
        _curatedCacheGroup = group; _curatedCacheKey = key; _curatedCache = new Map();
    }
    if (_curatedCache.has(product)) return _curatedCache.get(product);

    const siblings = group.filter(g => g && g !== product);
    const mine = productAttrs(product);
    const chips = coreChips(product, group, always, exclude, max).slice();

    // Only when a neighbour would render an identical tile do we spend a slot on a
    // presence-tier family — and then only on one that separates us from that
    // neighbour.
    const mineCore = chips.join('|');
    const clashes = siblings.filter(s => coreChips(s, group, always, exclude, max).join('|') === mineCore);
    if (clashes.length) {
        for (const family of ORDER) {
            if (chips.length >= max) break;
            if (exclude.includes(family)) continue;
            const v = mine.get(family);
            if (!v || chips.includes(v)) continue;
            if (familyTier(family, v, siblings) !== PRESENCE) continue;
            if (clashes.some(s => productAttrs(s).get(family) !== v)) chips.push(v);
        }
    }
    _curatedCache.set(product, chips);
    return chips;
};

/**
 * The chips that let the user tell `product` apart from the products shown
 * beside it.
 *
 * @param product  the product being rendered
 * @param group    every product displayed under the same title (product included)
 * @param opts.always    families to show even when the whole group shares them
 * @param opts.exclude   families to never chip (already shown elsewhere on the tile)
 * @param opts.max       hard cap on chip count (default 4)
 * @param opts.maxChars  auto-diff chip length cap (default 46)
 * @returns string[]  chip texts, already ordered
 */
export const differentiatingChips = (product, group, opts = {}) => {
    const max = opts.max || 4;
    const always = opts.always || [];
    const exclude = opts.exclude || [];
    const grp = (group && group.length) ? group : [product];
    const siblings = grp.filter(g => g && g !== product);

    const chips = curatedChips(product, grp, always, exclude, max).slice();

    // Last resort: some neighbour still renders the EXACT same tile. Diff the raw
    // text against those specific neighbours — not against every product with a
    // matching attribute signature, which is a different (and wrong) set: it let
    // the backstop pick a phrase that was true of the product but shared with the
    // very tile it was supposed to distinguish it from.
    const key = chips.join('|');
    const clashes = siblings.filter(s => curatedChips(s, grp, always, exclude, max).join('|') === key);
    if (clashes.length) {
        // may exceed max — two identical tiles are worse than a fifth chip
        autoDiffChips(product, clashes, opts.maxChars || 46)
            .forEach(extra => { if (!chips.includes(extra)) chips.push(extra); });
    }

    return chips;
};
