(function(root){
'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const defaultState=()=>({origin:'hagye',category:'all',region:'all',terrace:false,time:30,strict:false,query:'',sort:'near',natural:false,artificial:false,parking:false,indoor:false,official:false,favorite:false,weight:null,knownWeight:false,day:'',favorites:[],compare:[],selected:null});
function matchesCategory(p,category){return category==='all'||(['packing','harness'].includes(category)?p.category==='companion'&&p.companionModes?.includes(category):p.category===category);}
function filterPlaces(data,state){
 const q=state.query.trim().toLocaleLowerCase('ko');
 return data.places.filter(p=>{
  if(p.status==='closed'||p.status==='unverified')return false;
  if(!matchesCategory(p,state.category))return false;
  if(state.region!=='all'&&p.region!==state.region)return false;
  if(state.terrace&&p.terrace!==true)return false;
  const range=p.times[state.origin];
  if((state.strict?range[1]:range[0])>state.time)return false;
  if(q&&!`${p.name} ${p.area} ${p.region} ${p.address}`.toLocaleLowerCase('ko').includes(q))return false;
  if(state.natural&&p.surface!=='천연잔디')return false;
  if(state.artificial&&p.surface!=='인조잔디')return false;
  if(state.parking&&!p.parking)return false;
  if(state.indoor&&!p.indoor)return false;
  if(state.official&&p.level!=='official')return false;
  if(state.favorite&&!state.favorites.includes(p.id))return false;
  if(state.knownWeight&&p.weightLimit===null)return false;
  if(state.weight!==null&&p.weightLimit!==null&&(p.exclusive?state.weight>=p.weightLimit:state.weight>p.weightLimit))return false;
  if(state.day!==''&&p.schedule&&p.schedule[Number(state.day)]===null)return false;
  return true;
 }).sort((a,b)=>state.sort==='name'?a.name.localeCompare(b.name,'ko'):state.sort==='evidence'?Number(b.level==='official')-Number(a.level==='official')||a.number-b.number:a.times[state.origin][0]-b.times[state.origin][0]||a.times[state.origin][1]-b.times[state.origin][1]);
}
function toggleCompare(state,id){
 if(state.compare.includes(id)){state.compare=state.compare.filter(x=>x!==id);return 'removed';}
 if(state.compare.length>=3)return 'limit';state.compare.push(id);return 'added';
}
function project(lat,lng,zoom){const scale=256*2**zoom,s=Math.sin(lat*Math.PI/180);return {x:(lng+180)/360*scale,y:(.5-Math.log((1+s)/(1-s))/(4*Math.PI))*scale};}
function unproject(x,y,zoom){const scale=256*2**zoom;return {lng:x/scale*360-180,lat:Math.atan(Math.sinh(Math.PI*(1-2*y/scale)))*180/Math.PI};}
function mapURL(p){return `https://map.naver.com/p/search/${encodeURIComponent(`${p.name} ${p.address}`)}`;}
const core={defaultState,filterPlaces,toggleCompare,project,unproject,mapURL,esc};
if(typeof module!=='undefined')module.exports=core;
if(!root.document||!root.CAFE_DATA)return;
const data=root.CAFE_DATA,doc=root.document,$=id=>doc.getElementById(id),state=defaultState();
const byId=id=>data.places.find(p=>p.id===id);
try{const saved=JSON.parse(root.localStorage.getItem('chocho-favorites-v1')||'[]');if(Array.isArray(saved))state.favorites=saved.filter(id=>byId(id));}catch(_){}
let visible=[],toastTimer,opener=new Map();
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2500);}
function showDialog(id){const d=$(id);opener.set(d,doc.activeElement);if(!d.open)d.showModal();}
function evidenceBadge(p){return p.level==='official'?'공식 정보 포함':p.level==='owner'?'업체 등록 소개':'온라인 운영 근거';}
function rangeLabel(p){const t=p.times[state.origin];return `${t[0]}–${t[1]}분`;}
function edgeBadge(p){return p.times[state.origin][1]>state.time?'<span class="badge amber">시간 경계 후보</span>':'';}
function parkingLabel(p){return p.parking===true?'주차 가능':p.parking===false?'주차 없음':'주차 미확인';}
function categoryLabel(p){if(p.category==='playground')return '운동장 카페';const modes=(p.companionModes||[]).map(mode=>mode==='packing'?'동반 카페(패킹)':'동반 카페(하네스)');return modes.length?modes.join(' · '):'일반 동반 카페 · 방식 미확인';}
function playgroundLabel(p){return p.playground===true?'운동장 있음':p.playground===false?'운동장 없음':'운동장 미확인';}
function card(p){const selected=p.id===state.selected,fav=state.favorites.includes(p.id),comparison=state.compare.includes(p.id);return `<article class="place-card ${selected?'selected':''}" id="card-${p.id}" aria-labelledby="name-${p.id}"><div class="card-top"><span class="card-number">${String(p.number).padStart(2,'0')}</span><div class="card-title"><button class="card-name" id="name-${p.id}" data-select="${p.id}" aria-label="${esc(p.name)} 지도에서 선택" aria-pressed="${selected}">${esc(p.name)}</button><p class="card-area">${esc(p.region)} · ${esc(p.area)}</p></div><button class="favorite-button" data-fav="${p.id}" aria-label="${esc(p.name)} 저장" aria-pressed="${fav}">${fav?'♥':'♡'}</button></div><p class="card-subtitle">${esc(p.feature)}</p><div class="card-badges"><span class="badge">${evidenceBadge(p)}</span><span class="badge outline">${categoryLabel(p)}</span><span class="badge outline">${playgroundLabel(p)}</span>${edgeBadge(p)}${p.position.includes('추정')?'<span class="badge amber">위치 추정</span>':''}</div><div class="card-facts"><div class="fact"><span class="fact-icon">↗</span><div><strong>약 ${rangeLabel(p)}</strong><small>${data.origins[state.origin].name} 출발 · 계획 추정</small></div></div><div class="fact"><span class="fact-icon">↟</span><div><strong>${p.playground===true?esc(p.surface):'동반 구역 안내'}</strong><small>${esc(p.petArea)}</small></div></div><div class="fact"><span class="fact-icon">P</span><div><strong>${parkingLabel(p)}</strong><small>빈자리·요금은 재확인</small></div></div><div class="fact"><span class="fact-icon">♧</span><div><strong>${p.weightLimit===null?'체중 기준 문의':`${p.weightLimit}kg ${p.exclusive?'미만':'이하'}`}</strong><small>${p.weightLimit===null?'최신 제한 조건 문의':p.id==='mongle'?'체고 40cm 이하 안내':'입장 제한 재확인'}</small></div></div></div><p class="hour-line"><span>◷</span>${esc(p.hours)}</p><span class="conflict">${p.hoursConflict?'△ 영업시간 안내 차이 · 방문 전 재확인':'△ 임시휴무·입장 조건 재확인'}</span><div class="card-actions"><button class="detail-button" data-detail="${p.id}">정보·출처 ↗</button><a class="nav-link" href="${mapURL(p)}" target="_blank" rel="noopener noreferrer">네이버 지도 ↗</a><button class="compare-button" data-compare="${p.id}" aria-pressed="${comparison}">${comparison?'✓ 비교 선택':'+ 비교'}</button></div></article>`;}
function render(){
 visible=filterPlaces(data,state);if(!visible.some(p=>p.id===state.selected))state.selected=visible[0]?.id||null;
 const emptyHint=['packing','harness'].includes(state.category)?'이 동반 방식이 확인된 카페가 없거나 다른 필터에서 제외됐어요.<br>방식 미확인 카페는 전체 카페에서 확인해 주세요.':'잔디 종류나 시간 범위를 바꿔보세요.<br>미확인 조건까지 제외하면 후보가 줄어들 수 있어요.';
 $('results').innerHTML=visible.length?visible.map(card).join(''):`<div class="empty"><strong>이 조건의 장소가 없어요.</strong><p>${emptyHint}</p><button class="outline-button" data-reset>필터 초기화 ↺</button></div>`;
 $('resultCount').textContent=visible.length;
 const eligible=filterPlaces(data,{...state,category:'all'});
 doc.querySelectorAll('[data-category]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.category===state.category)));
 doc.querySelectorAll('[data-category-count]').forEach(el=>el.textContent=eligible.filter(p=>matchesCategory(p,el.dataset.categoryCount)).length);
 $('resultSummary').textContent=`${data.origins[state.origin].name} 출발 · ${state.strict?'추정 상한':'추정 하한'} ${state.time}분 이내`;
 $('mapCount').textContent=`${visible.length}곳 표시`;
 const count=['natural','artificial','parking','indoor','official','favorite','terrace','strict','knownWeight'].filter(k=>state[k]).length+Number(state.weight!==null)+Number(state.day!=='')+Number(state.region!=='all')+Number(state.category!=='all');
 $('filterCount').textContent=count?count:'';
 doc.querySelectorAll('[data-toggle]').forEach(el=>el.setAttribute('aria-pressed',String(state[el.dataset.toggle])));
 const tray=$('compareTray');tray.hidden=!state.compare.length;doc.body.classList.toggle('has-tray',!!state.compare.length);
 $('compareCount').textContent=`비교할 장소 ${state.compare.length} / 3`;$('compareNames').textContent=state.compare.map(id=>byId(id).name).join(' · ');$('openCompare').disabled=state.compare.length<2;
 renderSelection();tileMap.render();
}
function renderSelection(){const p=byId(state.selected);$('mapSelection').innerHTML=p?`<div class="selection-top"><div><strong>${esc(p.name)}</strong><p>${esc(p.address)}</p></div><span class="badge ${p.position.includes('추정')?'amber':''}">${esc(p.position)}</span></div><div class="selection-facts"><span>약 ${rangeLabel(p)}</span><span>·</span><span>${p.playground===true?esc(p.surface):categoryLabel(p)}</span><span>·</span><span>${parkingLabel(p)}</span></div><div class="selection-actions"><button data-detail="${p.id}">운영 정보·확인사항 보기 ↗</button><a href="tel:${p.phone.replace(/-/g,'')}">전화 확인 ↗</a></div>`:'<p>필터를 바꾸면 지도에 장소가 표시됩니다.</p>';}
function selectPlace(id,focusMap=false){if(!visible.some(p=>p.id===id))return;state.selected=id;render();if(focusMap)tileMap.focus(byId(id));}
function detail(id){const p=byId(id);if(!p)return;
 $('detailContent').innerHTML=`<div class="detail-head"><p class="eyebrow">PLACE ${String(p.number).padStart(2,'0')} · ${esc(p.area)}</p><h2 id="detailTitle">${esc(p.name)}</h2><p>${esc(p.address)}</p><div class="card-badges"><span class="badge">${evidenceBadge(p)}</span><span class="badge outline">${categoryLabel(p)}</span><span class="badge outline">${playgroundLabel(p)}</span>${edgeBadge(p)}</div></div><div class="detail-grid"><div class="detail-fact"><small>예상 이동시간</small><p>약 ${rangeLabel(p)} · ${data.origins[state.origin].name} 출발</p><p class="sub">수동 계획 추정 · 실시간 교통 미반영</p></div><div class="detail-fact"><small>카페 유형 / 동반 구역</small><p>${categoryLabel(p)} · ${playgroundLabel(p)}</p><p class="sub">${esc(p.yard)} / ${esc(p.petArea)}</p></div><div class="detail-fact"><small>영업시간 · 등록 정보</small><p>${esc(p.hours)}</p><p class="sub">${esc(p.hoursNote)}</p></div><div class="detail-fact"><small>주차</small><p>${esc(p.parkingText)}</p><p class="sub">공간 유무 확인 · 주차 대수/빈자리 미확인</p></div><div class="detail-fact"><small>반려견 / 어린이 입장</small><p>${esc(p.dogRule)}</p><p class="sub">${esc(p.kids)}</p></div><div class="detail-fact"><small>이용요금 · 재확인 필요</small><p>${esc(p.fee)}</p><p class="sub">${esc(p.feeNote)}</p></div></div><section class="detail-section"><h3>온라인 운영 근거</h3><p>${esc(p.evidence)}</p></section><section class="detail-section"><h3>지도 위치 · ${esc(p.position)}</h3><p>${esc(p.positionNote)}</p></section><section class="detail-section warn-section"><h3>출발 전 꼭 재확인</h3><ul>${p.checks.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section><section class="detail-section"><h3>확인한 출처와 업체 안내</h3><div class="source-list">${p.sources.map(s=>`<a class="source-item" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer"><span>${esc(s.name)}<small>${esc(s.type)}</small></span><span>↗</span></a>`).join('')}</div></section><div class="detail-actions"><a href="${mapURL(p)}" target="_blank" rel="noopener noreferrer">네이버 지도에서 길찾기 ↗</a><a href="tel:${p.phone.replace(/-/g,'')}">전화 ${p.phone}</a><button class="compare-button" data-compare="${p.id}" aria-pressed="${state.compare.includes(p.id)}">${state.compare.includes(p.id)?'✓ 비교 선택':'+ 비교에 추가'}</button></div><p class="check-date">정보 확인 ${p.checkedAt||data.checkedAt} · 전화/현장 미확인 · 이후 자동 갱신 없음</p>`;
 showDialog('detailDialog');
}
function compare(){if(state.compare.length<2){toast('비교할 장소를 2곳 이상 선택하세요.');return;}const ps=state.compare.map(byId);
 const rows=[['카페 유형',p=>`${categoryLabel(p)}<small>${playgroundLabel(p)}</small>`],['동반 구역',p=>esc(p.petArea)],['주소',p=>esc(p.address)],['예상 이동',p=>`약 ${rangeLabel(p)}<small>${data.origins[state.origin].name} 출발 · 수동 추정</small>${edgeBadge(p)}`],['운동장',p=>esc(p.yard)],['영업시간',p=>`${esc(p.hours)}<small>${esc(p.hoursNote)}</small>`],['주차',p=>`${esc(p.parkingText)}<small>빈자리·요금은 현장 확인</small>`],['반려견 입장',p=>esc(p.dogRule)],['어린이 입장',p=>esc(p.kids)],['이용요금',p=>`${esc(p.fee)}<small>${esc(p.feeNote)}</small>`],['위치 정확도',p=>`${esc(p.position)}<small>${esc(p.positionNote)}</small>`],['운영 근거',p=>esc(p.evidence)],['재확인 항목',p=>`<ul>${p.checks.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`],['지도·문의',p=>`<a href="${mapURL(p)}" target="_blank" rel="noopener noreferrer">네이버 지도 ↗</a><br><a href="tel:${p.phone.replace(/-/g,'')}">${p.phone}</a>`]];
 $('compareContent').innerHTML=`<div class="table-scroll" tabindex="0" aria-label="장소 비교표. 모바일에서 좌우로 스크롤하세요."><table><thead><tr><th scope="col">비교 항목</th>${ps.map(p=>`<th scope="col">${esc(p.name)}</th>`).join('')}</tr></thead><tbody>${rows.map(([name,fn])=>`<tr><th scope="row">${name}</th>${ps.map(p=>`<td>${fn(p)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="compare-note">모바일에서는 표를 좌우로 밀어 비교할 수 있어요. 요금·운영시간·입장 조건은 방문 전 재확인하세요.</p>`;showDialog('compareDialog');
}
function reset(){const favorites=state.favorites,comparison=state.compare,origin=state.origin;Object.assign(state,defaultState(),{favorites,compare:comparison,origin});$('time').value='30';$('region').value='all';$('search').value='';$('sort').value='near';$('weight').value='';$('day').value='';$('strict').checked=false;$('knownWeight').checked=false;render();tileMap.showNationwide();}
class TileMap{
 constructor(){this.center={lat:35.75,lng:128.25};this.zoom=6;this.isNationwide=true;this.tiles=new Map();this.tileErrors=0;this.tileLoaded=false;this.pointers=new Map();this.dragged=false;this.last=null;this.setup();}
 size(){const r=$('map').getBoundingClientRect();return {w:r.width||600,h:r.height||500};}
 setup(){const el=$('map');
  el.addEventListener('pointerdown',e=>{if(e.target.closest('button,a'))return;this.isNationwide=false;this.dragged=false;this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});el.setPointerCapture(e.pointerId);this.last={x:e.clientX,y:e.clientY};this.pinching=this.pointers.size===2?this.pinchDistance():null;});
  el.addEventListener('pointermove',e=>{if(!this.pointers.has(e.pointerId))return;const old=this.pointers.get(e.pointerId);this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(Math.abs(e.clientX-old.x)+Math.abs(e.clientY-old.y)>2)this.dragged=true;
   if(this.pointers.size===2){const d=this.pinchDistance();if(this.pinching&&d/this.pinching>1.4){this.setZoom(this.zoom+1);this.pinching=d;}else if(this.pinching&&d/this.pinching<.7){this.setZoom(this.zoom-1);this.pinching=d;}}
   else{const c=project(this.center.lat,this.center.lng,this.zoom);this.center=unproject(c.x-(e.clientX-old.x),c.y-(e.clientY-old.y),this.zoom);this.clampCenter();this.render();}
  });
  const end=e=>{this.pointers.delete(e.pointerId);this.pinching=null;};el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
  el.addEventListener('wheel',e=>{if(!e.ctrlKey)return;e.preventDefault();this.setZoom(this.zoom+(e.deltaY<0?1:-1));},{passive:false});
  el.addEventListener('keydown',e=>{if(e.target!==el)return;const moves={ArrowLeft:[-70,0],ArrowRight:[70,0],ArrowUp:[0,-70],ArrowDown:[0,70]};if(moves[e.key]){e.preventDefault();const c=project(this.center.lat,this.center.lng,this.zoom),[x,y]=moves[e.key];this.center=unproject(c.x+x,c.y+y,this.zoom);this.clampCenter();this.render();}else if(e.key==='+'||e.key==='='){e.preventDefault();this.setZoom(this.zoom+1);}else if(e.key==='-'){e.preventDefault();this.setZoom(this.zoom-1);}});
  $('zoomIn').addEventListener('click',()=>this.setZoom(this.zoom+1));$('zoomOut').addEventListener('click',()=>this.setZoom(this.zoom-1));$('fit').addEventListener('click',()=>this.fit());$('nationwide').addEventListener('click',()=>this.showNationwide());$('retryTiles').addEventListener('click',()=>{this.tileErrors=0;this.tileLoaded=false;this.tiles.forEach(t=>t.remove());this.tiles.clear();$('tileWarning').hidden=true;this.render();});
  root.addEventListener('resize',()=>this.isNationwide?this.showNationwide():this.render());
 }
 pinchDistance(){const [a,b]=[...this.pointers.values()];return Math.hypot(a.x-b.x,a.y-b.y);}
 clampCenter(){this.center.lat=Math.min(39.5,Math.max(32,this.center.lat));this.center.lng=Math.min(133,Math.max(123,this.center.lng));}
 setZoom(z){this.isNationwide=false;this.zoom=Math.min(16,Math.max(5,z));this.render();}
 focus(p){this.isNationwide=false;this.center={lat:p.lat,lng:p.lng};this.zoom=Math.max(12,Math.min(this.zoom,14));this.render();}
 fit(){const points=[...visible,data.origins[state.origin]],minLat=Math.min(...points.map(p=>p.lat)),maxLat=Math.max(...points.map(p=>p.lat)),minLng=Math.min(...points.map(p=>p.lng)),maxLng=Math.max(...points.map(p=>p.lng));this.fitBounds(minLat,maxLat,minLng,maxLng);}
 showNationwide(){this.fitBounds(32.7,38.8,124.5,132);this.isNationwide=true;}
 fitBounds(minLat,maxLat,minLng,maxLng){this.isNationwide=false;this.center={lat:(minLat+maxLat)/2,lng:(minLng+maxLng)/2};const {w,h}=this.size();this.zoom=5;for(let z=5;z<=14;z++){const a=project(minLat,minLng,z),b=project(maxLat,maxLng,z);if(Math.abs(a.x-b.x)<=Math.max(100,w-150)&&Math.abs(a.y-b.y)<=Math.max(150,h-140))this.zoom=z;}this.render();}
 render(){const {w,h}=this.size(),c=project(this.center.lat,this.center.lng,this.zoom),left=c.x-w/2,top=c.y-h/2;const layer=$('tileLayer'),needed=new Set(),count=2**this.zoom;$('map').classList.toggle('national-overview',this.zoom<10);
  // Only the current viewport is requested. Browser HTTP caching is left intact.
  if($('map').getBoundingClientRect().width>0){for(let x=Math.floor(left/256);x<=Math.floor((left+w)/256);x++)for(let y=Math.floor(top/256);y<=Math.floor((top+h)/256);y++){if(y<0||y>=count)continue;const key=`${this.zoom}/${x}/${y}`;needed.add(key);let tile=this.tiles.get(key);if(!tile){tile=doc.createElement('img');tile.alt='';tile.draggable=false;tile.decoding='async';tile.onload=()=>{this.tileLoaded=true;$('tileWarning').hidden=true;};tile.onerror=()=>{this.tileErrors++;if(!this.tileLoaded&&this.tileErrors>=3)$('tileWarning').hidden=false;};tile.src=`https://tile.openstreetmap.org/${this.zoom}/${((x%count)+count)%count}/${y}.png`;layer.appendChild(tile);this.tiles.set(key,tile);}tile.style.left=`${x*256-left}px`;tile.style.top=`${y*256-top}px`;}for(const [key,t]of this.tiles)if(!needed.has(key)){t.remove();this.tiles.delete(key);}}
  const pos=p=>{const a=project(p.lat,p.lng,this.zoom);return {x:a.x-left,y:a.y-top};};
  const html=visible.map(p=>{const xy=pos(p),approx=p.position.includes('추정');if(xy.x< -150||xy.x>w+150||xy.y< -150||xy.y>h+150)return '';const radius=600/(156543.03392*Math.cos(p.lat*Math.PI/180)/2**this.zoom);return `${approx?`<span class="uncertainty-circle" style="left:${xy.x}px;top:${xy.y}px;width:${radius*2}px;height:${radius*2}px"></span>`:''}<button class="marker ${p.id===state.selected?'selected':''} ${approx?'approx':''}" style="left:${xy.x}px;top:${xy.y}px" data-marker="${p.id}" aria-pressed="${p.id===state.selected}" aria-label="${esc(p.name)}, 약 ${rangeLabel(p)}, ${esc(p.position)}"><span class="pin"><b>${p.number}</b></span><span class="marker-label">${esc(p.name)}${approx?' · 추정':''}</span></button>`;}).join('');
  const o=data.origins[state.origin],op=pos(o);$('markerLayer').innerHTML=html+`<div class="origin-marker" style="left:${op.x}px;top:${op.y}px"><b></b><span>${o.name} 출발</span></div>`;
  $('zoomIn').disabled=this.zoom>=16;$('zoomOut').disabled=this.zoom<=5;
 }
}
const tileMap=new TileMap();
for(const [id,key,fn]of [['region','region',x=>x],['origin','origin',x=>x],['time','time',Number],['sort','sort',x=>x],['day','day',x=>x]])$(id).addEventListener('change',()=>{state[key]=fn($(id).value);render();if(id==='origin'||id==='time')tileMap.fit();});
$('search').addEventListener('input',()=>{state.query=$('search').value;render();});
$('strict').addEventListener('change',()=>{state.strict=$('strict').checked;render();tileMap.fit();});
$('knownWeight').addEventListener('change',()=>{state.knownWeight=$('knownWeight').checked;render();});
$('weight').addEventListener('input',()=>{const v=$('weight').value,n=Number(v);state.weight=v.trim()===''||!Number.isFinite(n)||n<0?null:n;render();});
$('filterButton').addEventListener('click',()=>{const show=$('extraFilters').hidden;$('extraFilters').hidden=!show;$('filterButton').setAttribute('aria-expanded',String(show));});
$('reset').addEventListener('click',reset);
['guideButton','noticeGuide','bottomGuide'].forEach(id=>$(id).addEventListener('click',()=>showDialog('guideDialog')));
$('clearCompare').addEventListener('click',()=>{state.compare=[];render();});$('openCompare').addEventListener('click',compare);
function switchView(mapView){doc.querySelector('.explorer').classList.toggle('mobile-map',mapView);$('listView').setAttribute('aria-pressed',String(!mapView));$('mapView').setAttribute('aria-pressed',String(mapView));if(mapView){if(tileMap.isNationwide)tileMap.showNationwide();else tileMap.render();}}
$('listView').addEventListener('click',()=>switchView(false));$('mapView').addEventListener('click',()=>switchView(true));
doc.addEventListener('click',e=>{let t;if((t=e.target.closest('[data-category]'))){state.category=t.dataset.category;render();tileMap.fit();}
 else if((t=e.target.closest('[data-toggle]'))){const k=t.dataset.toggle;state[k]=!state[k];if(k==='natural'&&state[k])state.artificial=false;if(k==='artificial'&&state[k])state.natural=false;render();tileMap.fit();}
 else if((t=e.target.closest('[data-detail]')))detail(t.dataset.detail);
 else if((t=e.target.closest('[data-marker]')))selectPlace(t.dataset.marker);
 else if((t=e.target.closest('[data-select]')))selectPlace(t.dataset.select,true);
 else if((t=e.target.closest('[data-fav]'))){const id=t.dataset.fav;state.favorites=state.favorites.includes(id)?state.favorites.filter(x=>x!==id):[...state.favorites,id];try{root.localStorage.setItem('chocho-favorites-v1',JSON.stringify(state.favorites));}catch(_){toast('이 브라우저에서는 저장을 유지할 수 없어요.');}render();}
 else if((t=e.target.closest('[data-compare]'))){const result=toggleCompare(state,t.dataset.compare);if(result==='limit')toast('한 번에 최대 3곳까지 비교할 수 있어요.');render();if($('detailDialog').open&&result!=='limit'){t.setAttribute('aria-pressed',String(state.compare.includes(t.dataset.compare)));t.textContent=state.compare.includes(t.dataset.compare)?'✓ 비교 선택':'+ 비교에 추가';}}
 else if((t=e.target.closest('[data-close]')))$(t.dataset.close).close();
 else if(e.target.closest('[data-reset]'))reset();
});
['detailDialog','compareDialog','guideDialog'].forEach(id=>{const d=$(id);d.addEventListener('close',()=>{const el=opener.get(d);if(el&&doc.contains(el))el.focus();});d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});});
render();tileMap.showNationwide();
root.PAW_APP={state,getFiltered:()=>visible,selectPlace,toggleCompare:id=>{const r=toggleCompare(state,id);render();return r;},render,compare,detail,reset,map:tileMap,switchView};
})(typeof window!=='undefined'?window:globalThis);
