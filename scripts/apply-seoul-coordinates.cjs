const fs=require('node:fs'),path=require('node:path');
const {distanceKm}=require('../public/app.js');
function selectAddressMatch(place,results){
 const m=place.address.match(/^서울(?:특별시)?\s+([가-힣]+구)\s+([^\s]+(?:로|길))\s+(\d+(?:-\d+)?)/);
 if(!m)return null;
 const [,borough,road,house]=m;
 let matches=results.filter(r=>r.address?.borough===borough&&r.address?.road===road&&r.address?.house_number===house&&r.address?.city==='서울특별시'&&Number(r.lat)>37.4&&Number(r.lat)<37.75&&Number(r.lon)>126.7&&Number(r.lon)<127.25);
 // Different legal dong is an ambiguous/wrong match even if road/number agree.
 matches=matches.filter(r=>!r.address.quarter||!place.area||place.area===place.region||r.address.quarter===place.area);
 const building=place.address.match(/\((\d+)동\s/);
 if(building){const exact=matches.filter(r=>r.name===building[1]||r.address.building===building[1]);if(exact.length)matches=exact;}
 if(!matches.length)return null;
 const first=matches[0],lat=Number(first.lat),lng=Number(first.lon);
 // A shared street number can identify a large complex. Do not choose an arbitrary building.
 if(matches.some(r=>distanceKm({lat,lng},{lat:Number(r.lat),lng:Number(r.lon)})>.12))return null;
 return {lat,lng,osmType:first.osm_type,osmId:first.osm_id};
}
module.exports={selectAddressMatch};
if(require.main===module){
 const root=path.join(__dirname,'..'),data=JSON.parse(fs.readFileSync(path.join(root,'data/venues.json'),'utf8')),cache=JSON.parse(fs.readFileSync(path.join(root,'data/seoul-coordinate-cache.json'),'utf8'));
 let count=0;
 for(const p of data.places.filter(p=>p.lat===null)){
  const address=p.address.replace(/\(.*/, '').replace(/ (?:\d+층|\d+호).*$/, '').replace(/^서울 /,'서울특별시 '),entry=cache[address];
  const match=entry&&selectAddressMatch(p,entry.results);if(!match)continue;
  p.lat=match.lat;p.lng=match.lng;p.position='도로명 주소 좌표 확인';
  p.positionNote='공식 등록 주소의 자치구·도로명·건물번호와 일치하는 OpenStreetMap 주소 위치입니다. 같은 건물의 다른 점포가 검색될 수 있으며 카페 출입구·층·현재 영업을 확인한 좌표는 아닙니다. 네이버 지도에서 매장 위치를 재확인하세요.';
  p.sources.push({name:'OpenStreetMap · 도로명 주소 좌표',url:`https://www.openstreetmap.org/${match.osmType}/${match.osmId}`,type:'ODbL · 자치구/도로명/건물번호 일치 · '+entry.checkedAt});count++;
 }
 fs.writeFileSync(path.join(root,'data/venues.json'),JSON.stringify(data,null,2)+'\n');console.log(`Applied ${count} matching address coordinates; ${data.places.filter(p=>p.lat===null).length} remain unconfirmed.`);
}
