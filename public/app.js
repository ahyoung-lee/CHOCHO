(function(root){
'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const NEARBY_RADIUS_KM=10;
const defaultState=()=>({origin:'hagye',category:'all',region:'all',terrace:false,hoteling:false,daycare:false,grooming:false,time:0,strict:false,query:'',sort:'near',natural:false,artificial:false,parking:false,indoor:false,official:false,favorite:false,weight:null,knownWeight:false,day:'',favorites:[],compare:[],selected:null});
function matchesCategory(p,category){return category==='all'||(category==='large-dog'?p.playground===true&&p.largeDogPlayground===true:['packing','harness'].includes(category)?p.category==='companion'&&p.companionModes?.includes(category):(p.categories||[p.category]).includes(category));}
function hasCoordinates(p){return !!p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng);}
function hasConfirmedCoordinates(p){return hasCoordinates(p)&&['주소 좌표 확인','도로명 주소 좌표 확인'].includes(p.position);}
function distanceKm(a,b){const rad=Math.PI/180,dlat=(b.lat-a.lat)*rad,dlng=(b.lng-a.lng)*rad,h=Math.sin(dlat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dlng/2)**2;return 6371*2*Math.asin(Math.sqrt(Math.min(1,h)));}
function filterPlaces(data,state){
 const q=state.query.trim().toLocaleLowerCase('ko');
 return data.places.filter(p=>{
  if(p.status==='closed'||p.status==='unverified')return false;
  if(!matchesCategory(p,state.category))return false;
  if(['current','custom'].includes(state.origin)&&(!hasConfirmedCoordinates(p)||!hasCoordinates(data.origins[state.origin])||distanceKm(data.origins[state.origin],p)>NEARBY_RADIUS_KM))return false;
  if(state.region==='seoul'&&!/^서울/.test(p.address))return false;
  if(!['all','seoul'].includes(state.region)&&p.region!==state.region)return false;
  if(state.terrace&&p.terrace!==true)return false;
  for(const service of ['hoteling','daycare','grooming'])if(state[service]&&p[service]!==true)return false;
  const range=p.times?.[state.origin];
  if(!['current','custom'].includes(state.origin)&&state.time>0&&(!range||(state.strict?range[1]:range[0])>state.time))return false;
  if(q&&!`${p.name} ${p.area} ${p.region} ${p.address}`.toLocaleLowerCase('ko').includes(q))return false;
  if(state.natural&&p.surface!=='천연잔디')return false;
  if(state.artificial&&p.surface!=='인조잔디')return false;
  if(state.parking&&!p.parking)return false;
  if(state.indoor&&!p.indoor)return false;
  if(state.official&&p.level!=='official')return false;
  if(state.favorite&&!state.favorites.includes(p.id))return false;
  const weightLimit=['playground','large-dog'].includes(state.category)&&p.playgroundWeightLimit!==undefined?p.playgroundWeightLimit:p.weightLimit;
  const exclusive=['playground','large-dog'].includes(state.category)&&p.playgroundWeightLimit!==undefined?p.playgroundWeightExclusive===true:p.exclusive;
  if(state.knownWeight&&weightLimit===null)return false;
  if(state.weight!==null&&weightLimit!==null&&(exclusive?state.weight>=weightLimit:state.weight>weightLimit))return false;
  if(state.day!==''&&p.schedule&&p.schedule[Number(state.day)]===null)return false;
  return true;
 }).sort((a,b)=>{
  if(!['current','custom'].includes(state.origin)&&state.sort==='name')return a.name.localeCompare(b.name,'ko');
  if(!['current','custom'].includes(state.origin)&&state.sort==='evidence')return Number(b.level==='official')-Number(a.level==='official')||a.number-b.number;
  if(['current','custom'].includes(state.origin)||state.time===0){const origin=data.origins[state.origin],da=hasCoordinates(a)?distanceKm(origin,a):Infinity,db=hasCoordinates(b)?distanceKm(origin,b):Infinity;return da-db||a.name.localeCompare(b.name,'ko');}
  return (a.times?.[state.origin]?.[0]??Infinity)-(b.times?.[state.origin]?.[0]??Infinity)||(a.times?.[state.origin]?.[1]??Infinity)-(b.times?.[state.origin]?.[1]??Infinity)||a.number-b.number;
 });
}
function toggleCompare(state,id){
 if(state.compare.includes(id)){state.compare=state.compare.filter(x=>x!==id);return 'removed';}
 if(state.compare.length>=3)return 'limit';state.compare.push(id);return 'added';
}
function project(lat,lng,zoom){const scale=256*2**zoom,s=Math.sin(lat*Math.PI/180);return {x:(lng+180)/360*scale,y:(.5-Math.log((1+s)/(1-s))/(4*Math.PI))*scale};}
function unproject(x,y,zoom){const scale=256*2**zoom;return {lng:x/scale*360-180,lat:Math.atan(Math.sinh(Math.PI*(1-2*y/scale)))*180/Math.PI};}
function mapURL(p){const address=p.address.replace(/\(.*/, '').replace(/\s+(?:지하\s*)?\d+층.*$/, '').trim();return `https://map.naver.com/p/search/${encodeURIComponent(address)}`;}
const core={defaultState,filterPlaces,toggleCompare,project,unproject,mapURL,esc,hasCoordinates,distanceKm};
if(typeof module!=='undefined')module.exports=core;
if(!root.document||!root.CAFE_DATA)return;
const data=root.CAFE_DATA,doc=root.document,$=id=>doc.getElementById(id),state=defaultState();
const byId=id=>data.places.find(p=>p.id===id);
try{const saved=JSON.parse(root.localStorage.getItem('chocho-favorites-v1')||'[]');if(Array.isArray(saved))state.favorites=saved.filter(id=>byId(id));}catch(_){}
const LIST_PAGE_SIZE=10;
let listLimit=LIST_PAGE_SIZE,listCriteria='';
let visible=[],toastTimer,opener=new Map();
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2500);}
function showDialog(id){const d=$(id);opener.set(d,doc.activeElement);if(!d.open)d.showModal();}
function evidenceBadge(p){return p.registration?'직접 등록 정보':p.level==='official'?'공식 정보 포함':p.level==='owner'?'업체 등록 소개':'온라인 운영 근거';}
function phoneLink(p,label){return p.phone?`<a href="tel:${p.phone.replace(/-/g,'')}">${esc(label||p.phone)}</a>`:p.contactNote?`<span>${esc(p.contactNote)}</span>`:'<span>전화번호 미확인 · 네이버 지도에서 확인</span>';}
function parkingLabel(p){return p.parking===true?'주차 가능':p.parking===false?'주차 불가능':'주차 미확인';}
function memoText(p,fallback){return p.registrationNote?.trim()?`<span class="venue-memo">${esc(p.registrationNote)}</span>`:esc(fallback);}
function categoryLabel(p){if(p.categories)return p.categories.map(key=>({playground:'운동장 카페',companion:'동반 카페',restaurant:'동반 음식점',bar:'동반 술집',pension:'동반 펜션'}[key])).concat(p.largeDogPlayground?['대형견 운동장']:[]).join(' · ');if(p.category==='pension')return '동반 펜션';if(p.category==='restaurant')return '동반 음식점';if(p.category==='bar')return '동반 술집';if(p.category==='playground')return p.largeDogPlayground===true?'운동장 카페 · 대형견 운동장':'운동장 카페';const modes=(p.companionModes||[]).map(mode=>mode==='packing'?'동반 카페(패킹)':'동반 카페(하네스)');return modes.length?modes.join(' · '):'일반 동반 카페 · 방식 미확인';}
function playgroundLabel(p){return p.playground===true?'운동장 있음':p.playground===false?'운동장 없음':'운동장 미확인';}
function weightFact(p){
 const general=Number.isFinite(p.weightLimit),playground=Number.isFinite(p.playgroundWeightLimit);
 if(!general&&!playground)return '';
 const limit=general?p.weightLimit:p.playgroundWeightLimit,exclusive=general?p.exclusive:p.playgroundWeightExclusive;
 const note=general&&playground?'운동장만 '+p.playgroundWeightLimit+'kg '+(p.playgroundWeightExclusive?'미만':'이하'):p.id==='mongle'?'체고 40cm 이하 안내':'입장 제한 재확인';
 return `<div class="fact"><span class="fact-icon">♧</span><div><strong>${general?'':'운동장 '}${limit}kg ${exclusive?'미만':'이하'}</strong><small>${esc(note)}</small></div></div>`;
}
function addressRegion(p){
 const parts=p.address.trim().split(/\s+/),labels={서울:'서울시',서울특별시:'서울시',부산:'부산시',부산광역시:'부산시',대구:'대구시',대구광역시:'대구시',인천:'인천시',인천광역시:'인천시',광주:'광주시',광주광역시:'광주시',대전:'대전시',대전광역시:'대전시',울산:'울산시',울산광역시:'울산시',세종:'세종시',세종특별자치시:'세종시',경기:'경기도',강원:'강원도',강원특별자치도:'강원도',충북:'충청북도',충남:'충청남도',전북:'전북특별자치도',전남:'전라남도',경북:'경상북도',경남:'경상남도',제주:'제주도',제주특별자치도:'제주도'};
 const region=[labels[parts[0]]||parts[0]];
 for(const part of parts.slice(1)){if(!/[시군구]$/.test(part))break;region.push(part);}
 return region.join(' ');
}
function resultNumber(p){return visible.findIndex(place=>place.id===p.id)+1;}
function card(p){const selected=p.id===state.selected,fav=state.favorites.includes(p.id),comparison=state.compare.includes(p.id);return `<article class="place-card ${selected?'selected':''}" id="card-${p.id}" aria-labelledby="name-${p.id}"><div class="card-top"><span class="card-number">${resultNumber(p)}</span><div class="card-title"><button class="card-name" id="name-${p.id}" data-select="${p.id}" aria-label="${esc(p.name)} 지도에서 선택" aria-pressed="${selected}">${esc(p.name)}</button><p class="card-area">${esc(addressRegion(p))}</p></div><button class="favorite-button" data-fav="${p.id}" aria-label="${esc(p.name)} 저장" aria-pressed="${fav}">${fav?'♥':'♡'}</button></div>${p.registration&&!p.registrationNote?.trim()?'':`<p class="card-subtitle">${memoText(p,p.feature)}</p>`}<div class="card-badges">${p.registration?'':`<span class="badge">${evidenceBadge(p)}</span>`}<span class="badge outline category-badge">${categoryLabel(p)}</span><span class="badge outline">${playgroundLabel(p)}</span>${p.position.includes('추정')?'<span class="badge amber">위치 추정</span>':''}</div><div class="card-facts"><div class="fact fact-phone"><span class="fact-icon" aria-hidden="true">☎</span><div><small>연락처</small><strong>${phoneLink(p)}</strong></div></div><div class="fact fact-parking"><span class="fact-icon">P</span><div><strong>${parkingLabel(p)}</strong><small>빈자리·요금은 재확인</small></div></div>${weightFact(p)}</div><div class="card-actions"><button class="detail-button" data-detail="${p.id}">정보·출처 ↗</button><button type="button" class="detail-button review-button" disabled title="리뷰 작성 기능 준비 중">리뷰 작성</button><div class="card-navigation"><a class="nav-link" href="${mapURL(p)}" target="_blank" rel="noopener noreferrer"><img src="assets/navermap.svg" alt="" width="18" height="24">네이버 지도 ↗</a><button class="compare-button" data-compare="${p.id}" aria-pressed="${comparison}">${comparison?'✓ 비교 선택':'+ 비교'}</button></div></div></article>`;}
function render(){
 const {selected,compare,favorites,...criteria}=state;
 const key=JSON.stringify([criteria,data.origins[state.origin],state.favorite?favorites:[]]);
 if(key!==listCriteria){listLimit=LIST_PAGE_SIZE;listCriteria=key;}
 visible=filterPlaces(data,state);if(!visible.some(p=>p.id===state.selected))state.selected=visible[0]?.id||null;
 const emptyHint=['current','custom'].includes(state.origin)?`${esc(data.origins[state.origin].name)} 주변 10km 이내에 조건에 맞는 장소가 없어요.<br>주소 좌표가 확인된 장소만 표시합니다. 추정 위치는 제외합니다. 다른 출발지나 조건으로 검색해 보세요.`:['packing','harness'].includes(state.category)?'이 동반 방식이 확인된 카페가 없거나 다른 필터에서 제외됐어요.<br>방식 미확인 카페는 전체 카페에서 확인해 주세요.':'선택한 업종에서 지역·검색어·조건에 맞는 장소가 없어요.<br>다른 검색어나 조건으로 검색해 보세요.';
 $('results').innerHTML=visible.length?visible.slice(0,listLimit).map(card).join(''):`<div class="empty"><strong>이 조건의 장소가 없어요.</strong><p>${emptyHint}</p><button class="outline-button" data-reset>필터 초기화 ↺</button></div>`;
 const remaining=Math.max(0,visible.length-listLimit);
 $('loadMore').hidden=remaining===0;
 $('loadMore').textContent=`업체 ${Math.min(LIST_PAGE_SIZE,remaining)}곳 더 보기 · ${remaining}곳 남음`;
 $('resultCount').textContent=visible.length;
 const eligible=filterPlaces(data,{...state,category:'all'});
 doc.querySelectorAll('[data-category]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.category===state.category)));
 doc.querySelectorAll('[data-category-count]').forEach(el=>el.textContent=el.dataset.categoryCount==='all'?data.places.length:eligible.filter(p=>matchesCategory(p,el.dataset.categoryCount)).length);
 $('resultSummary').textContent=state.origin==='current'?'현재 위치 주변 10km · 가까운 순':`${data.origins[state.origin].name} 출발 · ${state.origin==='custom'?'주변 10km · ':''}가까운 순`;
 const mapped=visible.filter(hasCoordinates).length;
 $('mapCount').textContent=`지도 ${mapped}곳 · 목록 ${visible.length}곳`;
 $('locationCoverage').textContent=mapped<visible.length?`주소만 확인된 ${visible.length-mapped}곳은 목록과 네이버 지도 링크로 확인할 수 있어요. 좌표를 확인하기 전에는 지도 핀과 거리를 표시하지 않습니다.`:'';
 doc.querySelectorAll('[data-toggle]').forEach(el=>el.setAttribute('aria-pressed',String(state[el.dataset.toggle])));
 const tray=$('compareTray');tray.hidden=!state.compare.length;doc.body.classList.toggle('has-tray',!!state.compare.length);
 $('compareCount').textContent=`비교할 장소 ${state.compare.length} / 3`;$('compareNames').textContent=state.compare.map(id=>byId(id).name).join(' · ');$('openCompare').disabled=state.compare.length<2;
 renderSelection();tileMap.render();
}
function renderSelection(){const p=byId(state.selected);$('mapSelection').innerHTML=p?`<div class="selection-top"><div><strong>${esc(p.name)}</strong><p>${esc(p.address)}</p></div><span class="badge ${p.position.includes('추정')?'amber':''}">${esc(p.position)}</span></div><div class="selection-facts"><span>${p.playground===true?esc(p.surface):categoryLabel(p)}</span><span>·</span><span>${parkingLabel(p)}</span></div><div class="selection-actions"><button data-detail="${p.id}">운영 정보·확인사항 보기 ↗</button>${phoneLink(p,'전화 확인 ↗')}</div>`:'<p>필터를 바꾸면 지도에 장소가 표시됩니다.</p>';}
function selectPlace(id,focusMap=false){if(!visible.some(p=>p.id===id))return;state.selected=id;listLimit=Math.max(listLimit,Math.ceil((visible.findIndex(p=>p.id===id)+1)/LIST_PAGE_SIZE)*LIST_PAGE_SIZE);render();if(focusMap){tileMap.focus(byId(id));if(root.matchMedia?.('(max-width:760px)').matches)switchView(true);}}
function detail(id){const p=byId(id);if(!p)return;
 $('detailContent').innerHTML=`<div class="detail-head"><p class="eyebrow">PLACE${resultNumber(p)?' '+resultNumber(p):''} · ${esc(p.area)}</p><h2 id="detailTitle">${esc(p.name)}</h2><p>${esc(p.address)}</p><div class="card-badges"><span class="badge">${evidenceBadge(p)}</span><span class="badge outline">${categoryLabel(p)}</span><span class="badge outline">${playgroundLabel(p)}</span></div></div><div class="detail-grid"><div class="detail-fact"><small>장소 유형 / 동반 구역</small><p>${categoryLabel(p)} · ${playgroundLabel(p)}</p><p class="sub">${esc(p.yard)} / ${esc(p.petArea)}</p></div><div class="detail-fact"><small>영업시간 · 등록 정보</small><p>${esc(p.hours)}</p><p class="sub">${esc(p.hoursNote)}</p></div><div class="detail-fact"><small>주차</small><p>${esc(p.parkingText)}</p><p class="sub">공간 유무 확인 · 주차 대수/빈자리 미확인</p></div><div class="detail-fact"><small>반려견 / 어린이 입장</small><p>${memoText(p,p.dogRule)}</p><p class="sub">${esc(p.kids)}</p></div><div class="detail-fact"><small>이용요금 · 재확인 필요</small><p>${esc(p.fee)}</p><p class="sub">${esc(p.feeNote)}</p></div></div><section class="detail-section"><h3>${p.registration?'직접 등록 근거':'온라인 운영 근거'}</h3><p>${esc(p.evidence)}</p></section><section class="detail-section"><h3>지도 위치 · ${esc(p.position)}</h3><p>${esc(p.positionNote)}</p></section><section class="detail-section warn-section"><h3>출발 전 꼭 재확인</h3><ul>${p.checks.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section><section class="detail-section"><h3>확인한 출처와 업체 안내</h3><div class="source-list">${p.sources.map(s=>`<a class="source-item" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer"><span>${esc(s.name)}<small>${esc(s.type)}</small></span><span>↗</span></a>`).join('')}</div></section><div class="detail-actions"><a href="${mapURL(p)}" target="_blank" rel="noopener noreferrer">네이버 지도에서 길찾기 ↗</a>${phoneLink(p,p.phone?'전화 '+p.phone:undefined)}<button class="compare-button" data-compare="${p.id}" aria-pressed="${state.compare.includes(p.id)}">${state.compare.includes(p.id)?'✓ 비교 선택':'+ 비교에 추가'}</button></div><p class="check-date">${p.registration?'등록 정보 반영 '+p.registration.updatedAt:'정보 확인 '+(p.checkedAt||data.checkedAt)} · 전화/현장 미확인 · 이후 자동 갱신 없음</p>`;
 showDialog('detailDialog');
}
function compare(){if(state.compare.length<2){toast('비교할 장소를 2곳 이상 선택하세요.');return;}const ps=state.compare.map(byId);
 const rows=[['장소 유형',p=>`${categoryLabel(p)}<small>${playgroundLabel(p)}</small>`],['동반 구역',p=>esc(p.petArea)],['주소',p=>esc(p.address)],['운동장',p=>esc(p.yard)],['영업시간',p=>`${esc(p.hours)}<small>${esc(p.hoursNote)}</small>`],['주차',p=>`${esc(p.parkingText)}<small>빈자리·요금은 현장 확인</small>`],['반려견 입장',p=>memoText(p,p.dogRule)],['어린이 입장',p=>esc(p.kids)],['이용요금',p=>`${esc(p.fee)}<small>${esc(p.feeNote)}</small>`],['위치 정확도',p=>`${esc(p.position)}<small>${esc(p.positionNote)}</small>`],['운영 근거',p=>esc(p.evidence)],['재확인 항목',p=>`<ul>${p.checks.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`],['지도·문의',p=>`<a href="${mapURL(p)}" target="_blank" rel="noopener noreferrer">네이버 지도 ↗</a><br>${phoneLink(p)}`]];
 $('compareContent').innerHTML=`<div class="table-scroll" tabindex="0" aria-label="장소 비교표. 모바일에서 좌우로 스크롤하세요."><table><thead><tr><th scope="col">비교 항목</th>${ps.map(p=>`<th scope="col">${esc(p.name)}</th>`).join('')}</tr></thead><tbody>${rows.map(([name,fn])=>`<tr><th scope="row">${name}</th>${ps.map(p=>`<td>${fn(p)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="compare-note">모바일에서는 표를 좌우로 밀어 비교할 수 있어요. 요금·운영시간·입장 조건은 방문 전 재확인하세요.</p>`;showDialog('compareDialog');
}
function reset(){listCriteria='';const favorites=state.favorites,comparison=state.compare,origin=state.origin;locationVersion++;locationPending=false;clearOriginSearch();$('origin').value=origin==='current'?'':data.origins[origin].name;$('locationStatus').textContent=`조건을 초기화했어요. 출발지는 ${data.origins[origin].name}입니다.`;Object.assign(state,defaultState(),{favorites,compare:comparison,origin});$('search').value='';render();if(origin==='current')tileMap.fit();else if(origin==='custom')tileMap.fit();else tileMap.showNationwide();}
class NaverMap{
 constructor(){this.center={lat:35.75,lng:128.25};this.zoom=6;this.isNationwide=true;this.bridge=null;this.setup();}
 size(){const r=$('map').getBoundingClientRect();return {w:r.width||600,h:r.height||500};}
 setup(){
  const failure=message=>{$('mapError').textContent=message;$('tileWarning').hidden=false;};
  if(root.NAVER_MAP)this.bridge=root.NAVER_MAP.create({element:$('tileLayer'),key:'lw1yxfxtxh',
   onChange:view=>{const moved=Math.abs(this.center.lat-view.center.lat)>1e-8||Math.abs(this.center.lng-view.center.lng)>1e-8||this.zoom!==view.zoom;this.center=view.center;this.zoom=view.zoom;if(moved)this.isNationwide=false;this.render();},
   onReady:()=>{$('tileWarning').hidden=true;this.render();},onError:failure});
  $('zoomIn').addEventListener('click',()=>this.setZoom(this.zoom+1));$('zoomOut').addEventListener('click',()=>this.setZoom(this.zoom-1));$('fit').addEventListener('click',()=>this.fit());$('nationwide').addEventListener('click',()=>this.showNationwide());
  $('retryTiles').addEventListener('click',()=>{if(this.bridge){$('tileWarning').hidden=true;this.bridge.load();}else failure('지도 연결 파일을 불러오지 못했어요. 페이지를 새로고침해 주세요.');});
  root.addEventListener('resize',()=>{this.bridge?.resize();this.isNationwide?this.showNationwide():this.render();});
  $('map').addEventListener('keydown',e=>{if(e.target!==$('map'))return;const moves={ArrowLeft:[-70,0],ArrowRight:[70,0],ArrowUp:[0,-70],ArrowDown:[0,70]};if(moves[e.key]){e.preventDefault();this.isNationwide=false;const c=project(this.center.lat,this.center.lng,this.zoom),[x,y]=moves[e.key];this.center=unproject(c.x+x,c.y+y,this.zoom);this.clampCenter();this.render();}else if(e.key==='+'||e.key==='='){e.preventDefault();this.setZoom(this.zoom+1);}else if(e.key==='-'){e.preventDefault();this.setZoom(this.zoom-1);}});
 }
 start(){if(this.bridge)this.bridge.load();else{$('mapError').textContent='지도 연결 파일을 불러오지 못했어요. 페이지를 새로고침해 주세요.';$('tileWarning').hidden=false;}}
 clampCenter(){if(['current','custom'].includes(state.origin)){this.center.lat=Math.min(85.051128,Math.max(-85.051128,this.center.lat));this.center.lng=((this.center.lng+180)%360+360)%360-180;return;}this.center.lat=Math.min(39.5,Math.max(32,this.center.lat));this.center.lng=Math.min(133,Math.max(123,this.center.lng));}
 setZoom(z){this.isNationwide=false;this.zoom=Math.min(16,Math.max(5,z));this.render();}
 focus(p){if(!hasCoordinates(p)){toast('지도 좌표가 미확인된 장소예요. 네이버 지도에서 주소를 확인해 주세요.');return;}this.isNationwide=false;this.center={lat:p.lat,lng:p.lng};this.zoom=Math.max(14,this.zoom);this.render();}
 fit(){
  const origin=data.origins[state.origin],points=[...visible,origin].filter(hasCoordinates);
  if(['current','custom'].includes(state.origin)){
   const dy=Math.max(.012,...points.map(p=>Math.abs(p.lat-origin.lat))),dx=Math.max(.015,...points.map(p=>Math.abs(p.lng-origin.lng)));
   this.fitBounds(origin.lat-dy,origin.lat+dy,origin.lng-dx,origin.lng+dx);this.center={lat:origin.lat,lng:origin.lng};this.render();return;
  }
  this.fitBounds(Math.min(...points.map(p=>p.lat)),Math.max(...points.map(p=>p.lat)),Math.min(...points.map(p=>p.lng)),Math.max(...points.map(p=>p.lng)));
 }
 showNationwide(){this.fitBounds(32.7,38.8,124.5,132);this.isNationwide=true;$('mapTitle').textContent='대한민국 한눈에 보기';}
 fitBounds(minLat,maxLat,minLng,maxLng){this.isNationwide=false;this.center={lat:(minLat+maxLat)/2,lng:(minLng+maxLng)/2};const {w,h}=this.size();this.zoom=5;for(let z=5;z<=14;z++){const a=project(minLat,minLng,z),b=project(maxLat,maxLng,z);if(Math.abs(a.x-b.x)<=Math.max(100,w-150)&&Math.abs(a.y-b.y)<=Math.max(150,h-140))this.zoom=z;}this.render();}
 render(){const {w,h}=this.size(),c=project(this.center.lat,this.center.lng,this.zoom),left=c.x-w/2,top=c.y-h/2;$('map').classList.toggle('national-overview',this.zoom<12);
  $('mapTitle').textContent=this.isNationwide?'대한민국 한눈에 보기':['current','custom'].includes(state.origin)?data.origins[state.origin].name+' 기준 지도':'업체 지도';
  this.bridge?.setView(this.center,this.zoom);
  const pos=p=>{const native=this.bridge?.project(p);if(native)return native;const a=project(p.lat,p.lng,this.zoom);return {x:a.x-left,y:a.y-top};};
  const mapped=visible.filter(hasCoordinates);
  if(this.bridge?.syncMarkers(mapped.map(p=>({...p,number:resultNumber(p)})),data.origins[state.origin],state.selected,id=>selectPlace(id))){$('markerLayer').innerHTML='';$('zoomIn').disabled=this.zoom>=16;$('zoomOut').disabled=this.zoom<=5;return;}
  const html=mapped.map(p=>{const xy=pos(p),approx=p.position.includes('추정');if(xy.x< -150||xy.x>w+150||xy.y< -150||xy.y>h+150)return '';const radius=600/(156543.03392*Math.cos(p.lat*Math.PI/180)/2**this.zoom);return `${approx?`<span class="uncertainty-circle" style="left:${xy.x}px;top:${xy.y}px;width:${radius*2}px;height:${radius*2}px"></span>`:''}<button class="marker ${p.id===state.selected?'selected':''} ${approx?'approx':''}" style="left:${xy.x}px;top:${xy.y}px" data-marker="${p.id}" aria-pressed="${p.id===state.selected}" aria-label="${esc(p.name)}, ${esc(p.position)}"><span class="pin"><b>${resultNumber(p)}</b></span><span class="marker-label">${esc(p.name)}${approx?' · 추정':''}</span></button>`;}).join('');
  const o=data.origins[state.origin],op=pos(o);$('markerLayer').innerHTML=html+`<div class="origin-marker" style="left:${op.x}px;top:${op.y}px"><b></b><span>${esc(o.name)} 출발</span></div>`;
  $('zoomIn').disabled=this.zoom>=16;$('zoomOut').disabled=this.zoom<=5;
 }
}
const tileMap=new NaverMap();
let locationPending=false,locationVersion=0;
let originCandidates=[],originSearchController;
const lookupOrigin=root.ORIGIN_SEARCH.createLookup(root.fetch?.bind(root));
function clearOriginSearch(){originSearchController?.abort();originCandidates=[];$('originResults').innerHTML='';$('originResults').hidden=true;}
function applyOrigin(key,point){
 listCriteria='';
 locationVersion++;locationPending=false;clearOriginSearch();
 if(point)data.origins[key]=point;
 state.origin=key;state.time=0;state.strict=false;state.sort='near';state.query='';$('search').value='';$('origin').value=data.origins[key].name;
 $('locationStatus').textContent='';
 render();tileMap.fit();
}
function chooseOrigin(index){const point=originCandidates[index];if(point)applyOrigin('custom',point);}
async function submitOrigin(){
 const query=$('origin').value.trim();
 if(!query){$('locationStatus').textContent='출발할 주소나 장소를 입력해 주세요.';return;}
 if(query.replace(/\s/g,'')==='현재위치'||query==='current'){requestLocation();return;}
 const preset=Object.entries(data.origins).find(([key,p])=>!['current','custom'].includes(key)&&(p.name===query||key===query));
 if(preset){applyOrigin(preset[0]);return;}
 locationVersion++;locationPending=false;clearOriginSearch();
 const version=locationVersion;
 const known=data.places.filter(p=>hasCoordinates(p)&&(p.name===query||p.address===query));
 const show=points=>{if(points.length===1){applyOrigin('custom',points[0]);return;}originCandidates=points;$('originResults').hidden=!points.length;$('originResults').innerHTML=points.map((p,i)=>`<button type="button" data-origin-result="${i}"><strong>${esc(p.name)}</strong><small>${esc(p.address)}${p.approximate?' · 도로/지역 기준 위치':''}</small></button>`).join('');$('locationStatus').textContent=points.length?'출발지로 사용할 검색 결과를 선택해 주세요.':'검색 결과가 없어요. 도로명 주소나 가까운 역·장소 이름으로 다시 검색해 주세요.';};
 if(known.length){show(known.map(p=>({name:p.name,address:p.address,lat:p.lat,lng:p.lng,approximate:p.position.includes('추정')})));return;}
 const controller=new AbortController();originSearchController=controller;
 const timeout=setTimeout(()=>controller.abort(),10000);
 $('locationStatus').textContent='출발지 주소·장소를 검색하고 있어요.';
 try{const points=await lookupOrigin(query,controller.signal);if(version!==locationVersion)return;show(points);}
 catch(error){if(version!==locationVersion)return;$('locationStatus').textContent='주소 검색에 연결하지 못했어요. 입력한 주소를 확인하고 다시 검색해 주세요. 기존 출발지를 유지합니다.';}
 finally{clearTimeout(timeout);}
}
function requestLocation(clearQuery=true){
 if(locationPending)return;
 clearOriginSearch();
 const previous=state.origin,version=++locationVersion;
 const fail=error=>{locationPending=false;$('origin').value=state.origin==='current'?'':data.origins[state.origin].name;const reason=error?.code===1?'위치 접근이 차단되어 있어요. 브라우저 사이트 설정에서 위치를 허용해 주세요.':error?.code===3?'위치 확인 시간이 초과됐어요. 출발지에서 현재 위치를 다시 선택해 주세요.':'현재 위치를 확인할 수 없어요. 기존 출발지를 사용합니다.';$('locationStatus').textContent=reason;};
 if(root.isSecureContext===false){fail();$('locationStatus').textContent='현재 위치는 HTTPS 연결 또는 localhost에서 사용할 수 있어요.';return;}
 if(!root.navigator?.geolocation){fail();return;}
 locationPending=true;$('origin').value='현재 위치';$('locationStatus').textContent='현재 위치를 확인하고 있어요. 위치 접근을 허용해 주세요.';
 root.navigator.geolocation.getCurrentPosition(position=>{
  if(version!==locationVersion)return;locationPending=false;
  const {latitude:lat,longitude:lng}=position.coords;
  if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180){fail();return;}
  data.origins.current={name:'현재 위치',lat:Math.max(-85.051128,Math.min(85.051128,lat)),lng};
  listCriteria='';state.origin='current';state.time=0;state.strict=false;state.sort='near';if(clearQuery){state.query='';$('search').value='';}$('origin').value='';
  $('locationStatus').textContent='';
  render();tileMap.fit();
 },error=>{if(version!==locationVersion)return;state.origin=previous;fail(error);},{enableHighAccuracy:true,timeout:12000,maximumAge:0});
}
$('origin').addEventListener('input',()=>{locationVersion++;locationPending=false;clearOriginSearch();$('locationStatus').textContent='입력한 출발지를 적용하려면 검색해 주세요.';});
$('origin').addEventListener('change',()=>{const query=$('origin').value.trim();if(['현재 위치','현재위치','current',...Object.keys(data.origins),...Object.values(data.origins).filter(p=>p.name!=='현재 위치').map(p=>p.name)].includes(query))submitOrigin();});
$('origin').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();submitOrigin();}else if(e.key==='Escape')clearOriginSearch();});
$('loadMore').addEventListener('click',()=>{listLimit+=LIST_PAGE_SIZE;render();});
$('originSearch').addEventListener('click',submitOrigin);
$('useCurrent').addEventListener('click',()=>requestLocation());
$('mapUseCurrent').addEventListener('click',()=>requestLocation());
$('search').addEventListener('input',()=>{locationVersion++;locationPending=false;clearOriginSearch();state.query=$('search').value;render();});
async function submitVenueSearch(){
 locationVersion++;locationPending=false;clearOriginSearch();
 const query=$('search').value.trim();
 const registeredMatch=data.places.some(p=>[p.name,p.area,p.region,p.address].join(' ').toLocaleLowerCase('ko').includes(query.toLocaleLowerCase('ko')));
 if(query&&!registeredMatch){state.query=query;render();$('origin').value=query;await submitOrigin();return;}
 state.query=query;render();tileMap.fit();
}
$('venueSearch').addEventListener('click',submitVenueSearch);
$('search').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();submitVenueSearch();}});
let registrationCandidates=[],registrationVersion=0,registrationController,registrationAddress=null,registrationSending=false,registrationSent=false;
const registrationCategories={'companion':'동반 카페','playground':'운동장 카페','large-dog':'대형견 카페','restaurant':'동반 음식점','bar':'동반 술집','pension':'동반 펜션'};
const registrationServices={registrationParking:'주차가능',registrationIndoor:'실내동반',registrationTerrace:'테라스동반',registrationHoteling:'호텔링',registrationDaycare:'유치원',registrationGrooming:'애견미용'};
function clearRegistrationAddress(){registrationVersion++;registrationController?.abort();registrationCandidates=[];registrationAddress=null;registrationSent=false;$('registrationSubmit').disabled=true;$('registrationResults').hidden=true;$('registrationResults').innerHTML='';$('registrationSelected').textContent='';}
$('openRegistration').addEventListener('click',()=>{if(registrationSending)return;clearRegistrationAddress();$('registrationName').value='';$('registrationCategory').value='companion';$('registrationAddress').value='';$('registrationAddressDetail').value='';$('registrationClose').hidden=true;$('registrationMemo').value='';$('registrationHoney').value='';$('registrationConsent').checked=false;Object.keys(registrationServices).forEach(id=>$(id).checked=false);$('registrationStatus').textContent='업체명과 업종을 입력하고 검색 결과에서 건물 주소를 선택해 주세요.';showDialog('registrationDialog');});
$('registrationAddress').addEventListener('input',clearRegistrationAddress);
async function searchRegistrationAddress(){
 clearRegistrationAddress();const query=$('registrationAddress').value.trim(),version=registrationVersion;
 if(!query){$('registrationStatus').textContent='검색할 주소나 업체명을 입력해 주세요.';return;}
 const controller=new AbortController();registrationController=controller;const timeout=setTimeout(()=>controller.abort(),10000);
 $('registrationStatus').textContent='주소를 검색하고 있어요.';
 try{const points=await lookupOrigin(query,controller.signal);if(version!==registrationVersion)return;registrationCandidates=points;$('registrationResults').hidden=!points.length;$('registrationResults').innerHTML=points.map((p,i)=>`<button type="button" data-registration-result="${i}" ${p.approximate?'disabled':''}><strong>${esc(p.name)}</strong><small>${esc(p.address)}${p.approximate?' · 도로/지역 위치: 상세 주소로 다시 검색':''}</small></button>`).join('');$('registrationStatus').textContent=points.length?'등록할 건물의 주소를 선택해 주세요.':'검색 결과가 없어요. 도로명과 건물번호로 다시 검색해 주세요.';}
 catch(_){if(version===registrationVersion)$('registrationStatus').textContent='주소 검색에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.';}
 finally{clearTimeout(timeout);}
}
$('registrationAddressSearch').addEventListener('click',searchRegistrationAddress);
$('registrationAddress').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();searchRegistrationAddress();}});
$('registrationDialog').addEventListener('close',clearRegistrationAddress);
$('registrationForm').addEventListener('submit',async e=>{
 e.preventDefault();if(registrationSending||registrationSent||$('registrationHoney').value)return;
 const name=$('registrationName').value.trim(),category=registrationCategories[$('registrationCategory').value],address=registrationAddress;
 const memo=$('registrationMemo').value.trim();
 if(memo.length>2000){$('registrationStatus').textContent='동반 조건 및 메모사항은 2,000자 이내로 입력해 주세요.';return;}
 if(!name||name.length>100||!category||!address||!$('registrationConsent').checked){$('registrationStatus').textContent='업체명·업종·선택한 건물 주소와 전송 동의를 확인해 주세요.';return;}
 if(!Object.keys(registrationServices).some(id=>$(id).checked)){$('registrationStatus').textContent='이용가능서비스를 1개 이상 선택해 주세요.';$('registrationParking').focus();return;}
 const addressDetail=$('registrationAddressDetail').value.trim();
 if(addressDetail.length>200){$('registrationStatus').textContent='상세주소는 200자 이내로 입력해 주세요.';return;}
 registrationSending=true;$('registrationSubmit').disabled=true;$('registrationSubmit').textContent='전송 중…';$('registrationStatus').textContent='등록 요청을 전송하고 있어요.';
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
 try{
  const response=await root.fetch('https://formsubmit.co/ajax/ay_lee@naver.com',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},signal:controller.signal,body:JSON.stringify({_subject:'[CHOCHO] 업체 등록 요청',_template:'table',_captcha:'false',_honey:'','업체명':name,'업종':category,'주소':[address.address,addressDetail].filter(Boolean).join(' '),'상세주소':addressDetail,'검색 장소명':address.name,'위도':address.lat,'경도':address.lng,'동반 조건 및 메모사항':memo,'반려견 동반 확인':'동의',...Object.fromEntries(Object.entries(registrationServices).map(([id,label])=>[label,$(id).checked?'선택':'미선택']))})});
  const result=await response.json();if(!response.ok||!(result.success===true||result.success==='true'))throw new Error('Registration rejected');
  registrationSent=true;$('registrationStatus').textContent='등록 요청이 접수 서비스에 전달됐어요. 운영자가 확인한 뒤 반영합니다. 최초 이용 시 운영자의 수신 메일 인증이 필요해요.';
 }catch(_){$('registrationStatus').textContent='전송 결과를 확인하지 못했어요(연결 또는 접수 실패). 잠시 후 다시 시도해 주세요.';}
 finally{clearTimeout(timeout);registrationSending=false;$('registrationSubmit').disabled=registrationSent||!registrationAddress;$('registrationSubmit').textContent='등록 요청';$('registrationClose').hidden=false;}
});
$('reset').addEventListener('click',reset);
['guideButton','noticeGuide','bottomGuide'].forEach(id=>$(id).addEventListener('click',()=>showDialog('guideDialog')));
$('clearCompare').addEventListener('click',()=>{state.compare=[];render();});$('openCompare').addEventListener('click',compare);
function switchView(mapView){doc.querySelector('.explorer').classList.toggle('mobile-map',mapView);$('listView').setAttribute('aria-pressed',String(!mapView));$('mapView').setAttribute('aria-pressed',String(mapView));if(mapView){tileMap.bridge?.resize();if(tileMap.isNationwide)tileMap.showNationwide();else tileMap.render();}}
$('listView').addEventListener('click',()=>switchView(false));$('mapView').addEventListener('click',()=>switchView(true));
// Handle keyboard activation before the map SDK expects pointer coordinates.
doc.addEventListener('keydown',e=>{const button=e.target.closest?.('.native-marker');if(button&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopPropagation();selectPlace(button.dataset.marker);}},true);
doc.addEventListener('click',e=>{let t;if((t=e.target.closest('[data-category]'))){state.category=t.dataset.category;render();tileMap.fit();}
 else if((t=e.target.closest('[data-registration-result]'))){const p=registrationCandidates[Number(t.dataset.registrationResult)];if(p&&!p.approximate&&!registrationSending&&!registrationSent){registrationAddress=p;registrationSent=false;$('registrationSubmit').disabled=false;$('registrationSelected').textContent=p.name+' · '+p.address;$('registrationStatus').textContent='내용과 전송 동의를 확인하고 등록 요청을 눌러 주세요.';}}
 else if((t=e.target.closest('[data-origin-result]')))chooseOrigin(Number(t.dataset.originResult));
 else if((t=e.target.closest('[data-toggle]'))){const k=t.dataset.toggle;state[k]=!state[k];if(k==='natural'&&state[k])state.artificial=false;if(k==='artificial'&&state[k])state.natural=false;render();tileMap.fit();}
 else if((t=e.target.closest('[data-detail]')))detail(t.dataset.detail);
 else if((t=e.target.closest('[data-marker]')))selectPlace(t.dataset.marker);
 else if((t=e.target.closest('[data-select]')))selectPlace(t.dataset.select,true);
 else if((t=e.target.closest('[data-fav]'))){const id=t.dataset.fav;state.favorites=state.favorites.includes(id)?state.favorites.filter(x=>x!==id):[...state.favorites,id];try{root.localStorage.setItem('chocho-favorites-v1',JSON.stringify(state.favorites));}catch(_){toast('이 브라우저에서는 저장을 유지할 수 없어요.');}render();}
 else if((t=e.target.closest('[data-compare]'))){const result=toggleCompare(state,t.dataset.compare);if(result==='limit')toast('한 번에 최대 3곳까지 비교할 수 있어요.');render();if($('detailDialog').open&&result!=='limit'){t.setAttribute('aria-pressed',String(state.compare.includes(t.dataset.compare)));t.textContent=state.compare.includes(t.dataset.compare)?'✓ 비교 선택':'+ 비교에 추가';}}
 else if((t=e.target.closest('[data-close]')))$(t.dataset.close).close();
 else if(e.target.closest('[data-reset]'))reset();
});
['detailDialog','compareDialog','guideDialog','registrationDialog'].forEach(id=>{const d=$(id);d.addEventListener('close',()=>{const el=opener.get(d);if(el&&doc.contains(el))el.focus();});d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});});
render();tileMap.showNationwide();tileMap.start();requestLocation(false);
root.PAW_APP={state,getFiltered:()=>visible,selectPlace,toggleCompare:id=>{const r=toggleCompare(state,id);render();return r;},render,compare,detail,reset,map:tileMap,switchView,submitOrigin,chooseOrigin,submitVenueSearch};
})(typeof window!=='undefined'?window:globalThis);
