// Generic atlas: everything is driven by data/datasets.json (see README).
(async function(){
const V='20261109n', bust=u=>u+(String(u).includes('?')?'&':'?')+'v='+V;
const $=s=>document.querySelector(s), J=u=>fetch(bust(u)).then(r=>{if(!r.ok)throw new Error(u+' '+r.status);return r.json()});
const M=await J('data/datasets.json'), PAL=await J('palette.json').catch(()=>({})), POST=await J('data/posters.json').catch(()=>({posters:[]})), CTY=await J('data/country_flags.json').catch(()=>({}));
const posters=POST.posters||[];
const NODATA=PAL.no_data||'#D9DBE0';
const map=L.map('map',{zoomSnap:0.5,worldCopyJump:true,preferCanvas:true}).setView([30,0],2);
const cache={}, norm=s=>String(s??'').normalize('NFKC').replace(/\s+/g,' ').trim().toLowerCase();
async function loadBase(id,iso){const b=M.bases[id];const k=id+(iso||'');if(cache[k])return cache[k];
  const url=b.tiled?b.pattern.replace('{iso3}',iso):b.file;let g=await J(url);
  if(url.endsWith('.topojson'))g=topojson.feature(g,g.objects[b.object||Object.keys(g.objects)[0]]);return cache[k]=g}
async function loadRows(f){if(cache[f])return cache[f];let r;
  if(f.endsWith('.csv')){const t=await fetch(bust(f)).then(r=>r.text());const[h,...ls]=t.trim().split(/\r?\n/).map(l=>l.split(','));r=ls.map(l=>Object.fromEntries(h.map((k,i)=>[k,isNaN(+l[i])||l[i]===''?l[i]:+l[i]])))}else r=await J(f);return cache[f]=r}
// background world
const world=await loadBase('world');L.geoJSON(world,{style:{color:'#fff',weight:.6,fillColor:'#EDEDEA',fillOpacity:1},interactive:false}).addTo(map);
// UI
const st=Object.fromEntries(new URLSearchParams(location.hash.slice(1)));
M.datasets.filter(d=>!d.hidden).forEach(d=>$('#ds').add(new Option(d.title,d.id)));
let lastSel='',D,layer,overlays=[],outl=[],pts,hidden=new Set();
$('#toggle').onclick=()=>document.body.classList.toggle('open');
$('#ds').onchange=()=>{hidden.clear();show($('#ds').value,{})};
$('#field').onchange=()=>{hidden.clear();si&&(si.value='');syncCby();render();buildSlider();$('#flegt').textContent=$('#field').selectedOptions[0].text};
function choiceLabel(f){const i=f.label.indexOf(',');return (i>0?f.label.slice(0,i):f.label).trim()}
function syncCby(){const cby=$('#cby');if(!D||!D.showChoices||D.fields.length<2){cby.hidden=true;cby.innerHTML='';return}
  const cur=$('#field').value;cby.hidden=false;cby.innerHTML=`<span>Colour by</span>`+D.fields.map(f=>`<button type="button" data-field="${esc(f.name)}" class="${f.name===cur?'on':''}" aria-pressed="${f.name===cur}">${esc(choiceLabel(f))}</button>`).join('');
  cby.querySelectorAll('button').forEach(b=>b.onclick=()=>{if($('#field').value===b.dataset.field)return;$('#field').value=b.dataset.field;$('#field').onchange()})}
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
  document.body.classList.remove('poster'); const pv=$('#poster'); if(pv) pv.hidden=true;
  framedId=null; userHold=false;
  D=M.datasets.find(d=>d.id===id)||M.datasets[0];$('#ds').value=D.id;$('#title').textContent=D.title;document.title=D.title+" · Muda's Atlas";document.body.classList.remove('home');
  $('#field').innerHTML='';D.fields.forEach(f=>$('#field').add(new Option(f.label,f.name)));if(opt.field)$('#field').value=opt.field;
  const rows=await loadRows(D.file);const base=await loadBase(D.base,D.country);
  D._rows=rows;D._base=base;const bk=M.bases[D.base];D._bk=bk;
  // filters (auto from manifest)
  const fb=$('#filters');fb.innerHTML='';const idx=indexRows(rows);
  for(const fl of (D.filters||[])){const vals=new Set();
    if(fl.from==='lines')rows.forEach(r=>{vals.add(r[D.lines.from]);vals.add(r[D.lines.to])});else if(fl.from==='base')base.features.forEach(ft=>{if(idx.has(keyOf(ft.properties[bk.key])))vals.add(ft.properties[fl.field])});else rows.forEach(r=>vals.add(r[fl.field]));if(fl.cumulative){const ns=[...vals].filter(v=>v!=null).map(Number);for(let y=Math.min(...ns);y<=Math.max(...ns,fl.max||0);y++)vals.add(y)}
    const s=document.createElement('select');s.dataset.f=fl.field;s.dataset.from=fl.from||'';if(!fl.noAll)s.add(new Option('All',''));
    [...vals].filter(v=>v!=null).sort((a,b)=>typeof a==='number'?b-a:String(a).localeCompare(b)).forEach(v=>s.add(new Option(v,v)));
    s.value=opt['f_'+fl.field]??(fl.default??'');if(s.selectedIndex<0)s.selectedIndex=0;s.onchange=render;
    const lb=document.createElement('label');lb.textContent=fl.label;lb.append(s);fb.append(lb)}
  // sources
  $('#sources').innerHTML=(D.notes?`<p>${esc(D.notes)}</p>`:'')+'<ul>'+(D.sources||[]).map(s=>`<li>${s.url?`<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a>`:esc(s.label)}</li>`).join('')+'</ul>';
  $('#credit').textContent=(D.sources||[]).slice(0,2).map(s=>s.label).join(' · ');
  overlays.forEach(o=>map.removeLayer(o));overlays=[];outl.forEach(o=>{map.removeLayer(o.g);o.lb&&map.removeLayer(o.lb)});outl=[];$('#toggles').innerHTML='';
  for(const o of (D.outlines||[])){const g0=await loadBase(o.base,o.country);const ob={g:L.geoJSON(g0,{style:{fill:false,opacity:1,...o.style},interactive:false})};
    if(o.labelField)ob.lb=L.layerGroup(g0.features.filter(f=>f.properties[o.labelField]).map(f=>{const p=f.properties,ll=p.ly!=null?[p.ly,p.lx]:L.geoJSON(f).getBounds().getCenter();
      return L.marker(ll,{interactive:false,keyboard:false,icon:L.divIcon({className:'rlabel',html:`<span>${esc(p[o.labelField])}</span>`,iconSize:null})})}));
    const on=v=>{if(v){ob.g.addTo(map);ob.lb&&ob.lb.addTo(map)}else{map.removeLayer(ob.g);ob.lb&&map.removeLayer(ob.lb)}};
    const want=opt['o_'+o.base]!=null?opt['o_'+o.base]==='1':o.default!==false;on(want);ob.on=want;ob.base=o.base;outl.push(ob);
    if(o.toggle){const lb=document.createElement('label');lb.className='chk';lb.innerHTML=`<input type="checkbox"${want?' checked':''}> ${esc(o.label)}`;
      lb.firstChild.onchange=e=>{on(ob.on=e.target.checked);render()};$('#toggles').append(lb)}}
  for(const oid of (D.overlays||[])){const od=M.datasets.find(d=>d.id===oid);if(!od)continue;const ob=await loadBase(od.base,od.country),orows=await loadRows(od.file),oi=new Map(orows.map(r=>[String(r[od.key]),r])),of=od.fields[0];const oc=colorer(of,orows.map(r=>r[of.name]));
    const outline=oid==='regions13_outline';
    overlays.push(L.geoJSON(ob,{style:ft=>outline?{color:'#111',weight:2,fill:false}:{color:'#fff',weight:.7,fillColor:oc.fn((oi.get(String(ft.properties[M.bases[od.base].key]))||{})[of.name]),fillOpacity:1},interactive:!outline,onEachFeature:(ft,l)=>!outline&&oi.has(String(ft.properties[M.bases[od.base].key]))&&l.bindPopup(()=>popup(od,{...ft.properties,...oi.get(String(ft.properties[M.bases[od.base].key]))}))}).addTo(map));if(od.followMain){const ly=overlays[overlays.length-1];ly._od=od;ly._oi=oi;ly._oc=oc}}
  if(D.view&&!opt.keepView&&!(D.lines&&(D.lines.ends||D.lines.network)))map.fitBounds(D.view);
  syncCby();render();buildSlider();$('#flegt').textContent=(D.fields.find(x=>x.name===$('#field').value)||D.fields[0]).label;maybeHint()}
function keyOf(v){return D._bk.normalize?norm(v):String(v)}
function indexRows(rows){return new Map(rows.map(r=>[D._bk.normalize?norm(r[D.key]):String(r[D.key]),r]))}
function popup(d,p){const flag=d.flagField&&p[d.flagField]?`<img src="${esc(p[d.flagField])}" style="height:14px;border:1px solid #0002;vertical-align:middle"> `:'';
  return `<b>${flag}${esc(fmt(p.name??p[d.key]))}</b><table>`+(d.popup||[]).filter(k=>k!=='name').map(k=>{let v=p[k];const s=typeof v==='string'&&/^https?:/.test(v)?`<a href="${esc(v)}" target="_blank" rel="noopener">link</a>`:esc(fmt(v));return `<tr><td>${esc(k.replace(/_/g,' '))}</td><td>${s}</td></tr>`}).join('')+'</table>'}
function render(){hideCard(true);if(!D.lines)map.getContainer().classList.remove('darkmap');if(!D.lines||!D.lines.planes)Planes.set([]);
  if(D.lines)return renderLines();
  if(linesLayer){map.removeLayer(linesLayer);linesLayer=null}if(endLbl){map.removeLayer(endLbl);endLbl=null}
  const rd0=$('#rdist'); if(rd0){rd0.hidden=true;rd0.innerHTML=''}
  const f=D.fields.find(x=>x.name===$('#field').value)||D.fields[0],bk=D._bk;
  const sel=[...document.querySelectorAll('#filters select')].map(s=>({f:s.dataset.f,base:!!s.dataset.from,v:s.value})).filter(s=>s.v!=='');
  const FDc=Object.fromEntries((D.filters||[]).map(x=>[x.field,x]));const pass=r=>sel.every(s=>s.base||(FDc[s.f]&&FDc[s.f].cumulative===true?(f.noSlider?true:(r[s.f]!=null&&+r[s.f]<=+s.v)):String(r[s.f])===s.v));const rows=D._rows.filter(pass);const idx=indexRows(rows);const idxAll=indexRows(D._rows);
  const feats=D._base.features.map(ft=>({ft,r:idx.get(keyOf(ft.properties[bk.key]))})).filter(o=>o.r&&sel.every(s=>!s.base||String(o.ft.properties[s.f])===s.v));
  const C=colorer(f,feats.map(o=>o.r[f.name]));const hk=v=>f.type==='category'?v:(typeof v==='number'?C.cls(v):null);
  if(layer)map.removeLayer(layer);
  const drawn=new Set(feats.map(o=>o.ft));
  layer=L.geoJSON({type:'FeatureCollection',features:D._base.features},{style:ft=>{const o=feats.find?null:null;const r=drawn.has(ft)?idx.get(keyOf(ft.properties[bk.key])):null;const v=r?r[f.name]:null;const off=r&&hidden.has(hk(v));
      return{color:/adm/.test(D.base)?'#7A6F6A':'#fff',weight:D.base==='world'?.6:/adm/.test(D.base)?.5:.3,fillColor:r&&!off?C.fn(v):NODATA,fillOpacity:r&&!off?1:.55}},
    onEachFeature:(ft,l)=>{const P=()=>popup(D,{...ft.properties,...(idxAll.get(keyOf(ft.properties[bk.key]))||{})});l.bindPopup(P);
      l.on('mouseover',()=>{if(!matchMedia('(hover:hover)').matches)return;hov(l);if(!pinned)showCard(P(),false)});l.on('mouseout',()=>{unhov(l);if(!pinned)hideCard()})}}).addTo(map);
  overlays.forEach(o=>{if(o._oi){if(f.noSlider){map.hasLayer(o)&&map.removeLayer(o);return}if(!map.hasLayer(o))o.addTo(map);const k=M.bases[o._od.base].key;o.setStyle(ft=>{const r=o._oi.get(String(ft.properties[k]));if(!r)return{fillOpacity:0,opacity:.35,color:'#fff',weight:.4};const ok=pass(r)&&!hidden.has(r[f.name]);return{color:'#fff',weight:.4,fillColor:ok?o._oc.fn(r[f.name]):NODATA,fillOpacity:ok?1:.55,opacity:1}})}o.bringToFront()});outl.forEach(o=>o.on&&o.g.bringToFront());
  const sk=D.id+JSON.stringify(sel),zf=sk!==lastSel;lastSel=sk;
  if(zf&&sel.length&&D.zoomOnFilter!==false&&feats.length&&feats.length<D._base.features.length*0.5)map.fitBounds(L.geoJSON({type:'FeatureCollection',features:feats.map(o=>o.ft)}).getBounds(),{padding:[20,20],maxZoom:9});
  if(pts)map.removeLayer(pts);pts=null;
  if(D.points)loadRows(D.points.file).then(P=>{const mx=Math.max(...P.map(p=>p[D.points.size]||1));pts=L.layerGroup(P.map(p=>L.circleMarker([p[D.points.lat],p[D.points.lon]],{radius:4+14*Math.sqrt((p[D.points.size]||1)/mx),color:'#3A1407',weight:1,fillColor:'#fff',fillOpacity:.8}).bindPopup(popup({popup:D.points.popup,key:D.points.label},p)))).addTo(map)});
  // legend
  const lg=$('#legend');lg.innerHTML=`<h3>${esc(f.label)}</h3>`;
  C.items.filter(i=>i.n>0||f.type!=='category').forEach(i=>{const d=document.createElement('div');d.className='row'+(hidden.has(i.key)?' off':'');
    d.innerHTML=`<span class="sw" style="background:${i.color}"></span><span>${esc(i.label)} <small>(${i.n})</small></span>`;d.onclick=()=>{hidden.has(i.key)?hidden.delete(i.key):hidden.add(i.key);render()};lg.append(d)});
  const nd=D._base.features.length-feats.length;lg.insertAdjacentHTML('beforeend',`<div class="row"><span class="sw" style="background:${NODATA}"></span><span>No data / filtered out <small>(${nd})</small></span></div><p style="font-size:11px;color:#5A6270">Tap a legend row to hide it. ${feats.length} areas shown.</p>`);
  const h=new URLSearchParams({ds:D.id,field:f.name});document.querySelectorAll('#filters select').forEach(s=>s.value&&h.set('f_'+s.dataset.f,s.value));outl.forEach(o=>h.set('o_'+o.base,o.on?'1':'0'));history.replaceState(null,'','#'+h)}

// generic origin–destination lines layer (manifest "lines": {airports, from, to, size})
function gcPts(a,b,n=64){const R=Math.PI/180,[p1,l1,p2,l2]=[a[0]*R,a[1]*R,b[0]*R,b[1]*R];const d=2*Math.asin(Math.sqrt(Math.sin((p2-p1)/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin((l2-l1)/2)**2));if(!d)return[a,b];const o=[];let prev=null;
  for(let i=0;i<=n;i++){const f=i/n,A=Math.sin((1-f)*d)/Math.sin(d),B=Math.sin(f*d)/Math.sin(d),x=A*Math.cos(p1)*Math.cos(l1)+B*Math.cos(p2)*Math.cos(l2),y=A*Math.cos(p1)*Math.sin(l1)+B*Math.cos(p2)*Math.sin(l2),z=A*Math.sin(p1)+B*Math.sin(p2);
    let lon=Math.atan2(y,x)/R;if(prev!=null){while(lon-prev>180)lon-=360;while(lon-prev<-180)lon+=360}prev=lon;o.push([Math.atan2(z,Math.sqrt(x*x+y*y))/R,lon])}return o}

// animated planes along great circles (manifest lines.planes: {perRoute, capDesktop, capPhone})
const P_DUR=1;const Planes=(()=>{let routes=[],pl=[],cv=null,raf=0;const red=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function ensure(){if(cv)return;cv=document.createElement('canvas');cv.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:450';map.getContainer().appendChild(cv)}
  function size(){const c=map.getContainer();cv.width=c.clientWidth*devicePixelRatio;cv.height=c.clientHeight*devicePixelRatio;cv.style.width=c.clientWidth+'px';cv.style.height=c.clientHeight+'px'}
  function set(R){routes=R;if(!R.length||red){pl=[];if(cv){cv.getContext('2d').clearRect(0,0,cv.width,cv.height)}cancelAnimationFrame(raf);raf=0;return}
    ensure();size();const P=D.lines.planes,cap=innerWidth<=760?(P.capPhone||300):(P.capDesktop||1500);
    pl=R.filter(g=>g&&g.length>1).slice(0,cap).map(g=>({g,t:0}));
    if(!raf){let last=performance.now();const loop=now=>{const dt=Math.max(0,Math.min(.1,(now-last)/1000));last=now;draw(dt);raf=pl.length?requestAnimationFrame(loop):0};raf=requestAnimationFrame(loop)}}
  function draw(dt){const x=cv.getContext('2d'),k=devicePixelRatio;x.setTransform(k,0,0,k,0,0);x.clearRect(0,0,cv.width,cv.height);x.fillStyle='#FFD21F';x.strokeStyle='#0F1420';x.lineWidth=.7;
    for(const p of pl){p.t+=dt/(P_DUR||1);if(p.t>=1){p.done=1;continue}const g=p.g;if(!g||g.length<2){p.done=1;continue}const f=p.t*(g.length-1),i=Math.max(0,Math.min(g.length-2,Math.floor(f))),u=f-i;
      const a=g[i],b=g[i+1],pt=map.latLngToContainerPoint([a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u]),pb=map.latLngToContainerPoint(b),pa=map.latLngToContainerPoint(a);
      const ang=Math.atan2(pb.y-pa.y,pb.x-pa.x);x.save();x.translate(pt.x,pt.y);x.rotate(ang);x.beginPath();
      x.moveTo(6,0);x.lineTo(1,-1.2);x.lineTo(-1,-5.5);x.lineTo(-2.5,-5.5);x.lineTo(-1.5,-1.2);x.lineTo(-4.5,-1.2);x.lineTo(-6,-3);x.lineTo(-6.8,-3);x.lineTo(-6,0);
      x.lineTo(-6.8,3);x.lineTo(-6,3);x.lineTo(-4.5,1.2);x.lineTo(-1.5,1.2);x.lineTo(-2.5,5.5);x.lineTo(-1,5.5);x.lineTo(1,1.2);x.closePath();x.fill();x.stroke();x.restore()}pl=pl.filter(p=>!p.done)}
  addEventListener('resize',()=>cv&&size());return{set,count:()=>pl.length}})();window.__planes=Planes;
let linesLayer=null,endLbl=null,linePickId=null,framedId=null,userHold=false,fitting=0;
async function renderLines(){const Lc=D.lines,f=D.fields.find(x=>x.name===$('#field').value)||D.fields[0];
  const sel=[...document.querySelectorAll('#filters select')].map(s=>({f:s.dataset.f,v:s.value})).filter(s=>s.v!=='');
  const AP=new Map((await loadRows(Lc.airports)).map(a=>[a[Lc.code||'iata'],a]));
  const FD=Object.fromEntries((D.filters||[]).map(x=>[x.field,x]));const rows=D._rows.filter(r=>sel.every(s=>s.f==='airport'?(r[Lc.from]===s.v||r[Lc.to]===s.v):FD[s.f]&&FD[s.f].cumulative?(+r[s.f]<=+s.v&&(FD[s.f].history||!(r[FD[s.f].cumulative]!=null&&+r[FD[s.f].cumulative]<=+s.v))):String(r[s.f])===s.v));
  const C=colorer(f,rows.map(r=>r[f.name]));const vis=rows.filter(r=>!hidden.has(r[f.name]));
  if(layer)map.removeLayer(layer);const dk=!!Lc.dark;map.getContainer().classList.toggle('darkmap',dk);layer=L.geoJSON(D._base,{style:dk?{color:'#3A4356',weight:.6,fillColor:'#232A3A',fillOpacity:1}:{color:'#fff',weight:.6,fillColor:'#E4E6EA',fillOpacity:1},interactive:false}).addTo(map);
  if(linesLayer)map.removeLayer(linesLayer);if(endLbl){map.removeLayer(endLbl);endLbl=null}if(pts)map.removeLayer(pts);pts=null;linesLayer=L.layerGroup().addTo(map);const big=vis.length>2000,rend=big?(window.__lr=window.__lr||L.canvas({padding:.3})):undefined;
  const dep={},by={};const PR=[];
  const hf=(D.filters||[]).find(x=>x.history),hv=hf&&sel.find(x=>x.f===hf.field);
  const isOld=r=>!!(hv&&r[hf.cumulative]!=null&&+r[hf.cumulative]<=+hv.v);
  linePickId=null;
  for(const r of vis){const a=AP.get(r[Lc.from]),b=AP.get(r[Lc.to]);if(!a||!b)continue;
    for(const c of[r[Lc.from],r[Lc.to]]){dep[c]=(dep[c]||0)+(+r[Lc.size]||0);(by[c]=by[c]||[]).push(r)}
    const g=gcPts([a.lat,a.lon],[b.lat,b.lon],big?12:64);const col=C.fn(r[f.name]);{const ys=sel.find(x=>x.f==='year');if(!ys||String(r.year)===ys.v)PR.push(g)}
    const thin=!!Lc.network;
    for(const sh of(big?[0]:[-360,0,360])){const old=isOld(r);const w=thin?0.7:(old?1.2:(big?.7:(hv?4:2.2)));const op=thin?(big?(Lc.dark?.22:.35):(Lc.dark?.95:.85)):(old?.35:(big?(Lc.dark?.22:.35):(hv?1:.75)));const ln=L.polyline(g.map(p=>[p[0],p[1]+sh]),{color:old&&!thin?'#8A93A6':col,weight:w,opacity:op,dashArray:old&&!thin?'4 4':null,renderer:rend}).bindPopup(()=>popup(D,r));
      ln.on('click',()=>{if(!(Lc.ends||Lc.network))return;linePickId=r.id;Lc.network?focusNetwork():focusRoute(r)});
      if(thin){ln.on('mouseover',()=>ln.setStyle({weight:1.05,color:'#F2A541'}));ln.on('mouseout',()=>ln.setStyle({weight:0.7,color:col}))}
      ln.addTo(linesLayer)}}
  Planes.set(Lc.planes?PR:[]);
  const mx=Math.max(1,...Object.values(dep));
  const apHtml=c=>{const a=AP.get(c),list=by[c];return `<b>${esc(c)} · ${esc(a.name)}</b><br><small>${esc(a.city||'')}</small><br>${list.length} ${esc(Lc.noun||'A380 route')}${list.length>1?'s':''} shown`+(Lc.ends?'':(Lc.sizeLabel?` · ${esc(Lc.sizeLabel)}: ${dep[c]}`:''))+'<table>'+list.map(r=>`<tr><td><span class="sw" style="display:inline-block;width:10px;height:10px;background:${C.fn(r[f.name])}"></span> ${esc(r[f.name])}</td><td>${esc(r[Lc.from]===c?'→ '+r[Lc.to]+' '+(r.to_city||''):'← '+r[Lc.from]+' '+(r.from_city||''))}</td><td>${Lc.detail?esc(fmt(r[Lc.detail])):esc(fmt(r.weekly_A380_each_way))+'/wk'}</td></tr>`).join('')+'</table>'};
  function chosenRoutes(){if(linePickId){const r=vis.find(x=>x.id===linePickId);if(r)return [r]}const cur=vis.filter(r=>!isOld(r));if(cur.length)return cur;return vis.length?[vis.slice().sort((a,b)=>b.year-a.year)[0]]:[]}
  function gcKm(A,B){const R=6371,p1=A.lat*Math.PI/180,p2=B.lat*Math.PI/180,dp=(B.lat-A.lat)*Math.PI/180,dl=(B.lon-A.lon)*Math.PI/180,x=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;return 2*R*Math.asin(Math.min(1,Math.sqrt(x)))}
  function setIsShort(rows){if(!rows.length||rows.length>8)return false;const pts=[];for(const r of rows){const A=AP.get(r[Lc.from]),B=AP.get(r[Lc.to]);if(A)pts.push(A);if(B)pts.push(B)}if(pts.length<2)return true;let max=0;for(let i=1;i<pts.length;i++)max=Math.max(max,gcKm(pts[0],pts[i]));return max<800}
  function highlightRoutes(){if(linePickId){const r=vis.find(x=>x.id===linePickId);if(r)return [r]}if(Lc.network){if(vis.length===1)return vis;if(vis.length<=2&&setIsShort(vis))return vis;return []}return chosenRoutes()}
  function drawEndLabels(){if(endLbl){map.removeLayer(endLbl);endLbl=null}if(!(Lc.ends||Lc.network))return;endLbl=L.layerGroup();
    const phone=innerWidth<=760;
    for(const r of highlightRoutes()){const A=AP.get(r[Lc.from]),B=AP.get(r[Lc.to]);if(!A||!B)continue;
      for(const p of [A,B]){if(!p.country&&p.cc&&CTY[p.cc]){p.country=CTY[p.cc].name;if(CTY[p.cc].flag)p.country_flag=CTY[p.cc].flag}}
      const pa=map.latLngToContainerPoint([A.lat,A.lon]),pb=map.latLngToContainerPoint([B.lat,B.lon]);
      const near=Math.hypot(pb.x-pa.x,pb.y-pa.y)<(phone?120:90);
      const vw=map.getSize().x;
      [['from',A,B,'From'],['to',B,A,'To']].forEach(([role,me,other,word])=>{
        const px=map.latLngToContainerPoint([me.lat,me.lon]).x;
        const cls=(near&&phone)?(role==='from'?'left':'right'):near?(role==='from'?'above':'below'):(px>vw*0.62?'left':px<vw*0.38?'right':((other.lon-me.lon)>0?'left':'right'));
        const raw=me.code!=null?String(me.code):'';
        const code=!me.approx&&/^[A-Za-z]{3}$/.test(raw)?raw:'';
        const today=me.country&&(me.approx||(r.year!=null&&+r.year<1992));
        const flag=me.country&&me.country_flag?`<small class="cc" aria-label="Present-day country: ${esc(me.country)}"><img src="${esc(me.country_flag)}" alt="">${esc(me.country)}${today?' today':''}</small>`:'';
        const html=`<span><b>${esc(word)}${code?' · '+esc(code):''}</b>${flag}${me.name?`<small>${esc(me.name)}</small>`:''}</span>`;
        for(const sh of(big?[0]:[-360,0,360])){
          L.circleMarker([me.lat,me.lon+sh],{radius:phone?5:6,color:'#1E2430',weight:2,fillColor:role==='from'?'#FFC21A':'#fff',fillOpacity:1}).bindPopup(apHtml(me[Lc.code||'code'])).addTo(endLbl);
          L.marker([me.lat,me.lon+sh],{interactive:false,keyboard:false,icon:L.divIcon({className:'aport '+cls,html,iconSize:[0,0],iconAnchor:[0,0]})}).addTo(endLbl);
        }
      });
    }
    endLbl.addTo(map)}
  function distInfo(r){const s=r.distance!=null?String(r.distance):'';
    if(/computed|not in source/i.test(s)){const km=typeof r.km==='number'?r.km:null,mi=km!=null?Math.round(km*0.621371):null;
      return {text:km!=null?`Calculated great-circle: ≈${km.toLocaleString()} km / ≈${mi.toLocaleString()} mi`:s, note:'Not the flown path. The source did not publish this distance.'}}
    if(s) return {text:s, note:''};
    const A=AP.get(r[Lc.from]),B=AP.get(r[Lc.to]);
    if(A&&B&&typeof A.lat==='number'&&typeof B.lat==='number'){const km=Math.round(gcKm(A,B)),mi=Math.round(km*0.621371);return {text:`Calculated great-circle: ${km.toLocaleString()} km / ${mi.toLocaleString()} mi`, note:'Not the flown path. Calculated from the endpoint coordinates.'}}
    return {text:'No distance in the dataset.', note:''}}
  function frameRoute(r){const A=AP.get(r[Lc.from]),B=AP.get(r[Lc.to]);if(!A||!B)return;
    const pts=gcPts([A.lat,A.lon],[B.lat,B.lon],48);
    let minLa=Infinity,maxLa=-Infinity,minLo=Infinity,maxLo=-Infinity;
    for(const p of pts){minLa=Math.min(minLa,p[0]);maxLa=Math.max(maxLa,p[0]);minLo=Math.min(minLo,p[1]);maxLo=Math.max(maxLo,p[1])}
    const km=typeof r.km==='number'?r.km:gcKm(A,B), phone=innerWidth<=760;
    const latPad=km<80?0.06:Math.max(0.35,(maxLa-minLa)*0.18), lonPad=km<80?0.06:Math.max(0.35,(maxLo-minLo)*0.12);
    const maxZoom=km<80?(phone?12:11):km<150?10:km<800?8:km<2500?6:5;
    fitting++; let done=false;
    const fin=()=>{if(done)return; done=true; fitting=Math.max(0,fitting-1); drawEndLabels()};
    map.once('moveend',fin);
    map.fitBounds([[minLa-latPad,minLo-lonPad],[maxLa+latPad,maxLo+lonPad]],{paddingTopLeft:[phone?28:50,phone?(km<800?210:80):60],paddingBottomRight:[phone?28:50,phone?120:100],maxZoom,animate:true});
    setTimeout(fin,900)}
  function focusRoute(r){drawEndLabels(); const el=$('#rdist');
    if(!Lc.ends||!r){if(el){el.hidden=true;el.innerHTML=''}return}
    const A=AP.get(r[Lc.from]),B=AP.get(r[Lc.to]),d=distInfo(r),cave=[];
    if(d.note)cave.push(d.note);
    if((A&&A.approx)||(B&&B.approx))cave.push('Endpoint positions are approximate.');
    if(((A&&A.approx)||(B&&B.approx)||(r.year!=null&&+r.year<1992))&&((A&&A.country)||(B&&B.country)))cave.push('Flags are today’s countries of the airport sites, not the flag of the flight year.');
    el.hidden=false; el.innerHTML=`<p class="rn">${esc(r.route||r.name||'')}</p><p class="rd">${esc(d.text)}</p>`+(cave.length?`<p class="rc">${esc(cave.join(' '))}</p>`:'');
    if(framedId!==r.id){userHold=false; framedId=r.id; frameRoute(r)}}
  function fitWorld(){if(!D.view)return; fitting++; let done=false; const fin=()=>{if(done)return; done=true; fitting=Math.max(0,fitting-1)}; map.once('moveend',fin); map.fitBounds(D.view,{padding:[24,24],maxZoom:4,animate:true}); setTimeout(fin,900)}
  function focusNetwork(){const hs=highlightRoutes(),r=hs[0],el=$('#rdist'); drawEndLabels();
    const short=!linePickId&&setIsShort(vis);
    const key=linePickId?('pick:'+linePickId):short?('short:'+vis.map(x=>x.id).sort().join(',')):('world:'+(hv?hv.v:'')+':'+vis.length);
    if(!r){if(el){el.hidden=true;el.innerHTML=''}}
    else {const A=AP.get(r[Lc.from]),B=AP.get(r[Lc.to]); for(const p of [A,B]){if(p&&!p.country&&p.cc&&CTY[p.cc]){p.country=CTY[p.cc].name;if(CTY[p.cc].flag)p.country_flag=CTY[p.cc].flag}}
      const d=distInfo(r),cave=[]; if(d.note)cave.push(d.note); if((A&&A.approx)||(B&&B.approx))cave.push('Endpoint positions are approximate.');
      if((r.year!=null&&+r.year<1992)&&((A&&A.country)||(B&&B.country)))cave.push('Flags are today’s countries of the airport sites, not the flag of the flight year.');
      el.hidden=false; el.innerHTML=`<p class="rn">${esc(r.route||(A&&B?(A.name+' – '+B.name):'')||'')}</p><p class="rd">${esc(d.text)}</p>`+(cave.length?`<p class="rc">${esc(cave.join(' '))}</p>`:'')}
    if(framedId===key)return; userHold=false; framedId=key;
    if(linePickId&&r)frameRoute(r); else if(short&&r)frameRoute(r); else if(short)frameRoute(vis[0]); else fitWorld()}
  if(!map._endsBound){map._endsBound=1;
    map.on('zoomend',()=>{if(D&&D.lines&&(D.lines.ends||D.lines.network)&&map._drawEnds)map._drawEnds()});
    map.on('dragstart',()=>{if(!fitting)userHold=true});
    map.on('zoomstart',()=>{if(!fitting)userHold=true});
  }
  map._drawEnds=drawEndLabels;
  const labeled=new Set();if(Lc.ends||Lc.network)highlightRoutes().forEach(r=>{labeled.add(r[Lc.from]);labeled.add(r[Lc.to])});
  for(const c of Object.keys(by)){if((Lc.ends||Lc.network)&&labeled.has(c))continue;const a=AP.get(c);
    const radius=(Lc.ends||Lc.network)?(big?2.2:(innerWidth<=760?3:3.5)):(big?1.5:3)+(big?7:13)*Math.sqrt((dep[c]||0)/mx);
    for(const sh of(big?[0]:[-360,0,360]))L.circleMarker([a.lat,a.lon+sh],{renderer:rend,radius,color:'#1E2430',weight:1,fillColor:'#fff',fillOpacity:.95}).bindPopup(apHtml(c)).bindTooltip(a.name?`${c} · ${a.name}`:c,{sticky:true}).addTo(linesLayer)}
  if(Lc.ends)focusRoute(chosenRoutes()[0]); else if(Lc.network)focusNetwork(); else {const el=$('#rdist'); if(el){el.hidden=true;el.innerHTML=''}}
  const nAl=new Set(vis.flatMap(r=>Lc.airlineList?(r[Lc.airlineList]||[]):[r.airline])).size;
  const lg=$('#legend');lg.innerHTML=`<h3>${esc(f.label)}</h3>`;
  C.items.filter(i=>i.n>0).forEach(i=>{const d=document.createElement('div');d.className='row'+(hidden.has(i.key)?' off':'');d.innerHTML=`<span class="sw" style="background:${i.color}"></span><span>${esc(i.label)} <small>(${i.n})</small></span>`;d.onclick=()=>{hidden.has(i.key)?hidden.delete(i.key):hidden.add(i.key);render()};lg.append(d)});
  lg.insertAdjacentHTML('beforeend',`<p style="font-size:11px;color:#5A6270">Tap a legend row to hide it. Routes: ${vis.length.toLocaleString()} (unique airport pairs) · ${Object.keys(by).length.toLocaleString()} airports${Lc.airlineList?' · '+nAl.toLocaleString()+' airlines':''} shown. ${Lc.network?'Small dots are airports. Tap a line to name that route, its calculated distance and present-day countries. A short route zooms in.':Lc.ends?'Labels name the selected record’s departure and destination. Tap a line to label that route.':'Circle size = '+esc(Lc.sizeLabel||'size')+'.'}</p>`+(Lc.yearNote?(()=>{const ys=sel.find(x=>x.f==='year');const t=ys&&Lc.yearNote[ys.v];return `<p style="font-size:12px"><b>${esc(Lc.yearNoteLabel||'')}:</b> ${esc(t||'no sourced figure for this year')}</p>`})():'')+(Lc.today?`<p style="font-size:12px;border-top:1px solid #ddd;padding-top:4px"><b>Today:</b> ${esc(Lc.today)}</p>`:''));
  const h=new URLSearchParams({ds:D.id,field:f.name});document.querySelectorAll('#filters select').forEach(s=>s.value&&h.set('f_'+s.dataset.f,s.value));history.replaceState(null,'','#'+h)}
// worldwide admin units, loaded per country on zoom
const admIdx=await J(M.bases.adm.index).catch(()=>({}));const admLayers={};const admGroup=L.layerGroup();
async function admRefresh(){if(!$('#admchk').checked||map.getZoom()<5){admGroup.clearLayers();Object.keys(admLayers).forEach(k=>delete admLayers[k]);return}
  const b=map.getBounds();for(const[iso,m] of Object.entries(admIdx)){const [x0,y0,x1,y1]=m.bbox;if(admLayers[iso]||!b.intersects([[y0,x0],[y1,x1]]))continue;admLayers[iso]=1;
    const g=await loadBase('adm',iso);admGroup.addLayer(L.geoJSON(g,{style:{color:'#3A1407',weight:.5,fill:false},interactive:false}))}}
$('#admchk').onchange=()=>{admGroup.addTo(map);admRefresh()};map.on('moveend',admRefresh);
window.atlasMap=map;
// ---- floating UI (generic) ----
let pinned=false,hl2=null;const info=$('#info');
function hov(l){if(l.setStyle&&l!==hl2){l._o=l._o||{...l.options};const line=l instanceof L.Polyline&&!(l instanceof L.Polygon);const base=typeof l._o.weight==='number'?l._o.weight:1;l.setStyle({weight:line?Math.min(base+0.35,1.15):2.5,color:'#F2A541'});l.bringToFront&&l.bringToFront()}}
function unhov(l){if(l!==hl2&&l._o&&l.setStyle)l.setStyle({weight:l._o.weight,color:l._o.color})}
function showCard(html,pin=true){pinned=pin;info.querySelector('.body').innerHTML=html;info.classList.add('on');info.classList.toggle('pin',pin)}
function hideCard(force){if(force||!pinned){info.classList.remove('on');pinned=false;if(hl2){const l=hl2;hl2=null;unhov(l)}}}
info.querySelector('.x').onclick=()=>hideCard(true);
map.on('popupopen',e=>{const p=e.popup,src=p._source;const c=p.getContent();const html=typeof c==='function'?c(src):c;map.closePopup(p);
  if(hl2&&hl2!==src){const l=hl2;hl2=null;unhov(l)}if(src&&src.setStyle&&src.feature){hov(src);hl2=src}showCard(html,true);dismissHint()});
map.on('click',()=>{});
// reset view control
const RC=L.Control.extend({options:{position:'topleft'},onAdd(){const b=L.DomUtil.create('a','leaflet-bar reset');b.href='#';b.title='Reset view';b.setAttribute('role','button');b.setAttribute('aria-label','Reset view');b.innerHTML='⟲';
  L.DomEvent.on(b,'click',e=>{L.DomEvent.stop(e);hideCard(true);if(D&&D.view)map.fitBounds(D.view)});return b}});new RC().addTo(map);
// first-visit hint
function dismissHint(){const h=$('#hint');if(h.classList.contains('on')){h.classList.remove('on');try{localStorage.setItem('atlasHint','1')}catch(e){}}}
function maybeHint(){let seen=false;try{seen=localStorage.getItem('atlasHint')}catch(e){}if(seen)return;$('#hint').classList.add('on');setTimeout(dismissHint,7000)}
$('#hint').onclick=dismissHint;
// floating legend collapse
$('#flegbtn').onclick=()=>{$('#fleg').classList.toggle('min')};
if(innerWidth<=760)$('#fleg').classList.add('min');
// time slider: built from any numeric filter named year (or "slider":true)
function buildSlider(){const ts=$('#tslider');ts.classList.remove('on');ts.innerHTML='';if(!D)return;
  const fl=(D.filters||[]).find(f=>f.slider||f.field==='year');if(!fl)return;if((D.fields.find(x=>x.name===$('#field').value)||{}).noSlider)return;const sel=document.querySelector(`#filters select[data-f="${fl.field}"]`);if(!sel)return;
  const fn=$('#field').value,have=new Set(D._rows.filter(r=>r[fn]!=null).map(r=>String(r[fl.field])));
  let vals=[...sel.options].map(o=>o.value).filter(v=>v!==''&&!isNaN(+v));if(vals.some(v=>have.has(v)))vals=vals.filter(v=>have.has(v));vals=vals.map(Number).sort((a,b)=>a-b);if(fl.cumulative&&vals.length>1){const a=vals[0],b=Math.max(vals[vals.length-1],fl.max||0);vals=[];for(let y=a;y<=b;y++){vals.push(y);if(![...sel.options].some(o=>o.value===String(y))){const o=document.createElement('option');o.value=o.textContent=String(y);sel.append(o)}}}
  if(!vals.includes(+sel.value)){sel.value=String(vals[vals.length-1]);render()}if(vals.length<2)return;
  ts.innerHTML=`<span class="lab">${esc(fl.label)}</span><button class="pl" aria-label="Play">▶</button><input type="range" min="0" max="${vals.length-1}" step="1" aria-label="${esc(fl.label)}"><b class="val"></b>`;
  const r=ts.querySelector('input'),v=ts.querySelector('.val'),pl=ts.querySelector('.pl');let tm=null;
  const set=i=>{r.value=i;v.textContent=vals[i];sel.value=String(vals[i]);render()};
  r.value=Math.max(0,vals.indexOf(+sel.value));v.textContent=vals[+r.value];r.oninput=()=>set(+r.value);
  pl.onclick=()=>{if(tm){clearInterval(tm);tm=null;pl.textContent='▶';return}pl.textContent='❚❚';if(+r.value>=vals.length-1)set(0);tm=setInterval(()=>{const i=+r.value+1;if(i>=vals.length){clearInterval(tm);tm=null;pl.textContent='▶';return}set(i)},1100)};
  sel.addEventListener('change',()=>{const i=vals.indexOf(+sel.value);if(i>=0){r.value=i;v.textContent=vals[i]}});ts.classList.add('on')}

const zc=()=>{const z=map.getZoom(),c=map.getContainer().classList;c.toggle('lowz',z<5);c.toggle('tinyz',z<3.5)};map.on('zoomend',zc);zc();
// scale bar (mi + km)
L.control.scale({position:innerWidth<=760?'topleft':'bottomleft',metric:true,imperial:true,maxWidth:130}).addTo(map);
// place search: local index of base units only (no geocoder)
const SRC=[['world'],['us_states'],['us_counties'],['uk_lad2021'],['poland_powiaty'],['adm1','MYS'],['adm','MYS'],['adm','SGP'],['adm1','IDN'],['adm','IDN'],['adm','FRA']];
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
const CI=M.categoryInfo||{},PCI=POST.categoryInfo||{},autoC=['#2F6DB5','#C8553D','#2E9E4F','#7B3FA0','#F07F1A','#17A2A4'];
const catOf=d=>d.category||'More maps';
const cats=[...new Set([...(M.categories||[]),...M.datasets.map(catOf),...posters.map(catOf)])].filter(c=>M.datasets.some(d=>!d.hidden&&catOf(d)===c)||posters.some(p=>catOf(p)===c));
const cinfo=(c,i)=>({icon:'🗺️',blurb:'',color:autoC[i%autoC.length],...(CI[c]||{}),...(PCI[c]||{})});
const icon=v=>v&&/\.(png|svg|jpe?g|webp)$/i.test(v)?`<img src="${esc(v)}" alt="">`:esc(v||'🗺️');
function home(cat){hideCard&&hideCard(true);if(hl){map.removeLayer(hl);hl=null}document.body.classList.add('home');document.body.classList.remove('open','poster');const pv=$('#poster');if(pv)pv.hidden=true;const rd=$('#rdist');if(rd){rd.hidden=true;rd.innerHTML=''};$('#title').textContent='';
  document.title=cat?cat+" · Muda's Atlas":"Muda's Atlas · What would you like to explore?";const box=$('#cards');$('#start').classList.toggle('incat',!!cat);
  if(!cat){box.innerHTML='<div class="cats">'+cats.map((c,i)=>{const k=cinfo(c,i),nM=M.datasets.filter(d=>!d.hidden&&catOf(d)===c).length,nP=posters.filter(p=>catOf(p)===c).length,n=nM+nP,unit=nP&&!nM?(n>1?'posters':'poster'):(n>1?'maps':'map');
      return `<button class="cat" data-c="${esc(c)}" style="background:linear-gradient(135deg,${k.color},${k.color}cc 60%,#1E2430)"><span class="n">${n} ${unit}</span><span class="big">${icon(k.icon)}</span><b>${esc(c)}</b><small>${esc(k.blurb)}</small></button>`}).join('')+'</div>';
    box.querySelectorAll('.cat').forEach(b=>b.onclick=()=>{location.hash='cat='+encodeURIComponent(b.dataset.c)})}
  else{const i=cats.indexOf(cat),k=cinfo(cat,i);
    const dsCards=M.datasets.filter(d=>!d.hidden&&catOf(d)===cat).map(d=>{
      const choices=d.showChoices&&d.fields.length>1?`<div class="choices">`+d.fields.map(f=>`<button type="button" class="ch" data-id="${esc(d.id)}" data-field="${esc(f.name)}">${esc(choiceLabel(f))}</button>`).join('')+`</div>`:'';
      return `<div class="card" style="--c:${k.color}"><button type="button" class="cardmain" data-id="${esc(d.id)}"><span class="ic">${icon(d.icon)}</span><span>${d.region?`<span class="rg">${esc(d.region)}</span>`:''}<b>${esc(d.title)}</b><small>${esc(d.blurb||'')}</small></span></button>${choices}</div>`}).join('');
    const poCards=posters.filter(p=>catOf(p)===cat).map(p=>`<div class="card" style="--c:${k.color}"><button type="button" class="cardmain" data-poster="${esc(p.id)}"><span class="ic">${icon(p.icon)}</span><span><span class="rg">${esc(p.region||'Poster')} · poster image</span><b>${esc(p.title)}</b><small>${esc(p.blurb||'')}</small></span></button></div>`).join('');
    box.innerHTML=`<div class="crumb"><button id="backcats">← All categories</button><h3>${icon(k.icon)} ${esc(cat)}</h3></div><div class="cards">${dsCards}${poCards}</div>`;
    $('#backcats').onclick=()=>{location.hash=''};
    box.querySelectorAll('.cardmain[data-id]').forEach(b=>b.onclick=()=>{location.hash='ds='+b.dataset.id});
    box.querySelectorAll('.cardmain[data-poster]').forEach(b=>b.onclick=()=>{location.hash='poster='+b.dataset.poster});
    box.querySelectorAll('.ch').forEach(b=>b.onclick=()=>{location.hash='ds='+encodeURIComponent(b.dataset.id)+'&field='+encodeURIComponent(b.dataset.field)})}
  $('#start').scrollTop=0}
let pz=1,pCur=null;
function showPoster(id){const P=posters.find(p=>p.id===id);if(!P)return home(null);const rd=$('#rdist');if(rd){rd.hidden=true;rd.innerHTML=''};
  document.body.classList.remove('home','open');document.body.classList.add('poster');$('#poster').hidden=false;$('#title').textContent=P.title;document.title=P.title+" · Muda's Atlas";$('#credit').textContent=P.credit||'';
  $('#pbadge').textContent=P.badge||'Poster image';$('#ptitle').textContent=P.title;$('#psub').textContent=P.subtitle||'';
  const imgs=P.images||[];const dl=imgs.map(im=>`<a href="${esc(im.file)}" download="${esc(im.file.split('/').pop())}">Download ${esc(im.label)}</a>`).join('');
  $('#ptools').innerHTML=`<button type="button" id="pfit">Fit width</button><button type="button" id="pzin" aria-label="Zoom in">Zoom in</button><button type="button" id="pzout" aria-label="Zoom out">Zoom out</button>${dl}`;
  const img=$('#pimg');img.alt=P.title+'. '+((P.caveats||[])[0]||'')+' Poster image, not an interactive map.';
  pCur=P;pz=1;layoutPoster();
  $('#pfit').onclick=()=>{pz=1;layoutPoster()};
  $('#pzin').onclick=()=>{pz=Math.min(4,pz*2);layoutPoster()};
  $('#pzout').onclick=()=>{pz=Math.max(1,pz/2);layoutPoster()};
  const rows=(P.groups||[]).map(g=>`<tr><td><a href="${esc(g.url)}" target="_blank" rel="noopener">${esc(g.name)}</a></td><td>${g.records.toLocaleString()}</td></tr>`).join('');
  const sum=(P.groups||[]).reduce((a,g)=>a+g.records,0);
  $('#pnotes').innerHTML=(P.caveats||[]).map(t=>`<p>${esc(t)}</p>`).join('')+
    `<h3>Record counts, not whale counts</h3><p>Downloaded ${esc(P.downloaded||'')}. Each group's count matched the OBIS API total. Checks found no duplicate record IDs and no missing or out-of-range coordinates, so no downloaded record was dropped.</p><table><tbody>${rows}<tr><td>Total</td><td>${sum.toLocaleString()}</td></tr></tbody></table>`+
    `<h3>Sources</h3><ul>`+(P.sources||[]).map(s=>`<li>${s.url?`<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a>`:esc(s.label)}</li>`).join('')+'</ul>';
  $('#poster').scrollTop=0}
function layoutPoster(){if(!pCur)return;const stage=$('#pstage'),img=$('#pimg'),w=Math.max(280,stage.clientWidth||stage.getBoundingClientRect().width),dw=Math.round(w*pz);
  const imgs=[...pCur.images].sort((a,b)=>a.width-b.width);let src=imgs[0];for(const im of imgs){src=im;if(im.width>=dw)break}
  if(img.getAttribute('src')!==src.file){img.width=src.width;img.height=src.height;img.src=src.file}
  img.style.width=dw+'px';
  $('#ptools').querySelectorAll('button').forEach(b=>b.classList.toggle('on',(b.id==='pfit'&&pz===1)))}
addEventListener('resize',()=>{if(document.body.classList.contains('poster'))layoutPoster()});
$('#homebtn').onclick=$('#explore').onclick=()=>{if(location.hash)location.hash='';else home()};
function route(){const s=Object.fromEntries(new URLSearchParams(location.hash.slice(1)));hidden.clear();
  if(s.poster&&posters.some(p=>p.id===s.poster))return showPoster(s.poster);
  if(s.ds&&M.datasets.some(d=>d.id===s.ds))return show(s.ds,s);home(s.cat&&cats.includes(s.cat)?s.cat:null)}
window.addEventListener('hashchange',route);
await route();
})().catch(e=>{document.body.insertAdjacentHTML('beforeend',`<pre style="position:fixed;top:60px;left:10px;background:#fff;color:#b00;z-index:9999">${e}</pre>`);console.error(e)});
