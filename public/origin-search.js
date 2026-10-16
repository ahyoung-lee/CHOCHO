(function(root){
'use strict';
function parseFeature(feature){
 const p=feature?.properties||{},coordinates=feature?.geometry?.coordinates;
 if(feature?.geometry?.type!=='Point'||!Array.isArray(coordinates))return null;
 const [lng,lat]=coordinates;
 if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>85||Math.abs(lng)>180||p.countrycode!=='KR')return null;
 const street=[p.street,p.housenumber].filter(Boolean).join(' ');
 const address=[...new Set([p.state,p.city,p.district,p.locality,street].filter(Boolean))].join(' ');
 const name=p.name||street||p.city||p.district;
 if(!name)return null;
 const approximate=['street','locality','district','city','county','state'].includes(p.type);
 return {name,address:address||name,lat,lng,approximate};
}
function createLookup(fetcher){
 const cache=new Map();
 return async function lookup(query,signal){
  const text=String(query).trim();if(!text)return [];
  if(cache.has(text))return cache.get(text);
  if(!fetcher)throw new Error('주소 검색을 사용할 수 없습니다.');
  // Only a submitted query is sent. Never attach the visitor's GPS coordinates.
  const url='https://photon.komoot.io/api/?'+new URLSearchParams({q:text,countrycode:'KR',limit:'6'});
  const response=await fetcher(url,{signal,referrerPolicy:'no-referrer'});
  if(!response.ok)throw new Error('주소 검색 응답 오류: '+response.status);
  const json=await response.json(),seen=new Set();
  const results=(Array.isArray(json.features)?json.features:[]).map(parseFeature).filter(Boolean).filter(p=>{const key=p.name+'|'+p.address+'|'+p.lat.toFixed(4)+'|'+p.lng.toFixed(4);if(seen.has(key))return false;seen.add(key);return true;});
  cache.set(text,results);return results;
 };
}
const api={parseFeature,createLookup};
if(typeof module!=='undefined')module.exports=api;else root.ORIGIN_SEARCH=api;
})(typeof window!=='undefined'?window:globalThis);
