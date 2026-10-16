// Offline import from a dated public register snapshot. Does not call a live API.
const fs=require('node:fs'),path=require('node:path');
const base=path.join(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(base,p),'utf8'));
const snapshot=read('data/seoul-official-register.json'),data=read('data/venues.json');
const cafeName=/(카페|커피|coffee|cafe|카훼|티하우스|찻집|로스터|베이크|베이커|케이크|파운야드|디저트|젤라또|하프파운드|펫타리움|엔트런스|포포|펫푸드)/i;
const excludedRefreshment=new Set([412,435,445,454,457]); // animal-experience cafés, convenience store, meal/toast shops
const extraCafes=new Set([13,36,79,115,125,196,219,220,223,238,315,328,329,330,381]);
const supplements=read('data/seoul-cafe-supplements.json');
const decisions=[],seen=new Set();
const normalizeAddress=s=>s.replace(/\(.*/, '').replace(/\s+/g,' ').trim();
const normalizeName=s=>s.replace(/\(주\)|주식회사/g,'').replace(/[^가-힣a-z0-9]/gi,'').toLowerCase();
data.places=data.places.filter(p=>!p.id.startsWith('seoul-mfds-')&&!p.id.startsWith('seoul-extra-'));
for(const row of snapshot.rows){
 const include=(row.indutyNm==='휴게음식점'&&!excludedRefreshment.has(row.rnum))||cafeName.test(row.bsshNm)||extraCafes.has(row.rnum);
 if(!include){decisions.push({registerNumber:row.rnum,name:row.bsshNm,decision:'not-imported',reason:'카페 유형 근거 미확인 또는 카페 외 업종. 반려견 동반 불가를 뜻하지 않습니다.'});continue;}
 const key=normalizeName(row.bsshNm)+'|'+normalizeAddress(row.siteAddr);
 if(seen.has(key)){decisions.push({registerNumber:row.rnum,name:row.bsshNm,decision:'duplicate',reason:'같은 상호·도로명 주소 중복'});continue;}seen.add(key);
 const region=row.siteAddr.split(' ')[1],area=[...row.siteAddr.matchAll(/([가-힣]+(?:[0-9]+)?(?:동|가))(?:[, )]|$)/g)].at(-1)?.[1]||region;
 const id=`seoul-mfds-${row.rnum}`,extra=supplements[id]||{};
 const sources=[{name:'식품안전나라 · 반려동물 동반 가능 업소 현황',url:snapshot.source,type:`공식 등록 현황 · ${snapshot.checkedAt} 조회 · 연번 ${row.rnum}`}];
 const p={id,number:data.places.length+1,name:row.bsshNm,area,region,address:row.siteAddr,phone:null,lat:null,lng:null,position:'지도 좌표 미확인',positionNote:'공식 목록의 도로명 주소를 확인했습니다. 건물 좌표를 확인하기 전에는 지도 핀을 표시하지 않습니다. 네이버 지도에서 상호와 주소를 확인하세요.',times:{hagye:null,nowon:null,gongneung:null},surface:'잔디 종류 미확인',outdoor:null,indoor:null,parking:null,parkingText:'주차공간·요금 미확인',dogRule:'반려동물 동반 업소 등록 확인 · 리드줄/이동가방·허용 구역·체중 조건은 매장 문의',weightLimit:null,exclusive:false,kids:'어린이 동반 조건 미확인',hours:'영업시간 미확인',hoursNote:'공식 업소 현황에는 영업시간·휴무 정보가 없습니다. 방문 전 매장 안내를 확인하세요.',schedule:null,breaks:null,hoursConflict:false,fee:'반려견 입장료·음료 주문 조건 미확인',feeNote:'매장에 최신 이용요금을 확인하세요.',feature:'반려동물 동반 공식 등록 · '+region+' 카페·디저트',yard:'전용 반려견 운동장 여부 미확인',petArea:'동반 허용 구역 미확인 · 매장 문의',evidence:`${snapshot.checkedAt} 식품안전나라의 서울 반려동물 동반 가능 업소 현황에서 상호·주소·등록 업종(${row.indutyNm})을 확인했습니다. 전화·현장 확인은 하지 않았습니다.`,level:'official',checks:['오늘 영업 여부와 마감시간','반려견 허용 구역·체중·리드줄/이동가방 조건','주차·반려견 입장료 및 음료 주문 조건'],sources,checkedAt:snapshot.checkedAt,status:'listed',category:'companion',playground:null,companionModes:[],terrace:null,registerNumber:row.rnum,registerIndustry:row.indutyNm,...extra};
 p.sources=[...sources,...(extra.sources||[])];data.places.push(p);
 decisions.push({registerNumber:row.rnum,name:row.bsshNm,decision:'imported',id,reason:extraCafes.has(row.rnum)?'카페 소개 자료와 공식 등록 대조':row.indutyNm==='휴게음식점'?'휴게음식점 등록 · 카페/디저트 후보':'상호의 카페/커피/디저트 업종 표기'});
}
for(const [id,extra] of Object.entries(supplements))if(id.startsWith('seoul-extra-')){
 const template=data.places.find(p=>p.id.startsWith('seoul-mfds-'));
 const p={...template,...extra,id,number:data.places.length+1,registerNumber:null,registerIndustry:null,level:'owner'};
 data.places.push(p);
}
data.checkedAt=snapshot.checkedAt;
data.coverage={scope:'서울 25개 구 및 기존 서울 근교',complete:false,source:snapshot.source,checkedAt:snapshot.checkedAt,registerRows:snapshot.rows.length,note:'공식 동반 업소 현황에서 카페·디저트 업종을 선별하고 별도 확인한 운동장 카페를 보완했습니다. 미등록 업소와 카페 유형 미확인 업소가 있어 서울 전수 목록은 아닙니다.'};
fs.writeFileSync(path.join(base,'data/venues.json'),JSON.stringify(data,null,2)+'\n');
fs.writeFileSync(path.join(base,'data/seoul-import-audit.json'),JSON.stringify({checkedAt:snapshot.checkedAt,source:snapshot.source,decisions},null,2)+'\n');
console.log(`Imported ${data.places.length-7} Seoul cafés; total ${data.places.length}.`);
