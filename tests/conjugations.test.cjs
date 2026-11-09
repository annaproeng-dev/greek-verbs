// Run with Node.js: node tests/conjugations.test.cjs
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync('data.js', 'utf8') + '\nthis.verbs = ALL_VERBS;', context);
assert.equal(context.verbs.length, 64);
for (const verb of context.verbs) {
  for (const key of ['conj_pres', 'conj_past', 'conj_fut']) {
    assert.equal(verb[key].length, 6, `${verb.greek} ${key}`);
    assert.ok(verb[key].every(form => typeof form === 'string' && form.trim()), `${verb.greek} ${key}`);
  }
  assert.equal(verb.conj_past[0], verb.past, `${verb.greek} first-person past`);
  assert.equal(verb.conj_fut[0], verb.future, `${verb.greek} first-person future`);
  assert.ok(verb.conj_fut.every(form => form.startsWith('θα ')), `${verb.greek} future`);
}
const byGreek = name => context.verbs.find(verb => verb.greek === name);
assert.equal(byGreek('αγοράζω').conj_past[3], 'αγοράσαμε');
assert.equal(byGreek('βγάζω').conj_past[3], 'βγάλαμε');
assert.equal(byGreek('ανεβαίνω').conj_fut[3], 'θα ανέβουμε');
assert.equal(byGreek('μπαίνω').conj_fut[3], 'θα μπούμε');
assert.equal(byGreek('σκέφτομαι').conj_past[3], 'σκεφτήκαμε');
assert.equal(byGreek('παίρνω μέρος').conj_fut[1], 'θα πάρεις μέρος');
assert.equal(byGreek('ξεχνάω / ξεχνώ').group, 'b1');
for (const name of ['είμαι', 'έχω', 'ξέρω']) assert.equal(byGreek(name).aoristSupported, false);
console.log('All 64 verbs have complete forms; representative irregular and stress cases pass.');
