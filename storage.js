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
    return record || {id: targetOwner, progress: {}, difficult: []};
  }
  function save(progress, difficult) {
    if (!owner) return Promise.reject(new Error('storage_unavailable'));
    const snapshot = {id: owner, progress: JSON.parse(JSON.stringify(progress)), difficult: [...difficult]};
    const pending = queue.then(() => put(snapshot));
    queue = pending.catch(() => {});
    return pending;
  }
  return {load, save, flush: () => queue};
})();
