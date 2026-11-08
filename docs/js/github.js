export class GitHub {
  #token;
  constructor(token, transport = fetch) { this.#token = token.trim(); this.transport = transport; }
  clear() { this.#token = ''; }
  async request(path, method = 'GET', body) {
    if (!this.#token) throw new Error('AUTH_REQUIRED');
    if (!path.startsWith('/') || path.startsWith('//') || path.includes('://')) throw new Error('INVALID_PATH');
    // Native browser fetch must be called without binding this GitHub instance.
    const send=this.transport;
    let response;
    try { response = await send(`https://api.github.com${path}`, {
      method, redirect: 'error', headers: { Authorization: `Bearer ${this.#token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(body ? {'Content-Type':'application/json'} : {}) },
      body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000)
    }); } catch(error) {
      throw new Error(['TimeoutError','AbortError'].includes(error.name)?'REQUEST_TIMEOUT':'NETWORK_ERROR');
    }
    if (!response.ok) {
      const err = new Error(response.status === 401 ? 'INVALID_TOKEN' : response.status === 403 || response.status === 429 ? 'PERMISSION_OR_RATE_LIMIT' : response.status === 409 ? 'CONFLICT' : response.status === 422 ? 'VALIDATION_OR_RULES' : `HTTP_${response.status}`);
      err.status = response.status; err.endpoint=path.split('?')[0]; err.method=method; err.retryAfter = response.headers.get('retry-after'); throw err;
    }
    if(response.status===204)return null;
    try{return await response.json();}catch{throw new Error('INVALID_API_RESPONSE');}
  }
  async saveEncryptedSecret(repository,name,encrypt) {
    return this.encryptFor(this,repository,name,encrypt);
  }
  async encryptFor(ownerApi,repository,name,encrypt) {
    if (!this.#token) throw new Error('AUTH_REQUIRED');
    const p=repoPath(repository),key=await ownerApi.request(`${p}/actions/secrets/public-key`);
    const encrypted_value=encrypt(this.#token,key.key);
    return ownerApi.request(`${p}/actions/secrets/${name}`,'PUT',{encrypted_value,key_id:key.key_id});
  }
  async all(path) {
    const values = [];
    for (let page=1; ; page++) {
      const items = await this.request(`${path}${path.includes('?')?'&':'?'}per_page=100&page=${page}`);
      values.push(...items); if(items.length < 100) return values;
    }
  }
}
export const repoPath = name => '/repos/' + name.split('/').map(encodeURIComponent).join('/');
export const refPath = name => name.split('/').map(encodeURIComponent).join('/');
export function starProgress(repos, login) {
  const owned = repos.filter(r => r.owner.login === login && !r.fork && !r.private);
  const best = owned.reduce((a,b)=>b.stargazers_count > (a?.stargazers_count ?? -1) ? b : a, null);
  const stars = best?.stargazers_count ?? 0;
  return {best, stars, next:[16,128,512,4096].find(n=>n>stars) ?? null};
}
export function datesPlan(start,end,perDay,today=new Date().toISOString().slice(0,10)) {
  const valid = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0,10)===s;
  if (!valid(start)||!valid(end)||start<'1970-01-01'||start>end||end>today||!Number.isInteger(perDay)||perDay<1||perDay>20) throw new Error('INVALID_DATES');
  const days = Math.round((Date.parse(end)-Date.parse(start))/86400000)+1;
  if(days*perDay>1500) throw new Error('PLAN_TOO_LARGE');
  return Array.from({length:days},(_,i)=>new Date(Date.parse(start)+i*86400000).toISOString().slice(0,10)).flatMap(day=>Array.from({length:perDay},(_,i)=>`${day}T12:${String(Math.floor(i/60)).padStart(2,'0')}:${String(i%60).padStart(2,'0')}Z`));
}

export function randomId(source=crypto) {
  if(source.randomUUID)return source.randomUUID();
  const bytes=source.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
  const hex=Array.from(bytes,n=>n.toString(16).padStart(2,'0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
