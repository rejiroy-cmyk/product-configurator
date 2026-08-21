const { rows, meta, img } = require('/tmp/cat-data.json');
const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const MUST = new Set(['3612 500','3612 272']);
const GROUP = (b) => {
  if (/^3612 40[234567]$/.test(b)) return 'element';
  if (b === '3461 110' || MUST.has(b)) return 'immer';
  if (b === '3612 420' || b === '3612 419') return 'wasser';
  if (/^3451 1(72|73)$/.test(b)) return 'rohbau';
  if (/^3451 /.test(b)) return 'steuerung';
  if (/^(3441|3431|3432|3421 24|8111|3471)/.test(b)) return 'ablauf';
  if (/^(8211|3962|3421 233)/.test(b)) return 'befestigung';
  if (/^(3482|2112 890)/.test(b)) return 'trennwand';
  return 'weiteres';
};
const GLABEL = { immer:'Immer dabei', wasser:'Wasseranschluss', steuerung:'Steuerung (Auswahl)',
  rohbau:'Rohbau-Set', ablauf:'Ablauf & Einlauf', befestigung:'Befestigung', trennwand:'Trennwand', weiteres:'Weiteres' };
const ORDER = ['immer','wasser','rohbau','steuerung','ablauf','befestigung','trennwand','weiteres'];
const chf = v => v==null ? '' : (Math.round(v*100)/100).toLocaleString('de-CH',{minimumFractionDigits:2});
const pic = (b, cls) => img[b] ? `<img class="${cls}" src="${img[b]}" alt="" loading="lazy">`
  : `<div class="${cls} noimg" aria-hidden="true"></div>`;
const bySeries = {};
for (const r of rows) (bySeries[r.series] = bySeries[r.series] || []).push(r);
let cards = '';
for (const series of Object.keys(bySeries).sort()) {
  const list = bySeries[series];
  const els = [...new Set(list.map(r=>r.el).filter(Boolean))];
  cards += `<section class="series"><header class="series-head"><h2>${esc(series)}</h2>
      <p class="series-meta">${list.length} Artikel${els.length>1 ? ` · <strong>${els.length} verschiedene Elemente</strong>` : ''}</p></header>`;
  for (const r of list) {
    const m = meta[r.our] || {};
    const groups = {};
    for (const b of r.parts) { const g = GROUP(b); (groups[g] = groups[g] || []).push(b); }
    if (groups.immer) groups.immer.sort((a,b)=> (MUST.has(b)?1:0)-(MUST.has(a)?1:0));
    const em = r.el ? (meta[r.el]||{}) : null;
    cards += `<article class="sheet${(r.removed.length||r.added.length)?' has-fix':''}">
      <div class="ident">${pic(r.our,'shot')}
        <div class="ident-txt"><p class="art">${esc(r.our)}</p>
          <h3>${esc(r.name)}</h3><p class="sub">${esc(r.sub)}</p>
          <dl class="facts"><dt>GTIN</dt><dd class="mono">${esc(r.gtin)}</dd>
          ${m.price!=null?`<dt>URP</dt><dd class="mono">${chf(m.price)}</dd>`:''}</dl>
          ${m.inCat===false?`<p class="warn">nicht in custom-data.json</p>`:''}
        </div></div>
      <div class="parts">
        ${r.el ? `<div class="element">${pic(r.el,'ethumb')}
          <div><p class="tag">Installationselement</p><p class="art accent">${esc(r.el)}</p>
          <p class="edesc">${esc((em.desc||em.label||'').slice(0,150))}</p></div>
          ${em.price!=null?`<p class="eprice mono">${chf(em.price)}</p>`:''}</div>`
        : `<div class="element none"><p class="tag">Wandmontage — ohne Element</p>
             <p class="edesc">Eigener Montagemodus mit eigener Teileliste: Dübelschraube und Spülrohr gehören hierher, die zwei Pflichtteile nicht. Liste noch nicht vollständig erhoben.</p></div>`}
        ${ORDER.filter(g=>groups[g]).map(g=>`<div class="grp ${g}">
            <p class="grp-label">${GLABEL[g]}<span class="cnt">${groups[g].length}</span></p>
            <ul class="chips">${groups[g].map(b=>{ const mm = meta[b]||{};
              return `<li class="${MUST.has(b)?'must':''}" title="${esc(mm.label||b)}">${pic(b,'chip')}<span class="mono">${esc(b)}</span></li>`;
            }).join('')}</ul></div>`).join('')}
        ${r.removed.length?`<p class="dropped"><span>entfernt</span>${r.removed.map(([b,why])=>
            `<span class="drop"><span class="mono">${esc(b)}</span> — ${esc(why)}</span>`).join('')}</p>`:''}
      </div></article>`;
  }
  cards += `</section>`;
}
const nEl = rows.filter(r=>r.el).length;
const elCount = {}; rows.forEach(r=>{ if(r.el) elCount[r.el]=(elCount[r.el]||0)+1; });
const nDrop = rows.reduce((n,r)=>n+r.removed.length,0);
const nAdd = rows.reduce((n,r)=>n+r.added.length,0);
const tally = (why) => rows.reduce((n,r)=>n+r.removed.filter(x=>x[1]===why).length,0);
const RULES = [
  { k:'muss', n:nAdd, t:'Pflichtteile',
    d:'Wer ein Element bekommt, bekommt zwingend <span class="mono">3612 500</span> Rückwandbefestigungssatz und <span class="mono">3612 272</span> Anschlussbogen. Bei SABAG fehlte der Anschlussbogen auf allen 113 konfigurierten Urinoirs.' },
  { k:'wand', n:tally('nur ohne Element nötig')+tally('Wandmontage-Teil, hier mit Element'), t:'Wandmontage-Teile',
    d:'<span class="mono">8211 112</span> Dübelschraube und <span class="mono">3432 115</span> Spülrohr gehören zur Montage <em>ohne</em> Element — mit Element hängt das Urinoir an dessen Gewindebolzen. Beide entfallen, sobald ein Element gesetzt ist.' },
  { k:'bundle', n:tally('im Element enthalten'), t:'Im Element enthalten',
    d:'<span class="mono">3451 172 / 173</span> Rohbau-Set entfällt, wenn der Elementtext schon „Rohbauset für Steuerung…“ führt — <span class="mono">3612 402</span> und <span class="mono">3612 403</span> tun das.' },
  { k:'komplett', n:tally('im Geberit-Urinoir enthalten'), t:'Geberit komplett',
    d:'<strong>Preda · Selva · Tamina</strong> sind Geberits eigene Urinoirs und kommen mit Sifon, Ablaufsieb, Befestigungsset und Schallschutz. Nur das Element wird gebraucht. Ihr leerer SAP-Zubehörsatz war das Signal, keine Datenlücke.' },
  { k:'shop', n:tally('unser Shop führt sie hier nicht'), t:'Gegen unseren Shop geprüft',
    d:'<span class="mono">3431 260</span> Einlaufgarnitur „zu Urinoir mit <em>Direktspülung</em>“ bietet SABAG bei 5 Urinoirs an; unser Profishop führt sie bei keinem davon. Dort gilt die Einlaufmanschette <span class="mono">3431 250</span>. Ablauf &amp; Einlauf ist die Gruppe, in der SABAG am meisten Ballast mitliefert.' },
];
const CSS = require('fs').readFileSync(__dirname + '/style.css','utf8');
process.stdout.write(`<title>Urinoir Montagekatalog</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<style>${CSS}</style>
<div class="wrap">
<header class="masthead">
  <p class="eyebrow">Sanitas Troesch · Abgleich SABAG</p>
  <h1>Urinoir Montagekatalog</h1>
  <p class="lede">Jedes Urinoir, das wir führen, mit dem passenden Geberit&nbsp;Duofix Installationselement und dem bereinigten Montagematerial — in unseren Artikelnummern und Preisen.</p>
  <p class="src">Zuordnung aus dem öffentlichen SABAG-Katalog (148 Urinoir-Seiten, Seiten 1–4; 113 mit Konfigurator), jede GTIN im eigenen Profishop aufgelöst. Darüber liegen Rejis Regeln: zwei Pflichtteile, drei Ausschlüsse.</p>
  <div class="stats">
    <div class="stat hero"><b>${rows.length}</b><span>Urinoirs</span></div>
    <div class="stat"><b>${nEl}</b><span>mit Element</span></div>
    <div class="stat gd"><b>${nAdd}</b><span>Pflichtteile ergänzt</span></div>
    <div class="stat fixed"><b>${nDrop}</b><span>Positionen entfernt</span></div>
    <div class="stat"><b>${Object.keys(bySeries).length}</b><span>Serien</span></div>
  </div>
  <div class="tally"><table>
      <thead><tr><th>Element</th><th>Urinoirs</th><th style="width:44%"></th><th>URP</th></tr></thead>
      <tbody>${Object.entries(elCount).sort((a,b)=>b[1]-a[1]).map(([b,c])=>`<tr>
        <td>${esc(b)}</td><td class="mono">${c}</td>
        <td><span class="bar" style="width:${Math.round(c/Math.max(...Object.values(elCount))*100)}%"></span></td>
        <td class="mono">${chf((meta[b]||{}).price)}</td></tr>`).join('')}</tbody>
  </table></div>
  <div class="rules">
    <p class="rules-h">Regelwerk — was von SABAGs Stand abweicht</p>
    <ol class="rulelist">${RULES.map(r=>`<li class="rule ${r.k}">
      <span class="rn mono">${r.n>0?(r.k==='muss'?'+':'−')+r.n:'0'}</span>
      <div><p class="rt">${r.t}</p><p class="rd">${r.d}</p></div></li>`).join('')}</ol>
    <p class="rules-f">Jede betroffene Position steht auf ihrem Blatt durchgestrichen mit Begründung — der Katalog bleibt damit als Abbild der Quelle lesbar.</p>
  </div>
</header>
${cards}
<footer>
  <p><strong>Pflichtteile.</strong> Wer ein Element bekommt, bekommt zwingend auch
  <span class="mono">3612 500</span> Rückwandbefestigungssatz und <span class="mono">3612 272</span>
  Anschlussbogen — dick umrandet. Bei SABAG stand nur <span class="mono">3612 500</span>; der
  Anschlussbogen fehlte auf allen 113 konfigurierten Urinoirs und wurde auf ${nAdd-48+46} Blättern ergänzt.
  Die 3 Urinoirs ohne Element bekommen entsprechend keines.</p>
  <p><strong>Vier Ausschlüsse</strong> (${nDrop} Positionen, je Blatt durchgestrichen):<br>
  · <span class="mono">3432 115</span> Spülrohr entfällt, sobald ein Element gesetzt ist — es gehört zur
  Wandmontage ohne Element. Alle 51 Blätter hier haben eines, also überall weg.<br>
  · <span class="mono">3451 172 / 173</span> Rohbau-Set entfällt, wenn das Element schon „Rohbauset für Steuerung…“ führt.<br>
  · <span class="mono">8211 112</span> Dübelschraube entfällt, sobald ein Element gesetzt ist — bleibt einzig bei Taro-Uni.<br>
  · <strong>Preda · Selva · Tamina</strong> sind Geberits eigene Urinoirs und kommen komplett — Sifon, Ablaufsieb,
  Befestigungsset und Schallschutz sind enthalten. Dort <em>nur</em> das Element plus die zwei Pflichtteile.
  Die Steuerung bleibt auf den Varianten mit Element <span class="mono">3612 407</span>, deren Keramik keine
  integrierte Steuerung hat — ein Rohbaurahmen ist keine Spülauslösung.</p>
  <p>Schraffierte Felder = Artikel ohne Bild in <span class="mono">custom-data.json</span>. Acht Urinoirs, die der Profishop kennt, fehlen dort ganz.</p>
</footer>
</div>`);
