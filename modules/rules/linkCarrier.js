// ─────────────────────────────────────────────────────────────────────────────
// Rule module: Wannenträger (styrofoam tub carrier) bundle for shower trays.
// Source of truth: INSTRUCTIONS.md §2–3, RULES_ENGINE_DESIGN.md (`linkCarrier`).
//
// PURE data producer. No DOM, no app state. Returns an InlineBOM-compatible
// `mat_carrier` group; it NEVER touches InlineBOM / pill / factory code (see the
// guardrails in RULES_ENGINE_DESIGN.md). Importable by both the app and tests.
//
// What it builds — the Wannenträger Montageart path (INSTRUCTIONS §2):
//   options : the single size + series-matched Duschenwannenträger (user picks it)
//   bundle  : Montageschaum + Schallschutzset, auto-injected when the carrier is
//             chosen (the established `.bundle` mechanism, createRelationalApp.js).
// Montageschaum qty = 1, but 2 when a side > 120 cm (INSTRUCTIONS §3). Schallschutz
// `1445 782` is always qty 1 (Kaldewei bundling rule, INSTRUCTIONS §3).
//
// Matching (validated against the 224 known-good carrier links — see
// scripts/replay-carrier-rule.js):
//   • carriers are size-encoded "L x W x THICK mm" and brand/series-stamped;
//   • a tray matches a carrier of the SAME L×W whose label carries the tray's
//     series (most specific model first, then family, then brand);
//   • thickness (the tray's depth) disambiguates same-L×W carriers — exact first,
//     else nearest; if still >1 candidate we FLAG rather than guess.
//
// Scope: this rule produces ONLY the Wannenträger path. The Montagerahmen (frame)
// and Stelzfüsse (Calima feet) paths from the design draft are separate follow-up
// rules (linkFrame / linkFeet); the existing mat_frame / mat_stelz data is left
// untouched. All math is in MILLIMETRES (integers) to avoid float rounding.
// ─────────────────────────────────────────────────────────────────────────────

const FOAM_ART = '1441 791.000.000'; // Montageschaum Alterna, Kartusche 400 ml
const SCHALL_ART = '1445 782.000.000'; // Schallschutzset Alterna - Stahl
const FOAM_IMG =
  'https://profishop.sanitastroesch.ch/multimedia/Web/PS1/01441791_000_000.png';
const SCHALL_IMG =
  'https://profishop.sanitastroesch.ch/multimedia/Web/PS1/01445782_000_000.png';

// Series keywords, most-specific first (so "superplan zero" wins over "superplan").
const SERIES_KEYS = [
  'superplan zero', 'superplan classic', 'superplan', 'cayonoplan', 'cayono',
  'conoflat', 'duschplan', 'calima', 'sanidusch', 'xetis', 'nexsys', 'scona',
  'ecoplan', 'loa', 'ambiente', 'sove', 'caro',
];

const norm = (k) => k.replace(/\s+/g, '-');

/** Every series/brand tag present in a label (carriers are often multi-series). */
function tagsOf(label) {
  const l = (label || '').toLowerCase();
  const tags = new Set();
  for (const k of SERIES_KEYS) if (l.includes(k)) tags.add(norm(k));
  if (l.includes('schmidlin') || l.includes('alterna')) tags.add('@schmidlin');
  if (l.includes('kaldewei')) tags.add('@kaldewei');
  return tags;
}

/**
 * Ordered match-keys to try for a tray: specific model → family → brand. The
 * first key that yields a same-size carrier wins, so specific links beat generic.
 */
function trayKeyPriority(label) {
  const l = (label || '').toLowerCase();
  const out = [];
  const add = (x) => { if (!out.includes(x)) out.push(x); };
  for (const k of SERIES_KEYS) if (l.includes(k)) add(norm(k));
  if (out.includes('superplan-zero') || out.includes('superplan-classic')) add('superplan');
  if (out.includes('cayonoplan')) add('cayono');
  // NO brand-level fallback (neither Kaldewei nor Schmidlin/Alterna). Matching a
  // tray to a carrier by manufacturer + size alone is unsafe: many trays cannot
  // take a Wannenträger at all (Kaldewei Conoflat is frame-only; flat Schmidlin
  // trays likewise — user-confirmed 2026-06-25) yet a generic same-size carrier
  // exists and would be wrongly fitted. A tray that matches no series-specific
  // carrier FLAGS (design §5: flag, don't guess); its carrier stays a manual call.
  // Existing manual carrier links are unaffected — the apply step is gap-only.
  return out;
}

/**
 * Parse L × W × thickness (all normalised to mm) from a label, plus an auf-Mass
 * (Vario / ranged) flag. Reads BOTH label and description (INSTRUCTIONS §1).
 * Detects unit by explicit "mm"/"cm" or by magnitude (no tray side is ≥ 400 cm).
 */
export function parseDimsMm(textOrTray) {
  const text =
    typeof textOrTray === 'string'
      ? textOrTray
      : `${(textOrTray && textOrTray.label) || ''} ${(textOrTray && textOrTray.description) || ''}`;
  const isAufMass =
    /vario/i.test(text) ||
    /\d+\s*-\s*\d+\s*x\s*\d+\s*-\s*\d+/.test(text) ||
    /auf\s*mass|nach\s*mass/i.test(text);

  const m = text.match(/(\d{2,4})\s*x\s*(\d{2,4})(?:\s*x\s*([\d.,]+))?\s*(mm|cm)?/i);
  if (!m) return { isAufMass, L: null, W: null, T: null };
  let a = parseInt(m[1], 10);
  let b = parseInt(m[2], 10);
  let t = m[3] != null ? parseFloat(m[3].replace(',', '.')) : null;
  const unit = (m[4] || '').toLowerCase();
  const isMm = unit === 'mm' || (!unit && (a >= 400 || b >= 400));
  if (!isMm) { a *= 10; b *= 10; if (t != null) t *= 10; } // cm → mm (depth shares the unit)
  return {
    isAufMass,
    L: Math.max(a, b),
    W: Math.min(a, b),
    T: t != null ? Math.round(t) : null,
  };
}

/**
 * Build the carrier pool from the catalog: every Duschenwannenträger part with
 * its parsed L×W×thickness and series tags, plus the shared Montageschaum and
 * Schallschutz parts (resolved from the pool so labels/images stay in sync).
 */
export function buildCarrierPool(data) {
  const src = (data && data.zubehoer_pool && data.zubehoer_pool.trays) || [];
  const carriers = [];
  let foam = null;
  let schall = null;
  for (const z of src) {
    const label = z.label || '';
    if (z.artNr === FOAM_ART && !foam) foam = z;
    if (z.artNr === SCHALL_ART && !schall) schall = z;
    if (!/dusch(en)?wannenträger/i.test(label)) continue;
    const { L, W, T } = parseDimsMm(label);
    if (L == null || W == null) continue; // e.g. "Eck" corner carriers without L×W
    carriers.push({
      artNr: z.artNr,
      label,
      imgUrl: z.imgUrl || '',
      L, W, T,
      tags: tagsOf(label),
    });
  }
  return {
    carriers,
    foam: foam
      ? { artNr: foam.artNr, label: foam.label, imgUrl: foam.imgUrl || FOAM_IMG }
      : { artNr: FOAM_ART, label: 'Montageschaum Alterna, zu Bade- und Duschenwannenträger, Kartusche 400 ml', imgUrl: FOAM_IMG },
    schall: schall
      ? { artNr: schall.artNr, label: schall.label, imgUrl: schall.imgUrl || SCHALL_IMG }
      : { artNr: SCHALL_ART, label: 'Schallschutzset Alterna - Stahl, zu Duschenwannenträger bis 2000 x 1000 mm', imgUrl: SCHALL_IMG },
  };
}

const uniqByArt = (arr) =>
  [...new Map(arr.map((c) => [c.artNr.replace(/\s/g, ''), c])).values()];

/** Among same-L×W carriers, disambiguate by thickness: exact, else nearest. */
function pickByThickness(cands, T) {
  if (T != null) {
    const exact = uniqByArt(cands.filter((c) => c.T === T));
    if (exact.length === 1) return { carrier: exact[0] };
    if (exact.length > 1) return { ambiguous: exact };
  }
  const withT = cands.filter((c) => c.T != null);
  const pool = withT.length ? withT : cands;
  if (T == null) {
    const u = uniqByArt(pool);
    return u.length === 1 ? { carrier: u[0] } : { ambiguous: u };
  }
  const minDist = Math.min(...pool.map((c) => Math.abs(c.T - T)));
  const near = uniqByArt(pool.filter((c) => Math.abs(c.T - T) === minDist));
  return near.length === 1 ? { carrier: near[0] } : { ambiguous: near };
}

function carrierOption(c) {
  return { artNr: c.artNr, label: c.label, imgUrl: c.imgUrl, type: 'Zubehör', menge: 1 };
}

/**
 * Build the `mat_carrier` Wannenträger group for a shower tray.
 * @returns {{group?: object, flag?: string}} — `group` is InlineBOM-ready;
 *          `flag` is set (group omitted) when we can't resolve it safely, so the
 *          caller leaves the tray untouched instead of guessing (design §5).
 */
export function linkCarrier(tray, pool) {
  if (!pool || !pool.carriers || !pool.carriers.length) return { flag: 'no-carrier-pool' };
  const { isAufMass, L, W, T } = parseDimsMm(tray);
  // Vario / auf-Mass trays have no single fixed-size carrier → they use a frame.
  if (isAufMass) return { flag: 'aufmass-uses-frame' };
  if (L == null || W == null) return { flag: 'no-dimensions' };

  const bySize = pool.carriers.filter((c) => c.L === L && c.W === W);
  if (!bySize.length) return { flag: 'no-carrier-for-size' };

  let chosen = null;
  let matchedKey = null;
  for (const key of trayKeyPriority(tray.label)) {
    const cands = bySize.filter((c) => c.tags.has(key));
    if (!cands.length) continue;
    const res = pickByThickness(cands, T);
    if (res.carrier) { chosen = res.carrier; matchedKey = key; break; }
    if (res.ambiguous) return { flag: 'ambiguous-carrier' };
  }
  if (!chosen) return { flag: 'no-series-match' };

  // Montageschaum qty: 2 if a side > 120 cm (1200 mm), else 1 (INSTRUCTIONS §3).
  const foamMenge = L > 1200 || W > 1200 ? 2 : 1;
  const ruleSeries = matchedKey.replace(/^@/, '');

  return {
    group: {
      id: 'mat_carrier',
      name: 'Wannenträger System',
      _auto: true,
      _rule: `carrier:${ruleSeries}`,
      options: [carrierOption(chosen)],
      bundle: [
        { artNr: pool.foam.artNr, label: pool.foam.label, imgUrl: pool.foam.imgUrl, type: 'Zubehör', menge: foamMenge },
        { artNr: pool.schall.artNr, label: pool.schall.label, imgUrl: pool.schall.imgUrl, type: 'Zubehör', menge: 1 },
      ],
    },
  };
}
