const assert=require('node:assert/strict'),core=require('../public/app.js');
const center={name:'구리시 공설묘지',lat:37.6276431,lng:127.1338692};
const base={status:'active',category:'companion',position:'주소 좌표 확인',times:{},name:'가까운 업체'};
const places=[{...base,id:'far',name:'가나다 먼 업체',lat:center.lat+.2,lng:center.lng},{...base,id:'second',name:'가나다 두번째',lat:center.lat+.04,lng:center.lng},{...base,id:'first',name:'하하 제일 가까운 업체',lat:center.lat+.01,lng:center.lng},{...base,id:'unknown',lat:null,lng:null},{...base,id:'estimate',...center,position:'주변 위치 추정'}];
const data={origins:{current:center,custom:center},places};
for(const origin of ['current','custom']){
 const state={...core.defaultState(),origin,sort:'name'};
 assert.deepEqual(core.filterPlaces(data,state).map(p=>p.id),['first','second'],origin+' uses identical confirmed nearby records and distance ordering');
 assert.deepEqual(core.filterPlaces(data,{...state,query:'제일'}).map(p=>p.id),['first']);
 assert.equal(core.filterPlaces({...data,origins:{[origin]:{lat:35,lng:129}}},state).length,0);
}
console.log('PASS GPS and searched origins share a 10km confirmed-coordinate radius and nearest-first ordering');
