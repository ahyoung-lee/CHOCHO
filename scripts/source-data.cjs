const fs=require('node:fs'),path=require('node:path');
// Full import sources stay local. Public CI uses only the published UI dataset.
function loadSourceData(root=path.join(__dirname,'..')){
 const source=path.join(root,'data/venues.json');
 if(fs.existsSync(source))return JSON.parse(fs.readFileSync(source,'utf8'));
 const published=path.join(root,'public/data.js');
 delete require.cache[require.resolve(published)];
 return require(published);
}
module.exports={loadSourceData};
