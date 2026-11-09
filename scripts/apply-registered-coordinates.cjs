const fs=require('node:fs'),path=require('node:path');
function streetAddress(address){
 const match=String(address).trim().match(/^(.+?\s[^\s]+(?:로|길))\s+(\d+(?:-\d+)?)(?=\s|$)/);
 return match?`${match[1]} ${match[2]}`.replace(/^서울특별시 /,'서울 ').replace(/^경기도 /,'경기 ').replace(/\s+/g,' '):null;
}
function addressQuery(address){
 const normalized=String(address).trim().replace(/^서울특별시 /,'서울 ').replace(/^경기도 /,'경기 ').replace(/^(인천|부산)광역시 /,'$1 ').replace(/\s+/g,' ');
 return streetAddress(normalized)??normalized.match(/^.+?\s[^\s]+[동리가] (?:산 ?)?\d+(?:-\d+)?(?=\s|$)/)?.[0]??null;
}
function selectAddressMatch(place,entry){
 const expected=addressQuery(place.address);
 if(!expected||entry?.query!==expected)return null;
 const matches=(entry.addresses||[]).filter(r=>r.addr?.trim()===expected&&r.is_alive==='Y'&&Number.isFinite(Number(r.lat))&&Number.isFinite(Number(r.lon))&&Number(r.lat)>33&&Number(r.lat)<39&&Number(r.lon)>124&&Number(r.lon)<132);
 if(!matches.length)return null;
 if(matches.some(r=>Math.abs(Number(r.lat)-Number(matches[0].lat))>.00001||Math.abs(Number(r.lon)-Number(matches[0].lon))>.00001))return null;
 return matches[0];
}
function applyCoordinates(data,cache){
 let count=0;
 for(const place of data.places){
  if(!place.registration)continue;
  const query=addressQuery(place.address),entry=cache[query],match=selectAddressMatch(place,entry);
  if(!match)continue;
  const road=Boolean(streetAddress(query));
  place.lat=Number(match.lat);place.lng=Number(match.lon);place.position=road?'도로명 주소 좌표 확인':'주소 좌표 확인';
  place.positionNote=road?'등록 주소의 시·군·구·도로명·건물번호가 일치하는 카카오맵 주소 위치입니다. 건물 기준 좌표이며 매장 출입구·층·현재 영업 여부는 방문 전 확인하세요.':'등록 지번 주소와 일치하는 카카오맵 위치입니다. 필지 기준 좌표이며 매장 출입구·층·현재 영업 여부는 방문 전 확인하세요.';
  place.coordinateEvidence={provider:'Kakao Map public address search',query,matchedAddress:match.addr,addressId:match.docid,checkedAt:entry.checkedAt,precision:road?'street-address':'parcel-address',sourceUrl:entry.sourceUrl};
  place.sources=place.sources.filter(s=>!['등록 도로명 주소 좌표','등록 지번 주소 좌표'].includes(s.type));
  const type=road?'등록 도로명 주소 좌표':'등록 지번 주소 좌표';
  const source={name:'카카오맵 · '+type,url:entry.sourceUrl,type,checkedAt:entry.checkedAt};
  const registrationIndex=place.sources.findIndex(s=>s.type==='사용자 직접 등록 주소 검색');
  place.sources.splice(registrationIndex<0?place.sources.length:registrationIndex,0,source);
  count++;
 }
 return count;
}
module.exports={streetAddress,addressQuery,selectAddressMatch,applyCoordinates};
if(require.main===module){
 const root=path.join(__dirname,'..'),file=path.join(root,'data/venues.json'),data=JSON.parse(fs.readFileSync(file,'utf8')),cache=require('../data/registered-kakao-address-cache.json');
 const count=applyCoordinates(data,cache);
 fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');
 console.log(`Applied ${count}/${data.places.length} exact registered address coordinates.`);
}
