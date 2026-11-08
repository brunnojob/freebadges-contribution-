import {repoPath,refPath,randomId} from './github.js?v=3.0.2';
export class Workflows {
  constructor(api,{log=()=>{},halt=()=>false,sleep=ms=>new Promise(r=>setTimeout(r,ms)),id=()=>randomId()}={}) {
    Object.assign(this,{api,log,halt,sleep,id}); this.receipts=[];
  }
  record(kind,url,extra={}) { const item={kind,url,...extra}; this.receipts.push(item); this.log(item); }
  checkpoint(){if(this.halt())throw new Error('STOPPED');}
  async preflight(name,user) {
    this.checkpoint(); const r=await this.api.request(repoPath(name));
    if(r.owner.login!==user.login || r.archived || r.disabled || !r.permissions?.push || r.fork) throw new Error('OWNED_WRITABLE_NON_FORK_REQUIRED');
    await this.api.request(`${repoPath(name)}/git/ref/heads/${refPath(r.default_branch)}`);
    return r;
  }
  async quickdraw(repo) {
    this.checkpoint(); const p=repoPath(repo.full_name);
    if(!repo.has_issues) throw new Error('ISSUES_DISABLED');
    const issue=await this.api.request(`${p}/issues`,'POST',{title:'Achievement Studio: workflow check',body:'Automated issue lifecycle check created by the repository owner using Achievement Studio.'});
    this.record('issue-opened',issue.html_url,{number:issue.number});
    // Always close a just-created issue, even when Stop is requested.
    const closed=await this.api.request(`${p}/issues/${issue.number}`,'PATCH',{state:'closed',state_reason:'completed'});
    if(closed.state!=='closed') throw new Error('ISSUE_NOT_CLOSED');
    const seconds=(Date.parse(closed.closed_at)-Date.parse(issue.created_at))/1000;
    this.record('issue-closed',closed.html_url,{seconds});
    if(seconds<0 || seconds>=300) throw new Error('QUICKDRAW_WINDOW_MISSED');
  }
  async pull(repo,{coauthor,reviewer,yolo=false}={}) {
    this.checkpoint(); const p=repoPath(repo.full_name), branch=`achievement-studio/${this.id()}`;
    const head=await this.api.request(`${p}/git/ref/heads/${refPath(repo.default_branch)}`);
    await this.api.request(`${p}/git/refs`,'POST',{ref:`refs/heads/${branch}`,sha:head.object.sha});
    this.record('branch-created',`https://github.com/${repo.full_name}/tree/${branch}`,{branch});
    this.checkpoint();
    const path=`.achievement-studio/${branch.split('/')[1]}.md`;
    const content=`# Achievement Studio workflow record\n\nAutomated GitHub workflow demonstration.\n\nMode: ${coauthor?'co-authored commit':reviewer?'unreviewed pull request':'pull request lifecycle'}\n`;
    const message='docs: record achievement workflow'+(coauthor?`\n\nCo-authored-by: ${coauthor.name || coauthor.login} <${coauthor.id}+${coauthor.login}@users.noreply.github.com>`:'');
    const file=await this.api.request(`${p}/contents/${path}`,'PUT',{branch,message,content:btoa(content)});
    const sha=file.commit.sha;
    this.record('commit-created',file.commit.html_url,{sha}); this.checkpoint();
    const pr=await this.api.request(`${p}/pulls`,'POST',{title:'docs: record GitHub workflow demonstration',head:branch,base:repo.default_branch,body:'Automated workflow demonstration. This PR adds only a clearly labeled record under `.achievement-studio/`. Badge eligibility is evaluated by GitHub.'});
    this.record('pr-opened',pr.html_url,{number:pr.number});
    if(reviewer) {
      try { await this.api.request(`${p}/pulls/${pr.number}/requested_reviewers`,'POST',{reviewers:[reviewer]}); }
      catch(error) {
        // Reviewer requests are optional; an ineligible reviewer must not block unrelated flows.
        if(![404,422].includes(error.status))throw error;
        this.record('review-request-skipped',pr.html_url,{reviewer,status:error.status});
      }
    }
    let rejected=false;
    for(let attempt=0;attempt<20;attempt++) {
      this.checkpoint(); const state=await this.api.request(`${p}/pulls/${pr.number}`);
      if(state.head.sha!==sha) throw new Error('PR_HEAD_CHANGED');
      if(state.merged) {this.record('pr-merged',pr.html_url,{sha:state.merge_commit_sha});return;}
      if(state.mergeable===null) {if(attempt===0)this.record('merge-pending',pr.html_url);await this.sleep(Math.min(1000+attempt*250,3000));continue;}
      if(state.mergeable===false) throw new Error('MERGE_CONFLICT');
      if(state.mergeable_state==='blocked')throw new Error('MERGE_BLOCKED');
      if(yolo) {
        const reviews=await this.api.all(`${p}/pulls/${pr.number}/reviews`);
        if(reviews.length) throw new Error('YOLO_ALREADY_REVIEWED');
      }
      const method=repo.allow_merge_commit?'merge':repo.allow_squash_merge?'squash':repo.allow_rebase_merge?'rebase':null;
      if(!method)throw new Error('MERGE_METHOD_UNAVAILABLE');
      let result;
      try {result=await this.api.request(`${p}/pulls/${pr.number}/merge`,'PUT',{sha,merge_method:method,...(method==='squash'?{commit_title:'docs: record achievement workflow',commit_message:message}:{})});}
      catch(error){
        if(![405,409,502,503].includes(error.status)&&!['NETWORK_ERROR','REQUEST_TIMEOUT'].includes(error.message))throw error;
        // Re-read GitHub's state before retrying an ambiguous or not-yet-ready merge.
        rejected=true;await this.sleep(Math.min(1000+attempt*250,3000));continue;
      }
      if(!result.merged)throw new Error('MERGE_NOT_CONFIRMED');
      this.record('pr-merged',pr.html_url,{sha:result.sha});
      try {await this.api.request(`${p}/git/refs/heads/${refPath(branch)}`,'DELETE');} catch {this.record('branch-retained',`https://github.com/${repo.full_name}/tree/${branch}`);}
      return;
    }
    throw new Error(rejected?'MERGE_REJECTED':'MERGEABILITY_PENDING');
  }
  async run(repo,modes,{coauthor,reviewer}={}) {
    if(modes.includes('pair') && !coauthor)throw new Error('PAIR_REQUIRED');
    if(modes.includes('quickdraw'))await this.quickdraw(repo);
    // Pair can also supply the first Pull Shark PR; YOLO can share the same merge.
    const pulls=modes.includes('pullshark')?2:modes.some(m=>m==='pair'||m==='yolo')?1:0;
    for(let i=0;i<pulls;i++)await this.pull(repo,{coauthor:i===0&&modes.includes('pair')?coauthor:undefined,reviewer:i===0&&modes.includes('yolo')?reviewer:undefined,yolo:i===0&&modes.includes('yolo')});
  }
  async contributions(repo,user,dates) {
    this.checkpoint(); const p=repoPath(repo.full_name), branch=`achievement-studio/history-${this.id()}`;
    const head=await this.api.request(`${p}/git/ref/heads/${refPath(repo.default_branch)}`);
    const base=await this.api.request(`${p}/git/commits/${head.object.sha}`);
    const blob=await this.api.request(`${p}/git/blobs`,'POST',{content:'Synthetic contribution history generated by Achievement Studio.\n',encoding:'utf-8'});
    const tree=await this.api.request(`${p}/git/trees`,'POST',{base_tree:base.tree.sha,tree:[{path:`.achievement-studio/${branch.split('/')[1]}.txt`,mode:'100644',type:'blob',sha:blob.sha}]});
    let parent=head.object.sha;
    await this.api.request(`${p}/git/refs`,'POST',{ref:`refs/heads/${branch}`,sha:parent});
    this.record('history-branch',`https://github.com/${repo.full_name}/tree/${branch}`,{branch});
    for(const [i,date] of dates.entries()) {
      this.checkpoint(); const author={name:user.name||user.login,email:`${user.id}+${user.login}@users.noreply.github.com`,date};
      const c=await this.api.request(`${p}/git/commits`,'POST',{message:`chore: synthetic contribution ${i+1}/${dates.length}`,tree:tree.sha,parents:[parent],author,committer:author});
      parent=c.sha;
      await this.api.request(`${p}/git/refs/heads/${refPath(branch)}`,'PATCH',{sha:parent,force:false});
      this.record('dated-commit',`https://github.com/${repo.full_name}/commit/${parent}`,{progress:i+1,total:dates.length});
      await this.sleep(1100);
    }
    this.checkpoint();
    const latest=await this.api.request(`${p}/git/ref/heads/${refPath(repo.default_branch)}`);
    if(latest.object.sha!==head.object.sha) throw new Error('DEFAULT_BRANCH_CHANGED_HISTORY_RETAINED');
    await this.api.request(`${p}/git/refs/heads/${refPath(repo.default_branch)}`,'PATCH',{sha:parent,force:false});
    this.record('history-published',`https://github.com/${repo.full_name}/commits/${encodeURIComponent(repo.default_branch)}`,{sha:parent});
  }
}
