const assert=require('node:assert/strict'),fs=require('node:fs');
const core=require('../public/app.js'),{validate}=require('../scripts/validate-data.cjs');
const base={...require('../data/venues.json').places[0],category:'playground',playground:true,categories:['playground','companion','restaurant']};
const data={origins:require('../data/venues.json').origins,places:[
 {...base,id:'both',hoteling:true,daycare:true,grooming:false},
 {...base,id:'hotel',hoteling:true,daycare:false,grooming:true},
 {...base,id:'unknown',hoteling:null,daycare:null,grooming:null},
 {...base,id:'no',hoteling:false,daycare:false,grooming:false}
]};
const run=overrides=>core.filterPlaces(data,{...core.defaultState(),...overrides}).map(p=>p.id).sort();
assert.deepEqual(run({hoteling:true}),['both','hotel']);
assert.deepEqual(run({daycare:true}),['both']);
assert.deepEqual(run({grooming:true}),['hotel']);
assert.deepEqual(run({hoteling:true,daycare:true}),['both']);
assert.deepEqual(run({category:'restaurant',daycare:true}),['both']);
assert.deepEqual(run({category:'companion',favorite:true,favorites:['hotel']}),['hotel']);
for(const key of ['hoteling','daycare','grooming'])assert.throws(()=>validate({...data,places:[{...base,[key]:'1'}]}));
assert.throws(()=>validate({...data,places:[{...base,categories:['unknown']}]}));
const html=fs.readFileSync(__dirname+'/../public/index.html','utf8');
assert.deepEqual([...html.matchAll(/data-toggle="([^"]+)"/g)].map(x=>x[1]),['parking','indoor','terrace','hoteling','daycare','grooming','favorite']);
console.log('PASS registered services, overlapping categories, unknown values and saved-filter order');
