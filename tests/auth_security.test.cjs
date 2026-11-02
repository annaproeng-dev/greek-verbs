// Run with Node.js: node tests/auth_security.test.cjs
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');

function context() {
  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, {textContent: '', dataset: {}, reset() {this.resets = (this.resets || 0) + 1;}, setAttribute() {}, classList: {remove() {}, add() {}, toggle() {}}});
    return nodes.get(id);
  };
  const scope = vm.createContext({
    lang: 'en', progress: {correct: 42}, difficultIds: new Set(['old']),
    plainRecord: value => value && typeof value === 'object' ? value : {},
    normalizeProgress() {},
    LearningStore: {flush: async () => {}, load: async () => {throw Error('storage_unavailable');}},
    document: {getElementById: node, querySelector: node, querySelectorAll: () => [], body: {classList: {remove() {}, add() {}}}},
    location: {hash: '', reload() {scope.reloads++;}}, reloads: 0,
    window: {}, console, setTimeout, clearTimeout, AbortController,
    appStorage: {setItem() {}}, ALL_VERBS: [],
    applyFlashFilter() {}, switchExercise() {}, switchSection() {},
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'auth.js'), 'utf8'), scope);
  vm.runInContext('renderAuth = () => {}; currentUser = {id: "old-user", email: "old@example.test"};', scope);
  return scope;
}

async function run() {
  const results = [];
  let scope = context();
  await vm.runInContext('changeAccount(null).catch(() => {})', scope);
  assert.equal(vm.runInContext('currentUser', scope), null);
  assert.equal(scope.progress.correct, 0);
  assert.equal(scope.difficultIds.size, 0);
  results.push('Logout clears old identity and progress even if IndexedDB fails');

  scope = context();
  vm.runInContext('applyLearning({progress: JSON.parse(\'{"__proto__":{"injected":true},"correct":7}\'), difficult: []})', scope);
  assert.equal(scope.progress.correct, 7);
  assert.equal(scope.progress.injected, undefined);
  assert.equal(Object.hasOwn(scope.progress, '__proto__'), false);
  results.push('Stored progress cannot change the object prototype');

  scope = context();
  let resolveSession;
  scope.pendingSession = new Promise(resolve => {resolveSession = resolve;});
  vm.runInContext('authRequest = () => pendingSession; accountReady = true;', scope);
  const checking = vm.runInContext('revalidateSession()', scope);
  vm.runInContext('setAccountBusy(true)', scope);
  resolveSession(null);
  await checking;
  assert.equal(vm.runInContext('authBusy', scope), true);
  assert.equal(vm.runInContext('currentUser.id', scope), 'old-user');
  results.push('Background session checks cannot unlock or overwrite an active login');

  scope = context();
  scope.announcements = 0;
  vm.runInContext('authRequest = async () => null; announceAccountChange = () => announcements++;', scope);
  await vm.runInContext('logout()', scope);
  assert.equal(scope.announcements, 1);
  assert.equal(scope.reloads, 1);
  assert.equal(vm.runInContext('currentUser', scope), null);
  results.push('Revoked session is announced to other tabs before IndexedDB loading');

  scope = context();
  vm.runInContext('routeAccount()', scope);
  assert.equal(scope.document.getElementById('authForm').resets, 1);
  results.push('Leaving the auth page clears hidden credential fields');
  return results;
}

module.exports = run;
if (require.main === module) run().then(results => console.log(results.join('\n'))).catch(error => {console.error(error); process.exitCode = 1;});
