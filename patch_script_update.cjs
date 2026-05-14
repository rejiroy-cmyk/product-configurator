const fs = require('fs');
let code = fs.readFileSync('scripts/patch-shower-data.cjs', 'utf8');

// We need to inject a strict keyword check at the beginning of the fullPool filter
const strictKeywordLogic = `
            if (cat.artNr) {
                const targetArtNrClean = cat.artNr.replace(/[^a-zA-Z0-9]/g, '');
                if (artNrClean === targetArtNrClean) return true;
                // If it's a specific artNr search, and it didn't match, we should return false, EXCEPT for Wannenträger overrides.
                // Actually, let's just let the Wannenträger overrides handle it later, or wait...
            }
            
            // STRICT KEYWORD GATING
            if (cat.keywords && cat.keywords.length > 0) {
                const hasKeyword = cat.keywords.some(k => lbl.includes(k));
                if (!hasKeyword) return false;
            }
`;

// Replace the old logic
code = code.replace(`
            if (cat.artNr) {
                const targetArtNrClean = cat.artNr.replace(/[^a-zA-Z0-9]/g, '');
                return artNrClean === targetArtNrClean;
            }
`, strictKeywordLogic);

// We also need to remove the redundant keyword checks later in the code
code = code.replace(`
            const hasKeyword = cat.keywords.some(k => lbl.includes(k));
            if (!hasKeyword) return false;
`, '');

// Remove the `else` block in size matching that does keywords since we do it at the top
code = code.replace(`} else {
                        const hasKeyword = cat.keywords.some(k => lbl.includes(k));
                        if (!hasKeyword) return false;
                    }`, '}');


fs.writeFileSync('scripts/patch-shower-data.cjs', code);
