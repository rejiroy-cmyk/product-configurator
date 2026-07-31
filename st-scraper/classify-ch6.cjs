/**
 * classify-ch6.cjs — single source of truth for Ch6 destination classification.
 * classify(entry) -> one of: bademischer | duschenmischer | waschtischmischer | bidet
 *                            | pool_accessory | waschtrog | mounting | EXCLUDE | review
 * Reads maktx + description (full-text rule). Used by the gap analysis, variant scrape,
 * and injection so they never drift.
 */
'use strict';
const T = e => ((e.maktx || '') + ' ' + (e.description || '')).toLowerCase();

function classify(e) {
    if (!e || !e.maktx) return 'review';
    const t = T(e), m = (e.maktx || '').toLowerCase();
    if (/^(panzerschlauch|gartenventil|waschautomat|münzautomat|trinkbrunnen|flaschenfüll|geschirrwaschbrause|hundebrause|abfallsystem|kunststoffablage|kalkumwandler|ecc2|systemkabel|netzteil|fernbedienung|sensorbox|touchfree|bidirektionale|serviceschl|steckschl|servicebox|schuber|demontagehilfe|montagelehre|wasser|schlauchbeschw|smartspray|seifenschale)/.test(m) || t.includes('küchentechnik') || /spülmitteldispenser|spiegelkombination/.test(m)) return 'EXCLUDE';
    if (m.includes('showerpipe') || m.includes('shower pipe')) return (t.includes('bademischer') || t.includes('wanne')) ? 'bademischer' : 'duschenmischer';
    if (/^(duschsystem|duschpaneel|duschsäule|duschsteuerung|showerstation|duschbatterie)/.test(m)) return 'duschenmischer';
    if (/^(bidetmischer|bidetbatterie)/.test(m)) return 'bidet';
    if (/^(auslaufventil)/.test(m)) return 'waschtrog';
    if (/^(bademischer|badebatterie|wannenf|wanneneinlauf|wannenrand|wannenthermostat|wannen-|bade-|einbausockel)/.test(m)) return 'bademischer';
    if (/^(duschenmischer|duschmischer|thermostatmischer|brausethermostat)/.test(m)) return 'duschenmischer';
    if (/^thermostat/.test(m)) return (t.includes('brause') || t.includes('dusch')) ? 'duschenmischer' : 'waschtischmischer';
    if (/^(einlochmischer|einlochbatterie|einhandbatterie|einloch|spültischmischer|dreilochbatterie|zweilochbatterie|zweigriff|waschtischmischer|waschtischauslauf|waschtischsteuerung|standventil|selbstschluss-standventil|wandmischer|wandbatterie|wandsteuerung|wandarmatur|wandventil|zweigriffmischer)/.test(m)) return 'waschtischmischer';
    if (/^(regenbrause|regenpaneel|handbrause|stabhandbrause|wandbrause|duschkopf|doppelkopfbrause|kopfbrause|seitenbrause|schulterbrause|gelenkbrause|brausearm|brausenwandarm|brausekopf|brauseschlauch|brausenschlauch|metallbrauseschlauch|brausehalter|brausegarnitur|handbrausegarnitur|regulierventil|duschgleitstange|gleitstange|giessrohr)/.test(m)) return 'pool_accessory';
    if (/^(einbaukörper|einbauset|einbau|anschlussbogen|wandanschluss|reduktionsnippel|reduzierstück|abstellv|rosette|zierrosette|wandrosette|verlängerung|spindelverl|hahnenverl|montage|deckenanschluss|rohrunterbrecher|manschetten|dicht|abdichtung|s-anschl|anschluss|doppelnippel|kupplung|kupplungsnippel|schlauchnippel|nippel|verschraubung|klemmverschr|doppelklemm|schlauchverschr|bogenverschr|doppelmutter|mischdüse|verschlusszapfen|verschlusskappe|übergangsstück|schlauchrohr|schlauchklemme|schlauchkupplung|absperrventil|eckventil|batterieventil|doppelventil|seitenventil|unterputzventil|umstellventil|rückflussverhinderer|adapter|adapterplatte|klebeadapter|klebeset|grundkörper|grundset|griffeinsatz|dekorplatte|bedienblende|befestigungsset|portereinheit|fertigset|montageplatte|montageschiene|montagesystem|montagewinkel|montagefüsse|bodenplatte|dreiweg|zweiweg|umstellung|reduzier|strahlrohr|ventilkupplung|abzweigstück|schallschutz|schallisolierung|wandeinbaukasten|wandwinkel|wandanschlussbogen|geräteanschlussbogen|steckhalter|gelenkhalter|t-stück|oberteil|bedienungsgriff|mengenreguliergriff|sicherheit|schlauchbruch|schlauchverbinder|siphon|auslauf|ablaufschlauch|endmontageset|schnellkupplungsadapter|selbstschlussventil|schlauch|metallschlauch|wege-endmontageset|schlauchabdeckung|gehäusedämmbox|doppelkupplungsnippel|verschluss|griff|halter|kappe)/.test(m)) return 'mounting';
    return 'review';
}
const APP_DESTS = ['bademischer', 'duschenmischer', 'waschtischmischer', 'bidet'];  // main products (get variants)

// A "Bade- und Duschmischer" (bath AND shower) is one product usable in both apps.
const DUAL_RE = /bade[-\s]*(?:und|\/|&|\+)\s*dusch|dusch[-\s]*(?:und|\/|&|\+)\s*bade|wannen[-\s]*(?:und|\/|&|\+)\s*brause|brause[-\s]*(?:und|\/|&|\+)\s*wannen/i;
function isDual(e) { return !!e && DUAL_RE.test(((e.maktx || '') + ' ' + (e.description || ''))); }

// destinationsOf -> array of app destinations (usually one; two for dual bath+shower mixers).
function destinationsOf(e) {
    const d = classify(e);
    if (isDual(e) && (d === 'bademischer' || d === 'duschenmischer')) return ['bademischer', 'duschenmischer'];
    return [d];
}
module.exports = { classify, destinationsOf, isDual, APP_DESTS };
