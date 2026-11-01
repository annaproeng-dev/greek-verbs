/* ── Language & Accent ─────────────────────────────── */
let lang = localStorage.getItem('greekTrainerLang') || 'en';
let accentMode = false;
let practicePool = ALL_VERBS.filter(v=>v.conj_pres);
let selectedPracticeTense = 'mixed';
let difficultMode = false;
const difficultIds = new Set(JSON.parse(localStorage.getItem('greekDifficultVerbs') || '[]'));
const progress = JSON.parse(localStorage.getItem('greekTrainerProgress') || '{}');
Object.assign(progress,{correct:progress.correct||0,wrong:progress.wrong||0,sessions:progress.sessions||0,byTense:progress.byTense||{},mistakes:progress.mistakes||{},activityDays:progress.activityDays||{},sessionProgress:progress.sessionProgress||0,firstActivity:progress.firstActivity||null});

const t = key => I18N[lang][key] || key;
const verbTrans = v => lang === 'en' ? v.english : v.russian;
const verbEx    = v => (lang === 'en' ? v.ex_en : v.ex_ru) || `${v.greek} — ${verbTrans(v)}`;
const verbExGreek = v => v.ex_gr || v.greek;
const verbExTranslation = v => (lang === 'en' ? v.ex_en : v.ex_ru) || verbTrans(v);

function toggleLang() {
  setLang(lang === 'en' ? 'ru' : 'en');
}

function setLang(l) {
  lang = l;
  localStorage.setItem('greekTrainerLang', l);
  document.documentElement.lang = l;
  document.title = t('document_title');
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n).replace('{count}',ALL_VERBS.length);
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPh);
  });
  document.getElementById('langBtn').textContent = t('lang_toggle');
  setupControls();
  document.querySelectorAll('.results-wrap').forEach(result => {
    const exercise = result.closest('.exercise');
    if (exercise) renderResults(exercise.id.replace('ex-',''), Number(result.dataset.correct), Number(result.dataset.total));
  });
  // Refresh active section
  const active = document.querySelector('.section.active');
  if (active) {
    const id = active.id.replace('sec-','');
    if (id === 'verbs')      renderTable();
    if (id === 'flashcards') renderFC();
    if (id === 'phrases')    { renderPhraseSelect(); renderPhrases(); }
    if (id === 'practice') refreshActiveExercise();
  }
}

const topicLabel = id => id === 'all' ? t('topic_all') : (TOPICS.find(topic=>topic.id===id)?.[lang] || id);

function speakGreek(text, event) {
  event?.stopPropagation();
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'el-GR'; utterance.rate = .82;
  const voice = speechSynthesis.getVoices().find(v=>v.lang.toLowerCase().startsWith('el'));
  if (voice) utterance.voice = voice;
  speechSynthesis.speak(utterance);
}

function saveProgress() { localStorage.setItem('greekTrainerProgress', JSON.stringify(progress)); }
function localDayKey(date=new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
function recordAnswer(v, tense, ok) {
  progress[ok?'correct':'wrong']++;
  const key=tense||'mixed'; progress.byTense[key] ||= {correct:0,wrong:0}; progress.byTense[key][ok?'correct':'wrong']++;
  if (v) progress.mistakes[v.id] = Math.max(0,(progress.mistakes[v.id]||0)+(ok?-1:1));
  const today=localDayKey();
  progress.firstActivity ||= today;
  progress.activityDays[today]=(progress.activityDays[today]||0)+1;
  progress.sessionProgress++;
  if(progress.sessionProgress>=10){ progress.sessions++; progress.sessionProgress=0; }
  saveProgress();
}
function recordSession() { progress.sessions++; saveProgress(); }
function progressCalendarStats(){
  const active=new Set(Object.keys(progress.activityDays).filter(day=>progress.activityDays[day]>0));
  const cursor=new Date(); cursor.setHours(12,0,0,0);
  if(!active.has(localDayKey(cursor))) cursor.setDate(cursor.getDate()-1);
  let streak=0;
  while(active.has(localDayKey(cursor))){streak++;cursor.setDate(cursor.getDate()-1);}
  if(!progress.firstActivity)return {streak:0,missed:0};
  const first=new Date(progress.firstActivity+'T12:00:00');
  const today=new Date(); today.setHours(12,0,0,0);
  const lastCountedDay=new Date(today);
  if(!active.has(localDayKey(today)))lastCountedDay.setDate(lastCountedDay.getDate()-1);
  let elapsed=0;
  for(const d=new Date(first);d<=lastCountedDay;d.setDate(d.getDate()+1))elapsed++;
  const activeSince=[...active].filter(day=>day>=progress.firstActivity&&day<=localDayKey(lastCountedDay)).length;
  return {streak,missed:Math.max(0,elapsed-activeSince)};
}
function showProgress() {
  const total=progress.correct+progress.wrong, accuracy=total?Math.round(progress.correct/total*100):0;
  const {streak,missed}=progressCalendarStats();
  document.getElementById('progressContent').innerHTML=`<button class="dialog-close" onclick="progressDialog.close()">×</button><h2>${t('progress_title')}</h2><div class="progress-cards"><div><b>${progress.correct}</b><span>${t('correct_answers')}</span></div><div><b>${progress.sessions}</b><span>${t('sessions')}</span></div><div><b>${streak} 🔥</b><span>${t('streak_days')}</span></div><div><b>${missed}</b><span>${t('missed_days')}</span></div></div><p class="progress-summary">${accuracy}% ${t('accuracy')} · ${progress.sessionProgress}/10<br>${t('progress_rule')}</p>`;
  document.getElementById('progressDialog').showModal();
}

function refreshActiveExercise() {
  const ex = document.querySelector('.exercise.active');
  if (!ex) return;
  const result = ex.querySelector('.results-wrap');
  if (result) {
    renderResults(ex.id.replace('ex-',''), Number(result.dataset.correct), Number(result.dataset.total));
    return;
  }
  const id = ex.id.replace('ex-','');
  if (id === 'quiz') renderQuiz();
  if (id === 'tense') renderTense();
  if (id === 'conj') renderConj();
  if (id === 'fill') renderFill();
  if (id === 'change') renderChange();
  if (id === 'situation') renderSituation();
  if (id === 'match') {
    document.getElementById('matchColL').textContent = t('match_col_l');
    document.getElementById('matchColR').textContent = t('match_col_r');
    document.querySelectorAll('#matchRight .match-item').forEach(el => {
      const v = ALL_VERBS.find(item => item.id === el.dataset.key);
      if (v) el.textContent = verbTrans(v);
    });
    document.getElementById('matchInfo').textContent = matchPaired === 6 ? t('match_all') : t('match_info');
  }
  if (id === 'image') {
    document.querySelectorAll('#imgLeft .img-card').forEach(el => {
      const item = IMAGE_EXERCISES.find(img => img.answer === el.dataset.key);
      const label = el.querySelector('.img-label');
      if (item && label) label.textContent = lang === 'en' ? item.label_en : item.label_ru;
    });
    document.getElementById('imgInfo').textContent = imgPaired === IMAGE_EXERCISES.length ? t('match_all') : t('q_image');
  }
}

function toggleAccent() {
  accentMode = document.getElementById('accentChk').checked;
}

function stripAccents(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
}

function checkStr(given, correct) {
  const g = given.normalize('NFC').trim().replace(/\s+/g,' '), c = correct.normalize('NFC').trim().replace(/\s+/g,' ');
  if (!accentMode) return stripAccents(g) === stripAccents(c) ? 'correct' : 'wrong';
  if (g === c) return 'correct';
  if (stripAccents(g) === stripAccents(c)) return 'almost';
  return 'wrong';
}

/* ── Navigation ─────────────────────────────────── */
function switchSection(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(b => b.classList.remove('active'));
  document.getElementById('sec-' + id).classList.add('active');
  document.getElementById('nav-' + id).classList.add('active');
  if (id === 'flashcards') renderFC();
  if (id === 'phrases')    { renderPhraseSelect(); renderPhrases(); }
}

function switchExercise(id) {
  document.querySelectorAll('.exercise').forEach(e => e.classList.remove('active'));
  document.querySelectorAll('.sub-tab').forEach(b => b.classList.remove('active'));
  document.getElementById('ex-' + id).classList.add('active');
  document.getElementById('subtab-' + id).classList.add('active');
  const exercise = document.getElementById('ex-' + id);
  exercise.querySelector('.results-wrap')?.remove();
  [...exercise.children].forEach(child => { child.hidden = false; });
  if (id === 'quiz')    initQuiz();
  if (id === 'match')   initMatch();
  if (id === 'tense')   initTense();
  if (id === 'conj')    initConj();
  if (id === 'fill')    initFill();
  if (id === 'change')  initChange();
  if (id === 'situation') initSituation();
  if (id === 'image')   initImage();
}

/* ── Results helper ──────────────────────────────── */
function showResults(exId, correct, total) {
  renderResults(exId, correct, total);
}

function renderResults(exId, correct, total) {
  const pct = Math.round(correct / total * 100);
  const em = pct>=90?'🏆':pct>=70?'🎉':pct>=50?'👍':'😅';
  const title = pct>=90?t('result_excellent'):pct>=70?t('result_very_good'):pct>=50?t('result_not_bad'):t('result_keep_going');
  const exercise = document.getElementById('ex-'+exId);
  [...exercise.children].forEach(child => { if (!child.classList.contains('results-wrap')) child.hidden = true; });
  let results = exercise.querySelector('.results-wrap');
  if (!results) {
    results = document.createElement('div');
    results.className = 'results-wrap';
    exercise.appendChild(results);
  }
  results.dataset.correct = correct;
  results.dataset.total = total;
  results.innerHTML = `
      <div class="results-emoji">${em}</div>
      <div class="results-title">${title}</div>
      <div class="results-sub">${correct} ${t('of')} ${total} (${pct}%)</div>
      <button class="restart-btn" onclick="restartExercise('${exId}')">${t('restart')}</button>`;
}

function restartExercise(exId) {
  const exercise = document.getElementById('ex-'+exId);
  exercise.querySelector('.results-wrap')?.remove();
  [...exercise.children].forEach(child => { child.hidden = false; });
  const starters = { quiz:initQuiz, tense:initTense, conj:initConj, fill:initFill, change:initChange, situation:initSituation };
  starters[exId]?.();
}

/* ── Verb Table ──────────────────────────────────── */
function renderTable() {
  const query=(document.getElementById('verbSearch')?.value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const group=document.getElementById('verbGroup')?.value||'all';
  const sorted = ALL_VERBS.filter(v=>{
    const hay=`${v.greek} ${v.english} ${v.russian}`.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const groupOk=group==='all'||(group==='irregular'?v.irregular:v.group===group);
    return groupOk&&hay.includes(query);
  }).sort((a,b) => a.greek.localeCompare(b.greek,'el'));
  const tbody = document.getElementById('verbTbody');
  tbody.innerHTML = '';
  sorted.forEach(v => {
    const tr = document.createElement('tr');
    tr.className='verb-row'; tr.tabIndex=0; tr.onclick=()=>openVerb(v.id); tr.onkeydown=e=>{if(e.key==='Enter')openVerb(v.id)};
    tr.innerHTML = `
      <td><button class="audio-btn" title="Pronunciation" onclick="speakGreek('${v.greek.replaceAll("'","\\'")}',event)">🔊</button></td>
      <td class="td-greek">${v.greek}</td>
      <td class="td-tense">${v.aoristSupported?v.past:'—'}</td>
      <td class="td-tense">${v.future}</td>
      <td class="td-ru">${verbTrans(v)}</td>`;
    tbody.appendChild(tr);
  });
  if (document.getElementById('verbCount')) document.getElementById('verbCount').textContent=`${sorted.length} / ${ALL_VERBS.length}`;
}

function openVerb(id) {
  window.location.href=`verb.html?id=${encodeURIComponent(id)}`;
}

/* ── Flashcards ──────────────────────────────────── */
let fcDeck = [...ALL_VERBS], fcIdx = 0, fcRevealed = false;

function renderFC() {
  fcRevealed = false;
  const v = fcDeck[fcIdx];
  document.getElementById('fcCard').classList.remove('revealed');
  document.getElementById('fcCounter').textContent = `${fcIdx+1} / ${fcDeck.length}`;
  document.getElementById('fcVerb').textContent = v.greek;
  document.getElementById('fcFrontLabel').textContent = t('fc_front_label');
  document.getElementById('fcTranslation').textContent = verbTrans(v);
  document.getElementById('fcPastLbl').textContent  = t('fc_past') + ' ' + (v.aoristSupported?v.past:'—');
  document.getElementById('fcPresLbl').textContent  = t('fc_pres') + ' ' + v.greek;
  document.getElementById('fcFutLbl').textContent   = t('fc_fut')  + ' ' + v.future;
  document.getElementById('fcExampleGreek').textContent = verbExGreek(v);
  document.getElementById('fcExample').textContent = verbExTranslation(v);
  document.getElementById('fcShowBtn').textContent  = t('fc_show');
  document.getElementById('fcNextBtn').textContent  = t('fc_next');
  document.getElementById('fcAudioBtn').textContent = t('fc_audio');
  document.getElementById('fcAudioBtn').onclick = event => speakGreek(v.greek,event);
  document.getElementById('markDifficultBtn').textContent = difficultIds.has(v.id) ? t('unmark_difficult') : t('mark_difficult');
  document.getElementById('fcShowBtn').style.display = 'inline-block';
  document.getElementById('fcNextBtn').style.display = 'none';
}

function fcShow() {
  fcRevealed = true;
  document.getElementById('fcCard').classList.add('revealed');
  document.getElementById('fcShowBtn').style.display = 'none';
  document.getElementById('fcNextBtn').style.display = 'inline-block';
}

function fcHide() {
  fcRevealed = false;
  document.getElementById('fcCard').classList.remove('revealed');
  document.getElementById('fcShowBtn').style.display = 'inline-block';
  document.getElementById('fcNextBtn').style.display = 'none';
}

function fcFlip() {
  fcRevealed ? fcHide() : fcShow();
}

function fcNext() {
  if (fcIdx < fcDeck.length-1) fcIdx++;
  else { fcDeck = [...fcDeck].sort(()=>Math.random()-0.5); fcIdx = 0; }
  renderFC();
}

function fcShuffle() {
  fcDeck = [...fcDeck].sort(()=>Math.random()-0.5);
  fcIdx = 0; renderFC();
}

function applyFlashFilter() {
  const topic=document.getElementById('flashTopic').value;
  const group=document.getElementById('flashGroup').value;
  const matches=v=>(topic==='all'||v.topics.includes(topic))&&(group==='all'||(group==='irregular'?v.irregular:v.group===group));
  fcDeck=ALL_VERBS.filter(v=>matches(v)&&(!difficultMode||difficultIds.has(v.id)));
  if(!fcDeck.length){ difficultMode=false; fcDeck=ALL_VERBS.filter(matches); }
  fcIdx=0; renderFC();
}
function toggleDifficultMode(){ difficultMode=!difficultMode; document.getElementById('difficultBtn').classList.toggle('active',difficultMode); applyFlashFilter(); }
function toggleCurrentDifficult(){ const id=fcDeck[fcIdx].id; difficultIds.has(id)?difficultIds.delete(id):difficultIds.add(id); localStorage.setItem('greekDifficultVerbs',JSON.stringify([...difficultIds])); renderFC(); }

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('fcCard').addEventListener('click', fcFlip);
});

/* ── Generic scored MC helper ──────────────────────── */
function renderMC(opts, correctAnswer, containerId, onSelect) {
  const grid = document.getElementById(containerId);
  grid.innerHTML = '';
  opts.forEach(opt => {
    const b = document.createElement('button');
    b.className = 'opt-btn';
    b.textContent = opt;
    b.dataset.key = opt;
    b.onclick = () => onSelect(b, opt, correctAnswer);
    grid.appendChild(b);
  });
}

function lockMC(containerId, correctAnswer, chosenBtn) {
  document.querySelectorAll('#' + containerId + ' .opt-btn').forEach(b => {
    b.disabled = true;
    if (b.dataset.key === correctAnswer) b.classList.add('correct');
  });
}

/* ── Quiz (translation) ──────────────────────────── */
let qDeck=[], qIdx=0, qCorrect=0, qAnswered=false, qDir='gr';

function initQuiz() {
  qDeck = [...practicePool].sort(()=>Math.random()-0.5);
  qIdx=0; qCorrect=0; qAnswered=false;
  document.getElementById('qDirBtn').textContent = qDir === 'gr' ? t('dir_gr_lang') : t('dir_lang_gr');
  renderQuiz();
}

function renderQuiz() {
  qAnswered = false;
  const v = qDeck[qIdx];
  document.getElementById('qFeedback').className = 'feedback';
  document.getElementById('qNext').classList.remove('show');
  document.getElementById('qScore').textContent = `${t('score_lbl')} ${qIdx}/${qDeck.length}`;

  const others = practicePool.filter(x=>x!==v).sort(()=>Math.random()-0.5).slice(0,3);
  if (qDir === 'gr') {
    document.getElementById('qPrompt').textContent = t('q_gr_to_lang');
    document.getElementById('qVerb').textContent   = v.greek;
    document.getElementById('qSub').textContent    = '';
    const opts = [v,...others].sort(()=>Math.random()-0.5).map(x=>verbTrans(x));
    renderMC(opts, verbTrans(v), 'qOpts', (btn, chosen, correct) => handleQuizAnswer(btn, chosen, verbTrans(v), v));
  } else {
    document.getElementById('qPrompt').textContent = t('q_lang_to_gr');
    document.getElementById('qVerb').textContent   = verbTrans(v);
    document.getElementById('qSub').textContent    = '';
    const opts = [v,...others].sort(()=>Math.random()-0.5).map(x=>x.greek);
    renderMC(opts, v.greek, 'qOpts', (btn, chosen, correct) => handleQuizAnswer(btn, chosen, v.greek, v));
  }
}

function handleQuizAnswer(btn, chosen, correct, v) {
  if (qAnswered) return; qAnswered = true;
  const ok = chosen === correct;
  if (ok) qCorrect++;
  recordAnswer(v,'translation',ok);
  lockMC('qOpts', correct, btn);
  if (!ok) btn.classList.add('wrong');
  const fb = document.getElementById('qFeedback');
  fb.className = 'feedback ' + (ok ? 'correct' : 'wrong');
  fb.textContent = ok ? t('correct') + ' ' + verbEx(v) : t('wrong') + ' ' + t('ans_correct') + ' ' + correct;
  document.getElementById('qNext').classList.add('show');
  document.getElementById('qScore').textContent = `${t('score_lbl')} ${qIdx+1}/${qDeck.length}`;
}

function toggleQDir() {
  qDir = qDir === 'gr' ? 'lang' : 'gr';
  document.getElementById('qDirBtn').textContent = qDir === 'gr' ? t('dir_gr_lang') : t('dir_lang_gr');
  qIdx=0; qCorrect=0; renderQuiz();
}

function nextQuiz() { qIdx++; qIdx>=qDeck.length ? showResults('quiz',qCorrect,qDeck.length) : renderQuiz(); }

/* ── Matching (verb ↔ translation) ──────────────── */
let matchSel=null, matchPaired=0;

function initMatch() {
  matchSel=null; matchPaired=0;
  const sample = [...practicePool].sort(()=>Math.random()-0.5).slice(0,6);
  const lItems = [...sample].sort(()=>Math.random()-0.5);
  const rItems = [...sample].sort(()=>Math.random()-0.5);
  const lCol = document.getElementById('matchLeft');
  const rCol = document.getElementById('matchRight');
  document.getElementById('matchColL').textContent = t('match_col_l');
  document.getElementById('matchColR').textContent = t('match_col_r');
  lCol.innerHTML=''; rCol.innerHTML='';
  document.getElementById('matchInfo').textContent = t('match_info');
  document.getElementById('matchRestart').classList.remove('show');
  const matchForm=v=>selectedPracticeTense==='past'?v.past:selectedPracticeTense==='fut'?v.future:v.greek;
  lItems.forEach(v => {
    const el = mkEl('div','match-item',matchForm(v)); el.dataset.key=v.id; el.dataset.side='left';
    el.onclick = ()=>handleMatch(el); lCol.appendChild(el);
  });
  rItems.forEach(v => {
    const el = mkEl('div','match-item ru',verbTrans(v)); el.dataset.key=v.id; el.dataset.side='right';
    el.onclick = ()=>handleMatch(el); rCol.appendChild(el);
  });
}

function mkEl(tag,cls,text) { const e=document.createElement(tag); e.className=cls; e.textContent=text; return e; }

function handleMatch(el) {
  if (el.classList.contains('matched')) return;
  if (!matchSel) {
    if (el.dataset.side==='right') return;
    el.classList.add('selected'); matchSel=el; return;
  }
  if (el.dataset.side==='left') { matchSel.classList.remove('selected'); el.classList.add('selected'); matchSel=el; return; }
  if (el.dataset.key===matchSel.dataset.key) {
    [el,matchSel].forEach(e=>{ e.classList.remove('selected'); e.classList.add('matched'); });
    matchPaired++;
    recordAnswer(ALL_VERBS.find(v=>v.id===el.dataset.key),selectedPracticeTense,true);
    if (matchPaired===6) { document.getElementById('matchInfo').textContent=t('match_all'); document.getElementById('matchRestart').classList.add('show'); }
  } else {
    recordAnswer(ALL_VERBS.find(v=>v.id===matchSel.dataset.key),selectedPracticeTense,false);
    [el,matchSel].forEach(e=>e.classList.add('wrong-flash'));
    const old=matchSel;
    setTimeout(()=>{ [el,old].forEach(e=>e.classList.remove('wrong-flash','selected')); },500);
  }
  matchSel=null;
}

/* ── Tense Identification ────────────────────────── */
let tItems=[], tIdx=0, tCorrect=0, tAnswered=false;

function buildTItems() {
  const a=[];
  practicePool.forEach(v=>{
    if(selectedPracticeTense==='mixed'||selectedPracticeTense==='pres')a.push({form:v.greek,tense:'pres',v});
    if(v.aoristSupported&&(selectedPracticeTense==='mixed'||selectedPracticeTense==='past'))a.push({form:v.past,tense:'past',v});
    if(selectedPracticeTense==='mixed'||selectedPracticeTense==='fut')a.push({form:v.future,tense:'fut',v});
  });
  return a.sort(()=>Math.random()-0.5);
}

function initTense() { tItems=buildTItems(); tIdx=0; tCorrect=0; renderTense(); }

function renderTense() {
  tAnswered=false;
  const item=tItems[tIdx];
  document.getElementById('tPrompt').textContent = t('q_tense');
  document.getElementById('tForm').textContent   = item.form;
  document.getElementById('tSub').textContent    = `(${verbTrans(item.v)})`;
  document.getElementById('tFeedback').className = 'feedback';
  document.getElementById('tNext').classList.remove('show');
  document.getElementById('tScore').textContent  = `${t('score_lbl')} ${tIdx}/${tItems.length}`;
  const tenseMap = {pres:t('pres_t'), past:t('past_t'), fut:t('fut_t')};
  const correctLabel = tenseMap[item.tense];
  const opts = [t('pres_t'),t('past_t'),t('fut_t')];
  renderMC(opts, correctLabel, 'tOpts', (btn, chosen) => {
    if (tAnswered) return; tAnswered=true;
    const ok = chosen===correctLabel;
    if (ok) tCorrect++;
    recordAnswer(item.v,item.tense,ok);
    lockMC('tOpts', correctLabel, btn);
    if (!ok) btn.classList.add('wrong');
    const fb=document.getElementById('tFeedback');
    fb.className='feedback '+(ok?'correct':'wrong');
    fb.textContent = ok ? t('correct') :
      `${t('wrong')} ${item.form}: ${t('pres_t')} ${item.v.greek} · ${t('past_t')} ${item.v.past} · ${t('fut_t')} ${item.v.future}`;
    document.getElementById('tNext').classList.add('show');
    document.getElementById('tScore').textContent=`${t('score_lbl')} ${tIdx+1}/${tItems.length}`;
  });
}

function nextTense() { tIdx++; tIdx>=tItems.length ? showResults('tense',tCorrect,tItems.length) : renderTense(); }

/* ── Conjugation ─────────────────────────────────── */
let cjDeck=[], cjIdx=0, cjCorrect=0, cjAnswered=false;

function buildCjItems() {
  const a=[];
  practicePool.forEach(v=>{ [0,1,2,3,4,5].forEach(p=>{
    if(selectedPracticeTense==='mixed'||selectedPracticeTense==='pres')a.push({v,p,tense:'pres',correct:v.conj_pres[p]});
    if(v.aoristSupported&&(selectedPracticeTense==='mixed'||selectedPracticeTense==='past'))a.push({v,p,tense:'past',correct:v.conj_past[p]});
    if(selectedPracticeTense==='mixed'||selectedPracticeTense==='fut')a.push({v,p,tense:'fut',correct:v.conj_fut[p]});
  }); });
  return a.sort(()=>Math.random()-0.5);
}

function initConj() { cjDeck=buildCjItems(); cjIdx=0; cjCorrect=0; renderConj(); }

function renderConj() {
  cjAnswered=false;
  const item=cjDeck[cjIdx];
  document.getElementById('cjPrompt').textContent = t('q_conj');
  document.getElementById('cjVerb').textContent   = `${PERSONS[item.p]} + ${item.v.greek} · ${t(item.tense+'_t')} (${verbTrans(item.v)})`;
  document.getElementById('cjFeedback').className = 'feedback';
  document.getElementById('cjNext').classList.remove('show');
  document.getElementById('cjScore').textContent  = `${t('score_lbl')} ${cjIdx}/${cjDeck.length}`;
  // Wrong options: other persons of same verb + one from another verb
  const forms=item.tense==='pres'?item.v.conj_pres:item.tense==='past'?item.v.conj_past:item.v.conj_fut;
  const wrongPool = forms.filter((_,i)=>i!==item.p);
  const otherVerbs=practicePool.filter(v=>v!==item.v&&v.conj_pres);
  const other=otherVerbs[Math.floor(Math.random()*otherVerbs.length)]||item.v;
  const extra = (item.tense==='pres'?other.conj_pres:item.tense==='past'?other.conj_past:other.conj_fut)[item.p];
  const opts = [item.correct, ...wrongPool.sort(()=>Math.random()-0.5).slice(0,2), extra].sort(()=>Math.random()-0.5);
  renderMC(opts, item.correct, 'cjOpts', (btn, chosen, correct) => {
    if (cjAnswered) return; cjAnswered=true;
    const ok = chosen===correct;
    if (ok) cjCorrect++;
    recordAnswer(item.v,item.tense,ok);
    lockMC('cjOpts', correct, btn);
    if (!ok) btn.classList.add('wrong');
    const fb=document.getElementById('cjFeedback');
    fb.className='feedback '+(ok?'correct':'wrong');
    fb.textContent = ok ? t('correct') : `${t('wrong')} ${t('ans_correct')} ${correct}`;
    document.getElementById('cjNext').classList.add('show');
    document.getElementById('cjScore').textContent=`${t('score_lbl')} ${cjIdx+1}/${cjDeck.length}`;
  });
}

function nextConj() { cjIdx++; cjIdx>=cjDeck.length ? showResults('conj',cjCorrect,cjDeck.length) : renderConj(); }

/* ── Fill in Blank ───────────────────────────────── */
let fDeck=[], fIdx=0, fCorrect=0, fAnswered=false;

function buildFillItems() {
  const items=[];
  practicePool.forEach(v=>[0,1,2,3,4,5].forEach(p=>{
    const add=(tense,forms)=>{
      const fullAnswer=forms[p];
      const tokens=fullAnswer.split(/\s+/); const token=tokens.reduce((a,b)=>b.length>a.length?b:a,'');
      const start=Math.max(1,Math.floor(token.length*.45));
      const hiddenLength=Math.max(1,Math.min(3,token.length-start-(token.length>4?1:0)));
      const missing=token.slice(start,start+hiddenLength);
      const maskedToken=token.slice(0,start)+'_'.repeat(hiddenLength)+token.slice(start+hiddenLength);
      const masked=fullAnswer.replace(token,maskedToken);
      items.push({masked,answer:missing,fullAnswer,v,p,tense});
    };
    if(selectedPracticeTense==='mixed'||selectedPracticeTense==='pres')add('pres',v.conj_pres);
    if(v.aoristSupported&&(selectedPracticeTense==='mixed'||selectedPracticeTense==='past'))add('past',v.conj_past);
    if(selectedPracticeTense==='mixed'||selectedPracticeTense==='fut')add('fut',v.conj_fut);
  }));
  return items.sort(()=>Math.random()-0.5);
}
function initFill() { fDeck=buildFillItems(); fIdx=0; fCorrect=0; fAnswered=false; renderFill(); }

function renderFill() {
  fAnswered=false;
  const item=fDeck[fIdx];
  document.getElementById('fillPrompt').textContent   = t('q_fill');
  document.getElementById('fillSentence').textContent = `${PERSONS[item.p]} ${item.masked}`;
  document.getElementById('fillHint').textContent     = `${t('hint')} ${verbTrans(item.v)} · ${t(item.tense+'_t')}`;
  document.getElementById('fillTip').textContent      = t('accent_tip');
  const inp = document.getElementById('fillInput');
  inp.value=''; inp.className='fill-input'; inp.focus();
  inp.placeholder = '…';
  document.getElementById('fillFeedback').className='feedback';
  document.getElementById('fillNext').classList.remove('show');
  document.getElementById('fillCheck').textContent = t('check');
  document.getElementById('fillScore').textContent = `${t('score_lbl')} ${fIdx}/${fDeck.length}`;
}

function checkFill() {
  const inp = document.getElementById('fillInput');
  if (!inp.value.trim() || fAnswered) return;
  fAnswered=true;
  const item=fDeck[fIdx];
  const result = checkStr(inp.value, item.answer);
  const fb = document.getElementById('fillFeedback');
  if (result==='correct') { fCorrect++; inp.className='fill-input correct'; fb.className='feedback correct'; fb.textContent=t('correct')+' '+item.fullAnswer; }
  else if (result==='almost') { inp.className='fill-input wrong'; fb.className='feedback wrong'; fb.textContent=`${t('almost')} ${item.answer} → ${item.fullAnswer}`; }
  else { inp.className='fill-input wrong'; fb.className='feedback wrong'; fb.textContent=`${t('wrong')} ${t('ans_correct')} ${item.answer} → ${item.fullAnswer}`; }
  recordAnswer(item.v,item.tense,result==='correct');
  document.getElementById('fillNext').classList.add('show');
  document.getElementById('fillScore').textContent=`${t('score_lbl')} ${fIdx+1}/${fDeck.length}`;
}

document.addEventListener('DOMContentLoaded', ()=>{
  document.documentElement.lang = lang;
  document.title = t('document_title');
  document.getElementById('fillInput').addEventListener('keydown', e=>{ if(e.key==='Enter') checkFill(); });
  document.getElementById('situationInput').addEventListener('keydown', e=>{ if(e.key==='Enter') checkSituation(); });
});

function nextFill() { fIdx++; fIdx>=fDeck.length ? showResults('fill',fCorrect,fDeck.length) : renderFill(); }

/* ── Change the Tense ────────────────────────────── */
let ctDeck=[], ctIdx=0, ctCorrect=0, ctAnswered=false;

function buildChangeItems() {
  const labels={pres:['Present','Настоящее'],past:['Past (aorist)','Прошедшее (аорист)'],fut:['Simple future','Простое будущее']};
  const items=[];
  practicePool.forEach(v=>[0,1,2,3,4,5].forEach(p=>{
    const forms={pres:v.conj_pres,past:v.conj_past,fut:v.conj_fut};
    const available=['pres','fut',...(v.aoristSupported?['past']:[])];
    available.forEach(from=>available.filter(to=>to!==from&&(selectedPracticeTense==='mixed'||to===selectedPracticeTense)).forEach(to=>{
      const answer=forms[to][p];
      const distractors=[forms[from][p],...forms[to].filter((_,i)=>i!==p)].filter((x,i,a)=>x!==answer&&a.indexOf(x)===i).slice(0,3);
      items.push({dir_en:`${labels[from][0]} → ${labels[to][0]}`,dir_ru:`${labels[from][1]} → ${labels[to][1]}`,form:forms[from][p],opts:[answer,...distractors].sort(()=>Math.random()-0.5),answer,v,tense:to});
    }));
  }));
  return items.sort(()=>Math.random()-0.5);
}
function initChange() { ctDeck=buildChangeItems(); ctIdx=0; ctCorrect=0; renderChange(); }

function renderChange() {
  ctAnswered=false;
  const item=ctDeck[ctIdx];
  const dir = lang==='en'? item.dir_en : item.dir_ru;
  document.getElementById('ctPrompt').textContent = t('q_change');
  document.getElementById('ctDir').textContent    = dir;
  document.getElementById('ctForm').textContent   = item.form;
  document.getElementById('ctFeedback').className = 'feedback';
  document.getElementById('ctNext').classList.remove('show');
  document.getElementById('ctScore').textContent  = `${t('score_lbl')} ${ctIdx}/${ctDeck.length}`;
  renderMC(item.opts, item.answer, 'ctOpts', (btn, chosen, correct) => {
    if (ctAnswered) return; ctAnswered=true;
    const ok = chosen===correct;
    if (ok) ctCorrect++;
    recordAnswer(item.v,item.tense,ok);
    lockMC('ctOpts', correct, btn);
    if (!ok) btn.classList.add('wrong');
    const fb=document.getElementById('ctFeedback');
    fb.className='feedback '+(ok?'correct':'wrong');
    fb.textContent = ok ? t('correct') : `${t('wrong')} ${t('ans_correct')} ${correct}`;
    document.getElementById('ctNext').classList.add('show');
    document.getElementById('ctScore').textContent=`${t('score_lbl')} ${ctIdx+1}/${ctDeck.length}`;
  });
}

function nextChange() { ctIdx++; ctIdx>=ctDeck.length ? showResults('change',ctCorrect,ctDeck.length) : renderChange(); }

/* ── Picture situations & dialogues ─────────────── */
let situationDeck=[], situationIdx=0, situationCorrect=0, situationAnswered=false;

function initSituation(){
  situationDeck=[...SITUATIONS].sort(()=>Math.random()-0.5);
  situationIdx=0; situationCorrect=0; situationAnswered=false;
  renderSituation();
}

function renderSituation(){
  situationAnswered=false;
  const item=situationDeck[situationIdx]; if(!item)return;
  document.getElementById('situationImage').src=item.image;
  document.getElementById('situationImage').alt=lang==='en'?item.en:item.ru;
  document.getElementById('situationPrompt').textContent=t('situation_prompt');
  document.getElementById('situationContext').textContent=`${t('situation_context')} ${lang==='en'?item.en:item.ru}`;
  document.getElementById('situationDialogue').innerHTML=item.lines.map(line=>`<p>${line}</p>`).join('');
  const audio=document.getElementById('situationAudio'); audio.textContent=t('situation_listen');
  audio.onclick=event=>speakGreek(item.full.join(' '),event);
  const input=document.getElementById('situationInput'); input.value=''; input.className='fill-input'; input.focus();
  document.getElementById('situationCheck').textContent=t('check');
  document.getElementById('situationFeedback').className='feedback';
  document.getElementById('situationNext').textContent=t('next');
  document.getElementById('situationNext').classList.remove('show');
  document.getElementById('situationScore').textContent=`${t('score_lbl')} ${situationIdx}/${situationDeck.length}`;
}

function checkSituation(){
  const input=document.getElementById('situationInput');
  if(!input.value.trim()||situationAnswered)return;
  situationAnswered=true;
  const item=situationDeck[situationIdx]; const result=checkStr(input.value,item.answer); const ok=result==='correct';
  if(ok)situationCorrect++;
  input.className='fill-input '+(ok?'correct':'wrong');
  const feedback=document.getElementById('situationFeedback'); feedback.className='feedback '+(ok?'correct':'wrong');
  feedback.textContent=ok?`${t('correct')} ${item.answer}`:`${result==='almost'?t('almost'):t('wrong') } ${t('ans_correct')} ${item.answer}`;
  recordAnswer(null,'situation',ok);
  document.getElementById('situationNext').classList.add('show');
  document.getElementById('situationScore').textContent=`${t('score_lbl')} ${situationIdx+1}/${situationDeck.length}`;
}

function nextSituation(){
  situationIdx++;
  situationIdx>=situationDeck.length?showResults('situation',situationCorrect,situationDeck.length):renderSituation();
}

/* ── Image Matching ──────────────────────────────── */
let imgSel=null, imgPaired=0;

function initImage() {
  imgSel=null; imgPaired=0;
  const lCol=document.getElementById('imgLeft');
  const rCol=document.getElementById('imgRight');
  const shuffledL=[...IMAGE_EXERCISES].sort(()=>Math.random()-0.5);
  const shuffledR=[...IMAGE_EXERCISES].sort(()=>Math.random()-0.5);
  lCol.innerHTML=''; rCol.innerHTML='';
  document.getElementById('imgInfo').textContent=t('q_image');
  document.getElementById('imgRestart').classList.remove('show');
  shuffledL.forEach(img=>{
    const el=document.createElement('div'); el.className='img-card'; el.dataset.key=img.answer; el.dataset.side='left';
    el.innerHTML=`<div class="img-emoji">${img.emoji}</div><div class="img-label">${lang==='en'?img.label_en:img.label_ru}</div>`;
    el.onclick=()=>handleImg(el); lCol.appendChild(el);
  });
  shuffledR.forEach(img=>{
    const el=document.createElement('div'); el.className='match-item ru'; el.dataset.key=img.answer; el.dataset.side='right';
    el.textContent=img.sentence; el.onclick=()=>handleImg(el); rCol.appendChild(el);
  });
}

function handleImg(el) {
  if (el.classList.contains('matched')) return;
  if (!imgSel) {
    if (el.dataset.side==='right') return;
    el.classList.add('selected'); imgSel=el; return;
  }
  if (el.dataset.side==='left') { imgSel.classList.remove('selected'); el.classList.add('selected'); imgSel=el; return; }
  if (el.dataset.key===imgSel.dataset.key) {
    [el,imgSel].forEach(e=>{ e.classList.remove('selected'); e.classList.add('matched'); });
    imgPaired++;
    if (imgPaired===IMAGE_EXERCISES.length) { document.getElementById('imgInfo').textContent=t('match_all'); document.getElementById('imgRestart').classList.add('show'); }
  } else {
    [el,imgSel].forEach(e=>e.classList.add('wrong-flash'));
    const old=imgSel;
    setTimeout(()=>{ [el,old].forEach(e=>e.classList.remove('wrong-flash','selected')); },500);
  }
  imgSel=null;
}

/* ── A2 exam phrasebook ──────────────────────────── */
const PHRASE_CATEGORY_MAP = {
  daily:['daily'], food:['food'], home:['personal'], work:['work'], travel:['directions'], shopping:['shopping'],
  health:['health','doctor'], social:['greetings','plans','opinion'], picnic:['picnic'], doctor:['doctor'], hotel:['hotel'],
  holiday:['holiday','plans'], visa:['visa'], lost:['lost']
};
let phraseCategory = 'daily';

const PHRASE_CATEGORY_EMOJI={daily:'⏰',food:'🍽️',personal:'🏠',greetings:'👋',directions:'🚌',shopping:'🛍️',health:'💊',doctor:'🩺',plans:'📅',opinion:'💬',work:'💼',picnic:'🧺',hotel:'🧳',holiday:'🏖️',visa:'📄',lost:'🎒'};
function phraseEmoji(item){
  const s=item.gr.toLowerCase();
  const rules=[
    [/λεωφορεί|στάση|κέντρο|ευθεία|στρίψ/, '🚌'],[/καφέ|πρωινό/, '☕'],[/νερό|χυμό/, '🥤'],[/φαγη|παραγγ|λογαριασμό|κρεμμύδι/, '🍽️'],
    [/κάρτα|πληρώσ/, '💳'],[/μήλα|σούπερ|ψων/, '🛒'],[/γιατρ|πυρετό|πονά|λαιμός/, '🩺'],[/φαρμακ/, '💊'],[/ξενοδοχ|δωμάτιο|κράτηση|πετσέτες/, '🧳'],
    [/διαβατ|έγγραφα|δικαιολογητικά|αίτησ|άδεια παραμονής/, '📄'],[/έχασα|τσάντα/, '🎒'],[/έκλεψαν|πορτοφόλι/, '👛'],[/δουλει|εργασία|συναδέλφ/, '💼'],
    [/μήνυμα|τηλεφων/, '📱'],[/θάλασσα|παραλία|κολυμπ/, '🏖️'],[/πικνίκ/, '🧺'],[/σπίτι/, '🏠'],[/ώρα|επτά|οκτώ/, '🕗'],[/διαβάζ|ελληνικά|εξέταση|άσκηση/, '📚']
  ];
  return rules.find(([re])=>re.test(s))?.[1]||PHRASE_CATEGORY_EMOJI[item.cat]||'💬';
}

const PHRASE_VISUALS={
  daily:['daily','center','⏰'],food:['food','center','🍽️'],home:['home','center','🏠'],work:['work','center','💼'],travel:['travel','center','🚌'],shopping:['shopping','center','🛍️'],health:['health','center','💊'],social:['social','center','💬'],picnic:['picnic','center','🧺'],doctor:['doctor','center','🩺'],hotel:['hotel','center','🧳'],holiday:['holiday','center','🏖️'],visa:['visa','center','📄'],lost:['lost','center','🎒']
};
function renderPhraseScene(){
  const scene=document.getElementById('phraseScene'); if(!scene)return;
  const [asset,position,emoji]=PHRASE_VISUALS[phraseCategory]||PHRASE_VISUALS.daily;
  scene.style.backgroundImage=`url('assets/phrases/topics/${asset}.png')`;
  scene.style.backgroundSize='contain';
  scene.style.backgroundPosition=position;
  scene.style.aspectRatio=['daily','shopping'].includes(asset)?'8 / 3':'1.5 / 1';
  scene.style.backgroundColor='#111426';
  scene.setAttribute('aria-label',topicLabel(phraseCategory));
  document.getElementById('phraseSceneEmoji').textContent=emoji;
}

function renderPhraseSelect() {
  const sel=document.getElementById('phraseSelect');
  sel.innerHTML='';
  TOPICS.forEach(topic=>{
    const o=document.createElement('option');
    o.value=topic.id; o.textContent=topic[lang]; sel.appendChild(o);
  });
  sel.value=phraseCategory;
}

function renderPhrases() {
  phraseCategory = document.getElementById('phraseSelect').value || phraseCategory;
  renderPhraseScene();
  document.getElementById('phrasesTitle').textContent=t('phrases_title');
  const tbody=document.getElementById('phrasesTbody');
  tbody.innerHTML='';
  const sourceCats=PHRASE_CATEGORY_MAP[phraseCategory]||[phraseCategory];
  EXAM_PHRASES.filter(item=>sourceCats.includes(item.cat)).forEach(item=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td class="td-phrase-greek"><span class="phrase-emoji" aria-hidden="true">${phraseEmoji(item)}</span><button class="audio-btn phrase-audio" onclick="speakGreek('${item.gr.replaceAll("'","\\'")}',event)">🔊</button><span>${item.gr}</span></td>
      <td class="td-phrase-meaning">${lang==='en'?item.en:item.ru}</td>
      <td class="td-phrase-context">${topicLabel(phraseCategory)}</td>`;
    tbody.appendChild(tr);
  });
}

function fillSelect(select, options, current) {
  if(!select)return;
  select.innerHTML='';
  options.forEach(([value,label])=>{const o=document.createElement('option');o.value=value;o.textContent=label;select.appendChild(o)});
  if(options.some(([value])=>value===current))select.value=current;
}

function setupControls() {
  const group=document.getElementById('verbGroup');
  const count=key=>key==='irregular'?ALL_VERBS.filter(v=>v.irregular).length:ALL_VERBS.filter(v=>v.group===key).length;
  fillSelect(group,[['all',`${t('filter_all')} (${ALL_VERBS.length})`],['a',`${t('group_a')} (${count('a')})`],['b1',`${t('group_b1')} (${count('b1')})`],['b2',`${t('group_b2')} (${count('b2')})`],['omai',`${t('group_omai')} (${count('omai')})`],['irregular',`${t('group_irregular')} (${count('irregular')})`]],group?.value||'all');
  const topicOptions=[['all',t('topic_all')],...TOPICS.map(topic=>[topic.id,topic[lang]])];
  const flash=document.getElementById('flashTopic'); fillSelect(flash,topicOptions,flash?.value||'all');
  const groupOptions=[['all',t('filter_all')],['a',t('group_a')],['b1',t('group_b1')],['b2',t('group_b2')],['omai',t('group_omai')],['irregular',t('group_irregular')]];
  const flashGroup=document.getElementById('flashGroup'); fillSelect(flashGroup,groupOptions,flashGroup?.value||'all');
  const pTopic=document.getElementById('practiceTopic'); fillSelect(pTopic,[...topicOptions,['mistakes',t('my_mistakes')]],pTopic?.value||'all');
  const pTense=document.getElementById('practiceTense'); fillSelect(pTense,[['mixed',t('mixed')],['pres',t('pres_t')],['past',t('past_t')],['fut',t('fut_t')]],pTense?.value||'mixed');
  const pType=document.getElementById('practiceType'); fillSelect(pType,[['quiz',t('sub_quiz')],['match',t('sub_match')],['tense',t('sub_tense')],['conj',t('sub_conj')],['change',t('sub_change')],['person',t('sub_person')],['situation',t('sub_situation')],['mixed',t('mixed_practice')],['fill',t('sub_fill')]],pType?.value||'quiz');
  document.getElementById('difficultBtn').textContent=t('difficult_only');
  renderTable();
}

function startConfiguredPractice() {
  const topic=document.getElementById('practiceTopic').value;
  const requested=document.getElementById('practiceType').value;
  selectedPracticeTense=document.getElementById('practiceTense').value;
  practicePool=ALL_VERBS.filter(v=>v.conj_pres).filter(v=>{
    if(topic==='all')return true;
    if(topic==='mistakes')return (progress.mistakes[v.id]||0)>0;
    return v.topics.includes(topic);
  }).filter(v=>selectedPracticeTense!=='past'||v.aoristSupported);
  const message=document.getElementById('practiceMessage');
  if(practicePool.length<(requested==='match'?6:2)) { message.textContent=t('empty_practice'); message.className='setup-message show'; return; }
  message.className='setup-message';
  let type=requested;
  if(type==='person')type='conj';
  if(type==='mixed')type=['quiz','match','tense','conj','change','situation','fill'][Math.floor(Math.random()*7)];
  switchExercise(type);
  document.getElementById('ex-'+type).scrollIntoView({behavior:'smooth',block:'start'});
}

/* ── Init ─────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', ()=>{
  renderTable();
  renderFC();
  switchExercise('quiz');
  renderPhraseSelect();
  renderPhrases();
  setupControls();
  if(!('speechSynthesis' in window)) document.querySelectorAll('.audio-btn').forEach(button=>button.hidden=true);
  // apply initial i18n
  document.querySelectorAll('[data-i18n]').forEach(el=>{ el.textContent=t(el.dataset.i18n).replace('{count}',ALL_VERBS.length); });
  document.querySelectorAll('[data-i18n-ph]').forEach(el=>{ el.placeholder=t(el.dataset.i18nPh); });
});
