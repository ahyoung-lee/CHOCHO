(async()=>{
const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');
// Keep historical boundary cases separate from the owner's published workbook.
const fullData=require('./fixtures/historical-venues.json'),data={...fullData,origins:{...fullData.origins},places:fullData.places.filter(p=>['nimung','urban','twohundred','vibe','coco','mongle','gaedde'].includes(p.id))},core=require('../public/app.js');
let checks=0;const test=(name,f)=>{f();checks++;console.log('PASS',name);};
const state=(overrides={})=>Object.assign(core.defaultState(),{time:30},overrides);
test('packing and harness filters allow overlap and exclude unverified modes',()=>{const base=data.places.find(p=>p.category==='companion');const d={...data,places:[{...base,id:'packing-only',companionModes:['packing']},{...base,id:'harness-only',companionModes:['harness']},{...base,id:'both',companionModes:['packing','harness']},{...base,id:'unknown',companionModes:[]},{...data.places[0],id:'playground',companionModes:['harness']}]};assert.deepEqual(core.filterPlaces(d,state({category:'packing'})).map(p=>p.id),['packing-only','both']);assert.deepEqual(core.filterPlaces(d,state({category:'harness'})).map(p=>p.id),['harness-only','both']);assert.equal(core.filterPlaces(d,state()).length,5);});
test('companion mode schema rejects typos and duplicate modes',()=>{const {validate}=require('../scripts/validate-data.cjs');const base=data.places.find(p=>p.category==='companion');assert.throws(()=>validate({...data,places:[{...base,companionModes:['bag']}]}));assert.throws(()=>validate({...data,places:[{...base,companionModes:['packing','packing']}]}));assert.doesNotThrow(()=>validate({...data,places:[{...base,companionModes:['packing','harness']}]}));});
const ids=s=>core.filterPlaces(data,s).map(p=>p.id);
test('default candidates have evidence and honest category metadata',()=>{assert.equal(ids(state()).length,7);for(const p of data.places){assert(p.evidence&&p.sources.length>=2);assert(p.category==='playground'?p.playground===true:p.playground!==true);for(const o of Object.keys(data.origins)){assert(p.times[o][0]<=p.times[o][1]);}for(const s of p.sources)assert.equal(new URL(s.url).protocol,'https:');}assert.equal(new Set(data.places.map(p=>p.id)).size,7);assert(!data.places.some(p=>p.name.includes('다니맘')));});
test('conservative 30-minute filter excludes border candidates',()=>assert.deepEqual(ids(state({strict:true})),['nimung','vibe','coco','twohundred']));
test('origin change uses its own time estimates',()=>{assert(ids(state({origin:'gongneung',time:20})).includes('nimung'));assert(!ids(state({origin:'gongneung',time:20})).includes('urban'));});
test('natural / artificial / official filters',()=>{assert.deepEqual(ids(state({natural:true})),['mongle']);assert.deepEqual(ids(state({artificial:true})),['coco','gaedde','urban']);assert.deepEqual(ids(state({official:true})),['coco','mongle']);});
test('12kg exact boundary: coco excluded, mongle included',()=>{const result=ids(state({weight:12}));assert(!result.includes('coco'));assert(result.includes('mongle'));assert(result.includes('urban'));});
test('13kg exact boundary: urban excluded; unknown rules remain explicit',()=>{const result=ids(state({weight:13}));assert(!result.includes('urban'));assert.deepEqual(ids(state({weight:13,knownWeight:true})),[]);assert(result.includes('nimung'));});
test('registered closed days and unknown schedule',()=>{assert(!ids(state({day:'1'})).includes('mongle'));assert(!ids(state({day:'2'})).includes('coco'));assert(ids(state({day:'2'})).includes('urban'));});
test('search/favorites/no-results',()=>{assert.deepEqual(ids(state({query:'니멍'})),['nimung']);assert.deepEqual(ids(state({favorite:true,favorites:['coco']})),['coco']);assert.deepEqual(ids(state({query:'존재하지않는곳'})),[]);});
test('compare limit, deselection, and selection independence',()=>{const s=state();['nimung','coco','mongle'].forEach(id=>assert.equal(core.toggleCompare(s,id),'added'));assert.equal(core.toggleCompare(s,'urban'),'limit');assert.equal(s.compare.length,3);assert.equal(core.toggleCompare(s,'coco'),'removed');assert.equal(core.toggleCompare(s,'urban'),'added');});
test('map coordinates project/unproject accurately at every supported zoom',()=>{for(const p of [...data.places,...Object.values(data.origins)])for(let z=10;z<=16;z++){const a=core.project(p.lat,p.lng,z),b=core.unproject(a.x,a.y,z);assert(Math.abs(b.lat-p.lat)<1e-8);assert(Math.abs(b.lng-p.lng)<1e-8);}});
test('navigation searches only the road address, excluding business names and floor/dong notes',()=>{for(const p of fullData.places){const u=new URL(core.mapURL(p)),address=p.address.replace(/\(.*/, '').replace(/\s+(?:지하\s*)?\d+층.*$/, '').trim();assert.equal(u.origin,'https://map.naver.com');assert.equal(decodeURIComponent(u.pathname),'/p/search/'+address);assert(address.length>0);}assert.equal(decodeURIComponent(new URL(core.mapURL({name:'카페',address:'서울특별시 노원구 동일로186길 64(좌측 1층 공릉동)'})).pathname),'/p/search/서울특별시 노원구 동일로186길 64');assert.equal(core.esc('<img src=x onerror="x">'), '&lt;img src=x onerror=&quot;x&quot;&gt;');});
class ClassList{constructor(){this.s=new Set();}add(v){this.s.add(v);}remove(v){this.s.delete(v);}toggle(v,b){if(b===undefined)b=!this.s.has(v);b?this.s.add(v):this.s.delete(v);return b;}contains(v){return this.s.has(v);}}
class Element{constructor(id){this.id=id;this.listeners={};this.classList=new ClassList();this.hidden=false;this.attributes={};this.dataset={};this.style={};this.value='';this.checked=false;this.innerHTML='';this.textContent='';this.children=[];this.open=false;this.disabled=false;}setAttribute(k,v){this.attributes[k]=v;}addEventListener(k,f){(this.listeners[k]??=[]).push(f);}fire(k,e={}){for(const f of this.listeners[k]||[])f({target:this,preventDefault(){},...e});}getBoundingClientRect(){return {width:700,height:520,left:0,right:700,top:0,bottom:520};}appendChild(x){this.children.push(x);}remove(){}focus(){}showModal(){this.open=true;}close(){this.open=false;this.fire('close');}setPointerCapture(){}}
const html=fs.readFileSync(__dirname+'/../public/index.html','utf8');const elements={};for(const m of html.matchAll(/\bid="([^"]+)"/g)){assert(!elements[m[1]],'duplicate HTML id');elements[m[1]]=new Element(m[1]);}
const chips=[...html.matchAll(/data-toggle="([^"]+)"/g)].map(m=>m[1]).map(k=>{const e=new Element(k);e.dataset.toggle=k;return e;});
const categories=['all','playground','companion','packing','harness','restaurant','bar','large-dog','pension'].map(k=>{const e=new Element(k);e.dataset.category=k;return e;});
const categoryCounts=['all','playground','companion','packing','harness','restaurant','bar','large-dog','pension'].map(k=>{const e=new Element(k);e.dataset.categoryCount=k;return e;});
const explorer=new Element('explorer'),documentListeners={};
const doc={getElementById:id=>{assert(elements[id],`missing element ${id}`);return elements[id];},querySelector:s=>{assert.equal(s,'.explorer');return explorer;},querySelectorAll:s=>{if(s==='[data-toggle]')return chips;if(s==='[data-category]')return categories;if(s==='[data-category-count]')return categoryCounts;throw new Error('Unexpected selector '+s);},createElement:tag=>new Element(tag),addEventListener:(k,f)=>(documentListeners[k]??=[]).push(f),body:new Element('body'),contains:()=>false,activeElement:null};
const storage=new Map();let fetchHandler=async()=>({ok:true,json:async()=>({features:[]})});
const window={fetch:(...args)=>fetchHandler(...args),document:doc,ORIGIN_SEARCH:require('../public/origin-search.js'),CAFE_DATA:data,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},addEventListener(){}};
let locationSuccess,locationFailure,locationRequests=0;
window.isSecureContext=true;window.navigator={geolocation:{getCurrentPosition(success,failure,options){assert.equal(options.maximumAge,0);locationRequests++;locationSuccess=success;locationFailure=failure;}}};
const ctx=vm.createContext({window,document:doc,AbortController,setTimeout:()=>1,clearTimeout(){},console});vm.runInContext(fs.readFileSync(__dirname+'/../public/app.js','utf8'),ctx);
const app=window.PAW_APP;
test('page load requests browser location permission once',()=>assert.equal(locationRequests,1));
test('map initially fits South Korea including Jeju and Dokdo',()=>{assert(app.map.zoom<10);const {w,h}=app.map.size(),center=core.project(app.map.center.lat,app.map.center.lng,app.map.zoom);for(const p of [{lat:33.1,lng:126.1},{lat:38.6,lng:128.4},{lat:37.24,lng:131.87}]){const xy=core.project(p.lat,p.lng,app.map.zoom);assert(Math.abs(xy.x-center.x)<w/2);assert(Math.abs(xy.y-center.y)<h/2);}});
const click=(selector,dataset)=>{const t=new Element('dynamic');t.dataset=dataset;t.closest=s=>s===selector?t:null;for(const f of documentListeners.click)f({target:t});};
test('DOM initialization renders 7 synchronized cards and map markers',()=>{assert.equal(elements.resultCount.textContent,7);assert.equal((elements.results.innerHTML.match(/class="place-card/g)||[]).length,7);assert.equal((elements.markerLayer.innerHTML.match(/data-marker=/g)||[]).length,7);assert(elements.compareTray.hidden);});
test('DOM condition chips combine parking and indoor filters',()=>{click('[data-toggle]',{toggle:'parking'});assert(app.getFiltered().every(p=>p.parking));click('[data-toggle]',{toggle:'indoor'});assert(app.getFiltered().every(p=>p.indoor&&p.parking));app.reset();});
test('DOM search empty state and filter reset recover all data',()=>{elements.search.value='NO_RESULTS';elements.search.fire('input');assert.equal(app.getFiltered().length,0);assert(elements.results.innerHTML.includes('장소가 없어요'));assert.equal((elements.markerLayer.innerHTML.match(/data-marker=/g)||[]).length,0);elements.reset.fire('click');assert.equal(app.getFiltered().length,7);});
test('DOM card-map selection stays synchronized',()=>{click('[data-marker]',{marker:'mongle'});assert.equal(app.state.selected,'mongle');assert(elements.mapSelection.innerHTML.includes('몽글브라운'));assert(elements.results.innerHTML.includes('selected" id="card-mongle'));click('[data-select]',{select:'coco'});assert.equal(app.state.selected,'coco');});
test('DOM save persists and saved filter works',()=>{click('[data-fav]',{fav:'coco'});assert(storage.get('chocho-favorites-v1').includes('coco'));click('[data-toggle]',{toggle:'favorite'});assert.equal(app.getFiltered().length,1);assert.equal(app.getFiltered()[0].id,'coco');app.reset();});
test('DOM compare opens table with 3 selected places and preserves across filters',()=>{for(const id of ['nimung','coco','mongle'])click('[data-compare]',{compare:id});assert(!elements.compareTray.hidden);assert(!elements.openCompare.disabled);assert.equal(app.toggleCompare('urban'),'limit');elements.openCompare.fire('click');assert(elements.compareDialog.open);assert(elements.compareContent.innerHTML.includes('<table>'));assert(elements.compareContent.innerHTML.includes('몽글브라운'));elements.search.value='니멍';elements.search.fire('input');assert.equal(app.state.compare.length,3);});
test('DOM detail modal contains provenance, caveats and telephone',()=>{app.detail('urban');assert(elements.detailDialog.open);assert(elements.detailContent.innerHTML.includes('tel:050714681261'));assert(elements.detailContent.innerHTML.includes('주변 위치 추정'));assert(elements.detailContent.innerHTML.includes('출발 전 꼭 재확인'));assert(elements.detailContent.innerHTML.includes('당근'));});
test('DOM mobile view switch and map zoom limits',()=>{app.switchView(true);assert(explorer.classList.contains('mobile-map'));assert.equal(elements.mapView.attributes['aria-pressed'],'true');app.switchView(false);assert(!explorer.classList.contains('mobile-map'));app.map.setZoom(99);assert.equal(app.map.zoom,16);assert(elements.zoomIn.disabled);app.map.setZoom(0);assert.equal(app.map.zoom,5);assert(elements.zoomOut.disabled);});
test('HTML ships local dependencies, responsive layout and privacy index controls',()=>{assert(html.includes('width=device-width'));assert(html.includes('noindex,nofollow'));for(const asset of ['styles.css','data.js','origin-search.js','naver-map.js','app.js','icon.svg'])assert(fs.existsSync(__dirname+'/../public/'+asset));const css=fs.readFileSync(__dirname+'/../public/styles.css','utf8');assert(css.includes('@media(max-width:760px)'));assert(css.includes('min-height:44px'));assert(html.includes('naver-map.js'));assert(!html.includes('© OpenStreetMap contributors'));});


test('category filters keep companion cafés out of playground results',()=>{assert.equal(ids(state({category:'playground'})).length,5);assert.deepEqual(ids(state({category:'companion'})),['vibe','twohundred']);});
test('region and terrace filters compose without guessing unknown values',()=>{assert.deepEqual(ids(state({region:'도봉구'})),['vibe']);assert.deepEqual(ids(state({terrace:true})),['twohundred']);assert.deepEqual(ids(state({region:'의정부',category:'companion'})),[]);});
test('closed and unverified records are excluded even when searching their name',()=>{const d={...data,places:[...data.places,{...data.places[0],id:'closed',name:'폐업카페',status:'closed'},{...data.places[1],id:'unchecked',status:'unverified'}]};assert.equal(core.filterPlaces(d,state()).length,7);assert.equal(core.filterPlaces(d,state({query:'폐업카페'})).length,0);});
test('general café cards never assert a verified playground',()=>{app.reset();app.state.category='companion';app.render();assert.equal(app.getFiltered().length,2);assert(elements.results.innerHTML.includes('일반 동반 카페'));assert(!elements.results.innerHTML.includes('운동장 있음'));assert(elements.results.innerHTML.includes('운동장 미확인'));assert.equal((elements.markerLayer.innerHTML.match(/data-marker=/g)||[]).length,2);});
test('all count stays at the registered total while search filters results',()=>{elements.search.value='도봉구';elements.search.fire('input');assert.equal(app.getFiltered().length,1);assert.equal(categoryCounts[0].textContent,7);app.reset();assert.equal(app.state.category,'all');assert.equal(app.state.region,'all');assert.equal(app.getFiltered().length,7);});
test('dataset schema catches duplicate ids, missing provenance and invalid time ranges',()=>{const {validate}=require('../scripts/validate-data.cjs');assert.doesNotThrow(()=>validate(data));assert.throws(()=>validate({...data,places:[...data.places,data.places[0]]}));assert.throws(()=>validate({...data,places:[{...data.places[0],sources:[]}]}));assert.throws(()=>validate({...data,places:[{...data.places[0],times:{hagye:[30,10]}}]}));});
test('map can pan to Busan, Jeju and Dokdo without the old Nowon clamp',()=>{for(const p of [{lat:35.18,lng:129.07},{lat:33.25,lng:126.56},{lat:37.24,lng:131.87}]){app.map.center={...p};app.map.clampCenter();assert.equal(app.map.center.lat,p.lat);assert.equal(app.map.center.lng,p.lng);}});
test('national view button and reset restore the nationwide map after focusing a cafe',()=>{app.map.showNationwide();app.map.focus(data.places[0]);assert(app.map.zoom>=12);elements.nationwide.fire('click');assert(app.map.zoom<10);app.map.fit();assert(app.map.zoom>=10);app.reset();assert(app.map.zoom<10);});
test('packing and harness buttons update counts, cards and map without double-counting all cafes',()=>{const companions=data.places.filter(p=>p.category==='companion');try{companions[0].companionModes=['packing','harness'];companions[1].companionModes=['packing'];app.reset();const count=key=>categoryCounts.find(el=>el.dataset.categoryCount===key).textContent;assert.equal(count('all'),7);assert.equal(count('playground'),5);assert.equal(count('packing'),2);assert.equal(count('harness'),1);click('[data-category]',{category:'harness'});assert.equal(app.getFiltered().length,1);assert(elements.results.innerHTML.includes('동반 카페(하네스)'));assert.equal((elements.markerLayer.innerHTML.match(/data-marker=/g)||[]).length,1);assert.equal(categories.find(el=>el.dataset.category==='harness').attributes['aria-pressed'],'true');click('[data-category]',{category:'packing'});assert.equal(app.getFiltered().length,2);}finally{for(const p of companions)delete p.companionModes;app.reset();}click('[data-category]',{category:'packing'});assert.equal(app.getFiltered().length,0);assert.equal(categoryCounts.find(el=>el.dataset.categoryCount==='packing').textContent,0);app.reset();});
test('delayed location cannot override a manually selected origin',()=>{elements.origin.value='nowon';elements.origin.fire('change');locationSuccess({coords:{latitude:37.55,longitude:126.98}});assert.equal(app.state.origin,'nowon');});
test('permission denial preserves origin and explains browser settings',()=>{elements.origin.value='current';elements.origin.fire('change');locationFailure({code:1});assert.equal(app.state.origin,'nowon');assert.equal(elements.origin.value,'노원역');assert(elements.locationStatus.textContent.includes('브라우저 사이트 설정'));});
test('location success synchronizes map, origin, distance sorting and all views',()=>{app.reset();elements.origin.value='current';elements.origin.fire('change');const p=data.places.find(p=>p.id==='mongle');locationSuccess({coords:{latitude:p.lat,longitude:p.lng}});assert.equal(app.state.origin,'current');assert.equal(elements.origin.value,'현재 위치');assert(Number.isFinite(app.map.center.lat));assert(Number.isFinite(app.map.center.lng));assert.equal(elements.locationStatus.textContent,'');assert.equal(app.getFiltered()[0].id,p.id);assert(app.getFiltered().length>0);assert(app.getFiltered().every(place=>core.distanceKm(p,place)<=10));assert(elements.resultSummary.textContent.includes('가까운 순'));assert(!elements.results.innerHTML.includes('직선거리'));assert(!elements.results.innerHTML.includes('시간 경계 후보'));assert(elements.markerLayer.innerHTML.includes('현재 위치 출발'));app.detail(p.id);assert(!elements.detailContent.innerHTML.includes('직선거리'));app.compare();assert(!elements.compareContent.innerHTML.includes('예상 이동'));app.reset();assert.equal(app.state.origin,'current');assert(Number.isFinite(app.map.center.lat));elements.origin.value='hagye';elements.origin.fire('change');assert(!elements.time);assert(!elements.timeField);});
test('current location excludes far, estimated and unconfirmed coordinates and composes with saved filters',()=>{
 const origin={lat:37.5,lng:127},base=data.places.find(p=>p.id==='coco');
 const fixture={...data,origins:{...data.origins,current:origin},places:[{...base,id:'near',...origin},{...base,id:'inside',lat:37.589,lng:127},{...base,id:'outside',lat:37.591,lng:127},{...base,id:'unknown',lat:null,lng:null},{...base,id:'estimated',...origin,position:'주변 위치 추정'},{...base,id:'unconfirmed',...origin,position:'지도 좌표 미확인'}]};
 const current=state({origin:'current',time:0});
 assert.deepEqual(core.filterPlaces(fixture,current).map(p=>p.id),['near','inside']);
 assert.deepEqual(core.filterPlaces(fixture,{...current,favorite:true,favorites:['inside','outside']}).map(p=>p.id),['inside']);
 assert.equal(core.filterPlaces({...fixture,origins:{...fixture.origins,current:{lat:35,lng:129}}},current).length,0);
 app.reset();elements.useCurrent.fire('click');const p=data.places.find(p=>p.id==='mongle');locationSuccess({coords:{latitude:p.lat,longitude:p.lng}});
 assert.equal(app.state.origin,'current');assert(app.getFiltered().every(place=>core.distanceKm(p,place)<=10));
 elements.origin.value='현재위치';elements.originSearch.fire('click');locationSuccess({coords:{latitude:35,longitude:129}});
 assert.equal(app.getFiltered().length,0);assert(elements.results.innerHTML.includes('현재 위치 주변'));
 assert(!elements.markerLayer.innerHTML.includes('data-marker='));
 elements.origin.value='hagye';elements.origin.fire('change');app.reset();assert.equal(app.getFiltered().length,7);
});
test('timeout and invalid coordinates leave the existing map usable',()=>{elements.origin.value='current';elements.origin.fire('change');locationFailure({code:3});assert.equal(app.state.origin,'hagye');assert(elements.locationStatus.textContent.includes('시간이 초과'));elements.origin.value='current';elements.origin.fire('change');locationSuccess({coords:{latitude:NaN,longitude:0}});assert.equal(app.state.origin,'hagye');assert.equal(elements.origin.value,'하계역');assert.equal(app.getFiltered().length,7);});
test('unsupported and insecure browsers retain the fixed origin',()=>{const navigator=window.navigator;window.navigator={};elements.origin.value='current';elements.origin.fire('change');assert.equal(elements.origin.value,'하계역');assert(elements.locationStatus.textContent.includes('확인할 수 없어요'));window.navigator=navigator;window.isSecureContext=false;elements.origin.value='current';elements.origin.fire('change');assert.equal(app.state.origin,'hagye');assert(elements.locationStatus.textContent.includes('HTTPS'));window.isSecureContext=true;});
test('unknown location, phone and time values remain usable without invented distances',()=>{const p={...data.places[0],id:'unknown-position',lat:null,lng:null,phone:null,times:{hagye:null,nowon:null,gongneung:null}};const d={...data,origins:{hagye:data.origins.hagye,nowon:data.origins.nowon,gongneung:data.origins.gongneung},places:[p,...data.places]};assert.equal(core.hasCoordinates(p),false);assert.equal(core.filterPlaces(d,state({time:0})).length,8);assert(!core.filterPlaces(d,state({time:30})).some(p=>p.id==='unknown-position'));const {validate}=require('../scripts/validate-data.cjs');assert.doesNotThrow(()=>validate(d));assert.throws(()=>validate({...d,places:[{...p,lng:127}]}));});

test('coordinate matching rejects roads, wrong districts, dong mismatches and ambiguous complexes',()=>{const {selectAddressMatch}=require('../scripts/apply-seoul-coordinates.cjs');const p={address:'서울특별시 강남구 학동로 123(1층 논현동)',area:'논현동',region:'강남구'},r={lat:'37.5',lon:'127.04',address:{borough:'강남구',city:'서울특별시',road:'학동로',house_number:'123',quarter:'논현동'}};assert(selectAddressMatch(p,[r]));assert.equal(selectAddressMatch(p,[{...r,address:{...r.address,house_number:undefined}}]),null);assert.equal(selectAddressMatch(p,[{...r,address:{...r.address,borough:'서초구'}}]),null);assert.equal(selectAddressMatch(p,[{...r,address:{...r.address,quarter:'역삼동'}}]),null);assert.equal(selectAddressMatch(p,[r,{...r,lat:'37.51'}]),null);});
test('supplemented weekday and zone-specific weight conditions are respected',()=>{const s=overrides=>state({time:0,...overrides}),has=(overrides,id)=>core.filterPlaces(fullData,s(overrides)).some(p=>p.id===id);assert(!has({day:'2'},'seoul-mfds-115'));assert(!has({day:'1'},'seoul-mfds-495'));assert(has({day:'6'},'seoul-mfds-495'));assert(has({weight:13},'seoul-mfds-381'));assert(!has({weight:13,category:'playground'},'seoul-mfds-381'));assert(has({weight:12,category:'playground'},'seoul-mfds-381'));});
test('historical fixtures cover Seoul districts, provenance and unknown-value regressions',()=>{const seoul=fullData.places.filter(p=>/^서울/.test(p.address));assert(seoul.length>=25);assert.equal(new Set(seoul.map(p=>p.region)).size,25);assert.equal(fullData.coverage.complete,false);assert(seoul.some(p=>p.category==='playground'));for(const p of seoul){assert(p.sources.length);assert(p.checkedAt);if(p.phone===null)assert(!p.phone);if(p.lat===null)assert.equal(p.lng,null);if(p.registerNumber)assert.equal(p.times.hagye,null);}assert(!seoul.some(p=>/세븐일레븐|고양이놀이터|꼬리살랑/.test(p.name)));assert.equal(new Set(fullData.places.map(p=>p.number)).size,fullData.places.length);require('../scripts/validate-data.cjs').validate(fullData);});
test('historical regression dataset renders and handles missing coordinates in detail/compare',()=>{window.CAFE_DATA=fullData;vm.runInContext(fs.readFileSync(__dirname+'/../public/app.js','utf8'),vm.createContext({window,document:doc,AbortController,setTimeout:()=>1,clearTimeout(){},console}));const all=window.PAW_APP;assert.equal(elements.resultCount.textContent,fullData.places.length);assert.equal(all.state.time,0);for(const region of new Set(fullData.places.filter(p=>/^서울/.test(p.address)).map(p=>p.region))){all.state.region=region;all.render();assert(all.getFiltered().length>0);assert(all.getFiltered().every(p=>p.region===region));assert(!/NaN|undefined/.test(elements.results.innerHTML));assert(!/NaN/.test(elements.markerLayer.innerHTML));}all.state.region='seoul';all.render();assert(all.getFiltered().every(p=>/^서울/.test(p.address)));const missing=fullData.places.find(p=>p.lat===null);all.state.region='all';all.state.query=missing.name;all.render();assert(all.getFiltered().some(p=>p.id===missing.id));all.selectPlace(missing.id,true);assert(Number.isFinite(all.map.center.lat));all.detail(missing.id);assert(elements.detailContent.innerHTML.includes('전화번호 미확인'));assert(!elements.detailContent.innerHTML.includes('tel:null'));all.state.compare=[missing.id,'coco'];all.compare();assert(elements.compareContent.innerHTML.includes('전화번호 미확인'));all.reset();all.state.origin='current';fullData.origins.current={name:'현재 위치',lat:37.55,lng:126.98};all.render();assert(all.getFiltered().length>0);assert(all.getFiltered().length<fullData.places.length);assert(all.getFiltered().every(p=>core.hasCoordinates(p)&&core.distanceKm(fullData.origins.current,p)<=10));assert(!/NaN|undefined/.test(elements.results.innerHTML));delete fullData.origins.current;});

async function testAsync(name,f){await f();checks++;console.log('PASS',name);}
const currentApp=window.PAW_APP;
await testAsync('manual address selection updates map, departure and distance sorting safely',async()=>{const feature={geometry:{type:'Point',coordinates:[126.97,37.55]},properties:{name:'서울역',city:'서울특별시',street:'한강대로',countrycode:'KR',type:'house'}};fetchHandler=async()=>({ok:true,json:async()=>({features:[feature]})});elements.origin.value='서울역';await currentApp.submitOrigin();assert(elements.originResults.hidden);assert.equal(currentApp.state.origin,'custom');assert.equal(currentApp.state.origin,'custom');assert.equal(elements.origin.value,'서울역');assert.equal(currentApp.map.center.lat,37.55);assert.equal(currentApp.map.center.lng,126.97);assert(elements.resultSummary.textContent.includes('서울역 출발'));assert(!/NaN|undefined/.test(elements.results.innerHTML));assert(!elements.results.innerHTML.includes('직선거리'));});
await testAsync('reset returns to the custom departure instead of retained GPS coordinates',async()=>{fullData.origins.current={name:'현재 위치',lat:37.6,lng:127.1};currentApp.map.focus(fullData.places[0]);currentApp.reset();assert.equal(currentApp.state.origin,'custom');assert.equal(elements.origin.value,'서울역');assert.equal(currentApp.map.center.lat,37.55);assert.equal(currentApp.map.center.lng,126.97);delete fullData.origins.current;});
await testAsync('failed address search keeps the applied origin and map',async()=>{const center={...currentApp.map.center};fetchHandler=async()=>{throw new Error('offline');};elements.origin.value='주소검색실패';await currentApp.submitOrigin();assert.equal(currentApp.state.origin,'custom');assert.equal(currentApp.map.center.lat,center.lat);assert(elements.locationStatus.textContent.includes('기존 출발지를 유지'));elements.origin.value='검색결과없음';fetchHandler=async()=>({ok:true,json:async()=>({features:[]})});await currentApp.submitOrigin();assert(elements.locationStatus.textContent.includes('검색 결과가 없어요'));assert.equal(currentApp.state.origin,'custom');});
await testAsync('late search and GPS callbacks cannot overwrite a manually selected origin',async()=>{let resolve;fetchHandler=()=>new Promise(r=>resolve=r);elements.origin.value='지연되는주소';const pending=currentApp.submitOrigin();elements.origin.value='노원역';await currentApp.submitOrigin();resolve({ok:true,json:async()=>({features:[{geometry:{type:'Point',coordinates:[127,37.5]},properties:{name:'지연결과',city:'서울특별시',countrycode:'KR'}}]})});await pending;assert.equal(currentApp.state.origin,'nowon');assert(elements.originResults.hidden);locationSuccess({coords:{latitude:35,longitude:129}});assert.equal(currentApp.state.origin,'nowon');});
await testAsync('manual origin labels cannot inject HTML into results or map',async()=>{const name='<img src=x onerror=alert(1)>';fetchHandler=async()=>({ok:true,json:async()=>({features:[{geometry:{type:'Point',coordinates:[127,37.5]},properties:{name,city:'서울특별시',countrycode:'KR'}}]})});elements.origin.value='보안검증장소';await currentApp.submitOrigin();assert(!elements.originResults.innerHTML.includes('<img'));currentApp.chooseOrigin(0);assert(!elements.results.innerHTML.includes(name));assert(elements.markerLayer.innerHTML.includes('&lt;img'));assert(!elements.markerLayer.innerHTML.includes('<img'));});
test('HTML uses editable departure and only the requested condition row',()=>{assert(html.includes('id="origin" type="search"'));assert(!html.includes('id="filterButton"'));assert(!html.includes('data-toggle="natural"'));assert(!html.includes('data-toggle="artificial"'));assert(html.includes('id="conditionHeading">조건필터'));for(const text of ['주차가능','실내 동반','테라스 동반','저장한 곳'])assert(html.includes(text));});
test('removed extra controls leave defaults unrestricted and saved places last',()=>{
 for(const id of ['region','strict','weight','knownWeight','day','filterCount','extraFilters','time','timeField','sort'])assert(!elements[id],id+' must be removed');
 assert(!html.includes('more-filters'));assert(!html.includes('data-toggle="official"'));
 assert.match(html,/data-toggle="grooming"[^>]*>[^<]*<\/button><button class="chip" data-toggle="favorite"/);
 assert.equal(chips.filter(e=>e.dataset.toggle==='favorite').length,1);
 currentApp.state.origin='hagye';currentApp.reset();assert.equal(currentApp.getFiltered().length,fullData.places.length);
 const s=currentApp.state;assert.equal(s.region,'all');assert.equal(s.weight,null);assert.equal(s.day,'');assert(!s.strict&&!s.official&&!s.knownWeight);
 click('[data-fav]',{fav:'twohundred'});click('[data-toggle]',{toggle:'favorite'});click('[data-toggle]',{toggle:'terrace'});
 assert.deepEqual(Array.from(currentApp.getFiltered(),p=>p.id),['twohundred']);
 click('[data-fav]',{fav:'twohundred'});assert.equal(currentApp.getFiltered().length,0);
 currentApp.reset();assert.equal(currentApp.getFiltered().length,fullData.places.length);
});
test('dining categories use real records and compose with search, region and count controls',()=>{
 const {classifyDining}=require('../scripts/classify-dining.cjs');
 assert.equal(classifyDining({indutyNm:'일반음식점',bsshNm:'생맥줏집'}),'bar');
 assert.equal(classifyDining({indutyNm:'일반음식점',bsshNm:'차고버거(BurgerGarage)'}),'restaurant');
 assert.equal(classifyDining({indutyNm:'일반음식점',bsshNm:'이름만으로 모르는 가게'}),null);
 assert(!html.includes('data-category="packing"'));assert(!html.includes('data-category="harness"'));
 assert(html.includes('data-category="restaurant"'));assert(html.includes('data-category="bar"'));
 assert(!fs.readFileSync(__dirname+'/../public/app.js','utf8').includes("$('introCopy').textContent="));
 for(const category of ['restaurant','bar']){
  const expected=fullData.places.filter(p=>p.category===category);assert(expected.length>0);
  currentApp.reset();click('[data-category]',{category});
  assert.equal(currentApp.getFiltered().length,expected.length);
  assert.equal(categoryCounts.find(e=>e.dataset.categoryCount===category).textContent,expected.length);
  assert(currentApp.getFiltered().every(p=>p.category===category));
  assert(elements.results.innerHTML.includes(category==='bar'?'동반 술집':'동반 음식점'));
  const place=expected[0];currentApp.state.query=place.name;currentApp.state.region=place.region;currentApp.render();
  assert(currentApp.getFiltered().some(p=>p.id===place.id));
  assert(currentApp.getFiltered().every(p=>p.category===category&&p.region===place.region));
  currentApp.state.query='no-such-dining-place';currentApp.render();assert.equal(currentApp.getFiltered().length,0);
 }
 currentApp.reset();assert.equal(currentApp.getFiltered().length,fullData.places.length);
});
test('large-dog cafes require confirmed playground access and respect weight limits',()=>{
 const matches=core.filterPlaces(fullData,state({time:0,category:'large-dog'}));assert.equal(matches.length,2);
 assert(matches.every(p=>p.playground===true&&p.largeDogPlayground===true));
 assert(!matches.some(p=>['nimung','coco','urban','gaedde','seoul-mfds-381'].includes(p.id)));
 const base=fullData.places.find(p=>p.id==='seoul-mfds-381');
 const fixture={...fullData,places:[{...base,largeDogPlayground:true},{...base,id:'unknown',largeDogPlayground:undefined},{...base,id:'no-yard',playground:false,largeDogPlayground:true}]};
 assert.equal(core.filterPlaces(fixture,state({time:0,category:'large-dog',weight:13})).length,0);
 assert.deepEqual(core.filterPlaces(fullData,state({time:0,category:'large-dog',weight:31})).map(p=>p.id),['large-dog-mokkoji']);
 currentApp.reset();click('[data-category]',{category:'large-dog'});assert.equal(currentApp.getFiltered().length,2);
 assert.equal(categoryCounts.find(e=>e.dataset.categoryCount==='large-dog').textContent,2);
 currentApp.state.query='모꼬지';currentApp.state.region='남양주';currentApp.render();assert.equal(currentApp.getFiltered()[0].id,'large-dog-mokkoji');
 assert(elements.results.innerHTML.includes('대형견 운동장'));
 const orderedCategories=['companion','playground','large-dog','restaurant','bar','pension'];assert.deepEqual([...html.matchAll(/data-category="([^"]+)"/g)].map(match=>match[1]),['all',...orderedCategories]);
 const sourceData=JSON.parse(fs.readFileSync(__dirname+'/../data/venues.json','utf8'));
 require('../scripts/validate-data.cjs').validate(sourceData);
 assert.throws(()=>require('../scripts/validate-data.cjs').validate({...sourceData,places:[{...matches[0],largeDogPlaygroundEvidence:''}]}));
 currentApp.reset();
});
await testAsync('registration sends only valid selected addresses and handles delivery failures and duplicate requests',async()=>{
 assert(html.includes('placeholder="이 사이트에는 입력 내용을 저장하지 않아요."'));assert(html.includes('id="openRegistration"'));
 const fireLast=async(id,event)=>{const listeners=elements[id].listeners[event];return await listeners[listeners.length-1]({target:elements[id],preventDefault(){}});};
 await fireLast('openRegistration','click');assert(elements.registrationDialog.open);assert(elements.registrationSubmit.disabled);
 assert(html.includes('이용가능서비스 (필수 선택)'));assert(elements.registrationClose.hidden);assert.equal(elements.registrationAddressDetail.value,'');
 fetchHandler=async()=>({ok:true,json:async()=>({features:[{geometry:{type:'Point',coordinates:[127.04,37.54]},properties:{name:'등록 주소 <img>',street:'테스트로',housenumber:'10',city:'서울',countrycode:'KR',type:'house'}}]})});
 elements.registrationAddress.value='테스트주소1';await fireLast('registrationAddressSearch','click');assert(!elements.registrationResults.hidden);assert(!elements.registrationResults.innerHTML.includes('<img>'));
 click('[data-registration-result]',{registrationResult:'0'});assert(elements.registrationSelected.textContent.includes('테스트로'));assert(!elements.registrationSubmit.disabled);
 const addressLookup=fetchHandler;let requests=[];fetchHandler=async(url,options)=>{requests.push({url,options});return {ok:true,json:async()=>({success:true})};};
 await fireLast('registrationForm','submit');assert.equal(requests.length,0);
 elements.registrationName.value='테스트 업체';elements.registrationConsent.checked=true;elements.registrationCategory.value='large-dog';elements.registrationMemo.value='실내에서는 이동가방 필수\n대형견은 테라스 이용 가능';
 await fireLast('registrationForm','submit');assert.equal(requests.length,0);assert(elements.registrationStatus.textContent.includes('1개 이상'));
 elements.registrationAddressDetail.value='2층 201호';
 elements.registrationCategory.value='pension';elements.registrationParking.checked=true;elements.registrationIndoor.checked=true;elements.registrationTerrace.checked=false;elements.registrationHoteling.checked=true;elements.registrationDaycare.checked=false;elements.registrationGrooming.checked=true;
 fetchHandler=async(url,options)=>{requests.push({url,options});return {ok:true,json:async()=>({success:false})};};
 await fireLast('registrationForm','submit');assert(elements.registrationStatus.textContent.includes('실패'));assert(!elements.registrationSubmit.disabled);assert.equal(elements.registrationName.value,'테스트 업체');
 assert.equal(requests[0].url,'https://formsubmit.co/ajax/ay_lee@naver.com');assert.equal(requests[0].options.method,'POST');const payload=JSON.parse(requests[0].options.body);assert.equal(payload['업체명'],'테스트 업체');assert.equal(payload['업종'],'동반 펜션');assert(payload['주소'].includes('테스트로'));assert.equal(payload['반려견 동반 확인'],'동의');
 assert.equal(payload['상세주소'],'2층 201호');assert(payload['주소'].endsWith('2층 201호'));assert(!elements.registrationClose.hidden);
 assert.deepEqual(['주차가능','실내동반','테라스동반','호텔링','유치원','애견미용'].map(label=>payload[label]),['선택','선택','미선택','선택','미선택','선택']);
 assert.equal(payload['동반 조건 및 메모사항'],'실내에서는 이동가방 필수\n대형견은 테라스 이용 가능');assert.equal(elements.registrationMemo.value,'실내에서는 이동가방 필수\n대형견은 테라스 이용 가능');
 fetchHandler=async()=>{throw new Error('offline');};await fireLast('registrationForm','submit');assert(elements.registrationStatus.textContent.includes('실패'));assert(!elements.registrationSubmit.disabled);
 fetchHandler=async()=>({ok:false,json:async()=>({success:true})});await fireLast('registrationForm','submit');assert(elements.registrationStatus.textContent.includes('실패'));assert(!elements.registrationSubmit.disabled);
 elements.registrationHoney.value='spam';fetchHandler=async()=>{throw new Error('Honeypot must not send');};await fireLast('registrationForm','submit');assert(!elements.registrationSubmit.disabled);elements.registrationHoney.value='';
 let finish;fetchHandler=()=>{requests.push({});return new Promise(resolve=>finish=resolve);};const sending=fireLast('registrationForm','submit');assert(elements.registrationSubmit.disabled);click('[data-registration-result]',{registrationResult:'0'});assert(elements.registrationSubmit.disabled);await fireLast('registrationForm','submit');assert.equal(requests.length,2);finish({ok:true,json:async()=>({success:'true'})});await sending;assert(elements.registrationStatus.textContent.includes('접수'));click('[data-registration-result]',{registrationResult:'0'});assert(elements.registrationSubmit.disabled);await fireLast('registrationForm','submit');assert.equal(requests.length,2);
 fetchHandler=addressLookup;
 elements.registrationAddress.value='다른주소';await fireLast('registrationAddress','input');assert.equal(elements.registrationSelected.textContent,'');assert(elements.registrationResults.hidden);
 let resolve;fetchHandler=()=>new Promise(r=>resolve=r);elements.registrationAddress.value='지연등록검색';const pending=fireLast('registrationAddressSearch','click');await fireLast('registrationAddress','input');resolve({ok:true,json:async()=>({features:[]})});await pending;assert(elements.registrationResults.hidden);
 const before=fullData.places.length;let writes=0;fetchHandler=async()=>{writes++;throw new Error('No registration writes allowed');};await fireLast('registrationForm','submit');assert.equal(writes,0);assert(elements.registrationSubmit.disabled);assert.equal(fullData.places.length,before);
 assert(!elements.registrationClose.hidden);click('[data-close]',{close:'registrationDialog'});assert(!elements.registrationDialog.open);
 await fireLast('openRegistration','click');assert.equal(elements.registrationAddressDetail.value,'');assert(elements.registrationClose.hidden);assert.equal(elements.registrationMemo.value,'');for(const suffix of ['Parking','Indoor','Terrace','Hoteling','Daycare','Grooming'])assert.equal(elements['registration'+suffix].checked,false);elements.registrationDialog.close();
});
await testAsync('current-location search and my-location refresh nearby ordering, category results and map pins',async()=>{
 currentApp.reset();const bar=fullData.places.find(p=>p.category==='bar'&&core.hasCoordinates(p));assert(bar);
 elements.origin.value='현재위치';await currentApp.submitOrigin();assert.equal(elements.origin.value,'현재 위치');
 locationSuccess({coords:{latitude:bar.lat,longitude:bar.lng}});assert.equal(currentApp.state.origin,'current');
 currentApp.state.sort='name';currentApp.render();
 const distances=()=>currentApp.getFiltered().map(p=>core.distanceKm(fullData.origins.current,p));
 assert(distances().every((d,i,all)=>d<=10&&(i===0||d>=all[i-1])));
 click('[data-category]',{category:'bar'});const nearbyBars=currentApp.getFiltered();assert(nearbyBars.length>0);assert.equal(nearbyBars[0].id,bar.id);assert(nearbyBars.every(p=>p.category==='bar'));
 assert(distances().every((d,i,all)=>i===0||d>=all[i-1]));
 for(const p of nearbyBars)assert(elements.markerLayer.innerHTML.includes('data-marker="'+p.id+'"'));
 const old={lat:fullData.origins.current.lat,lng:fullData.origins.current.lng};elements.mapUseCurrent.fire('click');
 locationSuccess({coords:{latitude:old.lat+0.01,longitude:old.lng+0.01}});assert.equal(fullData.origins.current.lat,old.lat+0.01);assert.equal(currentApp.state.sort,'near');
 assert(currentApp.getFiltered().every(p=>p.category==='bar'&&core.distanceKm(fullData.origins.current,p)<=10));assert(currentApp.getFiltered().every(p=>['주소 좌표 확인','도로명 주소 좌표 확인'].includes(p.position)));
 assert(!html.includes('시간 제한 없음'));assert(!html.includes('id="time"'));assert(!html.includes('id="sort"'));
 assert(!elements.results.innerHTML.includes('직선거리'));assert(elements.resultSummary.textContent.includes('10km'));
 elements.origin.value='하계역';await currentApp.submitOrigin();assert.equal(currentApp.state.origin,'hagye');assert(!elements.time);assert.equal(currentApp.state.time,0);
 currentApp.reset();
});
test('supplemented bar coordinates match official street addresses and retain provenance',()=>{
 const cache=JSON.parse(fs.readFileSync(__dirname+'/../data/seoul-coordinate-cache.json','utf8')),{selectAddressMatch}=require('../scripts/apply-seoul-coordinates.cjs');
 const bars=fullData.places.filter(p=>p.category==='bar'),mapped=bars.filter(core.hasCoordinates);assert.equal(mapped.length,4);assert.equal(bars.filter(p=>!core.hasCoordinates(p)).length,6);
 for(const p of mapped){const address=p.address.replace(/\(.*/,'').trim(),match=selectAddressMatch(p,cache[address].results);assert(match);assert.equal(p.lat,match.lat);assert.equal(p.lng,match.lng);assert(p.sources.some(s=>s.url.startsWith('https://www.openstreetmap.org/')));}
});
test('venue search button and Enter search while list, map and details use result-order numbers',()=>{
 currentApp.reset();const originalNumbers=fullData.places.map(p=>p.number);
 const assertNumbers=()=>{const visible=currentApp.getFiltered(),numbers=[...elements.results.innerHTML.matchAll(/class="card-number">(\d+)<\/span>/g)].map(m=>Number(m[1]));assert.deepEqual(numbers,visible.map((_,i)=>i+1));for(const p of visible.filter(core.hasCoordinates)){const match=elements.markerLayer.innerHTML.match(new RegExp('data-marker="'+p.id+'"[\\s\\S]*?<b>(\\d+)</b>'));if(match)assert.equal(Number(match[1]),visible.findIndex(x=>x.id===p.id)+1);}};
 assertNumbers();const first=currentApp.getFiltered()[0];currentApp.detail(first.id);assert(elements.detailContent.innerHTML.includes('PLACE 1 ·'));
 elements.search.value='미열';elements.venueSearch.fire('click');assert(currentApp.getFiltered().length>0);assert(currentApp.getFiltered().every(p=>p.name.includes('미열')));assertNumbers();
 elements.search.value='송리단';elements.search.fire('keydown',{key:'Enter'});assert(currentApp.getFiltered().some(p=>p.name==='송리단양조장'));assertNumbers();
 elements.search.value='없는업체명123';elements.venueSearch.fire('click');assert.equal(currentApp.getFiltered().length,0);assertNumbers();
 currentApp.reset();assertNumbers();assert.deepEqual(fullData.places.map(p=>p.number),originalNumbers);
});
test('published workbook venues render, combine services, overlap categories and keep saved places usable',()=>{
 const published=require('../public/data.js'),source=JSON.parse(fs.readFileSync(__dirname+'/../data/venues.json','utf8'));
 assert.deepEqual(published,source);require('../scripts/validate-data.cjs').validate(published);
 assert.equal(published.coverage.mode,'manual-workbook');assert(published.places.every(p=>p.registration&&p.categories));
 window.CAFE_DATA=published;vm.runInContext(fs.readFileSync(__dirname+'/../public/app.js','utf8'),vm.createContext({window,document:doc,AbortController,setTimeout:()=>1,clearTimeout(){},console}));
 const registered=window.PAW_APP;
 assert.equal(registered.getFiltered().length,published.places.length);
 for(const key of ['hoteling','daycare','grooming']){
  registered.reset();click('[data-toggle]',{toggle:key});
  const expected=published.places.filter(p=>p[key]===true);
  assert.equal(categoryCounts.find(c=>c.dataset.categoryCount==='all').textContent,published.places.length);
  assert.deepEqual(Array.from(registered.getFiltered(),p=>p.id).sort(),expected.map(p=>p.id).sort());
  assert.equal(chips.find(c=>c.dataset.toggle===key).attributes['aria-pressed'],'true');
  assert(!/NaN|undefined/.test(elements.results.innerHTML));
  assert.equal(chips.find(c=>c.dataset.toggle==='favorite').attributes['aria-pressed'],'false');
 }
 registered.reset();click('[data-category]',{category:'restaurant'});
 assert.equal(registered.getFiltered().length,published.places.filter(p=>p.categories.includes('restaurant')).length);
 assert(registered.getFiltered().some(p=>p.category==='playground'));
 const place=published.places.find(p=>p.daycare&&p.hoteling);
 click('[data-fav]',{fav:place.id});click('[data-toggle]',{toggle:'favorite'});
 click('[data-toggle]',{toggle:'daycare'});click('[data-toggle]',{toggle:'hoteling'});
 registered.state.category='all';registered.render();
 assert.deepEqual(Array.from(registered.getFiltered(),p=>p.id),[place.id]);
 registered.detail(place.id);assert(elements.detailContent.innerHTML.includes(place.name));
 registered.reset();assert.equal(registered.getFiltered().length,published.places.length);
 for(const key of ['hoteling','daycare','grooming','favorite'])assert.equal(registered.state[key],false);
 const unknown=published.places.find(p=>p.lat===null)||published.places[0],coords={lat:unknown.lat,lng:unknown.lng};try{unknown.lat=null;unknown.lng=null;registered.state.query=unknown.name;registered.render();assert(registered.getFiltered().some(p=>p.id===unknown.id));assert(!elements.markerLayer.innerHTML.includes('data-marker="'+unknown.id+'"'));}finally{Object.assign(unknown,coords);}
});
test('pension category filters registered venues and preserves the total count',()=>{
 const registered=window.PAW_APP,published=require('../data/venues.json');registered.reset();click('[data-category]',{category:'pension'});
 assert.deepEqual(Array.from(registered.getFiltered(),place=>place.id).sort(),published.places.filter(place=>place.categories.includes('pension')).map(place=>place.id).sort());
 assert.equal(categoryCounts.find(element=>element.dataset.categoryCount==='all').textContent,published.places.length);
 const base=published.places[0],sample={...published,places:[{...base,id:'pension-only',category:'pension',categories:['pension'],playground:false,largeDogPlayground:false},{...base,id:'cafe-only',category:'companion',categories:['companion'],playground:false,largeDogPlayground:false}]};
 assert.deepEqual(core.filterPlaces(sample,{...core.defaultState(),category:'pension'}).map(place=>place.id),['pension-only']);registered.reset();
});
test('venue cards show city and district, callable contact and parking without lawn or hours',()=>{
 const registered=window.PAW_APP;registered.reset();
 elements.search.value='펫타리움 청담점';elements.search.fire('input');
 assert.equal(registered.getFiltered().length,1);
 let cards=elements.results.innerHTML;
 assert(cards.includes('<p class="card-area">서울시 강남구</p>'));
 assert(cards.includes('href="tel:050714031704"'));
 assert(cards.includes('주차 가능'));
 assert(!cards.includes('card-subtitle'));assert(cards.includes('category-badge'));
 assert(cards.includes('fact fact-parking'));
 assert(!cards.includes('잔디'));assert(!cards.includes('hour-line'));assert(!cards.includes('영업시간'));assert(!cards.includes('직접 등록 정보'));assert(!cards.includes('체중 기준 문의'));
 elements.search.value='리블링코코';elements.search.fire('input');
 assert(elements.results.innerHTML.includes('<p class="card-area">경기도 남양주시</p>'));
 const place=registered.getFiltered()[0],phone=place.phone,parking=place.parking;
 try{place.phone=null;place.parking=false;registered.render();cards=elements.results.innerHTML;assert(cards.includes('전화번호 미확인'));assert(!cards.includes('tel:null'));assert(cards.includes('주차 불가능'));}
 finally{place.phone=phone;place.parking=parking;registered.reset();}
});
await testAsync('landmark search shows only nearest registered venues and centers the surrounding map',async()=>{
 const registered=window.PAW_APP,source=window.CAFE_DATA,point={name:'구리시 공설묘지',lat:37.6276431,lng:127.1338692};
 registered.state.origin='hagye';registered.reset();
 fetchHandler=async()=>({ok:true,json:async()=>({features:[{geometry:{type:'Point',coordinates:[point.lng,point.lat]},properties:{name:point.name,city:'구리시',countrycode:'KR',type:'other'}}]})});
 elements.search.value=point.name;await registered.submitVenueSearch();
 assert.equal(registered.state.origin,'custom');assert.equal(registered.state.query,'');assert.equal(elements.search.value,'');
 assert.equal(registered.map.center.lat,point.lat);assert.equal(registered.map.center.lng,point.lng);
 const expected=source.places.filter(p=>core.hasCoordinates(p)&&core.distanceKm(point,p)<=10).sort((a,b)=>core.distanceKm(point,a)-core.distanceKm(point,b));
 assert(expected.length>0&&expected.length<source.places.length);
 assert.deepEqual(Array.from(registered.getFiltered(),p=>p.id),expected.map(p=>p.id));
 assert.equal((elements.markerLayer.innerHTML.match(/data-marker=/g)||[]).length,expected.length);
 const {w,h}=registered.map.size(),center=core.project(point.lat,point.lng,registered.map.zoom);
 for(const p of expected){const xy=core.project(p.lat,p.lng,registered.map.zoom);assert(Math.abs(xy.x-center.x)<w/2);assert(Math.abs(xy.y-center.y)<h/2);assert(elements.markerLayer.innerHTML.includes('data-marker="'+p.id+'"'));}
 assert(elements.resultSummary.textContent.includes(point.name));
 elements.search.value='이전 업체 검색';registered.state.query='이전 업체 검색';elements.useCurrent.fire('click');
 locationSuccess({coords:{latitude:point.lat,longitude:point.lng}});
 assert.equal(registered.state.origin,'current');assert.equal(registered.state.query,'');assert.equal(elements.search.value,'');
 assert.equal(registered.map.center.lat,point.lat);assert.equal(registered.map.center.lng,point.lng);
 assert.deepEqual(Array.from(registered.getFiltered(),p=>p.id),expected.map(p=>p.id));
});
await testAsync('ambiguous landmark candidates keep the applied origin until a result is selected',async()=>{
 const registered=window.PAW_APP,oldCenter={...registered.map.center};
 fetchHandler=async()=>({ok:true,json:async()=>({features:[{geometry:{type:'Point',coordinates:[127.1,37.6]},properties:{name:'같은이름 A',city:'구리시',countrycode:'KR'}},{geometry:{type:'Point',coordinates:[127.2,37.7]},properties:{name:'같은이름 B',city:'남양주시',countrycode:'KR'}}]})});
 elements.origin.value='같은이름';await registered.submitOrigin();assert.equal(registered.state.origin,'current');assert.equal(registered.map.center.lat,oldCenter.lat);assert(!elements.originResults.hidden);
 registered.chooseOrigin(1);assert.equal(registered.state.origin,'custom');assert.equal(registered.map.center.lat,37.7);assert.equal(registered.map.center.lng,127.2);assert(elements.originResults.hidden);
});
await testAsync('a later registered-venue search cancels older landmark requests and candidates',async()=>{
 const registered=window.PAW_APP;registered.state.origin='hagye';registered.reset();
 let finish;fetchHandler=()=>new Promise(resolve=>{finish=resolve;});
 elements.search.value='오래걸리는장소';const pending=registered.submitVenueSearch();
 elements.search.value='리블링코코';await registered.submitVenueSearch();
 const center={...registered.map.center};
 const feature={geometry:{type:'Point',coordinates:[127.1338692,37.6276431]},properties:{name:'늦은장소',countrycode:'KR'}};
 finish({ok:true,json:async()=>({features:[feature]})});await pending;
 assert.equal(registered.state.origin,'hagye');assert.equal(registered.state.query,'리블링코코');assert.equal(registered.map.center.lat,center.lat);assert(elements.originResults.hidden);
 fetchHandler=async()=>({ok:true,json:async()=>({features:[feature,{...feature,properties:{name:'또다른장소',countrycode:'KR'}}]})});
 elements.origin.value='여러후보장소';await registered.submitOrigin();assert(!elements.originResults.hidden);
 elements.search.value='리블링코코';await registered.submitVenueSearch();assert(elements.originResults.hidden);
 registered.chooseOrigin(0);assert.equal(registered.state.origin,'hagye');assert.equal(registered.state.query,'리블링코코');
});
test('native marker keyboard selection avoids SDK pointer handlers and legend is removed',()=>{
 const registered=window.PAW_APP;registered.state.origin='hagye';registered.reset();
 const places=registered.getFiltered();
 for(const [index,key]of ['Enter',' '].entries()){
  const id=places[index+1].id,button={dataset:{marker:id}},target={closest:s=>s==='.native-marker'?button:null};let prevented=false,stopped=false;
  for(const handler of documentListeners.keydown)handler({key,target,preventDefault(){prevented=true;},stopPropagation(){stopped=true;}});
  assert(prevented&&stopped);assert.equal(registered.state.selected,id);
 }
 assert(!html.includes('class="map-legend"'));
});
console.log(`\n${checks} verification scenarios passed.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
