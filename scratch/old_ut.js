function ut(B,F,R,N={}){const m=N.isBath||!1,s=B.replace(/\s/g,"")
return{trays:[],mainImgUrl:R,selectedTray:null,mischerOptionsState:{},currentHersteller:"all",currentMontage:"all",currentSerie:"all",init:function(){this.selectedTray=null,this.mischerOptionsState={},this.currentHersteller="all",this.currentMontage="all",this.currentSerie="all",this.renderSidebar(),this.bindFilters(),this.filterResults(),this.clearBOM()},normalizeDuschenmischerSerie:function(r,e=""){let t=String(r||"").toLowerCase().trim()
const n=String(e||"").toLowerCase()
return t=t.replace(/^[-\s/]+/,"").replace(/^-?\s*endmontageset\b/,"").replace(/^-?\s*fertigmontageset\b/,"").replace(/^[-\s/]+/,""),n&&t.startsWith(n)&&(t=t.slice(n.length).trim()),n&&(t=t.replace(new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}\\b`,"gi"),"").trim()),t=t.replace(/^[-\s/]+/,"").replace(/\babdeckplatte\b.*$/i,"").replace(/\bdurchflussleistung\b.*$/i,"").replace(/\bohne einbaukörper\b.*$/i,"").replace(/\benergieeffizienzklasse\b.*$/i,"").replace(/\bgeräuschgruppe\b.*$/i,"").replace(/\barmhebel\b.*$/i,"").replace(/\bselbstschliessend\b.*$/i,"").replace(/\btemperaturgriff\b.*$/i,"").replace(/^thermostat\s+/i,"").replace(/\s+½[\"”]?\s+thermostat\b.*$/i,"").replace(/\s+thermostat\b.*$/i,"").replace(/\bmit sicherheitstaste\b.*$/i,"").replace(/\b1-weg\b.*$/i,"").replace(/\s+½[\"”]?$/i,"").replace(/\bav\.0\b/g,"ava 2.0").replace(/\bvit\.0\b/g,"vita 2.0").replace(/\s*,\s*$/g,"").replace(/\s+/g," ").trim(),t?t.split(" ").map(i=>/^kwc$/i.test(i)?"KWC":/^\d/.test(i)?i:i.charAt(0).toUpperCase()+i.slice(1)).join(" "):"Andere"},extractSerie:function(r){if(r.serie)return this.normalizeDuschenmischerSerie(r.serie,r.manufacturer)
const e=["aufputz-duschenmischer","unterputz-duschenmischer","duschenmischer","duschmischer","aufputz-bademischer","unterputz-bademischer","bademischer","waschtischmischer","thermostatmischer","thermostat-duschenmischer","einhebelmischer","einlochmischer","mischer"]
let t=(r.label||"").toLowerCase()
if(r.manufacturer){const a=r.manufacturer.toLowerCase()
t.startsWith(a)&&(t=t.slice(a.length).trim())}for(const a of e)if(t.startsWith(a)){t=t.slice(a.length).trim()
break}if(t=t.replace(/-?endmontageset/g,"").trim(),t=t.replace(/-?fertigmontageset/g,"").trim(),r.manufacturer){const a=r.manufacturer.toLowerCase()
t.startsWith(a)&&(t=t.slice(a.length).trim())}const n=t.match(/^(.*?)(?:\s+\d+\s*[xX]\s*\d+|\s*,|\s*\(|\s+-|\s+\d+mm|\s+\d+\s*mm)/)
let i=n&&n[1]?n[1].trim():t.trim()
return this.normalizeDuschenmischerSerie(i,r.manufacturer)},extractMontage:function(r){const e=(r.label||"").toLowerCase()
return e.includes("unterputz")||e.includes(" up ")||e.includes("einbau")||e.includes("endmontageset")||e.includes("grundkörper")||e.includes("grundkoerper")?"Unterputz":e.includes("aufputz")||e.includes(" ap ")||e.includes("wandbatterie")||e.includes("wandmischer")||e.includes("ad 153 mm")||e.includes("aufputz-duschenmischer")||e.includes("thermostat-duschenmischer")?"Aufputz":m&&(e.includes("standmodell")||e.includes("freistehend"))?"Standmodell":"Aufputz"},getUniqueValues:function(r,e){const t=e||this.trays
if(r==="hersteller"){const n=this.trays.map(i=>i.manufacturer||"Andere")
return[...new Set(n)].filter(Boolean).sort()}return r==="montage"?[...new Set(t.map(n=>this.extractMontage(n)))].sort():r==="serie"?[...new Set(t.map(n=>this.extractSerie(n)))].sort():[]},renderSidebar:function(){const r=document.getElementById("configSidebar")
if(!r)return
const e=this.currentHersteller==="all"?this.trays:this.trays.filter(o=>o.manufacturer===this.currentHersteller),t=e.filter(o=>this.currentMontage==="all"?!0:this.extractMontage(o)===this.currentMontage),n=this.getUniqueValues("hersteller"),i=this.getUniqueValues("serie",t),a=this.getUniqueValues("montage",e)
r.innerHTML=`
                <div class="sidebar-section">
                    <h2 style="margin-bottom: 1.5rem
 display: flex
 align-items: center
 gap: 0.5rem
">
                        <i class="ri-filter-3-line" style="color: var(--accent)
"></i> Filter
                    </h2>

                    <div class="filter-group">
                        <label id="head_hersteller_${s}" class="filter-label">Hersteller</label>
                        <div class="pill-group" id="list_hersteller_${s}">
                            <button class="pill-btn ${this.currentHersteller==="all"?"active":""}" data-key="Hersteller" data-val="all">Alle</button>
                            ${n.map(o=>`<button class="pill-btn ${this.currentHersteller===o?"active":""}" data-key="Hersteller" data-val="${o}">${o}</button>`).join("")}
                        </div>
                    </div>

                    <div class="filter-group">
                        <label id="head_montage_${s}" class="filter-label">Montageart</label>
                        <div class="pill-group" id="list_montage_${s}">
                            <button class="pill-btn ${this.currentMontage==="all"?"active":""}" data-key="Montage" data-val="all">Alle</button>
                            ${a.map(o=>`<button class="pill-btn ${this.currentMontage===o?"active":""}" data-key="Montage" data-val="${o}">${o}</button>`).join("")}
                        </div>
                    </div>

                    <div class="filter-group">
                        <label id="head_serie_${s}" class="filter-label">Serie</label>
                        <div class="pill-group" id="list_serie_${s}">
                            <button class="pill-btn ${this.currentSerie==="all"?"active":""}" data-key="Serie" data-val="all">Alle</button>
                            ${i.map(o=>`<button class="pill-btn ${this.currentSerie===o?"active":""}" data-key="Serie" data-val="${o}">${o}</button>`).join("")}
                        </div>
                    </div>

                    <div class="filter-group" style="margin-top:1.5rem
 padding-top:1.5rem
 border-top: 1px solid var(--border)
">
                        <label class="filter-label">Suche</label>
                        <input type="text" id="input_search_${s}" class="filter-select" placeholder="Art.Nr. oder Name...">
                    </div>
                </div>
                
                <div class="sidebar-section">
                    <h2>Suchergebnisse <span id="resultCount_${s}" class="badge">0</span></h2>
                    <div class="search-results-container" id="searchResults_${s}"></div>
                </div>

                <div class="sidebar-section" id="trayConfigurator_${s}" style="display:none
 margin-top:2rem
">
                    <h2>Konfiguration</h2>
                    <p class="section-desc">Bestimmen Sie das benötigte Zubehör.</p>
                    <div id="trayConfiguratorInner_${s}"></div>
                </div>
            `,r.querySelectorAll(".pill-btn[data-key]").forEach(o=>{o.addEventListener("click",()=>{this.setFilter(o.dataset.key,o.dataset.val)})}),X(`head_hersteller_${s}`,`list_hersteller_${s}`,this.currentHersteller,"Hersteller",()=>this.setFilter("Hersteller","all")),X(`head_montage_${s}`,`list_montage_${s}`,this.currentMontage,"Montageart",()=>this.setFilter("Montage","all")),X(`head_serie_${s}`,`list_serie_${s}`,this.currentSerie,"Serie",()=>this.setFilter("Serie","all"))
const l=document.getElementById(`input_search_${s}`)
l&&l.addEventListener("input",()=>this.filterResults()),this.filterResults()},setFilter:function(r,e){this[`current${r}`]=e,this.renderSidebar()},bindFilters:function(){},filterResults:function(){var i
const r=document.getElementById(`searchResults_${s}`),e=document.getElementById(`resultCount_${s}`),t=(((i=document.getElementById(`input_search_${s}`))==null?void 0:i.value)||"").toLowerCase()
if(!r)return
let n=this.trays
if(this.currentHersteller!=="all"&&(n=n.filter(a=>a.manufacturer===this.currentHersteller)),this.currentSerie!=="all"&&(n=n.filter(a=>this.extractSerie(a)===this.currentSerie)),this.currentMontage!=="all"&&(n=n.filter(a=>this.extractMontage(a)===this.currentMontage)),t&&(n=n.filter(a=>(a.label||"").toLowerCase().includes(t)||(a.artNr||"").toLowerCase().includes(t))),e.textContent=n.length,n.length===0){r.innerHTML='<div style="padding:2rem
 text-align:center
 color:var(--text-secondary)
">Keine Produkte gefunden. Bitte passen Sie die Filter an.</div>'
return}r.innerHTML=n.map(a=>{const l=this.selectedTray&&this.selectedTray.id===a.id,o=a.imgUrl?`<img src="${a.imgUrl}" style="max-width:100%
 max-height:100%
 object-fit:contain
">`:'<div style="font-size:10px
 color:#bbb
">No Image</div>'
return`
                    <div class="result-item-btn ${l?"active":""}" data-tid="${a.id}" style="display:flex
 align-items:center
 gap:0.6rem
 padding:0.5rem
 margin-bottom:5px
 border-radius:8px
 min-height:54px
 overflow:hidden
 border:1px solid var(--border)
">
                        <div style="width:38px
 height:38px
 background:#fff
 border-radius:5px
 flex-shrink:0
 padding:2px
 display:flex
 align-items:center
 justify-content:center
 border:1px solid var(--border)
">
                           ${o}
                        </div>
                        <div class="result-info" style="flex:1
 text-align:left
 min-width:0
 line-height:1.2
">
                            <strong style="display:block
 font-size:0.85rem
 margin-bottom:1px
 white-space:nowrap
 overflow:hidden
 text-overflow:ellipsis
 color:var(--text-primary)
">${this.extractSerie(a)}</strong>
                            <div class="result-meta" style="font-size:0.7rem
 color:var(--text-secondary)
 white-space:nowrap
 overflow:hidden
 text-overflow:ellipsis
">
                                <span style="font-weight:600
 color:var(--accent)
">${a.artNr}</span> <span style="opacity:0.5
 margin:0 2px
">|</span> ${this.extractMontage(a)}
                            </div>
                        </div>
                        <i class="ri-checkbox-circle-fill" style="color:var(--accent)
 font-size:1.1rem
 flex-shrink:0
 ${l?"":"display:none
"}"></i>
                    </div>
                `}).join(""),r.querySelectorAll(".result-item-btn").forEach(a=>{a.addEventListener("click",()=>{this.selectItem(a.dataset.tid)})})},selectItem:function(r){this.selectedTray=this.trays.find(e=>e.id===r),this.mischerOptionsState={},this.selectedTray&&this.selectedTray.mountingMaterials&&this.selectedTray.mountingMaterials.forEach((e,t)=>{e.options&&e.options.length>0&&(this.mischerOptionsState[t]=0)}),this.filterResults(),this.renderConfigurator(),this.updateBOM()},isMatVisible:function(r,e){if(!this.selectedTray||!this.selectedTray.mountingMaterials)return!0
if((r.name||"").toLowerCase().includes("duschengleitstange")){const n=this.selectedTray.mountingMaterials.findIndex(i=>(i.name||"").toLowerCase().includes("brausehalter"))
if(n>=0){const i=this.mischerOptionsState[n]
if(i!==void 0){const a=this.selectedTray.mountingMaterials[n].options[i]
return!!(a&&a.label&&a.label.toLowerCase().startsWith("ohne"))}}}return!0},renderConfigurator:function(){const r=document.getElementById(`trayConfigurator_${s}`),e=document.getElementById(`trayConfiguratorInner_${s}`)
if(!this.selectedTray){r&&(r.style.display="none")
return}if(r&&(r.style.display="block"),!e)return
e.innerHTML=""
const t=this.selectedTray.mountingMaterials||[]
if(t.length===0){e.innerHTML='<p class="section-desc">Kein spezifisches Zubehör verfügbar.</p>'
return}t.forEach((n,i)=>{if(!this.isMatVisible(n,i))return
const a=document.createElement("div")
a.className="filter-group",a.style.marginBottom="1.25rem"
const l=this.mischerOptionsState[i],o=l!==void 0?n.options[l]:null,y=(o==null?void 0:o.imgUrl)||"",M=n.options.length>1
a.innerHTML=`
                    <label style="display:block
 margin-bottom:0.4rem
 font-size:0.85rem
 color:var(--text-secondary)
 text-transform:uppercase
 letter-spacing:0.5px
">${n.name||"Zubehör"}</label>
                    <div style="display:flex
 align-items:center
 gap:0.75rem
">
                        <div style="width:40px
 height:40px
 background:#fff
 border-radius:4px
 border:1px solid var(--border)
 display:flex
 align-items:center
 justify-content:center
 padding:2px
 flex-shrink:0
">
                            ${y?`<img src="${y}" style="max-width:100%
 max-height:100%
 object-fit:contain
">`:'<i class="ri-image-line" style="color:#ddd
"></i>'}
                        </div>
                        <div style="flex:1
 position:relative
">
                            <select class="filter-select mischer-acc-select" data-midx="${i}" style="width:100%
 padding-right:2rem
 ${M?"":"pointer-events:none
 background-image:none !important
"}">
                                ${n.options.map((v,S)=>`
                                    <option value="${S}" ${l==S?"selected":""}>${v.label} (${v.artNr})</option>
                                `).join("")}
                            </select>
                            ${M?'<i class="ri-arrow-down-s-line" style="position:absolute
 right:10px
 top:50%
 transform:translateY(-50%)
 pointer-events:none
 color:var(--text-secondary)
 font-size:1.2rem
"></i>':""}
                        </div>
                    </div>
                `,e.appendChild(a)}),e.querySelectorAll(".mischer-acc-select").forEach(n=>{n.addEventListener("change",i=>{const a=parseInt(n.dataset.midx),l=parseInt(n.value)
this.mischerOptionsState[a]=l,this.renderConfigurator(),this.updateBOM()})})},updateBOM:function(){const r=document.getElementById("bomTableBody"),e=document.getElementById("bomCount")
if(!r)return
if(r.innerHTML="",!this.selectedTray){e&&(e.textContent="0 Artikel")
return}let t=1
r.innerHTML+=`
                <tr class="bom-main-item">
                    <td><div class="img-cell"><img src="${this.selectedTray.imgUrl||""}"></div></td>
                    <td><span class="bom-code">${this.selectedTray.artNr}</span></td>
                    <td><div class="bom-desc">${this.selectedTray.label}</div></td>
                    <td><span class="bom-type">Hauptprodukt</span></td>
                    <td><strong>1</strong></td>
                </tr>
            `,this.selectedTray.mountingMaterials&&this.selectedTray.mountingMaterials.forEach((n,i)=>{if(!this.isMatVisible(n,i))return
const a=this.mischerOptionsState[i]
if(a!==void 0){const l=n.options[a]
if(l&&!l.label.toLowerCase().startsWith("ohne")){const o=l.menge||1
t+=o,r.innerHTML+=`
                                <tr>
                                    <td><div class="img-cell"><img src="${l.imgUrl||""}"></div></td>
                                    <td><span class="bom-code">${l.artNr}</span></td>
                                    <td><div class="bom-desc">${l.label}</div></td>
                                    <td><span class="bom-type">${n.name||"Zubehör"}</span></td>
                                    <td><strong>${o}</strong></td>
                                </tr>
                            `}}}),e&&(e.textContent=`${t} Artikel gewählt`)},clearBOM:function(){this.mischerOptionsState={},this.updateBOM()},copyToClipboard:function(){if(!this.selectedTray)return
let r=[`${this.selectedTray.artNr}	1`]
this.selectedTray.mountingMaterials&&this.selectedTray.mountingMaterials.forEach((e,t)=>{if(!this.isMatVisible(e,t))return
const n=this.mischerOptionsState[t]
if(n!==void 0){const i=e.options[n]
i&&!i.label.toLowerCase().startsWith("ohne")&&r.push(`${i.artNr}	${i.menge||1}`)}}),navigator.clipboard.writeText(r.join(`
`)).then(()=>alert("Stückliste kopiert!"))}}}