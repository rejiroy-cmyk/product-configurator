function bt(B,F,R,N={}){const m=N.isMixer||B.toLowerCase().includes("mischer")||B.toLowerCase().includes("armatur")
N.montageLabel1,N.montageLabel2,N.montageLabel3
const s=N.hideSizeForm||m,r=B.replace(/\s/g,"")
return{trays:[],mainImgUrl:R,selectedTray:null,extractSerie:function(e){if(e.serie)return e.serie
let t=e.label||""
e.manufacturer&&t.toLowerCase().startsWith(e.manufacturer.toLowerCase())&&(t=t.substring(e.manufacturer.length).trim())
const n=t.match(/^(.*?)(?:\s+\d+\s*[xX]\s*\d+|\s*,|\s*\(|\s+-| \d+)/)
let i=n&&n[1]?n[1].trim():t.trim()
const a=["Doppelwaschtisch","Möbelwaschtisch","Aufsatzwaschtisch","Waschtisch","Handwaschbecken","Einbaubecken","Wandbecken","Waschtischanlage","Aufsatzbecken","Waschbecken","Duschenwanne","Duschwanne","Badewanne","Duschfläche","Wanne"]
for(const l of a)if(i.toLowerCase().startsWith(l.toLowerCase())){i=i.substring(l.length).trim(),(i.startsWith("-")||i.startsWith("/"))&&(i=i.substring(1).trim()),e.manufacturer&&i.toLowerCase().startsWith(e.manufacturer.toLowerCase())&&(i=i.substring(e.manufacturer.length).trim())
break}return e.manufacturer&&i.toLowerCase().startsWith(e.manufacturer.toLowerCase())&&(i=i.substring(e.manufacturer.length).trim()),i||"Andere"},getUniqueValues:function(e){return e==="serie"?[...new Set(this.trays.map(t=>this.extractSerie(t)))].sort():[...new Set(this.trays.map(t=>t[e]))].sort()},classifyAccessory:function(e){if(!e)return"common"
if(e.overrideMontageart&&e.overrideMontageart!=="auto")return e.overrideMontageart.toLowerCase()
const t=(e.label||e.name||"").toLowerCase(),n=(e.artNr||"").replace(/\s/g,"")
if(n==="1445782.000.000"||n==="1441782.000.000")return"wannenträger"
if(n==="1431191.000.000"||n==="1431190.000.000"||n==="1435435.000.000")return"montagerahmen"
if(t.includes("schallschutzset")||t.includes("schallschutz"))return m?"unterputz":"montagerahmen"
const i=B.toLowerCase().includes("klosett")||B.toLowerCase().includes("wc")
if(m){const a=t.toLowerCase()
if(a.includes("standmodell")||a.includes("freien stand"))return"standmodell"
if(a.includes("einbaukörper")||a.includes("grundkörper")||a.includes("ibox")||a.includes("up-gehäuse"))return"common"
if(a.includes("endmontage")||a.includes("einbau")||a.includes("anschlussbogen")||a.includes("unterputz")||a.includes(" up "))return"unterputz"
if(a.includes("aufputz")||a.includes(" ap ")||a.includes("ausserhalb")||a.includes("mischer")||a.includes("batterie"))return"aufputz"}else if(i){const a=t.toLowerCase()
return a.includes("einbauspülkasten")||a.includes("einbauspulkasten")?"unterputz":"aufputz"}else{if(t.includes("träger")||t.includes("wannenträger")||t.includes("montageschaum"))return"wannenträger"
if(t.includes("rahmen")||t.includes("füsse")||t.includes("fussset")||t.includes("schallschutzset")||t.includes("schallschutz"))return"montagerahmen"
if(t.includes("stelzfüss")||t.includes("stelzfuss"))return"stelzfüsse"}return"common"},init:function(){this.isToiletApp=B.toLowerCase().includes("klosett")||B.toLowerCase().includes("wc"),this.selectedTray=null,this.currentMontageart="alle",this.currentManufacturer="all",this.currentSerie="all",this.currentForm="all",this.currentSize="all",this.renderSidebar(),this.bindFilters(),this.filterResults(),this.clearBOM()},renderSidebar:function(){const e=B.toLowerCase().includes("klosett")||B.toLowerCase().includes("wc")
console.log(`[Configurator] Rendering Sidebar for ${B}. isToiletApp: ${e}`),this.getUniqueValues("manufacturer"),this.getUniqueValues("form"),this.getUniqueValues("size")
const t=e?"Montage":"Form",n=e?"System":"Montageart"
Ae.innerHTML=`
                    <div class="sidebar-section">
                        <h2>Filter: ${B}</h2>
                        
                        <div class="filter-group">
                            <div class="finder-sub-header" id="head_rel_mfr_${r}">Hersteller</div>
                            <div class="pill-group" id="list_rel_mfr_${r}"></div>
                        </div>

                        <div class="filter-group">
                            <div class="finder-sub-header" id="head_rel_serie_${r}">Serie</div>
                            <div class="pill-group" id="list_rel_serie_${r}"></div>
                        </div>
                        
                        ${s?"":`
                        <div class="filter-group">
                            <div class="finder-sub-header" id="head_rel_form_${r}">${t}</div>
                            <div class="pill-group" id="list_rel_form_${r}"></div>
                        </div>
                        
                        <div class="filter-group">
                            <div class="finder-sub-header" id="head_rel_size_${r}">Grösse</div>
                            <div class="pill-group" id="list_rel_size_${r}"></div>
                        </div>
                        `}
                        
                        <div class="filter-group">
                            <div class="finder-sub-header" id="head_rel_montage_${r}">${n}</div>
                            <div class="pill-group" id="list_rel_montage_${r}"></div>
                        </div>

                        ${s||e?"":`
                        <div style="display:flex
 gap:1rem
 margin-top: 1rem
">
                            <div class="filter-group" style="flex:1
">
                                <label>Länge (cm)</label>
                                <input type="number" id="filterLength_${r}" class="filter-select" placeholder="z.B. 120" style="background:var(--bg-surface)
 color:var(--text-primary)
 border:1px solid var(--border)
" />
                            </div>
                            <div class="filter-group" style="flex:1
">
                                <label>Breite (cm)</label>
                                <input type="number" id="filterWidth_${r}" class="filter-select" placeholder="z.B. 80" style="background:var(--bg-surface)
 color:var(--text-primary)
 border:1px solid var(--border)
" />
                            </div>
                        </div>
                        `}
                    </div>
                    
                    <div class="sidebar-section">
                        <h2>Suchergebnisse <span id="resultCount_${r}" class="badge">0</span></h2>
                        <div class="search-results-container" id="searchResults_${r}"></div>
                    </div>

                    <div class="sidebar-section" id="trayConfigurator_${r}" style="display:none
 margin-top:2rem
">
                        <h2>Konfiguration</h2>
                        <p class="section-desc">Wählen Sie das passende Zubehör.</p>
                        <div id="trayConfiguratorInner_${B.replace(/\s/g,"")}"></div>
                    </div>
                `,this.updatePillFilters()},updatePillFilters:function(){const e=B.replace(/\s/g,""),t=document.getElementById(`list_rel_mfr_${e}`),n=document.getElementById(`list_rel_serie_${e}`),i=document.getElementById(`list_rel_form_${e}`),a=document.getElementById(`list_rel_size_${e}`),l=document.getElementById(`list_rel_montage_${e}`)
if(!t)return
const o=B.toLowerCase().includes("klosett")||B.toLowerCase().includes("wc"),y=m||o,M=o?"Montage":"Form",v=o?"System":"Montageart",S=y?"Aufputz":N.montageLabel1||"Wannenträger",_=y?"Unterputz":N.montageLabel2||"Montagerahmen",u=N.montageLabel3||"",x=this.getUniqueValues("manufacturer")
t.innerHTML=`<button class="pill-btn ${this.currentManufacturer==="all"?"active":""}" data-val="all">Alle</button>`+x.map(g=>`
                    <button class="pill-btn ${this.currentManufacturer===g?"active":""}" data-val="${g}">${g}</button>
                `).join(""),X(`head_rel_mfr_${e}`,`list_rel_mfr_${e}`,this.currentManufacturer,"Hersteller",()=>{this.currentManufacturer="all",this.currentSerie="all",this.currentForm="all",this.currentSize="all",this.updatePillFilters(),this.filterResults()}),t.querySelectorAll(".pill-btn").forEach(g=>g.addEventListener("click",()=>{this.currentManufacturer=g.dataset.val,this.updatePillFilters(),this.filterResults()}))
let A=this.trays
this.currentManufacturer!=="all"&&(A=A.filter(g=>g.manufacturer===this.currentManufacturer))
const H=[...new Set(A.map(g=>this.extractSerie(g)))].sort()
if(n.innerHTML=`<button class="pill-btn ${this.currentSerie==="all"?"active":""}" data-val="all">Alle</button>`+H.map(g=>`
                    <button class="pill-btn ${this.currentSerie===g?"active":""}" data-val="${g}">${g}</button>
                `).join(""),X(`head_rel_serie_${e}`,`list_rel_serie_${e}`,this.currentSerie,"Serie",()=>{this.currentSerie="all",this.currentSize="all",this.updatePillFilters(),this.filterResults()}),n.querySelectorAll(".pill-btn").forEach(g=>g.addEventListener("click",()=>{this.currentSerie=g.dataset.val,this.updatePillFilters(),this.filterResults()})),i){let g=A
this.currentSerie!=="all"&&(g=g.filter(d=>this.extractSerie(d)===this.currentSerie))
const c=[...new Set(g.map(d=>d.form))].filter(Boolean).sort()
i.innerHTML=`<button class="pill-btn ${this.currentForm==="all"?"active":""}" data-val="all">Alle</button>`+c.map(d=>`
                        <button class="pill-btn ${this.currentForm===d?"active":""}" data-val="${d}">${d}</button>
                    `).join(""),X(`head_rel_form_${e}`,`list_rel_form_${e}`,this.currentForm,M,()=>{this.currentForm="all",this.currentSize="all",this.updatePillFilters(),this.filterResults()}),i.querySelectorAll(".pill-btn").forEach(d=>d.addEventListener("click",()=>{this.currentForm=d.dataset.val,this.updatePillFilters(),this.filterResults()}))}if(a){let g=A
this.currentSerie!=="all"&&(g=g.filter(d=>this.extractSerie(d)===this.currentSerie)),this.currentForm!=="all"&&(g=g.filter(d=>d.form===this.currentForm))
const c=[...new Set(g.map(d=>d.size))].sort()
a.innerHTML=`<button class="pill-btn ${this.currentSize==="all"?"active":""}" data-val="all">Alle</button>`+c.map(d=>`
                        <button class="pill-btn ${this.currentSize===d?"active":""}" data-val="${d}">${d}</button>
                    `).join(""),X(`head_rel_size_${e}`,`list_rel_size_${e}`,this.currentSize,"Grösse",()=>{this.currentSize="all",this.updatePillFilters(),this.filterResults()}),a.querySelectorAll(".pill-btn").forEach(d=>d.addEventListener("click",()=>{this.currentSize=d.dataset.val,this.updatePillFilters(),this.filterResults()}))}const p=S.toLowerCase(),k=_.toLowerCase(),f=u?u.toLowerCase():""
l.innerHTML=`
                    <button class="pill-btn ${this.currentMontageart==="alle"?"active":""}" data-val="alle">Alle</button>
                    <button class="pill-btn ${this.currentMontageart===p?"active":""}" data-val="${p}">${S}</button>
                    <button class="pill-btn ${this.currentMontageart===k?"active":""}" data-val="${k}">${_}</button>
                    ${u?`<button class="pill-btn ${this.currentMontageart===f?"active":""}" data-val="${f}">${u}</button>`:""}
                `,X(`head_rel_montage_${e}`,`list_rel_montage_${e}`,this.currentMontageart,v,()=>{this.currentMontageart="alle",this.updatePillFilters(),this.filterResults()}),l.querySelectorAll(".pill-btn").forEach(g=>g.addEventListener("click",()=>{this.currentMontageart=g.dataset.val,this.updatePillFilters(),this.filterResults()})),s||this.updateManualInputs()},bindFilters:function(){if(!s){const e=document.getElementById(`filterLength_${r}`),t=document.getElementById(`filterWidth_${r}`),n=()=>{this.updateSizeDropdownFromManual(),this.filterResults()}
e&&e.addEventListener("input",n),t&&t.addEventListener("input",n)}},updateManualInputs:function(){const e=this.currentSize,t=document.getElementById(`filterLength_${r}`),n=document.getElementById(`filterWidth_${r}`)
if(!(!t||!n))if(e==="all")t.value="",n.value=""
else{const i=e.split(/[xX]/).map(a=>a.trim())
i.length===2&&(t.value=i[0],n.value=i[1])}},updateSizeDropdownFromManual:function(){const e=document.getElementById(`filterLength_${r}`),t=document.getElementById(`filterWidth_${r}`)
if(!e||!t)return
const n=e.value,i=t.value
if(n&&i){const a=`${n} x ${i}`,l=`${i} x ${n}`,o=this.trays.find(y=>y.size===a||y.size===l)
o?this.currentSize=o.size:this.currentSize="all"}else this.currentSize="all"
this.updatePillFilters()},filterResults:function(){var v,S
const e=this.currentManufacturer||"all",t=this.currentSerie||"all",n=this.currentForm||"all",i=this.currentSize||"all",a=((v=document.getElementById(`filterLength_${r}`))==null?void 0:v.value)||"",l=((S=document.getElementById(`filterWidth_${r}`))==null?void 0:S.value)||"",o=this.isToiletApp||B.toLowerCase().includes("klosett")||B.toLowerCase().includes("wc"),y=this.trays.filter(_=>{if(e!=="all"&&e!=="alle"&&_.manufacturer!==e||t!=="all"&&t!=="alle"&&this.extractSerie(_)!==t)return!1
if(!s){const u=n.toLowerCase(),x=(_.form||"").toLowerCase()
if(u!=="all"&&u!=="alle"&&!x.includes(u)&&!u.includes(x))return!1
if(i!=="all"&&i!=="alle"){if(_.size!==i)return!1}else if(!o&&(a||l)&&_.size&&_.size.includes("x")){const A=_.size.toLowerCase().split("x").map(H=>H.trim())
if(A.length===2){let[H,p]=A.map(c=>parseFloat(c)),k=parseFloat(a),f=parseFloat(l)
const g=c=>c<400?c*10:c
if(a&&l){if(!(g(H)==g(k)&&g(p)==g(f)||g(H)==g(f)&&g(p)==g(k)))return!1}else if(a){if(g(H)!=g(k)&&g(p)!=g(k))return!1}else if(l&&g(H)!=g(f)&&g(p)!=g(f))return!1}}}if(this.currentMontageart!=="alle"&&this.currentMontageart!=="all"){const u=this.classifyAccessory(_)
if(u!=="common"&&u!==this.currentMontageart)return!1}return!0})
console.log(`[Configurator] ${B} Filter Results: ${y.length} of ${this.trays.length} visible. (M:${e}, S:${t}, F:${n})`),document.getElementById(`resultCount_${r}`).textContent=y.length
const M=document.getElementById(`searchResults_${r}`)
if(M.innerHTML="",y.length===0){M.innerHTML='<div class="no-results">Keine Produkte gefunden. Bitte Filter anpassen.</div>'
return}y.forEach(_=>{const u=document.createElement("button")
u.className=`result-item-btn ${this.selectedTray&&this.selectedTray.id===_.id?"active":""}`,u.innerHTML=`
                        <div class="result-info">
                            <strong>${_.label}</strong>
                            <div class="result-meta">
                                <span>${_.manufacturer}</span> ${s?"":`| <span>${_.size}</span>`}
                            </div>
                        </div>
                        <span class="finish-artnr">${_.artNr}</span>
                    `,u.addEventListener("click",()=>this.selectTray(_.id)),M.appendChild(u)}),this.selectedTray&&(this.renderConfigurator(),this.updateBOM())},selectTray:function(e){if(this.selectedTray=this.trays.find(t=>t.id===e),this.currentMontageart==="alle"){const t=new Set
this.selectedTray.mountingMaterials&&this.selectedTray.mountingMaterials.forEach(n=>{const i=n.options&&n.options[0]
if(i){const a=this.classifyAccessory(i)
a!=="common"&&t.add(a)}}),t.has("wannenträger")?this.currentMontageart="wannenträger":t.size>0&&(this.currentMontageart=Array.from(t)[0]),this.updatePillFilters()}this.selectedTray.selections={},this.selectedTray.variants&&this.selectedTray.variants.length>0&&(this.selectedTray.selections.__variant__=this.selectedTray.artNr),this.selectedTray.mountingMaterials&&this.selectedTray.mountingMaterials.forEach((t,n)=>{t.options||(t={id:t.id||"mat_"+Math.random().toString(36).substr(2,5),name:t.label?t.label.split(" ")[0]:"Zubehör",options:[{artNr:t.artNr||"",label:t.label||"",type:t.type||"Zubehör"}]},this.selectedTray.mountingMaterials[n]=t),t.options.length>0&&(this.selectedTray.selections[t.id]=t.options[0].artNr)}),this.filterResults(),this.renderConfigurator(),this.updateBOM()},renderConfigurator:function(){const e=document.getElementById(`trayConfigurator_${r}`),t=document.getElementById(`trayConfiguratorInner_${r}`)
t.innerHTML=""
let n=!1
if(this.selectedTray&&this.selectedTray.variants&&this.selectedTray.variants.length>0){n=!0
const a=document.createElement("div")
a.className="filter-group",a.style.marginBottom="1.5rem"
const l=document.createElement("label")
l.textContent="Ausführung / Variante / Farbe"
const o=document.createElement("div")
o.className="finish-buttons-grid",o.style.marginTop="0.5rem"
const y=(v,S)=>{const _=document.createElement("button"),u=this.selectedTray.selections.__variant__===v
_.className=`finish-row-btn ${u?"active":""}`,_.style.width="100%",_.style.display="flex",_.style.alignItems="center"
const x=Be(v),A=ke(S,v)
return _.innerHTML=`
                            <div class="finish-swatch" style="position: relative
 overflow: hidden
 background-color: ${A}
 box-shadow: inset 0 1px 3px rgba(0,0,0,0.15)
 width: 28px
 height: 28px
 border-radius: 50%
 margin-right: 12px
 border: 1px solid rgba(0,0,0,0.2)
">
                                ${x?`<img src="${x}" style="position: absolute
 width: 100%
 height: 100%
 object-fit: cover
 background: #fff
 top: 0
 left: 0
" onerror="this.style.display='none'
">`:""}
                            </div>
                            <div style="flex:1
 text-align:left
">
                                <span style="display:block
 font-weight: 500
">${S}</span>
                                <span class="finish-artnr" style="margin-left: 0
">${v}</span>
                            </div>
                        `,_.addEventListener("click",H=>{this.selectedTray.selections.__variant__=v
const p=S.toLowerCase(),f=["schwarz","black","matt","chrom","weiss","white","gold","bronze","nickel","edelstahl","inox","pvd","messing","brushed","poliert","gebürstet","copper","kupfer"].filter(d=>p.includes(d)),g=v&&String(v).match(/\.(\d{3})(?:\.|$)/),c=g?g[1]:null
this.selectedTray.mountingMaterials.forEach(d=>{if(d.options&&d.options.length>1){let z=null,L=0
d.options.forEach(C=>{let K=0
if(c){const E=C.artNr&&String(C.artNr).match(/\.(\d{3})(?:\.|$)/)
E&&E[1]===c&&(K+=100)}const D=C.label.toLowerCase()
f.forEach(E=>{D.includes(E)&&K++}),K>L&&(L=K,z=C)})
const G=f.some(C=>!["chrom","weiss","white"].includes(C))||c&&!["000","100"].includes(c)
!z&&!G&&(z=d.options[0]),z&&(L>0||!G)&&(this.selectedTray.selections[d.id]=z.artNr)}}),this.updateBOM(),this.renderConfigurator()}),_},M=`Standard ${this.selectedTray.label.split(",").pop().trim()}`
o.appendChild(y(this.selectedTray.artNr,M)),this.selectedTray.variants.forEach(v=>{o.appendChild(y(v.artNr,v.label))}),a.appendChild(l),a.appendChild(o),t.appendChild(a)}if(this.selectedTray&&this.selectedTray.mountingMaterials&&this.selectedTray.mountingMaterials.length>0&&(n=!0),!n){e.style.display="none"
return}if(e.style.display="block",this.currentMontageart==="wannenträger"&&!this.selectedTray.mountingMaterials.some(l=>{var y
const o=(y=l.options)==null?void 0:y[0]
return o&&this.classifyAccessory(o)==="wannenträger"})){const l=document.createElement("div")
l.className="compatibility-warning",l.innerHTML=`
                            <div style="background: rgba(255, 152, 0, 0.1)
 border: 1px solid rgba(255, 152, 0, 0.3)
 color: #e65100
 padding: 1rem
 border-radius: 8px
 font-size: 0.9rem
 margin-bottom: 1.5rem
 display: flex
 align-items: start
 gap: 0.75rem
">
                                <span style="font-size: 1.2rem
">⚠️</span>
                                <div>
                                    <strong style="display: block
 margin-bottom: 0.25rem
">Kein Wannenträger verfügbar</strong>
                                    Für dieses Modell ist kein passender Wannenträger im System hinterlegt. Bitte nutzen Sie die Montageart <strong>Mit Wannenfüssen</strong>.
                                </div>
                            </div>
                        `,t.appendChild(l)}[...this.selectedTray.mountingMaterials].sort((a,l)=>{const o=y=>{const M=(y.name||"").toLowerCase()
return M.includes("sitz")||M.includes("deckel")||M.includes("überlauf")?2:M.includes("platte")||M.includes("betätigung")||M.includes("garnitur")||M.includes("siphon")?3:M.includes("zargen")||M.includes("dicht")?4:M.includes("manschette")||M.includes("träger")||M.includes("füsse")||M.includes("anker")?5:M.includes("schaum")||M.includes("kleber")?6:M.includes("schall")||M.includes("isolation")?7:99}
return o(a)-o(l)}).forEach(a=>{if(!a.options||a.options.length===0)return
const l=this.classifyAccessory(a.options[0])!=="common"?this.classifyAccessory(a.options[0]):this.classifyAccessory(a)
if(this.currentMontageart!=="alle"&&l!=="common"&&l!==this.currentMontageart)return
if(a.name.includes("Infinity Board (Add-on)")){const v=this.selectedTray.mountingMaterials.find(S=>S.name.includes("Füsse / Anker"))
if(v&&this.selectedTray.selections[v.id]!=="1111 905.000.000")return}const o=document.createElement("div")
o.className="filter-group"
const y=document.createElement("label")
y.textContent=a.name||"Zubehör"
const M=window.productApps&&window.productApps.zubehoer_pool?window.productApps.zubehoer_pool.trays:[]
if(a.options.length===1){const v=a.options[0],S=M.find(u=>u.artNr===v.artNr),_=S?S.label:v.label
o.innerHTML=`<label>${a.name}</label>
                            <div style="background:var(--bg-surface)
 padding:0.75rem
 border-radius:6px
 font-size:0.85rem
 color:var(--text-primary)
 border:1px solid var(--border)
">
                                <strong style="display:block
 margin-bottom:0.25rem
">${_}</strong>
                                <span style="color:var(--text-secondary)
 font-family:monospace
">${v.artNr}</span>
                            </div>`}else{const v=document.createElement("select")
v.className="filter-select",a.options.forEach(S=>{const _=M.find(A=>A.artNr===S.artNr),u=_?_.label:S.label,x=document.createElement("option")
x.value=S.artNr,x.textContent=S.dropdownLabel?S.dropdownLabel:`${u} (${S.artNr})`,this.selectedTray.selections[a.id]===S.artNr&&(x.selected=!0),v.appendChild(x)}),v.addEventListener("change",S=>{const _=S.target.value
if(this.selectedTray.selections[a.id]=_,B.toLowerCase().includes("wanne")||B.toLowerCase().includes("duschfläche")){const x=_==="1411 342.501.000"||_==="1411 342.100.000",A=_==="1411 322.501.000"||_==="1411 322.100.000",H=_==="1411 333.000.000"||_==="1411 334.000.000",p=_==="1411 311.000.000"||_==="1411 312.000.000"
if(x){const k=this.selectedTray.mountingMaterials.find(f=>f.name.includes("Ablaufgarnitur"))
if(k){const f=k.options.find(g=>g.artNr==="1411 333.000.000"||g.artNr==="1411 334.000.000")
f&&(this.selectedTray.selections[k.id]=f.artNr)}}else if(H){const k=this.selectedTray.mountingMaterials.find(f=>f.name.includes("Ab- und Überlaufset"))
if(k){const f=k.options.find(g=>g.artNr==="1411 342.501.000"||g.artNr==="1411 342.100.000")
f&&(this.selectedTray.selections[k.id]=f.artNr)}}else if(A){const k=this.selectedTray.mountingMaterials.find(f=>f.name.includes("Ablaufgarnitur"))
if(k){const f=k.options.find(g=>g.artNr==="1411 311.000.000"||g.artNr==="1411 312.000.000"||g.artNr==="1411 107.000.000")
f&&(this.selectedTray.selections[k.id]=f.artNr)}}else if(p){const k=this.selectedTray.mountingMaterials.find(f=>f.name.includes("Ab- und Überlaufset"))
if(k){const f=k.options.find(g=>g.artNr==="1411 322.501.000"||g.artNr==="1411 322.100.000")
f&&(this.selectedTray.selections[k.id]=f.artNr)}}}this.updateBOM(),this.renderConfigurator()}),o.appendChild(y),o.appendChild(v)}t.appendChild(o)})},clearBOM:function(){me.textContent="0 Artikel ausgewählt",re.innerHTML='<tr><td colspan="5" style="text-align: center
 color: #9da3ad
 padding: 2rem
">Bitte wählen Sie ein Produkt aus den Suchergebnissen.</td></tr>'},updateBOM:function(){if(!this.selectedTray)return
const e=this.selectedTray.mountingMaterials||[]
re.innerHTML=""
const t=[],n=B.toLowerCase(),i=n.includes("wandklosett"),a=n.includes("standklosett"),l=n.includes("wanne")||n.includes("duschfläche")
let o=this.selectedTray.artNr,y=this.selectedTray.label,M=this.selectedTray.menge||1
if(this.selectedTray.selections.__variant__&&this.selectedTray.selections.__variant__!==this.selectedTray.artNr){const p=(this.selectedTray.variants||[]).find(k=>k.artNr===this.selectedTray.selections.__variant__)
p&&(o=p.artNr,y=p.label,M=p.menge||1)}const v=o==="2111 845.100.000"||o==="3231 113.100.000",S=v?2:1
if(t.push({artNr:o,label:y,typ:B,menge:M,img:this.selectedTray.imgUrl||this.mainImgUrl,note:"Hauptartikel",priority:S}),a){const p=y.toLowerCase(),k=p.includes("einbauspülkasten")||p.includes("einbauspulkasten"),f=k?1:2
t[t.length-1].priority=f
const g=window.productApps&&window.productApps.zubehoer_pool?window.productApps.zubehoer_pool.trays:[]
e.forEach(c=>{const d=this.selectedTray.selections[c.id],z=(c.options||[]).find(b=>b.artNr===d)||c.options&&c.options[0]
if(!z)return
const L=this.classifyAccessory(z)!=="common"?this.classifyAccessory(z):this.classifyAccessory(c)
if(this.currentMontageart!=="alle"&&L!=="common"&&L!==this.currentMontageart)return
const G=g.find(b=>b.artNr===z.artNr),C=G?G.label:z.label,K=G&&G.imgUrl?G.imgUrl:z.imgUrl
C.toLowerCase()
const D=c.name.toLowerCase()
let E=99
const h=c.name||"Zubehör"
k?D==="wc-sitz"||D==="klosettsitz"?E=2:D==="betätigungsplatte"?E=3:D==="schallschutz"?E=4:D==="befestigungsschrauben"?E=5:D==="ablaufmanschette"?E=6:D==="duofix element"||z.artNr==="3612 348.000.000"?E=7:D==="rückwandbefestigungssatz"||z.artNr==="3612 500.000.000"?E=8:(D==="ablaufbogen"||z.artNr==="3612 374.000.000")&&(E=9):D==="spülkasten"?E=1:D==="wc-sitz"||D==="klosettsitz"?E=3:D==="schallschutz"?E=4:D==="befestigungsschrauben"?E=5:D==="ablaufanschluss"&&(E=6),t.push({artNr:z.artNr,label:C,typ:z.type||c.name||"Zubehör",menge:z.menge||1,img:K,note:h,priority:E})})}else l?e.forEach(p=>{const k=this.selectedTray.selections[p.id],f=(p.options||[]).find(h=>h.artNr===k)||p.options&&p.options[0]
if(!f)return
if(p.name.includes("Infinity Board (Add-on)")){const h=this.selectedTray.mountingMaterials.find(b=>b.name.includes("Füsse / Anker"))
if(h&&this.selectedTray.selections[h.id]!=="1111 905.000.000")return}const g=this.classifyAccessory(f)!=="common"?this.classifyAccessory(f):this.classifyAccessory(p)
if(this.currentMontageart!=="alle"&&g!=="common"&&g!==this.currentMontageart)return
const d=(window.productApps&&window.productApps.zubehoer_pool?window.productApps.zubehoer_pool.trays:[]).find(h=>h.artNr===f.artNr),z=d?d.label:f.label,L=d&&d.imgUrl?d.imgUrl:f.imgUrl,G=(z+" "+(f.type||p.name||"")).toLowerCase()
let C=99
const K=p.name||"Zubehör"
G.includes("deckel")||G.includes("überlauf")?C=2:G.includes("ablauf")||G.includes("siphon")||G.includes("garnitur")||G.includes("sifon")?C=3:G.includes("dichtband")||G.includes("wannenband")||G.includes("zargen")||G.includes("dichtset")?C=4:G.includes("träger")||G.includes("rahmen")||G.includes("wannenträger")||G.includes("montagerahmen")||G.includes("fuss")||G.includes("füsse")||G.includes("mittenabstütz")||G.includes("wannenanker")||G.includes("stütz")?C=5:G.includes("schaum")?C=6:G.includes("schall")||G.includes("isolation")?C=7:C=8
let D=f.menge!==void 0?f.menge:1
const E=(this.selectedTray.label||"").toLowerCase()
if(E.includes("calima")&&G.includes("stelz")){const h=E.match(/(\d{3,4})\s*x\s*(\d{3,4})/)
if(h){const b=Math.max(parseInt(h[1]),parseInt(h[2])),U=Math.min(parseInt(h[1]),parseInt(h[2]))
let W=16
U<=700?b<=1e3?W=12:b<=1300?W=15:b<=1600?W=18:W=21:b<=1e3?W=16:b<=1300?W=20:b<=1600?W=24:W=28,D=Math.ceil(W/4)}}t.push({artNr:f.artNr,label:z,typ:f.type||p.name||"Zubehör",menge:D,img:L,note:K,priority:C})}):e.forEach(p=>{const k=this.selectedTray.selections[p.id],f=(p.options||[]).find(h=>h.artNr===k)||p.options&&p.options[0]
if(!f)return
const g=this.classifyAccessory(f)!=="common"?this.classifyAccessory(f):this.classifyAccessory(p)
if(this.currentMontageart!=="alle"&&g!=="common"&&g!==this.currentMontageart)return
const d=(window.productApps&&window.productApps.zubehoer_pool?window.productApps.zubehoer_pool.trays:[]).find(h=>h.artNr===f.artNr),z=d?d.label:f.label,L=d&&d.imgUrl?d.imgUrl:f.imgUrl,G=z.toLowerCase(),C=(f.type||p.name||"").toLowerCase(),K=G+" "+C
let D=99,E=p.name||"Zubehör"
K.includes("sitz")||K.includes("deckel")?D=v?3:2:K.includes("platte")||K.includes("betätigung")?D=3:K.includes("schall")||K.includes("isolation")?D=v?5:4:K.includes("reservoir")||K.includes("spülkasten")||K.includes("ap128")||K.includes("ap116")?D=1:(K.includes("manschette")||K.includes("garnitur")||K.includes("ablaufanschluss")||f.artNr.includes("3241 116")||f.artNr.includes("3241 101")||f.artNr.includes("3241 102"))&&(D=5),t.push({artNr:f.artNr,label:z,typ:f.type||p.name||"Zubehör",menge:f.menge||1,img:L,note:E,priority:D})})
if(i){const p=y.toLowerCase(),k=window.productApps&&window.productApps.zubehoer_pool?window.productApps.zubehoer_pool.trays:[],f=g=>{const c=k.find(d=>d.artNr===g)
return c?{artNr:c.artNr,label:c.label,img:c.imgUrl}:null}
if(v){const g=f("8211 114.000.000")||{artNr:"8211 114.000.000",label:"Befestigungsschrauben"}
t.push({...g,typ:"Technik",menge:2,priority:4,note:"Aufputz-Technik"})}else{const g=p.includes("manschette")||p.includes("garnitur"),c=t.some(G=>G.priority===5)
if(!g&&!c){const G=f("3241 101.000.000")||{artNr:"3241 101.000.000",label:"Manschettengarnitur"}
t.push({...G,typ:"Technik",menge:1,priority:5,note:"Standard-Technik"})}const d=f("3612 348.000.000")||{artNr:"3612 348.000.000",label:"Wandklosettelement Geberit Duofix"}
t.push({...d,typ:"Technik",menge:1,priority:6,note:"Standard-Technik"})
const z=f("3612 500.000.000")||{artNr:"3612 500.000.000",label:"Rückwandbefestigungssatz Geberit Duofix"}
t.push({...z,typ:"Technik",menge:1,priority:7,note:"Standard-Technik"})
const L=f("3612 374.000.000")||{artNr:"3612 374.000.000",label:"Ablaufbogen Geberit- Silent"}
t.push({...L,typ:"Technik",menge:1,priority:8,note:"Standard-Technik"})}}const _=y.toLowerCase(),u=_.includes("pack")||/m\.\s*(klosett|wc-)?sitz/.test(_)||/inkl\.\s*(klosett|wc-)?sitz/.test(_)||/\bset\b/.test(_)&&!_.includes("schallschutz"),x=_.includes("inkl. schall")||_.includes("m. schall")||_.includes("schallschutz-set")||_.includes("schallschutzset")||_.includes("inkl. isolation")
let A=t.sort((p,k)=>p.priority-k.priority)
u&&(A=A.filter(p=>p.priority!==2)),x&&(A=A.filter(p=>p.priority!==4))
let H=0
A.forEach(p=>{const k=document.createElement("tr")
k.innerHTML=`
                        <td><div class="img-cell" ${p.img?"":'style="background: transparent
 border: 1px dashed var(--border)
"'}>
                            ${p.img?`<img src="${p.img}" alt="${p.label}">`:'<i class="ri-settings-3-line" style="font-size:1.2rem
opacity:0.3
"></i>'}
                        </div></td>
                        <td><span class="bom-code">${p.artNr}</span></td>
                        <td>
                            <div class="bom-desc">${p.label}</div>
                            <div style="font-size: 0.8rem
 color: #9e9e9e
 margin-top: 0.25rem
">${p.note}</div>
                        </td>
                        <td><span class="bom-type">${p.typ}</span></td>
                        <td><strong>${p.menge}</strong></td>
                    `,re.appendChild(k),H+=p.menge}),me.textContent=`${H} Artikel benötigt`},copyToClipboard:function(){if(!this.selectedTray){alert("Bitte wählen Sie zuerst ein Produkt aus.")
return}let e=[]
const t=document.getElementById("bomTableBody")
if(t)t.querySelectorAll("tr").forEach(a=>{const l=a.querySelector(".bom-code"),o=a.querySelector("strong")
if(l&&o){const y=l.textContent.replace(/\t/g,"").trim(),M=o.textContent.replace(/\t/g,"").trim()
e.push(`${y}	${M}`)}})
else{alert("Tabelle konnte nicht gefunden werden.")
return}const n=e.join(`
`)
navigator.clipboard.writeText(n).then(()=>{alert(`Artikel und Menge kopiert für SAP:

`+n.replace(/\t/g,"    "))}).catch(i=>alert("Kopieren fehlgeschlagen."))}}}