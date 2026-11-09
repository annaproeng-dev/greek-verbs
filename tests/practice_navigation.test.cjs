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
    focus() {}, select() {}, setAttribute() {}, addEventListener() {}, removeAttribute() {}, pause() {this.paused=true;}, load() {}, play() {this.paused=false;return Promise.resolve();}, querySelector() { return null; }, querySelectorAll() { return []; }
  });
  return elements.get(id);
};
const timers = [];
const scope = vm.createContext({
  localStorage: {getItem() { return null; }, setItem() {}},
  window: {}, document: {addEventListener() {}, dispatchEvent() {}, getElementById: node, querySelector: node, querySelectorAll() { return []; }},
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
  assert.ok(document.getElementById('fillFeedback').textContent.includes(task.answer));
  assert.equal(document.getElementById('fillCheck').textContent, t('try_again'));
  assert.equal(document.getElementById('fillInput').readOnly, false);
  document.getElementById('fillInput').value = 'άν'; checkFill();
  assert.equal(fAnswered, true); assert.deepEqual(recorded, [false, true]);
  timers.pop()(); assert.equal(fIdx, 1);
  previousFill(); assert.equal(fIdx, 0); assert.equal(document.getElementById('fillInput').value, 'άν');
  nextFill(); document.getElementById('fillInput').value = 'άν'; checkFill(); timers.pop()();
  assert.equal(result.id, 'fill'); assert.equal(result.total, 2);

  recorded = []; result = null;
  situationDeck = [SITUATIONS[0], SITUATIONS[1]]; situationIdx = 0; situationStates = []; situationCorrect = 0; situationAnswered = false;situationMode='type';
  situationState().inputs=['x']; checkSituation();
  assert.equal(situationAnswered, false); assert.deepEqual(recorded, [false]);
  assert.ok(document.getElementById('situationFeedback').textContent.includes(SITUATIONS[0].answer));
  assert.equal(document.getElementById('situationCheck').textContent, t('try_again'));
  assert.equal(situationState().solved,false);
  situationState().inputs=[SITUATIONS[0].answer];checkSituation();
  assert.equal(situationIdx, 0); nextSituation(); assert.equal(situationIdx, 1); assert.deepEqual(recorded, [false, true]);
  previousSituation(); assert.equal(situationIdx, 0); assert.equal(situationAnswered, true);

  // Three dialogues per category, with 1–3 ordered, reconstructable gaps.
  for(const cat of Object.keys(SITUATION_LABELS)) {
    const items=SITUATIONS.filter(item=>item.cat===cat);
    assert.equal(items.length,3,cat);
    assert(items.every(item=>item.answers.length>=1&&item.answers.length<=3),cat);
    for(const item of items){
      let gap=0;
      const rebuilt=item.lines.map(line=>line.replaceAll('___',()=>item.answers[gap++]));
      assert.deepEqual(rebuilt,item.full);
      assert.equal(gap,item.answers.length);
    }
  }
  for(const item of SITUATIONS){
    assert.equal(item.lineSpeakers.length,item.full.length);
    assert.equal(SITUATION_RECORDINGS[item.id].fingerprint,situationAudioFingerprint(item));
  }
  const played=[];
  globalThis.Audio=class {constructor(src){this.src=src;played.push(this);} play(){return Promise.resolve();} pause(){this.paused=true;}};
  playSituationDialogue(SITUATIONS[0]);
  assert.ok(played[0].src.includes('v2-food-1.mp3'));
  const firstPlayback=played[0];playSituationDialogue(SITUATIONS[1]);assert.equal(firstPlayback.paused,true);
  const count=played.length;
  playSituationDialogue({...SITUATIONS[0],full:['Changed dialogue']});assert.equal(played.length,count);
  assert.ok(document.getElementById('situationVoiceStatus').textContent.length>0);
  situationCategory='food'; initSituation();
  assert.equal(situationDeck.length,3);
  assert.deepEqual(situationDeck.map(item=>item.cat),['food','food','food']);
  situationIdx=2; renderSituation(); recorded=[];
  situationState().inputs=situationDeck[2].answers.slice().reverse();
  checkSituation(); assert.equal(situationAnswered,false);
  situationState().inputs=situationDeck[2].answers.slice();
  checkSituation(); assert.equal(situationAnswered,true);
  const scoreBefore=situationCorrect;setSituationMode('drag');checkSituation();
  assert.equal(situationCorrect,scoreBefore);
  initSituation();situationIdx=2;setSituationMode('drag');recorded=[];
  checkSituation();assert.equal(recorded.length,0); // Incomplete gaps never count as attempts.
  placeSituationWord(0,1);placeSituationWord(1,1);
  assert.equal(situationState().slots[0],null); // A word can occupy only one gap.
  for(let i=0;i<3;i++)placeSituationWord(i,i);
  setSituationMode('type');setSituationMode('drag');
  assert.deepEqual(situationState().slots,[0,1,2]);
  checkSituation();assert.equal(situationAnswered,true);assert.deepEqual(recorded,[true]);
  previousSituation();assert.equal(situationIdx,1);nextSituation();assert.equal(situationIdx,1);
  changeSituationTopic('hotel');assert.equal(situationIdx,0);assert.equal(situationDeck.length,3);
  assert.equal(situationDeck[0].cat,'hotel');
`, scope);
console.log('Retry, scoring, navigation, results and history: OK');
