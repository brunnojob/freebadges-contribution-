import test from 'node:test';
import assert from 'node:assert/strict';
import {GitHub,starProgress,datesPlan} from '../docs/js/github.js';
import {Workflows} from '../docs/js/workflows.js';
const repo={full_name:'alice/demo',owner:{login:'alice'},permissions:{push:true},default_branch:'main',has_issues:true,allow_merge_commit:true};
function mock({reviewed=false,changed=false,blocked=false,historyMoved=false}={}){
 const calls=[];let pr=0,commits=0;
 return {calls,async all(path){calls.push({path});return reviewed?[{state:'COMMENTED'}]:[];},async request(path,method='GET',body){
 calls.push({path,method,body});
 if(method==='GET'&&path==='/repos/alice/demo')return repo;
 if(path.includes('/git/ref/heads/'))return {object:{sha:historyMoved&&commits?'moved':'base'}};
 if(method==='GET'&&path.endsWith('/git/commits/base'))return {tree:{sha:'base-tree'}};
 if(path.endsWith('/git/blobs'))return {sha:'blob'};
 if(path.endsWith('/git/trees'))return {sha:'tree'};
 if(path.endsWith('/git/commits'))return {sha:'dated-'+(++commits)};
 if(path.endsWith('/issues')&&method==='POST')return {number:1,html_url:'https://github.com/alice/demo/issues/1',created_at:'2026-01-01T00:00:00Z'};
 if(path.endsWith('/issues/1'))return {state:'closed',closed_at:'2026-01-01T00:00:03Z',html_url:'https://github.com/alice/demo/issues/1'};
 if(path.includes('/contents/'))return {commit:{sha:'pr-sha',html_url:'https://github.com/alice/demo/commit/pr-sha'}};
 if(path.endsWith('/pulls')&&method==='POST')return {number:++pr,html_url:'https://github.com/alice/demo/pull/'+pr};
 if(/\/pulls\/\d+$/.test(path)&&method==='GET')return {head:{sha:changed?'intruder':'pr-sha'},mergeable:true};
 if(path.endsWith('/merge')){if(blocked)throw new Error('VALIDATION_OR_RULES');return {merged:true,sha:'merged'};}
 return {};
 }};
}
test('combined run creates exactly two merged PRs, a closed issue and coauthor trailer',async()=>{
 const api=mock(),w=new Workflows(api,{id:()=>`run-${api.calls.length}`,sleep:async()=>{}});
 await w.run(repo,['quickdraw','pair','yolo','pullshark'],{coauthor:{id:2,login:'bob',name:'Bob'}});
 assert.equal(api.calls.filter(c=>c.path.endsWith('/merge')).length,2);
 assert.match(api.calls.find(c=>c.path.includes('/contents/')).body.message,/\n\nCo-authored-by: Bob <2\+bob@users.noreply.github.com>$/);
 assert.equal(w.receipts.filter(r=>r.kind==='pr-merged').length,2);
 assert.equal(w.receipts.find(r=>r.kind==='issue-closed').seconds,3);
 assert.ok(api.calls.some(c=>c.path.endsWith('/reviews')));
});
test('coauthor required before any mutations',async()=>{const api=mock();await assert.rejects(new Workflows(api).run(repo,['pair']),/PAIR_REQUIRED/);assert.equal(api.calls.length,0);});
test('changed PR head never merged',async()=>{const api=mock({changed:true});await assert.rejects(new Workflows(api).run(repo,['yolo']),/PR_HEAD_CHANGED/);assert.ok(!api.calls.some(c=>c.path.endsWith('/merge')));});
test('YOLO refuses reviewed PR even without requested reviewer',async()=>{const api=mock({reviewed:true});await assert.rejects(new Workflows(api).run(repo,['yolo']),/YOLO_ALREADY_REVIEWED/);assert.ok(!api.calls.some(c=>c.path.endsWith('/merge')));});
test('branch protection failure keeps PR evidence',async()=>{const api=mock({blocked:true}),w=new Workflows(api);await assert.rejects(w.run(repo,['pullshark']),/VALIDATION_OR_RULES/);assert.ok(w.receipts.some(r=>r.kind==='pr-opened'));assert.ok(!api.calls.some(c=>c.method==='DELETE'));});
test('stopped workflow still closes an issue already opened',async()=>{const api=mock(),w=new Workflows(api,{halt:()=>api.calls.length>0});await w.quickdraw(repo);assert.equal(w.receipts.at(-1).kind,'issue-closed');});
test('preflight refuses another owner, fork, archive or missing permission',async()=>{for(const r of [{...repo,owner:{login:'bob'}},{...repo,fork:true},{...repo,archived:true},{...repo,permissions:{push:false}}]){const w=new Workflows({request:async()=>r});await assert.rejects(w.preflight('alice/demo',{login:'alice'}),/OWNED_WRITABLE/);}});
test('dated history preserves base tree, uses dates and never forces branch',async()=>{const api=mock(),w=new Workflows(api,{sleep:async()=>{}}),dates=datesPlan('2026-01-01','2026-01-02',1);await w.contributions(repo,{id:1,login:'alice'},dates);const commits=api.calls.filter(c=>c.path.endsWith('/git/commits')&&c.method==='POST');assert.equal(commits.length,2);assert.equal(commits[0].body.parents[0],'base');assert.equal(commits[1].body.parents[0],'dated-1');assert.equal(commits[0].body.author.date,dates[0]);assert.ok(api.calls.filter(c=>c.method==='PATCH').every(c=>c.body.force===false));assert.equal(api.calls.find(c=>c.path.endsWith('/git/trees')).body.base_tree,'base-tree');});
test('concurrent default branch update leaves history on separate branch',async()=>{const api=mock({historyMoved:true});await assert.rejects(new Workflows(api,{sleep:async()=>{}}).contributions(repo,{id:1,login:'alice'},['2026-01-01T12:00:00Z']),/DEFAULT_BRANCH_CHANGED/);assert.ok(!api.calls.some(c=>c.method==='PATCH'&&c.path.endsWith('/heads/main')));});
test('calendar rejects invalid dates, futures, fractional counts and oversized plans',()=>{for(const v of [['2026-02-30','2026-03-01',1],['2026-01-02','2026-01-01',1],['2026-01-01','2099-01-01',1],['2026-01-01','2026-01-01',1.5],['2020-01-01','2026-01-01',20]])assert.throws(()=>datesPlan(...v));assert.equal(datesPlan('2024-02-28','2024-03-01',2).length,6);});
test('Starstruck uses maximum eligible repository, not total stars',()=>{const r=stars=>({owner:{login:'alice'},stargazers_count:stars});const p=starProgress([r(10),r(12),{...r(1000),fork:true},{...r(500),private:true}], 'alice');assert.equal(p.stars,12);assert.equal(p.next,16);});
test('GitHub token only sent to fixed API host and cleared on disconnect',async()=>{const calls=[],api=new GitHub('secret',async(url,args)=>{calls.push({url,args});return {ok:true,status:200,json:async()=>({login:'alice'})};});await api.request('/user');assert.equal(calls[0].url,'https://api.github.com/user');assert.equal(calls[0].args.headers.Authorization,'Bearer secret');assert.equal(calls[0].args.redirect,'error');await assert.rejects(api.request('//evil.test'),/INVALID_PATH/);api.clear();await assert.rejects(api.request('/user'),/AUTH_REQUIRED/);});
test('API errors never include server response or token',async()=>{const api=new GitHub('secret',async()=>({ok:false,status:403,headers:new Headers()}));await assert.rejects(api.request('/user'),e=>e.message==='PERMISSION_OR_RATE_LIMIT'&&!e.message.includes('secret'));});
