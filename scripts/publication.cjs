// Only fields needed by the public UI may leave the local source dataset.
const fields=('id number name address area region phone contactNote category categories companionModes playground largeDogPlayground largeDogPlaygroundEvidence playgroundWeightLimit playgroundWeightExclusive status level indoor outdoor terrace hoteling daycare grooming parking parkingText parkingNote petArea yard dogRule registrationNote weightLimit exclusive kids hours hoursNote hoursConflict schedule breaks fee feeNote feature surface times lat lng position positionNote checkedAt checks approximate').split(' ');
const pick=(value,keys)=>Object.fromEntries(keys.filter(key=>Object.hasOwn(value,key)).map(key=>[key,value[key]]));
function publicData(data){
 return {
  checkedAt:data.checkedAt,
  origins:Object.fromEntries(Object.entries(data.origins).map(([key,value])=>[key,pick(value,['name','lat','lng'])])),
  coverage:pick(data.coverage||{},['complete','mode','registeredCount']),
  places:data.places.map(place=>({
   ...pick(place,fields),
   ...(place.registration?{registration:pick(place.registration,['updatedAt'])}:{}),
   evidence:place.registration?'운영자가 직접 등록한 업체·동반 조건입니다. 전화·현장 확인을 뜻하지 않으며 방문 전 업체에 확인해 주세요.':place.evidence,
   sources:(place.sources||[]).map(source=>pick(source,['name','url','type','checkedAt']))
  }))
 };
}
const publicFiles=new Set(['index.html','styles.css','app.js','data.js','origin-search.js','naver-map.js','reveal.js','icon.svg']);
function assertPublicFile(file){
 const parts=file.split('/');
 const asset=parts[0]==='assets'&&parts.length>1&&parts.every(part=>part&&!part.startsWith('.'))&&/\.(png|jpe?g|webp|svg|ico|avif|gif)$/i.test(file);
 if(!publicFiles.has(file)&&!asset)throw new Error(`공개 배포가 허용되지 않은 파일: ${file}`);
}
module.exports={publicData,assertPublicFile};
