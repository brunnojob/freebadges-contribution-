import {writeFile,appendFile} from 'node:fs/promises';
import {GitHub,datesPlan} from '../docs/js/github.js';
import {Workflows} from '../docs/js/workflows.js';
export function validatePlan(value) {
  if(!value||typeof value!=='object'||!['badges','history'].includes(value.kind)||!Array.isArray(value.modes)||value.modes.some(m=>!['quickdraw','pullshark','pair','yolo'].includes(m))||new Set(value.modes).size!==value.modes.length)throw new Error('INVALID_PLAN');
  if(!/^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9_.-]{1,100}$/.test(value.repository)||!/^[A-Za-z0-9-]{1,39}$/.test(value.account)||value.repository.split('/')[0].toLowerCase()!==value.account.toLowerCase())throw new Error('INVALID_PLAN');
  if(value.reviewer&&!/^[A-Za-z0-9-]{1,39}$/.test(value.reviewer))throw new Error('INVALID_PLAN');
  if(value.kind==='badges'&&!value.modes.length)throw new Error('INVALID_PLAN');
  if(value.kind==='badges'&&value.modes.includes('pair')&&!/^[A-Za-z0-9-]{1,39}$/.test(value.coauthor||''))throw new Error('INVALID_PLAN');
  if(value.kind==='history')datesPlan(value.start,value.end,value.daily);
  return value;
}
export async function runPlan(plan,{api,secondaryApi,actor,engineFactory=api=>new Workflows(api)}={}) {
  validatePlan(plan);const user=await api.request('/user');
  if(user.login.toLowerCase()!==plan.account.toLowerCase()||actor?.toLowerCase()!==user.login.toLowerCase())throw new Error('ACCOUNT_MISMATCH');
  let coauthor;
  if(plan.modes.includes('pair')){if(!secondaryApi)throw new Error('PAIR_REQUIRED');coauthor=await secondaryApi.request('/user');if(coauthor.login.toLowerCase()!==(plan.coauthor||'').toLowerCase()||coauthor.login===user.login)throw new Error('PAIR_REQUIRED');}
  const engine=engineFactory(api),repo=await engine.preflight(plan.repository,user);
  if(plan.kind==='history')await engine.contributions(repo,user,datesPlan(plan.start,plan.end,plan.daily));
  else await engine.run(repo,plan.modes,{coauthor,reviewer:plan.reviewer||undefined});
  return engine.receipts;
}
async function main(){
 const api=new GitHub(process.env.CLASSIC_PAT||''),secondaryApi=process.env.COAUTHOR_PAT?new GitHub(process.env.COAUTHOR_PAT):undefined;
 const report={tool:'Freebadges Contribution',started:new Date().toISOString(),operations:[],badgeAwardVerified:false};let failed=false;
 try{
  const plan=validatePlan(JSON.parse(process.env.PLAN_JSON||'null'));
  const log=item=>{report.operations.push({...item,time:new Date().toISOString()});console.log(`${item.kind}${item.progress?' '+item.progress+'/'+item.total:''}`);};
  await runPlan(plan,{api,secondaryApi,actor:process.env.GITHUB_ACTOR,engineFactory:a=>new Workflows(a,{log})});
 }catch(e){failed=true;report.error=/^[A-Z_0-9]+$/.test(e.message)?e.message:'EXECUTION_FAILED';console.error(report.error);}
 finally{api.clear();secondaryApi?.clear();await writeFile('execution-report.json',JSON.stringify(report,null,2));if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,`## Freebadges Contribution\n\n${failed?'Execution stopped. Inspect the report before repeating.':'GitHub operations completed. Badge issuance is evaluated separately by GitHub.'}\n\n${report.operations.map(r=>`- ${r.kind}: ${r.url}`).join('\n')}\n`);}
 if(failed)process.exitCode=1;
}
if(process.env.FREEBADGES_RUNNER==='1')await main();
