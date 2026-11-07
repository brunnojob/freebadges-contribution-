import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {GitHub} from '../docs/js/github.js';
import {ActionsRunner} from '../docs/js/actions.js';
import {runnerFiles} from '../docs/js/runner-manifest.js';
import {validatePlan,runPlan} from '../scripts/actions-runner.mjs';
const user={login:'alice'},repo={full_name:'alice/freebadges-actions-v3',owner:user,private:true,permissions:{admin:true},default_branch:'main'};
const valid={kind:'badges',account:'alice',repository:'alice/target',modes:['quickdraw']};
test('Pages contains authentication and crypto; no loopback gate or third-party scripts',async()=>{
 const html=await readFile('docs/index.html','utf8'),app=await readFile('docs/js/app.js','utf8');assert.match(html,/js\/app.js/);assert.match(html,/vendor\/crypto\/sealedbox.web.js/);assert.doesNotMatch(app,/LOCALHOST_ONLY/);assert.doesNotMatch(html,/<script[^>]*src="https?:/);assert.match(html,/connect-src https:\/\/api.github.com/);
});
test('installer verifies private executor code before saving any secrets',async()=>{
 const calls=[],api={async request(path,method='GET',body){calls.push({path,method,body});if(path.endsWith('/actions/workflows/achievement-runner.yml'))return {state:'active'};if(path.endsWith('/contents/.github/workflows'))return [{name:'achievement-runner.yml'}];const file=Object.keys(runnerFiles).find(f=>path.endsWith('/contents/'+f));if(file)return {content:Buffer.from(runnerFiles[file]).toString('base64')};return repo;}};
 const executor=await new ActionsRunner(api).prepare(user);assert.equal(executor.full_name,repo.full_name);assert.ok(!calls.some(c=>c.path.includes('/secrets')));
 api.request=async path=>path.includes('/contents/')?{content:Buffer.from('tampered').toString('base64')}:repo;
 await assert.rejects(new ActionsRunner(api).prepare(user),/RUNNER_CHANGED/);
});
test('installer rejects public or other-account executor',async()=>{for(const r of [{...repo,private:false},{...repo,owner:{login:'bob'}},{...repo,permissions:{admin:false}}])await assert.rejects(new ActionsRunner({request:async()=>r}).prepare(user),/PRIVATE_RUNNER_REQUIRED/);});
test('dispatch inputs contain plan and correlation ID, never tokens',async()=>{
 const calls=[],api={async saveEncryptedSecret(repository,name){calls.push({secret:name,repository});},async request(path,method,body){calls.push({path,method,body});return null;}};
 const result=await new ActionsRunner(api).dispatch(repo,valid);
 assert.equal(result.repo,repo.full_name);const payload=calls.find(c=>c.path?.endsWith('/dispatches')).body;assert.deepEqual(Object.keys(payload.inputs).sort(),['plan','request_id']);assert.deepEqual(JSON.parse(payload.inputs.plan),valid);assert.equal(calls[0].secret,'CLASSIC_PAT');
});
test('pair dispatch requires secondary credentials before saving secrets',async()=>{const api={saveEncryptedSecret:async()=>assert.fail('credential saved')};await assert.rejects(new ActionsRunner(api).dispatch(repo,{...valid,modes:['pair']}),/PAIR_REQUIRED/);});
test('secret API only receives encrypted values; secondary encrypts for primary repository',async()=>{
 const primaryCalls=[],transport=async(url,args)=>{primaryCalls.push({url,args});return {ok:true,status:args.method==='GET'?200:204,json:async()=>({key:'public-key',key_id:'key-id'})};};
 const primary=new GitHub('primary-secret',transport),secondary=new GitHub('secondary-secret',()=>assert.fail('secondary attempted to write runner'));
 await secondary.encryptFor(primary,repo.full_name,'COAUTHOR_PAT',(value,key)=>{assert.equal(value,'secondary-secret');assert.equal(key,'public-key');return 'ciphertext';});
 const write=primaryCalls.find(c=>c.args.method==='PUT');assert.deepEqual(JSON.parse(write.args.body),{encrypted_value:'ciphertext',key_id:'key-id'});assert.equal(write.args.headers.Authorization,'Bearer primary-secret');
});
test('status correlation selects the exact submitted run',async()=>{const api={request:async()=>({workflow_runs:[{id:1,display_title:'Freebadges other'},{id:2,display_title:'Freebadges exact',status:'completed',conclusion:'success',html_url:'https://github.com/alice/x/actions/runs/2'}]})};const state=await new ActionsRunner(api).status({repo:repo.full_name,requestId:'exact'});assert.equal(state.id,2);});
test('runner rejects mismatched account and invalid modes before mutations',async()=>{
 assert.throws(()=>validatePlan({...valid,modes:['admin']}),/INVALID_PLAN/);assert.throws(()=>validatePlan({...valid,repository:'bob/repo'}),/INVALID_PLAN/);
 await assert.rejects(runPlan(valid,{api:{request:async()=>({login:'bob'})},actor:'bob'}),/ACCOUNT_MISMATCH/);
 await assert.rejects(runPlan(valid,{api:{request:async()=>user},actor:'eve'}),/ACCOUNT_MISMATCH/);
});
test('runner checks secondary account before any target operations',async()=>{await assert.rejects(runPlan({...valid,modes:['pair'],coauthor:'bob'},{api:{request:async()=>user},secondaryApi:{request:async()=>user},actor:'alice',engineFactory:()=>assert.fail('target changed')}),/PAIR_REQUIRED/);});
test('runner routes a valid plan to shared workflow engine',async()=>{let invoked=false;const result=await runPlan(valid,{api:{request:async()=>user},actor:'alice',engineFactory:()=>({receipts:[{kind:'done'}],preflight:async()=>({full_name:'alice/target'}),run:async(r,modes)=>{assert.equal(r.full_name,'alice/target');assert.deepEqual(modes,['quickdraw']);invoked=true;}})});assert.ok(invoked);assert.equal(result[0].kind,'done');});
test('vendored browser sealed box interoperates with system libsodium',async t=>{
 const context=vm.createContext({crypto:webcrypto,Uint8Array,Float64Array,Int32Array,Uint32Array,ArrayBuffer});vm.runInContext('this.window=this;this.self=this;',context);
 vm.runInContext(await readFile('docs/vendor/crypto/nacl-fast.min.js','utf8'),context);vm.runInContext(await readFile('docs/vendor/crypto/sealedbox.web.js','utf8'),context);
 const pair=context.nacl.box.keyPair(),message=new TextEncoder().encode('test-token-never-a-real-credential'),sealed=context.sealedBox.seal(message,pair.publicKey);
 const data={pk:Buffer.from(pair.publicKey).toString('hex'),sk:Buffer.from(pair.secretKey).toString('hex'),cipher:Buffer.from(sealed).toString('hex')};
 const code=`import ctypes,json,sys\nd=json.load(sys.stdin)\ns=ctypes.CDLL('libsodium.so.23')\ns.sodium_init()\nc=bytes.fromhex(d['cipher']);out=ctypes.create_string_buffer(len(c)-48)\nr=s.crypto_box_seal_open(out,c,len(c),bytes.fromhex(d['pk']),bytes.fromhex(d['sk']))\nassert r==0\nprint(out.raw.decode())`;
 const python=spawnSync('python3',['-c',code],{input:JSON.stringify(data),encoding:'utf8'});
 if(python.error||python.stderr.includes('cannot open shared object')){t.skip('System libsodium unavailable; JS round-trip remains checked');assert.deepEqual(context.sealedBox.open(sealed,pair.publicKey,pair.secretKey),message);return;}
 assert.equal(python.status,0,python.stderr);assert.equal(python.stdout.trim(),'test-token-never-a-real-credential');
});
test('runner manifest exactly matches reviewed sources',async()=>{for(const [file,content]of Object.entries(runnerFiles)){if(file==='package.json')continue;assert.equal(content,await readFile(file,'utf8'),file);}});
