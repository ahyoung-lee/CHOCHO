const assert=require('node:assert/strict');
const {streetAddress,selectAddressMatch,applyCoordinates}=require('../scripts/apply-registered-coordinates.cjs');
const data=require('../data/venues.json'),cache=require('../data/registered-kakao-address-cache.json');
assert.equal(streetAddress('서울특별시 송파구 삼전로 53 뜨레피움 지하1층'),'서울 송파구 삼전로 53');
assert.equal(streetAddress('경기도 포천시 내촌면 매봉길 64-1 다동 1층'),'경기 포천시 내촌면 매봉길 64-1');
assert.equal(streetAddress('경기 성남시 수정구 위례광장로 328 우성위례타워 1층'),'경기 성남시 수정구 위례광장로 328');
let confirmedCount=0,unlocatedCount=0;
for(const p of data.places){
 const entry=cache[streetAddress(p.address)],match=selectAddressMatch(p,entry);
 if(!match){
  unlocatedCount++;
  assert.equal(p.lat,null,p.name+' must not receive guessed coordinates');
  assert.equal(p.lng,null);assert.equal(p.position,'좌표 미확인');
  assert.equal(p.coordinateEvidence,undefined);
  assert(!p.sources.some(source=>source.type==='등록 도로명 주소 좌표'));
  continue;
 }
 confirmedCount++;
 assert.equal(p.lat,Number(match.lat));assert.equal(p.lng,Number(match.lon));
 assert.equal(p.coordinateEvidence.matchedAddress,streetAddress(p.address));
 assert.equal(p.position,'도로명 주소 좌표 확인');
 assert.equal(selectAddressMatch({...p,address:p.address.replace(/ (\d+)/,' 99999')},entry),null,'different number must be rejected');
 assert.equal(selectAddressMatch(p,{...entry,addresses:entry.addresses.map(r=>({...r,addr:r.addr.replace(/ (\d+)/,' 99999')}))}),null);
 assert.equal(selectAddressMatch(p,{...entry,addresses:entry.addresses.map(r=>({...r,addr:r.addr.replace(/^\S+ \S+ /,'강원 춘천시 ')}))}),null,'different province/city must be rejected');
 const ambiguous={...entry,addresses:[match,{...match,lat:Number(match.lat)+.01}]};
 assert.equal(selectAddressMatch(p,ambiguous),null,'ambiguous coordinate candidates must be rejected');
}
const again=structuredClone(data);assert.equal(applyCoordinates(again,cache),confirmedCount);assert.deepEqual(again,data,'cache application must be idempotent');
const unregistered=structuredClone(data.places[0]);delete unregistered.registration;unregistered.lat=null;unregistered.lng=null;
assert.equal(applyCoordinates({places:[unregistered]},cache),0,'cache cannot import unregistered venues');
console.log(`PASS ${confirmedCount} exact registered address coordinates; ${unlocatedCount} explicitly unlocated venues, changed-address rejection, ambiguous match rejection and idempotence`);
