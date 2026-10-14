import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))),process.argv.includes('--dist')?'dist':'public');
const rawPort=process.env.PORT||'3000',port=Number(rawPort);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT는 1–65535 사이 정수여야 합니다.');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json; charset=utf-8'};
http.createServer(async(req,res)=>{
 try{
  const raw=new URL(req.url,'http://localhost').pathname;
  const requested=decodeURIComponent(raw);if(requested.includes('\0'))throw new Error();
  const file=path.resolve(root,'.'+(requested==='/'?'/index.html':requested));
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end('Forbidden');return;}
  const real=await fs.realpath(file);if(!real.startsWith(root+path.sep)){res.writeHead(403);res.end('Forbidden');return;}
  const content=await fs.readFile(real);res.writeHead(200,{'Content-Type':types[path.extname(real)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});res.end(content);
 }catch(_){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`CHOCHO: http://localhost:${port}`));
