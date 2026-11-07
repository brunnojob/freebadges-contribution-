import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve('docs');
const portIndex=process.argv.indexOf('--port');
const port=Number(portIndex<0?4173:process.argv[portIndex+1]);
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json'};
http.createServer(async(req,res)=>{try{const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(path!==root&&!path.startsWith(root+sep)){res.writeHead(403).end();return;}const file=(await stat(path)).isDirectory()?resolve(path,'index.html'):path;res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(await readFile(file));}catch{res.writeHead(404).end('Not found');}}).listen(port,'0.0.0.0',()=>console.log(`http://localhost:${port}`));
