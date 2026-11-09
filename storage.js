/* Account-scoped learning data. Credentials are handled only by the server. */
const LearningStore = (() => {
  const opened = new Promise((resolve, reject) => {
    const request = indexedDB.open('greek-verbs', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('learning', {keyPath: 'id'});
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('storage_blocked'));
  });
  let owner = null;
  let baseline = {progress: {}, difficult: []};
  let queue = Promise.resolve();
  async function transaction(mode, operation) {
    const db = await opened;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('learning', mode);
      const request = operation(tx.objectStore('learning'));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('storage_aborted'));
    });
  }
  const get = id => transaction('readonly', store => store.get(id));
  const put = value => transaction('readwrite', store => store.put(value));
  async function load(user, adoptGuest = false) {
    owner = null;
    await queue;
    const targetOwner = user ? 'user:' + user.id : 'guest';
    let record = await get(targetOwner);
    if (!record && targetOwner === 'guest') {
      const legacy = key => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
      record = {id: targetOwner, progress: legacy('greekTrainerProgress') || {}, difficult: legacy('greekDifficultVerbs') || []};
      await put(record);
      try {
        localStorage.removeItem('greekTrainerProgress');
        localStorage.removeItem('greekDifficultVerbs');
      } catch { /* IndexedDB remains available even if localStorage is blocked. */ }
    }
    if (!record && adoptGuest && user) {
      const guest = await get('guest');
      if (guest) {
        record = {...guest, id: targetOwner};
        await transaction('readwrite', store => {
          store.put({id: 'guest', progress: {}, difficult: []});
          return store.put(record);
        });
      }
    }
    owner = targetOwner;
    baseline=JSON.parse(JSON.stringify(record || {progress:{},difficult:[]}));
    return record || {id: targetOwner, progress: {}, difficult: []};
  }
  // Merge only local changes inside one IndexedDB transaction. Two trainer tabs
  // must add to the same counters rather than overwrite each other's progress.
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
    const snapshot = {id: owner, progress: JSON.parse(JSON.stringify(progress)), difficult: [...difficult]};
    const previous=baseline;
    baseline=JSON.parse(JSON.stringify(snapshot));
    const pending=queue.then(async()=>{
      const db=await opened;
      return new Promise((resolve,reject)=>{
        const tx=db.transaction('learning','readwrite'), store=tx.objectStore('learning');
        const request=store.get(snapshot.id);let merged;
        request.onsuccess=()=>{
          const remote=request.result||{progress:{},difficult:[]};
          const mergedProgress=mergeChanges(previous.progress||{},snapshot.progress,remote.progress||{});
          const attempts=Math.max(0,(snapshot.progress.correct||0)+(snapshot.progress.wrong||0)-(previous.progress?.correct||0)-(previous.progress?.wrong||0));
          const oldPartial=remote.progress?.sessionProgress||0;
          const explicitSessions=(snapshot.progress.sessions||0)-(previous.progress?.sessions||0)-Math.floor(((previous.progress?.sessionProgress||0)+attempts)/10);
          mergedProgress.sessionProgress=(oldPartial+attempts)%10;
          mergedProgress.sessions=Math.max(0,(remote.progress?.sessions||0)+Math.floor((oldPartial+attempts)/10)+explicitSessions);
          const removed=new Set((previous.difficult||[]).filter(id=>!snapshot.difficult.includes(id)));
          const added=snapshot.difficult.filter(id=>!(previous.difficult||[]).includes(id));
          merged={id:snapshot.id,progress:mergedProgress,difficult:[...new Set([...(remote.difficult||[]).filter(id=>!removed.has(id)),...added])]};
          store.put(merged);
        };
        tx.oncomplete=()=>resolve(merged);
        tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('storage_aborted'));
      });
    });
    queue=pending.catch(()=>{});
    return pending;
  }
  return {load, save, flush: () => queue};
})();
