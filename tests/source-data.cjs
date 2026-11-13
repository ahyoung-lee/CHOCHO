const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {loadSourceData}=require('../scripts/source-data.cjs');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'chocho-source-'));
try{
 fs.mkdirSync(path.join(directory,'public'));
 fs.mkdirSync(path.join(directory,'data'));
 fs.writeFileSync(path.join(directory,'public/data.js'),'module.exports={places:[],published:true};');
 assert.equal(loadSourceData(directory).published,true,'clean checkout must build from public data');
 fs.writeFileSync(path.join(directory,'data/venues.json'),JSON.stringify({places:[],private:true}));
 assert.equal(loadSourceData(directory).private,true,'local workbook imports must take priority');
 fs.writeFileSync(path.join(directory,'data/venues.json'),'broken');
 assert.throws(()=>loadSourceData(directory),'corrupt source must fail rather than deploy stale data');
 console.log('PASS public-only checkout, local source priority and corrupt source rejection');
}finally{fs.rmSync(directory,{recursive:true,force:true});}
