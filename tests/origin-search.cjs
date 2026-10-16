const assert=require('node:assert/strict');
const search=require('../public/origin-search.js');
(async()=>{
 const feature=(overrides={})=>({geometry:{type:'Point',coordinates:[126.97,37.55]},properties:{name:'서울역',street:'한강대로',housenumber:'405',city:'서울특별시',countrycode:'KR',type:'house',...overrides}});
 assert.equal(search.parseFeature(feature()).lat,37.55);
 assert(search.parseFeature(feature()).address.includes('한강대로 405'));
 assert.equal(search.parseFeature({...feature(),geometry:{type:'Point',coordinates:[200,90]}}),null);
 assert.equal(search.parseFeature(feature({countrycode:'JP'})),null);
 assert.equal(search.parseFeature(feature({type:'street'})).approximate,true);
 let calls=0;
 const lookup=search.createLookup(async url=>{calls++;assert(url.startsWith('https://photon.komoot.io/api/'));assert(!url.includes('lat='));return {ok:true,json:async()=>({features:[feature(),feature()]})};});
 assert.equal((await lookup('서울역')).length,1);
 assert.equal((await lookup('서울역')).length,1);assert.equal(calls,1);
 assert.deepEqual(await lookup(' '),[]);assert.equal(calls,1);
 await assert.rejects(search.createLookup(async()=>({ok:false,status:429}))('서울역'));
 assert.deepEqual(await search.createLookup(async()=>({ok:true,json:async()=>({features:[]})}))('없는장소'),[]);
 console.log('PASS origin search: coordinates, labels, approximate areas, cache, request privacy and failures');
})().catch(e=>{console.error(e);process.exitCode=1;});
