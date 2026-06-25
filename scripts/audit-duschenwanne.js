// Full completeness/mismatch audit of every Duschenwanne product. Read-only.
//   node scripts/audit-duschenwanne.js
//
// Checks each tray's BOM against the rules we established:
//   • required groups: siphon (mat_siphon) + tape (mat_tape)
//   • at least one mounting path: carrier / frame / stelzfüsse
//   • carrier bundle = Montageschaum (1441 791) + Schallschutz (1445 782)
//   • frame ↔ brand match (Schmidlin→Omnia, Kaldewei→FR 5300, Laufen→Ineo)
//   • frame size: Omnia exact L×W (or auf-Mass 199/200 for Vario); FR 5300/Ineo range fit
//   • Omnia frame carries the Fussset bundleRule; FR 5300 MAS rule (side>90);
//     Ineo carries a Schallschutz bundle
//   • dangling references: frame parts in a BOM but absent from the pool
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'custom-data.json'), 'utf8'));
const trays = (data.duschenwanne && data.duschenwanne.trays) || [];
const pool = (data.zubehoer_pool && data.zubehoer_pool.trays) || [];
const clean = (a) => (a || '').replace(/\s/g, '');
const poolSet = new Set(pool.map((z) => clean(z.artNr)));

const grp = (t, id) => (t.mountingMaterials || []).find((m) => m.id === id);
const opt0 = (g) => (g && g.options && g.options[0]) || null;
const dim = (s) => {
  const m = (s || '').match(/(\d{2,4})\s*x\s*(\d{2,4})/);
  if (!m) return null;
  let a = +m[1], b = +m[2];
  if (a >= 400 || b >= 400) { a /= 10; b /= 10; }
  return [Math.max(a, b), Math.min(a, b)];
};
const brandOf = (l) => /kaldewei/i.test(l) ? 'Kaldewei' : /laufen/i.test(l) ? 'Laufen' : (/schmidlin|alterna/i.test(l) ? 'Schmidlin' : 'other');
const frameSys = (l) => /fr\s*5300/i.test(l) ? 'FR5300' : /einbau-?\s*system-?\s*rahmen\s+kaldewei\s+esr/i.test(l) ? 'ESR'
  : /omnia/i.test(l) ? 'Omnia' : /ineo/i.test(l) ? 'Ineo' : /laufen/i.test(l) ? 'Laufen-other' : 'other';
const isVario = (l) => /vario/i.test(l || '');
const isAufMassFrame = (a) => a === '1435 199.000.000' || a === '1435 200.000.000';

const F = {
  noSiphon: [], noTape: [], noMount: [], carrierNoBundle: [],
  omniaNoFussset: [], omniaSizeMismatch: [], frameBrandMismatch: [],
  fr5300MasIssue: [], ineoNoSchall: [], rangeMisfit: [], dangling: [],
};

for (const t of trays) {
  const L = (t.label || '');
  const td = dim(L);
  const siphon = grp(t, 'mat_siphon');
  const tape = grp(t, 'mat_tape');
  const carrier = grp(t, 'mat_carrier');
  const frame = grp(t, 'mat_frame');
  const stelz = grp(t, 'mat_stelz');
  const montageset = grp(t, 'mat_montageset');
  const tag = `${t.artNr}  ${L.slice(0, 44)}`;

  // A Duschen-Montageset is a complete kit (frame, feet, tape, siphon, cover) —
  // it satisfies siphon + tape + mount on its own.
  if (!montageset) {
    // ── required groups ──
    if (!opt0(siphon)) F.noSiphon.push(tag);
    if (!opt0(tape)) F.noTape.push(tag);
    // ── at least one mounting path ──
    if (!carrier && !frame && !stelz) F.noMount.push(tag);
  }

  // ── carrier bundle completeness ──
  if (carrier) {
    const b = (carrier.bundle || []).map((x) => clean(x.artNr));
    const hasFoam = b.includes('1441791.000.000');
    const hasSchall = b.includes('1445782.000.000');
    if (!hasFoam || !hasSchall) F.carrierNoBundle.push(`${tag}  [foam:${hasFoam} schall:${hasSchall}]`);
  }

  // ── frame checks ──
  if (frame && opt0(frame)) {
    const fl = opt0(frame).label || '';
    const fa = opt0(frame).artNr;
    const sys = frameSys(fl);
    const brand = brandOf(L);

    // brand ↔ frame system match
    const expected = brand === 'Schmidlin' ? 'Omnia' : brand === 'Kaldewei' ? 'FR5300' : brand === 'Laufen' ? 'Ineo' : null;
    if (expected && sys !== expected && sys !== 'other')
      F.frameBrandMismatch.push(`${tag}  brand=${brand} frame=${sys} (${fa})`);

    if (sys === 'Omnia') {
      // Fussset bundleRule present & pointing at this frame
      const hasFuss = (frame.bundleRules || []).some((br) => (br.optionArtNrs || []).includes(fa) && (br.bundle || []).some((x) => /fussset/i.test(x.label || '')));
      if (!hasFuss) F.omniaNoFussset.push(`${tag}  (${fa})`);
      // exact size match unless the auf-Mass adjustable frame
      if (!isAufMassFrame(fa) && !isVario(L)) {
        const fd = dim(fl);
        if (td && fd && (td[0] !== fd[0] || td[1] !== fd[1]))
          F.omniaSizeMismatch.push(`${tag}  tray=${td.join('x')} frame=${fd.join('x')} (${fa})`);
      }
    }

    if (sys === 'FR5300') {
      const side = td ? td[0] : null;       // max side in cm
      const b = (frame.bundle || []).map((x) => (x.label || '').toLowerCase());
      const hasMas = b.some((x) => /mitten|mas\s*53/.test(x));
      const cono = /conoflat/i.test(L);
      if (side != null) {
        if (side > 90 && !hasMas) F.fr5300MasIssue.push(`${tag}  side=${side}>90 but NO MAS`);
        else if (side <= 90 && hasMas) F.fr5300MasIssue.push(`${tag}  side=${side}<=90 but HAS MAS`);
        else if (side > 90 && hasMas) {
          const has5315 = (frame.bundle || []).some((x) => clean(x.artNr) === '1435433.000.000');
          const has5305 = (frame.bundle || []).some((x) => clean(x.artNr) === '1435435.000.000');
          if (cono && !has5315) F.fr5300MasIssue.push(`${tag}  Conoflat should use MAS 5315`);
          if (!cono && !has5305) F.fr5300MasIssue.push(`${tag}  should use MAS 5305`);
        }
      }
      // FR 5300 range fit: ≤90×90 / ≤120×120 / ≤150×180
      const bound = /bis\s*(\d+)\s*x\s*(\d+)/i.exec(fl);
      if (bound && td) {
        const [bl, bw] = [Math.max(+bound[1], +bound[2]), Math.min(+bound[1], +bound[2])];
        if (td[0] > bl || td[1] > bw) F.rangeMisfit.push(`${tag}  tray=${td.join('x')} > frame bound ${bl}x${bw} (${fa})`);
      }
    }

    if (sys === 'Ineo') {
      const hasSchall = (frame.bundle || []).some((x) => /schallschutz/i.test(x.label || ''));
      if (!hasSchall) F.ineoNoSchall.push(`${tag}  (${fa})`);
    }

    // dangling: frame part not in pool
    for (const o of frame.options || []) if (!poolSet.has(clean(o.artNr))) F.dangling.push(`${tag}  frame ${o.artNr} not in pool`);
  }
}

const show = (title, arr, max = 100) => {
  console.log(`\n${title}: ${arr.length}`);
  arr.slice(0, max).forEach((x) => console.log(`   ${x}`));
  if (arr.length > max) console.log(`   … +${arr.length - max} more`);
};

console.log('══════════ Duschenwanne BOM audit — ' + trays.length + ' products ══════════');
console.log('\n── A. INCOMPLETE (missing a required component) ──');
show('🔴 No siphon (Ablaufgarnitur)', F.noSiphon);
show('🔴 No sealing tape (Zargen-Wannendichtband)', F.noTape);
show('🔴 No mounting path at all (no carrier / frame / Stelzfüsse)', F.noMount);
show('🟠 Wannenträger missing its foam+Schallschutz bundle', F.carrierNoBundle);
show('🟠 Omnia frame missing the Fussset bundle', F.omniaNoFussset);
show('🟠 FR 5300 MAS mis-bundled (qty/variant)', F.fr5300MasIssue);
show('🟠 Ineo frame missing Schallschutz set', F.ineoNoSchall);

console.log('\n── B. MISMATCHED ──');
show('🔴 Frame system ≠ tray brand', F.frameBrandMismatch);
show('🔴 Omnia frame size ≠ tray size', F.omniaSizeMismatch);
show('🔴 Tray exceeds its frame size-range', F.rangeMisfit);

console.log('\n── C. DATA INTEGRITY ──');
show('🔴 Frame part referenced but missing from pool', F.dangling);

const totalIssues = Object.values(F).reduce((n, a) => n + a.length, 0);
const cleanTrays = trays.filter((t) =>
  grp(t, 'mat_montageset') ||
  (opt0(grp(t, 'mat_siphon')) && opt0(grp(t, 'mat_tape')) &&
    (grp(t, 'mat_carrier') || grp(t, 'mat_frame') || grp(t, 'mat_stelz')))
).length;
console.log(`\n══════════ ${totalIssues} issue(s) across the categories | ${cleanTrays}/${trays.length} trays pass the baseline (siphon+tape+mount) ══════════`);
