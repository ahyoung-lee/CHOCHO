// One-time, single-thread lookup of already known public business addresses.
// Policy: https://operations.osmfoundation.org/policies/nominatim/
// This is an offline data-maintenance task, not a website geocoding service.
import fs from 'node:fs';
import {setTimeout as delay} from 'node:timers/promises';
const venues=JSON.parse(fs.readFileSync('data/venues.json','utf8'));
const file='data/seoul-coordinate-cache.json';
const cache=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{};
async function saveCache(){
 // Windows/network drives can briefly lock a file during indexing; retry saving
 // the same response before sending another request, without truncating the cache.
 const pending=file+'.pending';
 for(let attempt=0;attempt<5;attempt++){
  try{fs.writeFileSync(pending,JSON.stringify(cache,null,2)+'\n');fs.renameSync(pending,file);return;}
  catch(error){if(attempt===4)throw error;await delay(500);}
 }
}
const limit=Number(process.argv[2]||venues.places.length);
let requests=0,matches=0;
for(const p of venues.places.filter(p=>p.lat===null).slice(0,limit)){
 const address=p.address.replace(/\(.*/, '').replace(/ (?:\d+층|\d+호).*$/, '').replace(/^서울 /,'서울특별시 ');
 if(cache[address])continue;
 const query=new URLSearchParams({q:address,format:'jsonv2',countrycodes:'kr',limit:'3',addressdetails:'1'});
 const url='https://nominatim.openstreetmap.org/search?'+query;
 const response=await fetch(url,{headers:{'User-Agent':'CHOCHO-OneTimeBusinessAddressImport/1.0 (https://github.com/ahyoung-lee/CHOCHO)','Accept-Language':'ko'},signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error(`Geocoder stopped on HTTP ${response.status}; cached results preserved.`);
 const results=await response.json();cache[address]={checkedAt:'2026-10-16',url,results};
 await saveCache();
 requests++;if(results.length)matches++;
 console.log(`${requests}: ${p.name}: ${results.length} result(s)`);
 if(requests>=limit)break;
 await delay(1200);
}
console.log(`Saved ${requests} lookups; ${matches} addresses returned candidates. Results require address/precision review before importing.`);
