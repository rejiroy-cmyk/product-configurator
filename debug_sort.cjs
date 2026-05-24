const lblTrager = "Duschenwannenträger Alterna ecoplan, 900 x 900 x 65 mm, ecoplan/Duschplan, Schmidlin, Höhe 170 mm, zu Duschenwanne, erfüllt die Anforderungen gemäss der SIA- Norm 271/1";
const matTrager = "Wannenträger System";
const cbTrager = (lblTrager + ' ' + matTrager).toLowerCase();

const lblSiphon = "Duschwannenablauf Geberit 90 Ø Abgang Ø 56 mm direkt verschweissbar für Duschwannen mit Ablaufloch Ø 90 mm Ablaufleistung 0,65 l/s ohne Ablaufdeckel 1422 118";
const matSiphon = "Ablaufgarnitur";
const cbSiphon = (lblSiphon + ' ' + matSiphon).toLowerCase();

const exactMatch = (words, combinedLbl) => words.some(w => new RegExp(`(^|\\s|-|\\/)${w}(\\s|-|\\/|$)`, 'i').test(combinedLbl));

console.log("Träger match 'träger':", exactMatch(['träger'], cbTrager));
console.log("Träger match 'wannenträger':", exactMatch(['wannenträger'], cbTrager));
console.log("Siphon match 'garnitur':", exactMatch(['garnitur'], cbSiphon));
console.log("Siphon match 'ablaufgarnitur':", exactMatch(['ablaufgarnitur'], cbSiphon));

console.log("Träger matches Array:", exactMatch(['träger', 'rahmen', 'wannenträger', 'montagerahmen'], cbTrager));
console.log("Siphon matches Array:", exactMatch(['ablauf', 'siphon', 'garnitur', 'sifon', 'ablaufgarnitur'], cbSiphon));

// Wait! Does Siphon match Deckel?
console.log("Siphon match Deckel?:", exactMatch(['deckel', 'ablaufabdeckung', 'ablaufdeckel'], cbSiphon));
console.log("Siphon match ohne?:", exactMatch(['ohne'], cbSiphon));
