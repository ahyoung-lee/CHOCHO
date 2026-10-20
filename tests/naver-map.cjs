const assert=require('node:assert/strict');
const create=require('../public/naver-map.js');
const scripts=[],errors=[],changes=[],ready=[];
const root={document:{head:{appendChild:s=>scripts.push(s)},createElement:()=>({remove(){}})},setTimeout:(fn,delay)=>{if(delay===0)ready.push(fn);return 1;},clearTimeout(){}};
const bridge=create(root,{element:{clientWidth:700,clientHeight:520},key:'test-key',onError:e=>errors.push(e),onChange:v=>changes.push(v),onReady(){}});
bridge.setView({lat:37.5,lng:127},12);
bridge.load();bridge.load();
assert.equal(scripts.length,1,'one SDK request while loading');
assert(scripts[0].src.includes('ncpKeyId=test-key'));
scripts[0].onerror();assert.equal(errors.length,1);
bridge.load();assert.equal(scripts.length,2,'failed SDK request can retry');
let count=0;const listeners={};
class LatLng{constructor(lat,lng){this.a=lat;this.b=lng;}lat(){return this.a;}lng(){return this.b;}}
class Map{constructor(el,opts){count++;this.center=opts.center;this.zoom=opts.zoom;}getCenter(){return this.center;}getZoom(){return this.zoom;}setOptions(o){this.center=o.center;this.zoom=o.zoom;}getProjection(){return {fromCoordToOffset:()=>({x:123,y:234})};}setSize(s){this.size=s;}destroy(){this.destroyed=true;}}
root.naver={maps:{Map,LatLng,Size:class{constructor(w,h){this.width=w;this.height=h;}},Position:{BOTTOM_LEFT:1,BOTTOM_RIGHT:2},Event:{addListener:(m,event,fn)=>{listeners[event]=fn;}}}};
root.initChochoNaverMap();assert.equal(count,0,'wait for SDK global to be published');ready.shift()();
assert.equal(count,1);assert.equal(bridge.map.getZoom(),12,'latest view survives delayed SDK load');
assert.deepEqual(bridge.project({lat:37.5,lng:127}),{x:123,y:234});
bridge.map.center=new LatLng(35.1,129.1);listeners.bounds_changed();
assert.equal(changes.at(-1).center.lat,35.1);
bridge.setView({lat:33.4,lng:126.5},10);assert.equal(bridge.map.getCenter().lat(),33.4);
bridge.load();assert.equal(count,1,'filter/render changes never recreate map');
bridge.resize();assert.equal(bridge.map.size.width,700);
root.navermap_authFailure();assert(errors.at(-1).includes('인증'));
const failedMap=bridge.map;bridge.load();assert(failedMap.destroyed,'retry disposes an unauthorized map');
root.initChochoNaverMap();ready.shift()();assert.equal(count,2,'authentication failure can retry');
console.log('PASS Naver SDK load, retry, delayed view, projection, drag sync, resize and authentication failure');
