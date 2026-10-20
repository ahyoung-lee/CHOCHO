// Offline exact-address lookup for the saved workbook venues only.
// The website does not call this public map search endpoint.
import fs from 'node:fs';
import {setTimeout as delay} from 'node:timers/promises';
import matcher from './apply-registered-coordinates.cjs';
const file='data/registered-kakao-address-cache.json';
const cache=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{};
const data=JSON.parse(fs.readFileSync('data/venues.json','utf8'));
for(const place of data.places){
 const query=matcher.streetAddress(place.address);
 if(!query)throw Error('Missing road address: '+place.address);
 if(cache[query])continue;
 const url='https://search.map.kakao.com/mapsearch/map.daum?'+new URLSearchParams({q:query,msFlag:'A',sort:'0'});
 const response=await fetch(url,{headers:{Referer:'https://map.kakao.com/','User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error('Stopped on HTTP '+response.status);
 const result=await response.json();
 // Keep only address evidence, never import unrelated discovered businesses.
 cache[query]={provider:'Kakao Map public address search',checkedAt:new Date().toISOString().slice(0,10),query,url,sourceUrl:'https://map.kakao.com/?q='+encodeURIComponent(query),addresses:(result.address||[]).map(({docid,addr,lat,lon,is_alive,d1_name,d2_name,d3_roadname,main_bunji,sub_bunji})=>({docid,addr,lat,lon,is_alive,d1_name,d2_name,d3_roadname,main_bunji,sub_bunji}))};
 fs.writeFileSync(file,JSON.stringify(cache,null,2)+'\n');
 console.log(place.name+': '+(matcher.selectAddressMatch(place,cache[query])?'EXACT':'UNRESOLVED'));
 await delay(1250);
}
