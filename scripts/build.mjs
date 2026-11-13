import {readFile,writeFile,rm,cp,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const {validate}=createRequire(import.meta.url)('./validate-data.cjs');
const {publicData,assertPublicFile}=createRequire(import.meta.url)('./publication.cjs');
const {loadSourceData}=createRequire(import.meta.url)('./source-data.cjs');
async function checkPublicFiles(directory,prefix=''){
 for(const entry of await readdir(directory,{withFileTypes:true})){
  const relative=prefix+entry.name;
  if(entry.isSymbolicLink())throw new Error(`심볼릭 링크는 배포할 수 없습니다: ${relative}`);
  if(entry.isDirectory()){
   if(relative!=='assets'&&!relative.startsWith('assets/'))throw new Error(`공개 배포가 허용되지 않은 폴더: ${relative}`);
   await checkPublicFiles(path.join(directory,entry.name),relative+'/');
  }else assertPublicFile(relative);
 }
}
await checkPublicFiles(path.join(root,'public'));
const data=validate(publicData(validate(loadSourceData(root))));
const generated=`/* Generated public display data. Edit the local source and rebuild. */\n(function(root){const data=${JSON.stringify(data)};if(typeof module!=='undefined')module.exports=data;else root.CAFE_DATA=data;})(typeof window!=='undefined'?window:globalThis);\n`;
await writeFile(path.join(root,'public/data.js'),generated);
await rm(path.join(root,'dist'),{force:true,recursive:true});
await cp(path.join(root,'public'),path.join(root,'dist'),{recursive:true});
// Content versions prevent a new HTML page from loading cached scripts/data.
const indexPath=path.join(root,'dist/index.html');
let html=await readFile(indexPath,'utf8');
for(const asset of ['styles.css','data.js','origin-search.js','naver-map.js','app.js','reveal.js']){
 const version=createHash('sha256').update(await readFile(path.join(root,'dist',asset))).digest('hex').slice(0,12);
 html=html.replaceAll(`"${asset}"`,`"${asset}?v=${version}"`);
}
await writeFile(indexPath,html);
console.log(`Build complete: dist/ (${data.places.length} venues)`);
