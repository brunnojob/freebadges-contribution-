import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const guide=process.argv.includes('--guide');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..',guide?'docs':'app');
const arg=name=>{const i=process.argv.indexOf(name);return i<0?undefined:process.argv[i+1];};
const port=Number(arg('--port')||4173);
const host=guide?(arg('--host')||'127.0.0.1'):'127.0.0.1';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json'};
const local=new Set([`localhost:${port}`,`127.0.0.1:${port}`,`[::1]:${port}`]);
const server=http.createServer(async(req,res)=>{
  if(!guide&&!local.has(req.headers.host)){res.writeHead(403).end('Localhost only');return;}
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
  try{
    const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if(path!==root&&!path.startsWith(root+sep)){res.writeHead(403).end();return;}
    const file=(await stat(path)).isDirectory()?resolve(path,'index.html'):path;
    const bytes=await readFile(file);
    res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});
    res.end(req.method==='HEAD'?undefined:bytes);
  }catch{res.writeHead(404).end('Not found');}
});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'Port in use. Close the other instance or run npm start -- --port 4174.':error.message);process.exitCode=1;});
server.listen(port,host,()=>console.log(`${guide?'Guide preview':'Local automation'}: http://localhost:${port}\nPress Ctrl+C to stop.`));
