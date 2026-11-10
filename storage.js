/* Server learning storage; IndexedDB is read only for legacy migration. */
const LearningStore = (() => {
  let generation = null;
  let owner = null, baseline = {progress: {}, difficult: []};
  let queue = Promise.resolve(), failure = null;
  const clone = value => JSON.parse(JSON.stringify(value));
  async function request(payload = {}) {
    const response = await fetch('/api/auth?action=learning', {method:'POST', credentials:'same-origin',
      headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
    const result = await response.json();
    if (!response.ok) throw Object.assign(new Error(result.error || 'storage_unavailable'), {status:response.status});
    return result;
  }
  function legacyRecord(id) {
    return new Promise(resolve => {
      if (!globalThis.indexedDB) return resolve(null);
      const opening = indexedDB.open('greek-verbs');
      opening.onupgradeneeded = () => { opening.transaction.abort(); resolve(null); };
      opening.onerror = opening.onblocked = () => resolve(null);
      opening.onsuccess = () => {
        const db = opening.result;
        if (!db.objectStoreNames.contains('learning')) { db.close(); return resolve(null); }
        const tx = db.transaction('learning','readonly'), get = tx.objectStore('learning').get(id);
        get.onsuccess = () => resolve(get.result || null);
        get.onerror = () => resolve(null);
        tx.oncomplete = () => db.close();
      };
    });
  }
  // Maxima make repeated imports safe, including an interrupted migration.
  function importMerge(remote, legacy) {
    if (typeof legacy === 'number') return Math.max(Number(remote)||0, legacy);
    if (Array.isArray(legacy)) return [...new Set([...(Array.isArray(remote)?remote:[]), ...legacy])];
    if (legacy && typeof legacy === 'object') {
      const result = {...remote};
      for (const key of Object.keys(legacy)) if (!['__proto__','constructor','prototype'].includes(key)) result[key] = importMerge(remote?.[key], legacy[key]);
      return result;
    }
    return remote ?? legacy;
  }
  async function update(expectedOwner, transform, options = {}) {
    for (let attempt=0; attempt<8; attempt++) {
      const remote = await request();
      if (remote.owner !== expectedOwner) throw new Error('account_changed');
      if (options.generation && remote.generation !== options.generation) throw new Error('storage_reset');
      try { return await request({operation:options.operation || 'save', owner:expectedOwner, generation:remote.generation, revision:remote.revision, source:options.source, data:transform(remote.data)}); }
      catch(error) { if (error.status !== 409 || error.message !== 'conflict') throw error; }
    }
    throw new Error('storage_conflict');
  }
  function readLegacy(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; }
  }
  async function load(user, adoptGuest=false) {
    owner = null;
    await queue;
    const target = user ? 'user:'+user.id : 'guest';
    let remote = await request();
    if (remote.owner !== target) throw new Error('account_changed');
    const legacy = await legacyRecord(target);
    let imported = legacy;
    if (target === 'guest') imported = importMerge(imported || {}, {
      progress:readLegacy('greekTrainerProgress', {}), difficult:readLegacy('greekDifficultVerbs', [])});
    if (imported && !remote.migrationClosed) {
      const legacyData = {progress:imported.progress || {}, difficult:Array.isArray(imported.difficult)?imported.difficult:[]};
      const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(legacyData)));
      const source = [...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');
      if (!remote.imports.includes(source)) remote = await update(target, data => importMerge(data, legacyData), {operation:'import',source,generation:remote.generation});
    }
    // Legacy copies are removed only after a successful authoritative load/import.
    await clearLegacy(user);
    if (adoptGuest && user && guestSnapshot) {
      remote = await update(target, data => importMerge(data, guestSnapshot));
      guestSnapshot = null;
    }
    failure = null;
    generation = remote.generation;
    owner = target;
    baseline = clone(remote.data);
    if (!user) guestSnapshot = clone(remote.data);
    return {id:target, ...remote.data};
  }
  let guestSnapshot = null;
  // Merge concurrent changes before an optimistic server update.
  function mergeChanges(base, local, remote, path='') {
    if(JSON.stringify(base)===JSON.stringify(local))return remote;
    if(typeof local==='number'&&Number.isFinite(local)&&!path.startsWith('exam.'))
      return Math.max(0,(Number(remote)||0)+local-(Number(base)||0));
    if(local&&typeof local==='object'&&!Array.isArray(local)){
      const result={...(remote&&typeof remote==='object'?remote:{})};
      for(const key of new Set([...Object.keys(base||{}),...Object.keys(local)])){
        if(['__proto__','constructor','prototype'].includes(key))continue;
        if(!Object.hasOwn(local,key)){delete result[key];continue;}
        result[key]=mergeChanges(base?.[key],local[key],remote?.[key],path?path+'.'+key:key);
      }
      return result;
    }
    return local;
  }
  function save(progress, difficult) {
    if (!owner) return Promise.reject(new Error('storage_unavailable'));
    const target=owner, expectedGeneration=generation, previous=clone(baseline), snapshot=clone({progress,difficult:[...difficult]});
    baseline=clone(snapshot);
    if(target==='guest') guestSnapshot=clone(snapshot);
    const pending=queue.then(() => {
      if(failure) throw failure;
      return update(target, remote => {
        const mergedProgress=mergeChanges(previous.progress||{},snapshot.progress,remote.progress||{});
        const attempts=Math.max(0,(snapshot.progress.correct||0)+(snapshot.progress.wrong||0)-(previous.progress?.correct||0)-(previous.progress?.wrong||0));
        const oldPartial=remote.progress?.sessionProgress||0;
        const explicitSessions=(snapshot.progress.sessions||0)-(previous.progress?.sessions||0)-Math.floor(((previous.progress?.sessionProgress||0)+attempts)/10);
        mergedProgress.sessionProgress=(oldPartial+attempts)%10;
        mergedProgress.sessions=Math.max(0,(remote.progress?.sessions||0)+Math.floor((oldPartial+attempts)/10)+explicitSessions);
        const removed=new Set((previous.difficult||[]).filter(id=>!snapshot.difficult.includes(id)));
        const added=snapshot.difficult.filter(id=>!(previous.difficult||[]).includes(id));
        return {progress:mergedProgress,difficult:[...new Set([...(remote.difficult||[]).filter(id=>!removed.has(id)),...added])]};
      }, {generation:expectedGeneration});
    });
    queue=pending.catch(error=>{failure=error;});
    return pending;
  }
  async function flush() { await queue; if(failure) throw failure; }
  async function exportRecord(user) {
    await flush(); const result=await request();
    if(result.owner!==(user?'user:'+user.id:'guest')) throw new Error('account_changed');
    return result.data;
  }
  async function remove(user) {
    const target=user?'user:'+user.id:'guest';
    await queue;
    const remote=await update(target,()=>({progress:{},difficult:[]}),{operation:'reset',generation});
    generation=remote.generation; failure=null; baseline={progress:{},difficult:[]};
    await clearLegacy(user);
  }
  async function clearLegacy(user) {
    const target=user?'user:'+user.id:'guest';
    if(globalThis.indexedDB) await new Promise(resolve=>{
      const opening=indexedDB.open('greek-verbs');
      opening.onerror=opening.onblocked=()=>resolve();
      opening.onsuccess=()=>{
        const db=opening.result;
        if(!db.objectStoreNames.contains('learning')){db.close();resolve();return;}
        const tx=db.transaction('learning','readwrite');tx.objectStore('learning').delete(target);
        tx.oncomplete=tx.onerror=tx.onabort=()=>{db.close();resolve();};
      };
    });
    if(!user)for(const key of ['greekTrainerProgress','greekDifficultVerbs'])try{localStorage.removeItem(key);}catch{}
  }
  return {load,save,flush,exportRecord,remove,clearLegacy};
})();
