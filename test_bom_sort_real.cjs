const exactMatch = (words, combinedLbl) => words.some(w => new RegExp(`(^|\\s|-|\\/)${w}(\\s|-|\\/|$)`, 'i').test(combinedLbl));

const getPri = (label, matName) => {
    const combinedLbl = (label + ' ' + matName).toLowerCase();
    if (exactMatch(['deckel', 'ablaufabdeckung', 'ablaufdeckel'], combinedLbl) && !exactMatch(['ohne'], combinedLbl)) {
        return 2;
    } else if (exactMatch(['schallschutz', 'schallschutzset', 'isolation', 'schallband'], combinedLbl)) {
        return 8;
    } else if (exactMatch(['schaum', 'montageschaum', 'fuss', 'füsse', 'fussset', 'wannenfüsse', 'stelzfüsse', 'mittenabstütz', 'wannenanker', 'mittenabstützsystem', 'stütz'], combinedLbl)) {
        return 7;
    } else if (exactMatch(['träger', 'rahmen', 'wannenträger', 'montagerahmen'], combinedLbl)) {
        return 6;
    } else if (exactMatch(['montageset', 'dichtset', 'einbauset'], combinedLbl)) {
        return 5;
    } else if (exactMatch(['dichtband', 'wannenband', 'zargen', 'zargen-wannendichtband', 'zargenband'], combinedLbl)) {
        return 4;
    } else if (exactMatch(['ablauf', 'siphon', 'garnitur', 'sifon', 'ablaufgarnitur'], combinedLbl)) {
        return 3;
    }
    return 99;
}

const items = [
    { label: "ablaufdeckel geberit, zu duschwannenablauf ø 90 mm (1422 117),", name: "Ablaufdeckel", artNr: "1" },
    { label: "Duschwannenablauf Geberit 90 Ø Abgang Ø 56 mm direkt verschweissbar für Duschwannen mit Ablaufloch Ø 90 mm Ablaufleistung 0,65 l/s ohne Ablaufdeckel 1422 118", name: "Ablaufgarnitur", artNr: "2" },
    { label: "Montagerahmen", name: "Montagerahmen", artNr: "3" },
    { label: "Fussset Zubehör", name: "Fussset", artNr: "4" }
];

items.forEach(i => {
    i.priority = getPri(i.label, i.name);
    console.log(i.name, i.priority);
});
