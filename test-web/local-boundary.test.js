import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import http from 'node:http';
test('public guide has no token fields, workflow engine or network access',async()=>{
 const html=await readFile('docs/index.html','utf8');
 assert.match(html,/connect-src 'none'/);
 assert.doesNotMatch(html,/<input|js\/app\.js|id="token"/);
 const files=await readdir('docs/js');assert.deepEqual(files.sort(),['guide-data.js','guide.js']);
 const script=await readFile('docs/js/guide.js','utf8');assert.doesNotMatch(script,/\bfetch\s*\(|Authorization|new GitHub/);
});
test('local automation rejects remote hosting in UI and binds only to loopback',async()=>{
 const app=await readFile('app/js/app.js','utf8');assert.match(app,/LOCALHOST_ONLY/);
 const server=await readFile('scripts/serve.mjs','utf8');assert.match(server,/guide\?\(arg\('--host'\)\|\|'127\.0\.0\.1'\):'127\.0\.0\.1'/);
 const port=20000+Math.floor(Math.random()*20000);
 const child=spawn(process.execPath,['scripts/serve.mjs','--port',String(port),'--host','0.0.0.0'],{stdio:['ignore','pipe','pipe']});
 try{
  await Promise.race([once(child.stdout,'data'),once(child,'error').then(([e])=>{throw e;})]);
  const response=await fetch(`http://127.0.0.1:${port}`);assert.equal(response.status,200);assert.match(await response.text(),/js\/app.js/);
  assert.equal((await fetch(`http://127.0.0.1:${port}/js/github.js`)).status,200);
  assert.equal((await fetch(`http://127.0.0.1:${port}/guide.js`)).status,404);
  const rejected=await new Promise((resolve,reject)=>http.get({hostname:'127.0.0.1',port,headers:{Host:`evil.example:${port}`}},res=>{res.resume();resolve(res.statusCode);}).on('error',reject));
  assert.equal(rejected,403);
 }finally{child.kill();await once(child,'exit');}
});
