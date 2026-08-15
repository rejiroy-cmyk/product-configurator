//
// Which image URL is real, and which of several to take.
//
// Shared so the rule exists once. It was copied into every fetcher, and the
// copies all carried the same wrong blocklist for months.
//
// ── The blocklist that meant the opposite ────────────────────────────────────
// '_nV', '_100_000' and '_000_000' were treated as placeholder markers. They
// are not:
//   _nV        the per-article technical drawing profishop itself renders as
//              the primary listing thumbnail. Blocking it is why 1,673
//              Duschtrennwand slots shared 12 bathroom scenes.
//   _000_000   the finish triplet of a COLOURLESS article — every Einbaukörper
//              and Grundkörper in the catalogue.
//   _100_000   the same mistake, caught one round earlier.
//
// The bank is the quality signal, never the filename: PS1/…_nV.png is an
// 859-byte blank while PG1/…_nV.png is the real ~26 KB drawing — same
// basename, different bank.
//
// ── Local paths are trusted outright ─────────────────────────────────────────
// An `img/…` path exists only because a scraper already fetched, decoded and
// size-checked that file. Re-judging it by filename can only cause damage, and
// the local names literally contain _nV / _000_000: judging them by name marks
// 23,321 articles with perfectly good images as needing a re-heal, which
// overwrites them. This mirrors isRealImg() in modules/factories/_shared.js.
//
'use strict';

const PLACEHOLDER = ['no-image', 'placeholder'];
// Non-photo banks: SAP/YM1 = technical drawings/Schallschutz, Energieetiketten = EU labels.
const NON_PHOTO = ['/multimedia/SAP/', '/Energieetiketten/'];

const isLocal = (u) => String(u || '').startsWith('img/');
const baseName = (u) => String(u).split('/').pop();
const isPG1 = (u) => /\/PG1\//.test(String(u));
const isPS1 = (u) => /\/PS1\//.test(String(u));

function isDistinctive(u) {
    if (!u || !String(u).trim()) return false;
    if (isLocal(u)) return true;                     // already fetched and checked
    return !PLACEHOLDER.some(s => u.includes(s))
        && !NON_PHOTO.some(s => u.includes(s));
}

// An article needs an image only when it has none worth keeping.
const needsImage = (imgUrl) => !isDistinctive(imgUrl);

// Rank for the fallback path only: real photo, then anything, then thumbnail.
const imgRank = (u) => (isPG1(u) ? 0 : isPS1(u) ? 2 : 1);

// The picking rule that reproduces what the shop shows: take `result.image`,
// then upgrade to its PG1 twin — same basename, PG1 bank — when the response
// actually carries one. Only with no usable primary does it rank the rest.
//
// Deliberately NOT "take the best-looking PG1 anywhere in images[]": that swaps
// in a different picture than the shop lists, which is the thing being
// mirrored. And the twin must be present in the response — synthesizing a PG1
// URL that was never returned just records a 404.
function bestImage(result) {
    if (!result) return null;
    const all = [result.image, ...(Array.isArray(result.images) ? result.images : [])]
        .filter(isDistinctive);
    if (!all.length) return null;
    const primary = isDistinctive(result.image) ? result.image : null;
    if (primary) {
        if (isPG1(primary)) return primary;
        const twin = all.find(u => u !== primary && isPG1(u) && baseName(u) === baseName(primary));
        return twin || primary;
    }
    return all.slice().sort((a, b) => imgRank(a) - imgRank(b))[0];
}

module.exports = { isDistinctive, needsImage, bestImage, isLocal, isPG1, isPS1, baseName, imgRank, PLACEHOLDER, NON_PHOTO };
