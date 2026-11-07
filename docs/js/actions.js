import {repoPath,randomId} from './github.js';
import {runnerFiles} from './runner-manifest.js';
const runnerName='freebadges-actions-v3';
export const encodeText=text=>btoa(String.fromCharCode(...new TextEncoder().encode(text)));
const decodeText=base64=>new TextDecoder().decode(Uint8Array.from(atob(base64.replace(/\s/g,'')),c=>c.charCodeAt(0)));
export function sealToken(value,key) {
  const publicKey=Uint8Array.from(atob(key),c=>c.charCodeAt(0));
  const bytes=new TextEncoder().encode(value);
  try{return btoa(String.fromCharCode(...window.sealedBox.seal(bytes,publicKey)));}finally{bytes.fill(0);}
}
export class ActionsRunner {
  constructor(api,{sleep=ms=>new Promise(r=>setTimeout(r,ms)),log=()=>{}}={}){Object.assign(this,{api,sleep,log});}
  async prepare(user) {
    const fullName=`${user.login}/${runnerName}`,p=repoPath(fullName);let repo;
    try{repo=await this.api.request(p);}catch(e){if(e.status!==404)throw e;repo=await this.api.request('/user/repos','POST',{name:runnerName,private:true,auto_init:true,description:'Private GitHub Actions executor for Freebadges Contribution'});this.log('runner-created');repo=await this.api.request(p);}
    if(repo.owner.login!==user.login||!repo.private||!repo.permissions?.admin||repo.archived)throw new Error('PRIVATE_RUNNER_REQUIRED');
    for(let i=0;i<8;i++){try{await this.api.request(`${p}/git/ref/heads/${repo.default_branch.split('/').map(encodeURIComponent).join('/')}`);break;}catch(e){if(![404,409].includes(e.status))throw e;if(i===7)throw new Error('RUNNER_PENDING');await this.sleep(2000);}}
    // Validate executable code before depositing any credentials.
    const paths=Object.keys(runnerFiles);
    for(const path of paths) {
      let file;try{file=await this.api.request(`${p}/contents/${path}`);}catch(e){if(e.status!==404)throw e;}
      if(file){if(decodeText(file.content)!==runnerFiles[path])throw new Error('RUNNER_CHANGED');}
      else{await this.api.request(`${p}/contents/${path}`,'PUT',{message:'Install Freebadges Actions executor',branch:repo.default_branch,content:encodeText(runnerFiles[path])});}
    }
    const workflows=await this.api.request(`${p}/contents/.github/workflows`);
    if(workflows.some(f=>f.name!=='achievement-runner.yml'))throw new Error('RUNNER_CHANGED');
    const workflow=`${p}/actions/workflows/achievement-runner.yml`;
    for(let i=0;i<8;i++){
      try{const w=await this.api.request(workflow);if(w.state!=='active')await this.api.request(`${workflow}/enable`,'PUT');return {...repo,full_name:fullName};}
      catch(e){if(e.status!==404)throw e;if(i===7)throw new Error('RUNNER_PENDING');await this.sleep(2000);}
    }
  }
  async dispatch(repo,plan,{secondaryApi}={}) {
    if(!repo.private||repo.owner.login!==plan.account||!repo.permissions?.admin)throw new Error('PRIVATE_RUNNER_REQUIRED');
    if(plan.modes.includes('pair')&&!secondaryApi)throw new Error('PAIR_REQUIRED');
    const p=repoPath(repo.full_name);
    await this.api.saveEncryptedSecret(repo.full_name,'CLASSIC_PAT',sealToken);
    if(plan.modes.includes('pair')){
      if(!secondaryApi)throw new Error('PAIR_REQUIRED');
      await secondaryApi.encryptFor(this.api,repo.full_name,'COAUTHOR_PAT',sealToken);
    }else{try{await this.api.request(`${p}/actions/secrets/COAUTHOR_PAT`,'DELETE');}catch(e){if(e.status!==404)throw e;}}
    const requestId=randomId();
    const result=await this.api.request(`${p}/actions/workflows/achievement-runner.yml/dispatches`,'POST',{ref:repo.default_branch,inputs:{request_id:requestId,plan:JSON.stringify(plan)}});
    return {repo:repo.full_name,requestId,url:result?.html_url||`https://github.com/${repo.full_name}/actions/workflows/achievement-runner.yml`,runId:result?.workflow_run_id};
  }
  async status(run) {
    const p=repoPath(run.repo);let state;
    if(run.runId)state=await this.api.request(`${p}/actions/runs/${run.runId}`);
    else {const result=await this.api.request(`${p}/actions/workflows/achievement-runner.yml/runs?event=workflow_dispatch&per_page=100`);state=result.workflow_runs.find(r=>r.display_title===`Freebadges ${run.requestId}`);}
    if(state){run.runId=state.id;run.url=state.html_url;return state;}return null;
  }
  async cancel(run){if(!run.runId)await this.status(run);if(!run.runId)throw new Error('RUNNER_PENDING');await this.api.request(`${repoPath(run.repo)}/actions/runs/${run.runId}/cancel`,'POST');}
  async clearSecrets(repo){for(const name of ['CLASSIC_PAT','COAUTHOR_PAT']){try{await this.api.request(`${repoPath(repo)}/actions/secrets/${name}`,'DELETE');}catch(e){if(e.status!==404)throw e;}}}
}
