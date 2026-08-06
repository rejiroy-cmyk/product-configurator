/**
 * Regenerates `assets/offline-fonts.css` — the self-contained replacement for the two
 * CDN <link>s that index.html used to carry (Google Fonts + jsdelivr RemixIcon).
 *
 *   node scripts/build-offline-assets.mjs
 *
 * Why this exists: dist/index.html is a single self-contained file, but it still reached
 * out to fonts.googleapis.com and cdn.jsdelivr.net at runtime. With no connection the UI
 * lost every icon (blank tofu boxes) and fell back to a system font. Everything is now
 * embedded as base64 data: URIs, so the build renders correctly with zero network.
 *
 * Two inputs, both versioned:
 *   - RemixIcon  -> node_modules/remixicon (devDependency, pinned in package.json)
 *   - Outfit/Inter -> fetched from Google Fonts at generation time
 *
 * The icon font is SUBSET to only the glyphs the app actually references — the full face
 * is ~2500 icons / 140 KB, the app uses ~56. Requires fonttools:
 *     pip3 install fonttools brotli
 *
 * Output is a generated artifact and IS checked in, so a normal `npm run build` needs
 * neither Python nor network. Re-run this only when you add an icon or change fonts;
 * `npm test` fails if a referenced icon is missing from the generated CSS.
 */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_CSS = path.join(ROOT, 'assets', 'offline-fonts.css');
const TMP = fs.mkdtempSync('/tmp/offline-fonts-');

// Weights the stylesheet actually asks for (500/600/700/800 appear explicitly, 400 is the
// implicit default). A variable font covering 300-800 is smaller than five static cuts.
const WEIGHT_RANGE = '300..800';
// Outfit only. index.css asks for "Outfit", "Inter", sans-serif — but Outfit covers Latin
// completely, so Inter is a fallback that never actually renders, and it cost 130 KB (more
// than everything else combined). The one place Inter was the *primary* face is the
// Offertanfrage print window, and that's a separate document.write() document which cannot
// see this stylesheet's @font-face rules anyway — it now uses a system stack instead.
const FAMILIES = ['Outfit'];

// Modern-browser UA, so Google Fonts serves woff2 rather than legacy formats.
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
           '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const log = (m) => console.log(`  ${m}`);

// ── 1. Which icons does the app actually use? ────────────────────────────────
// Scan source AND data: category icons live in modules/data.js, not just markup.
// There is no dynamic `'ri-' + name` construction in this codebase (verified), so a
// static scan is complete. If that ever changes, this subset will silently drop glyphs.
function collectUsedIcons() {
    const files = [];
    const walk = (dir) => {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
            if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
            const p = path.join(dir, e.name);
            if (e.isDirectory()) walk(p);
            else if (/\.(js|html|css|json)$/.test(e.name)) files.push(p);
        }
    };
    walk(path.join(ROOT, 'modules'));
    for (const f of ['index.html', 'index.css', 'app.js']) files.push(path.join(ROOT, f));

    const used = new Set();
    for (const f of files) {
        const txt = fs.readFileSync(f, 'utf8');
        for (const m of txt.matchAll(/\bri-[a-z0-9-]+/g)) used.add(m[0]);
    }
    return [...used].sort();
}

// ── 2. Map icon class -> codepoint using RemixIcon's own stylesheet ──────────
function mapCodepoints(used) {
    const cssPath = path.join(ROOT, 'node_modules', 'remixicon', 'fonts', 'remixicon.css');
    if (!fs.existsSync(cssPath)) {
        throw new Error('remixicon not installed. Run: npm install --save-dev remixicon');
    }
    const css = fs.readFileSync(cssPath, 'utf8');
    const table = new Map();
    for (const m of css.matchAll(/\.(ri-[a-z0-9-]+):before\s*\{\s*content:\s*"\\([0-9a-fA-F]+)"/g)) {
        table.set(m[1], m[2]);
    }
    const found = new Map();
    const missing = [];
    for (const name of used) {
        if (table.has(name)) found.set(name, table.get(name));
        else missing.push(name);
    }
    // A miss means the class renders as a blank box in the real UI — a genuine bug, not a
    // subsetting artifact. Fail loudly rather than silently shipping an invisible icon.
    if (missing.length) {
        throw new Error(
            `These icon classes do not exist in RemixIcon and would render blank:\n` +
            missing.map((m) => `    ${m}`).join('\n') +
            `\n  Fix the name at the usage site, then re-run.`
        );
    }
    return found;
}

// ── 3. Subset the icon font to just those glyphs ─────────────────────────────
function subsetIconFont(codepoints) {
    const src = path.join(ROOT, 'node_modules', 'remixicon', 'fonts', 'remixicon.woff2');
    const out = path.join(TMP, 'remixicon-subset.woff2');
    const unicodes = [...new Set(codepoints.values())].map((c) => `U+${c}`).join(',');
    try {
        execFileSync('pyftsubset', [
            src,
            `--output-file=${out}`,
            `--unicodes=${unicodes}`,
            '--flavor=woff2',
            '--layout-features=',
            '--no-hinting',
            '--desubroutinize',
        ], { stdio: 'pipe' });
    } catch (err) {
        throw new Error(
            'pyftsubset failed (is fonttools installed?).\n' +
            '  Install with:  pip3 install fonttools brotli\n' +
            `  Underlying error: ${err.stderr?.toString().trim() || err.message}`,
            { cause: err }
        );
    }
    return fs.readFileSync(out);
}

// ── 4. Fetch the text faces from Google Fonts ────────────────────────────────
// Only latin + latin-ext are kept: the UI is German, so the umlauts and ß are covered,
// and dropping cyrillic/greek/vietnamese saves the bulk of the bytes.
async function fetchGoogleFont(family) {
    const url = `https://fonts.googleapis.com/css2?family=${family}:wght@${WEIGHT_RANGE}&display=swap`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`Google Fonts returned ${res.status} for ${family}`);
    const css = await res.text();

    // Google labels each @font-face with a preceding /* subset */ comment. Matching the
    // comment and its block together keeps name<->block alignment guaranteed.
    const blocks = [...css.matchAll(/\/\*\s*([a-z-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g)];
    if (!blocks.length) throw new Error(`Could not parse any @font-face for ${family}`);

    const out = [];
    for (const [, subset, body] of blocks) {
        if (!['latin', 'latin-ext'].includes(subset)) continue;
        const src = /src:\s*url\((https:[^)]+\.woff2)\)/.exec(body)?.[1];
        const range = /unicode-range:\s*([^;]+);/.exec(body)?.[1]?.trim();
        if (!src) continue;
        const bytes = Buffer.from(await (await fetch(src)).arrayBuffer());
        out.push({ subset, range, bytes });
    }
    if (!out.length) throw new Error(`No latin subsets found for ${family}`);
    return out;
}

// ── 5. Emit the stylesheet ───────────────────────────────────────────────────
const b64 = (buf) => buf.toString('base64');
const face = (family, weightRange, bytes, range) => `@font-face {
  font-family: '${family}';
  font-style: normal;
  font-weight: ${weightRange};
  font-display: swap;
  src: url(data:font/woff2;charset=utf-8;base64,${b64(bytes)}) format('woff2');${
    range ? `\n  unicode-range: ${range};` : ''}
}`;

(async () => {
    console.log('Building offline font assets...');

    const used = collectUsedIcons();
    log(`icons referenced by the app: ${used.length}`);
    const codepoints = mapCodepoints(used);

    const iconBytes = subsetIconFont(codepoints);
    const fullSize = fs.statSync(path.join(ROOT, 'node_modules/remixicon/fonts/remixicon.woff2')).size;
    log(`remixicon subset: ${(iconBytes.length / 1024).toFixed(1)} KB ` +
        `(from ${(fullSize / 1024).toFixed(1)} KB full face)`);

    const textFaces = [];
    for (const fam of FAMILIES) {
        const faces = await fetchGoogleFont(fam);
        const kb = faces.reduce((n, f) => n + f.bytes.length, 0) / 1024;
        log(`${fam}: ${faces.length} subset(s), ${kb.toFixed(1)} KB`);
        textFaces.push({ fam, faces });
    }

    const iconRules = [...codepoints]
        .map(([name, cp]) => `.${name}:before { content: "\\${cp}"; }`)
        .join('\n');

    const css = `/* GENERATED by scripts/build-offline-assets.mjs — do not edit by hand.
 *
 * Replaces the Google Fonts + jsdelivr RemixIcon <link>s that index.html used to carry,
 * so the built single-file app renders correctly with no network at all. The icon font is
 * subset to the ${codepoints.size} glyphs this app actually uses.
 *
 * Re-generate after adding an icon:  node scripts/build-offline-assets.mjs
 */

${textFaces.map(({ fam, faces }) =>
    faces.map((f) => face(fam, WEIGHT_RANGE.replace('..', ' '), f.bytes, f.range)).join('\n\n')
).join('\n\n')}

${face('remixicon', 'normal', iconBytes, null)}

[class^="ri-"], [class*=" ri-"] {
  font-family: 'remixicon' !important;
  font-style: normal;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  display: inline-block;
  vertical-align: -0.125em;
}

${iconRules}
`;

    fs.mkdirSync(path.dirname(OUT_CSS), { recursive: true });
    fs.writeFileSync(OUT_CSS, css);
    log(`wrote ${path.relative(ROOT, OUT_CSS)} (${(css.length / 1024).toFixed(1)} KB)`);
    fs.rmSync(TMP, { recursive: true, force: true });
    console.log('Done.');
})().catch((err) => {
    console.error(`\nerror: ${err.message}\n`);
    process.exit(1);
});
