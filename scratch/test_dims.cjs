
const norm = (v) => {
    if (!v) return null;
    if (v < 20) return v * 10;
    if (v >= 20 && v < 200) return v;
    if (v >= 400) return v;
    if (v >= 60 && v < 400) return v * 10;
    return v;
};

const parse3D = (label) => {
    if (!label) return { w: null, h: null, d: null };
    const m = label.match(/(\d{2,4})\s*[xX]\s*(\d{2,4})\s*(?:[xX]\s*([\d,]{1,5}))?/);
    if (!m) return { w: null, h: null, d: null };
    const rawW = parseFloat(m[1].replace(',', '.'));
    const rawH = parseFloat(m[2].replace(',', '.'));
    const rawD = m[3] ? parseFloat(m[3].replace(',', '.')) : null;
    return { w: norm(rawW), h: norm(rawH), d: norm(rawD), rawD };
};

console.log('Schmidlin 35:', parse3D('Duschwanne Schmidlin, 80 x 80 x 3,5 cm'));
console.log('Schmidlin 65:', parse3D('Duschwanne Schmidlin, 80 x 80 x 6,5 cm'));
console.log('Carrier 35:', parse3D('Duschenwannenträger Schedel, 800 x 800 x 35 mm'));
console.log('Carrier 65:', parse3D('Duschenwannenträger Schedel, 800 x 800 x 65 mm'));
