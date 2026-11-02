// Run with Node.js: node tests/practice_navigation.test.cjs
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');

const elements = new Map();
const node = id => {
  if (!elements.has(id)) elements.set(id, {
    value: '', checked: false, open: false, disabled: false, readOnly: false,
    textContent: '', dataset: {}, className: '', children: [],
    classList: {contains: name => name === 'active', toggle() {}, add() {}, remove() {}},
    focus() {}, setAttribute() {}, addEventListener() {}, querySelector() { return null; }
  });
  return elements.get(id);
};
const timers = [];
const scope = vm.createContext({
  localStorage: {getItem() { return null; }, setItem() {}},
  window: {}, document: {addEventListener() {}, dispatchEvent() {}, getElementById: node, querySelectorAll() { return []; }},
  Event: function Event() {},
  setTimeout(fn) { timers.push(fn); return timers.length; }, clearTimeout() {},
  assert, timers
});
for (const file of ['data.js', 'app.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), scope, {filename: file});
}
vm.runInContext(`
  let recorded = [];
  recordAnswer = (verb, tense, ok) => recorded.push(ok);
  let result = null;
  showResults = (id, correct, total) => result = {id, correct, total};
  const task = {masked:'κ__', answer:'άν', fullAnswer:'κάν', v:ALL_VERBS[0], p:0, tense:'pres'};
  fDeck = [task, task]; fIdx = 0; fStates = []; fCorrect = 0; fAnswered = false;
  document.getElementById('fillInput').value = 'x'; checkFill();
  assert.equal(fAnswered, false); assert.deepEqual(recorded, [false]);
  document.getElementById('fillInput').value = 'άν'; checkFill();
  assert.equal(fAnswered, true); assert.deepEqual(recorded, [false, true]);
  timers.pop()(); assert.equal(fIdx, 1);
  previousFill(); assert.equal(fIdx, 0); assert.equal(document.getElementById('fillInput').value, 'άν');
  nextFill(); document.getElementById('fillInput').value = 'άν'; checkFill(); timers.pop()();
  assert.equal(result.id, 'fill'); assert.equal(result.total, 2);

  recorded = []; result = null;
  situationDeck = [SITUATIONS[0], SITUATIONS[1]]; situationIdx = 0; situationStates = []; situationCorrect = 0; situationAnswered = false;
  document.getElementById('situationInput').value = 'x'; checkSituation();
  assert.equal(situationAnswered, false); assert.deepEqual(recorded, [false]);
  document.getElementById('situationInput').value = SITUATIONS[0].answer; checkSituation();
  timers.pop()(); assert.equal(situationIdx, 1); assert.deepEqual(recorded, [false, true]);
  previousSituation(); assert.equal(situationIdx, 0); assert.equal(situationAnswered, true);
`, scope);
console.log('Retry, scoring, automatic advance, results and history: OK');
