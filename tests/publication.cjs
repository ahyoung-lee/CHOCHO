const assert=require('node:assert/strict');
const fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const source=require('../scripts/source-data.cjs').loadSourceData();
const published=require('../public/data.js');
const core=require('../public/app.js');
for(const p of published.places){
 assert.equal(p.registration?.file,undefined,'workbook filename must stay out of browser data');
 assert.equal(p.registration?.row,undefined,'workbook row must stay out of browser data');
 assert.equal(p.coordinateEvidence,undefined,'coordinate investigation must stay out of browser data');
 assert(!/\.xlsx|\d+행/.test(p.evidence),'public evidence must not expose workbook locations');
}
const {publicData,assertPublicFile}=require('../scripts/publication.cjs');
const extra=structuredClone(source);
extra.privateNotes='DO NOT PUBLISH';extra.places[0].privateNotes='DO NOT PUBLISH';
assert(!JSON.stringify(publicData(extra)).includes('DO NOT PUBLISH'),'new internal fields must not be published by default');
assert.deepEqual(published,publicData(source));
assert.deepEqual(publicData(published),published,'public-only builds must preserve the published dataset');
const tracked=execFileSync('git',['ls-files','-z'],{cwd:require('node:path').join(__dirname,'..'),encoding:'utf8'}).split('\0').filter(Boolean);
assert.deepEqual(tracked.filter(file=>file.startsWith('data/')||/\.(xlsx|xls|xlsm|xlsb)$/i.test(file)),[],'raw source files must not be tracked in the public repository');
for(const origin of Object.keys(source.origins)){
 const state={...core.defaultState(),origin};
 assert.deepEqual(core.filterPlaces(published,state).map(p=>p.id),core.filterPlaces(source,state).map(p=>p.id));
}
const state={...core.defaultState(),origin:'current'};
const location={name:'내 위치',lat:37.65,lng:127.06};
assert.deepEqual(core.filterPlaces({...published,origins:{...published.origins,current:location}},state).map(p=>p.id),core.filterPlaces({...source,origins:{...source.origins,current:location}},state).map(p=>p.id));
for(const file of ['index.html','data.js','assets/logo.png'])assert.doesNotThrow(()=>assertPublicFile(file));
for(const file of ['data/venues.json','assets/backup.xlsx','assets/.env','assets/raw.json','app.js.bak','.git/config','assets/source.js'])assert.throws(()=>assertPublicFile(file),file);
assert(!fs.readFileSync('public/index.html','utf8').includes('업체정보_간편입력.xlsx'));
console.log('PASS publication privacy, automatic nearby results and deploy file restrictions');
