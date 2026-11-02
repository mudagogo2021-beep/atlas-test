// Generic atlas: everything is driven by data/datasets.json (see README).
(async function(){
const $=s=>document.querySelector(s), J=u=>fetch(u).then(r=>{if(!r.ok)throw new Error(u+' '+r.status);return r.json()});
const M=await J('data/datasets.json'), PAL=await J('palette.json').catch(()=>({}));
const NODATA=PAL.no_data||'#D9DBE0';
const map=L.map('map',{zoomSnap:0.5,worldCopyJump:true,preferCanvas:true}).setView([30,0],2);
const cache={}, norm=s=>String(s??'').normalize('NFKC').replace(/\s+/g,' ').trim().toLowerCase();
async function loadBase(id,iso){const b=M.bases[id];const k=id+(iso||'');if(cache[k])return cache[k];
  const url=b.tiled?b.pattern.replace('{iso3}',iso):b.file;let g=await J(url);
  if(url.endsWith('.topojson'))g=topojson.feature(g,g.objects[b.object||Object.keys(g.objects)[0]]);return cache[k]=g}
async function loadRows(f){if(cache[f])return cache[f];let r;
  if(f.endsWith('.csv')){const t=await fetch(f).then(r=>r.text());const[h,...ls]=t.trim().split(/\r?\n/).map(l=>l.split(','));r=ls.map(l=>Object.fromEntries(h.map((k,i)=>[k,isNaN(+l[i])||l[i]===''?l[i]:+l[i]])))}else r=await J(f);return cache[f]=r}
// background world
const world=await loadBase('world');L.geoJSON(world,{style:{color:'#fff',weight:.6,fillColor:'#EDEDEA',fillOpacity:1},interactive:false}).addTo(map);
// UI
const st=Object.fromEntries(new URLSearchParams(location.hash.slice(1)));
M.datasets.forEach(d=>$('#ds').add(new Option(d.title,d.id)));
let D,layer,overlays=[],pts,hidden=new Set();
$('#toggle').onclick=()=>document.body.classList.toggle('open');
$('#ds').onchange=()=>{hidden.clear();show($('#ds').value,{})};
$('#field').onchange=()=>{hidden.clear();render()};
function fmt(v){return v==null||v===''?'—':typeof v==='number'?(Math.abs(v)>=1000?v.toLocaleString():+v.toFixed(2)+''):Array.isArray(v)?v.join(', '):v}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function colorer(f,vals){
  if(f.type==='category'){const auto=['#2F6DB5','#D7263D','#2E9E4F','#F07F1A','#7B3FA0','#8B5A2B','#17A2A4','#E377C2','#B5B800','#555'];let i=0;const c={...(f.colors||{})};
    [...new Set(vals)].filter(v=>v!=null).forEach(v=>{if(!c[v])c[v]=auto[i++%auto.length]});return{fn:v=>v==null?NODATA:c[v],items:Object.keys(c).filter(k=>vals.includes(k)).map(k=>({key:k,label:k,color:c[k],n:vals.filter(x=>x===k).length}))}}
  const nums=vals.filter(v=>typeof v==='number').sort((a,b)=>a-b),sc=f.scale||['#eee','#888','#000'];let br=f.breaks;
  if(!Array.isArray(br)){br=[];for(let i=1;i<sc.length;i++)br.push(nums[Math.floor(i*nums.length/sc.length)]);br=[...new Set(br)]}
  const cls=v=>{let i=0;while(i<br.length&&v>=br[i])i++;return i};
  const items=sc.slice(0,br.length+1).map((c,i)=>({key:i,color:c,label:i===0?`< ${fmt(br[0])}`:i===br.length?`≥ ${fmt(br[i-1])}`:`${fmt(br[i-1])} – ${fmt(br[i])}`,n:nums.filter(v=>cls(v)===i).length}));
  return{fn:v=>typeof v==='number'?sc[cls(v)]:NODATA,items,cls}}
async function show(id,opt){
  D=M.datasets.find(d=>d.id===id)||M.datasets[0];$('#ds').value=D.id;$('#title').textContent=D.title;document.title=D.title+" · Muda's Atlas";document.body.classList.remove('home');
  $('#field').innerHTML='';D.fields.forEach(f=>$('#field').add(new Option(f.label,f.name)));if(opt.field)$('#field').value=opt.field;
  const rows=await loadRows(D.file);const base=await loadBase(D.base,D.country);
  D._rows=rows;D._base=base;const bk=M.bases[D.base];D._bk=bk;
  // filters (auto from manifest)
  const fb=$('#filters');fb.innerHTML='';const idx=indexRows(rows);
  for(const fl of (D.filters||[])){const vals=new Set();
    if(fl.from==='base')base.features.forEach(ft=>{if(idx.has(keyOf(ft.properties[bk.key])))vals.add(ft.properties[fl.field])});else rows.forEach(r=>vals.add(r[fl.field]));
    const s=document.createElement('select');s.dataset.f=fl.field;s.dataset.from=fl.from||'';if(!fl.noAll)s.add(new Option('All',''));
    [...vals].filter(v=>v!=null).sort((a,b)=>typeof a==='number'?b-a:String(a).localeCompare(b)).forEach(v=>s.add(new Option(v,v)));
    s.value=opt['f_'+fl.field]??(fl.default??'');if(s.selectedIndex<0)s.selectedIndex=0;s.onchange=render;
    const lb=document.createElement('label');lb.textContent=fl.label;lb.append(s);fb.append(lb)}
  // sources
  $('#sources').innerHTML=(D.notes?`<p>${esc(D.notes)}</p>`:'')+'<ul>'+(D.sources||[]).map(s=>`<li>${s.url?`<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a>`:esc(s.label)}</li>`).join('')+'</ul>';
  $('#credit').textContent=(D.sources||[]).slice(0,2).map(s=>s.label).join(' · ');
  overlays.forEach(o=>map.removeLayer(o));overlays=[];
  for(const oid of (D.overlays||[])){const od=M.datasets.find(d=>d.id===oid);if(!od)continue;const ob=await loadBase(od.base,od.country),orows=await loadRows(od.file),oi=new Map(orows.map(r=>[String(r[od.key]),r])),of=od.fields[0];const oc=colorer(of,orows.map(r=>r[of.name]));
    const outline=oid==='regions13_outline';
    overlays.push(L.geoJSON(ob,{style:ft=>outline?{color:'#111',weight:2,fill:false}:{color:'#fff',weight:.7,fillColor:oc.fn((oi.get(String(ft.properties[M.bases[od.base].key]))||{})[of.name]),fillOpacity:1},interactive:!outline,onEachFeature:(ft,l)=>!outline&&l.bindPopup(()=>popup(od,{...ft.properties,...oi.get(String(ft.properties[M.bases[od.base].key]))}))}).addTo(map))}
  if(D.view&&!opt.keepView)map.fitBounds(D.view);
  render()}
function keyOf(v){return D._bk.normalize?norm(v):String(v)}
function indexRows(rows){return new Map(rows.map(r=>[D._bk.normalize?norm(r[D.key]):String(r[D.key]),r]))}
function popup(d,p){const flag=d.flagField&&p[d.flagField]?`<img src="${esc(p[d.flagField])}" style="height:14px;border:1px solid #0002;vertical-align:middle"> `:'';
  return `<b>${flag}${esc(fmt(p.name??p[d.key]))}</b><table>`+(d.popup||[]).filter(k=>k!=='name').map(k=>{let v=p[k];const s=typeof v==='string'&&/^https?:/.test(v)?`<a href="${esc(v)}" target="_blank" rel="noopener">link</a>`:esc(fmt(v));return `<tr><td>${esc(k.replace(/_/g,' '))}</td><td>${s}</td></tr>`}).join('')+'</table>'}
function render(){
  const f=D.fields.find(x=>x.name===$('#field').value)||D.fields[0],bk=D._bk;
  const sel=[...document.querySelectorAll('#filters select')].map(s=>({f:s.dataset.f,base:!!s.dataset.from,v:s.value})).filter(s=>s.v!=='');
  const rows=D._rows.filter(r=>sel.every(s=>s.base||String(r[s.f])===s.v));const idx=indexRows(rows);
  const feats=D._base.features.map(ft=>({ft,r:idx.get(keyOf(ft.properties[bk.key]))})).filter(o=>o.r&&sel.every(s=>!s.base||String(o.ft.properties[s.f])===s.v));
  const C=colorer(f,feats.map(o=>o.r[f.name]));const hk=v=>f.type==='category'?v:(typeof v==='number'?C.cls(v):null);
  if(layer)map.removeLayer(layer);
  const drawn=new Set(feats.map(o=>o.ft));
  layer=L.geoJSON({type:'FeatureCollection',features:D._base.features},{style:ft=>{const o=feats.find?null:null;const r=drawn.has(ft)?idx.get(keyOf(ft.properties[bk.key])):null;const v=r?r[f.name]:null;const off=r&&hidden.has(hk(v));
      return{color:'#fff',weight:D.base==='world'?.6:.3,fillColor:r&&!off?C.fn(v):NODATA,fillOpacity:r&&!off?1:.55}},
    onEachFeature:(ft,l)=>l.bindPopup(()=>popup(D,{...ft.properties,...(idx.get(keyOf(ft.properties[bk.key]))||{})}))}).addTo(map);
  overlays.forEach(o=>o.bringToFront());
  if(pts)map.removeLayer(pts);pts=null;
  if(D.points)loadRows(D.points.file).then(P=>{const mx=Math.max(...P.map(p=>p[D.points.size]||1));pts=L.layerGroup(P.map(p=>L.circleMarker([p[D.points.lat],p[D.points.lon]],{radius:4+14*Math.sqrt((p[D.points.size]||1)/mx),color:'#3A1407',weight:1,fillColor:'#fff',fillOpacity:.8}).bindPopup(popup({popup:D.points.popup,key:D.points.label},p)))).addTo(map)});
  // legend
  const lg=$('#legend');lg.innerHTML=`<h3>${esc(f.label)}</h3>`;
  C.items.filter(i=>i.n>0||f.type!=='category').forEach(i=>{const d=document.createElement('div');d.className='row'+(hidden.has(i.key)?' off':'');
    d.innerHTML=`<span class="sw" style="background:${i.color}"></span><span>${esc(i.label)} <small>(${i.n})</small></span>`;d.onclick=()=>{hidden.has(i.key)?hidden.delete(i.key):hidden.add(i.key);render()};lg.append(d)});
  const nd=D._base.features.length-feats.length;lg.insertAdjacentHTML('beforeend',`<div class="row"><span class="sw" style="background:${NODATA}"></span><span>No data / filtered out <small>(${nd})</small></span></div><p style="font-size:11px;color:#5A6270">Tap a legend row to hide it. ${feats.length} areas shown.</p>`);
  const h=new URLSearchParams({ds:D.id,field:f.name});document.querySelectorAll('#filters select').forEach(s=>s.value&&h.set('f_'+s.dataset.f,s.value));history.replaceState(null,'','#'+h)}
// worldwide admin units, loaded per country on zoom
const admIdx=await J(M.bases.adm.index).catch(()=>({}));const admLayers={};const admGroup=L.layerGroup();
async function admRefresh(){if(!$('#admchk').checked||map.getZoom()<5){admGroup.clearLayers();Object.keys(admLayers).forEach(k=>delete admLayers[k]);return}
  const b=map.getBounds();for(const[iso,m] of Object.entries(admIdx)){const [x0,y0,x1,y1]=m.bbox;if(admLayers[iso]||!b.intersects([[y0,x0],[y1,x1]]))continue;admLayers[iso]=1;
    const g=await loadBase('adm',iso);admGroup.addLayer(L.geoJSON(g,{style:{color:'#3A1407',weight:.5,fill:false},interactive:false}))}}
$('#admchk').onchange=()=>{admGroup.addTo(map);admRefresh()};map.on('moveend',admRefresh);
window.atlasMap=map;
// scale bar (mi + km)
L.control.scale({position:'bottomleft',metric:true,imperial:true,maxWidth:130}).addTo(map);
// place search: local index of base units only (no geocoder)
const SRC=[['world'],['us_states'],['us_counties'],['adm1','MYS'],['adm','MYS'],['adm','SGP'],['adm1','IDN'],['adm','IDN'],['adm','FRA']];
const CN={MYS:'Malaysia',SGP:'Singapore',IDN:'Indonesia',FRA:'France'};let SI=null,hl=null;const seen=new Set();
function addIdx(id,iso,g){const k=id+(iso||'');if(seen.has(k))return;seen.add(k);const lv={world:'Country',us_states:'US state',us_counties:'US county',adm1:'Province / state'}[id]||'District';
  g.features.forEach(ft=>{const p=ft.properties,n=p.name;if(!n)return;let sub=id==='us_counties'?(p.state_name||p.state):id==='us_states'?'USA':iso?(CN[iso]||admIdx[iso]&&iso||iso):(p.continent||'');
    SI.push({n,q:norm(n),sub:lv+(sub?' · '+sub:''),id,iso,ft})})}
async function buildIdx(){if(SI)return;SI=[];await Promise.all(SRC.map(([id,iso])=>loadBase(id,iso).then(g=>addIdx(id,iso,g)).catch(()=>{})))}
function idxLoaded(){if(!SI)return;for(const iso of Object.keys(admLayers)){const g=cache['adm'+iso];if(g)addIdx('adm',iso,g)}}
const sb=$('#search'),si=$('#q'),sr=$('#qres');if(innerWidth<=760)sb.classList.remove('open');let hits=[],cur=-1;
$('#qbtn').onclick=()=>{sb.classList.toggle('open');if(sb.classList.contains('open')){si.focus();buildIdx()}};
si.onfocus=()=>buildIdx();
si.oninput=async()=>{await buildIdx();idxLoaded();const q=norm(si.value);cur=-1;if(q.length<2){sr.innerHTML='';hits=[];return}
  hits=SI.filter(e=>e.q.includes(q)).sort((a,b)=>(b.q.startsWith(q)-a.q.startsWith(q))||a.n.length-b.n.length).slice(0,8);
  sr.innerHTML=hits.length?hits.map((h,i)=>`<li data-i="${i}"><b>${esc(h.n)}</b><small>${esc(h.sub)}</small></li>`).join(''):'<li class="none">No matching place in the loaded maps</li>';
  sr.querySelectorAll('li[data-i]').forEach(li=>li.onmousedown=e=>{e.preventDefault();go(hits[+li.dataset.i])})};
si.onkeydown=e=>{const L_=sr.querySelectorAll('li[data-i]');if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();cur=(cur+(e.key==='ArrowDown'?1:-1)+L_.length)%L_.length;L_.forEach((l,i)=>l.classList.toggle('act',i===cur))}
  else if(e.key==='Enter'&&hits.length)go(hits[Math.max(cur,0)]);else if(e.key==='Escape'){sr.innerHTML='';si.blur()}};
function go(h){sr.innerHTML='';si.value=h.n;si.blur();if(window.innerWidth<=760)sb.classList.remove('open');document.body.classList.remove('open');
  if(hl)map.removeLayer(hl);hl=L.geoJSON(h.ft,{style:{color:'#F2A541',weight:3,fill:false},interactive:false}).addTo(map);
  map.fitBounds(hl.getBounds(),{maxZoom:h.id==='world'?6:10,padding:[30,30]});
  let tgt=null;if(layer&&D&&D.base===h.id&&(!D.country||D.country===h.iso))layer.eachLayer(l=>{if(!tgt&&l.feature&&l.feature.properties[D._bk.key]===h.ft.properties[D._bk.key]&&l.feature.properties.name===h.ft.properties.name)tgt=l});
  const c=hl.getBounds().getCenter();setTimeout(()=>{if(tgt)tgt.openPopup(c);else L.popup().setLatLng(c).setContent(`<b>${esc(h.n)}</b><br><small>${esc(h.sub)}</small><br><small style="color:#5A6270">Not part of the current map's data. Pick a map that covers it.</small>`).openOn(map)},350)}
map.on('click',()=>{sr.innerHTML=''});
// start screen: category tiles -> map cards, all from the manifest
const CI=M.categoryInfo||{},autoC=['#2F6DB5','#C8553D','#2E9E4F','#7B3FA0','#F07F1A','#17A2A4'];
const cats=[...new Set([...(M.categories||[]),...M.datasets.map(d=>d.category||'More maps')])].filter(c=>M.datasets.some(d=>(d.category||'More maps')===c));
const cinfo=(c,i)=>({icon:'🗺️',blurb:'',color:autoC[i%autoC.length],...(CI[c]||{})});
const icon=v=>v&&/\.(png|svg|jpe?g|webp)$/i.test(v)?`<img src="${esc(v)}" alt="">`:esc(v||'🗺️');
function home(cat){if(hl){map.removeLayer(hl);hl=null}document.body.classList.add('home');document.body.classList.remove('open');$('#title').textContent='';
  document.title=cat?cat+" · Muda's Atlas":"Muda's Atlas · What would you like to explore?";const box=$('#cards');$('#start').classList.toggle('incat',!!cat);
  if(!cat){box.innerHTML='<div class="cats">'+cats.map((c,i)=>{const k=cinfo(c,i),n=M.datasets.filter(d=>(d.category||'More maps')===c).length;
      return `<button class="cat" data-c="${esc(c)}" style="background:linear-gradient(135deg,${k.color},${k.color}cc 60%,#1E2430)"><span class="n">${n} map${n>1?'s':''}</span><span class="big">${icon(k.icon)}</span><b>${esc(c)}</b><small>${esc(k.blurb)}</small></button>`}).join('')+'</div>';
    box.querySelectorAll('.cat').forEach(b=>b.onclick=()=>{location.hash='cat='+encodeURIComponent(b.dataset.c)})}
  else{const i=cats.indexOf(cat),k=cinfo(cat,i);
    box.innerHTML=`<div class="crumb"><button id="backcats">← All categories</button><h3>${icon(k.icon)} ${esc(cat)}</h3></div><div class="cards">`+M.datasets.filter(d=>(d.category||'More maps')===cat).map(d=>
      `<button class="card" data-id="${esc(d.id)}" style="--c:${k.color}"><span class="ic">${icon(d.icon)}</span><span>${d.region?`<span class="rg">${esc(d.region)}</span>`:''}<b>${esc(d.title)}</b><small>${esc(d.blurb||'')}</small></span></button>`).join('')+'</div>';
    $('#backcats').onclick=()=>{location.hash=''};
    box.querySelectorAll('.card').forEach(b=>b.onclick=()=>{location.hash='ds='+b.dataset.id})}
  $('#start').scrollTop=0}
$('#homebtn').onclick=$('#explore').onclick=()=>{if(location.hash)location.hash='';else home()};
function route(){const s=Object.fromEntries(new URLSearchParams(location.hash.slice(1)));hidden.clear();
  if(s.ds&&M.datasets.some(d=>d.id===s.ds))return show(s.ds,s);home(s.cat&&cats.includes(s.cat)?s.cat:null)}
window.addEventListener('hashchange',route);
await route();
})().catch(e=>{document.body.insertAdjacentHTML('beforeend',`<pre style="position:fixed;top:60px;left:10px;background:#fff;color:#b00;z-index:9999">${e}</pre>`);console.error(e)});
