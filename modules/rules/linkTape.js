// ─────────────────────────────────────────────────────────────────────────────
// Rule module: Zargen-Wannendichtband (sealing tape) for shower trays.
// Source of truth: INSTRUCTIONS.md §3.
//
// PURE data producer. No DOM, no app state. Returns an InlineBOM-compatible
// `mat_tape` group; it NEVER touches InlineBOM / pill / factory code (see the
// guardrails in RULES_ENGINE_DESIGN.md). Importable by both the app and tests.
//
// Rule (fixed-size trays): offer TWO lengths —
//   • L-Variante (2-seitig / Eck):    smallest tape ≥ L + W + 20cm
//   • U-Variante (3-seitig / Nische): smallest tape ≥ L + 2·W + 20cm
// Rule (auf-Mass / Vario): offer ALL available tape lengths (manual dropdown).
//
// All math is in CENTIMETRES (integers) to avoid the float rounding that made
// the old meter-based scripts over-pick a size on boundary cases.
// ─────────────────────────────────────────────────────────────────────────────

const FALLBACK_TAPE_IMG =
  'https://profishop.sanitastroesch.ch/multimedia/Web/PG1/01461001_000_000.png';

/**
 * Extract the sealing-tape pool (Zargen-Wannendichtband Alterna, art-nr 1461…)
 * from the catalog's zubehoer_pool, with each length normalised to cm.
 * @returns {Array<{artNr,label,imgUrl,lengthCm}>} sorted ascending by length.
 */
export function buildTapePool(data) {
  const trays = (data && data.zubehoer_pool && data.zubehoer_pool.trays) || [];
  const pool = [];
  for (const z of trays) {
    const label = z.label || '';
    if (!/zargen/i.test(label) || !/alterna/i.test(label)) continue;
    const m = label.match(/Länge\s*([\d.,]+)\s*m\b/i);
    if (!m) continue; // e.g. the "Eckdichtungen 3d" item has no length → not a tape
    const meters = parseFloat(m[1].replace(',', '.'));
    if (!Number.isFinite(meters)) continue;
    pool.push({
      artNr: z.artNr,
      label,
      imgUrl: z.imgUrl || FALLBACK_TAPE_IMG,
      lengthCm: Math.round(meters * 100),
    });
  }
  return pool.sort((a, b) => a.lengthCm - b.lengthCm);
}

/**
 * Parse a tray's length/width (cm) and whether it is an auf-Mass / Vario tray.
 * Reads BOTH label and description (INSTRUCTIONS.md §1).
 */
export function parseTrayDims(tray) {
  const text = `${(tray && tray.label) || ''} ${(tray && tray.description) || ''}`;
  const isAufMass =
    /vario/i.test(text) ||
    /\d+\s*-\s*\d+\s*x\s*\d+\s*-\s*\d+/.test(text) || // both dims ranged
    /auf\s*mass|nach\s*mass/i.test(text);

  // Capture L × W (× depth)? with an optional trailing unit. Allows 4-digit mm.
  const m = text.match(/(\d{2,4})\s*x\s*(\d{2,4})(?:\s*x\s*[\d.,]+)?\s*(mm|cm)?/i);
  if (!m) return { isAufMass, L: null, W: null, unit: null };
  let a = parseInt(m[1], 10);
  let b = parseInt(m[2], 10);

  // Unit normalisation (INSTRUCTIONS §3): convert mm → cm. Detect by explicit
  // unit, or fall back to magnitude (no shower-tray side is ≥ 400 cm).
  const unit = (m[3] || '').toLowerCase();
  const isMm = unit === 'mm' || (!unit && (a >= 400 || b >= 400));
  if (isMm) {
    a = Math.round(a / 10);
    b = Math.round(b / 10);
  }
  return { isAufMass, L: Math.max(a, b), W: Math.min(a, b), unit: isMm ? 'mm' : 'cm' };
}

function smallestTapeAtLeast(pool, reqCm) {
  return pool.find((t) => t.lengthCm >= reqCm) || null;
}

function tapeOption(t, dropdownLabel) {
  return {
    artNr: t.artNr,
    label: t.label,
    dropdownLabel,
    type: 'Zubehör',
    imgUrl: t.imgUrl,
    menge: 1,
  };
}

/**
 * Build the `mat_tape` group for a shower tray.
 * @returns {{group?: object, flag?: string}} — `group` is InlineBOM-ready;
 *          `flag` is set (and group omitted) when we can't resolve it, so the
 *          caller can surface a `bitte_waehlen`/"Ausstehend" state instead of guessing.
 */
export function linkTape(tray, pool) {
  if (!pool || pool.length === 0) return { flag: 'no-tape-pool' };
  const { isAufMass, L, W } = parseTrayDims(tray);

  // auf-Mass / Vario → manual dropdown of ALL lengths
  if (isAufMass) {
    return {
      group: {
        id: 'mat_tape',
        name: 'Zargen-Wannendichtband',
        _auto: true,
        _rule: 'tape:aufmass',
        options: pool.map((t) => tapeOption(t, t.label)),
      },
    };
  }

  if (L == null) return { flag: 'no-dimensions' };

  const tL = smallestTapeAtLeast(pool, L + W + 20);
  const tU = smallestTapeAtLeast(pool, L + 2 * W + 20);
  if (!tL || !tU) return { flag: 'no-matching-tape' };

  return {
    group: {
      id: 'mat_tape',
      name: 'Zargen-Wannendichtband',
      _auto: true,
      _rule: 'tape:fixed',
      options: [
        tapeOption(tL, `2-seitige Montage (Eck-Variante) - ${tL.label}`),
        tapeOption(tU, `3-seitige Montage (Nische-Variante) - ${tU.label}`),
      ],
    },
  };
}
