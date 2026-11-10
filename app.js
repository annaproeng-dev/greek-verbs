const isExamPage=()=>document.body?.dataset?.page==='exam';

/* ── Language & Accent ─────────────────────────────── */
const readStoredJSON = (key, fallback, valid) => { try { const value=JSON.parse(appStorage.getItem(key)); return valid(value)?value:fallback; } catch { return fallback; } };
let lang = ['en','ru'].includes(appStorage.getItem('greekTrainerLang')) ? appStorage.getItem('greekTrainerLang') : 'en';
let accentMode = false;
let practicePool = ALL_VERBS.filter(v=>v.conj_pres);
let selectedPracticeTense = 'mixed';
const SESSION_SIZE = 10;
let difficultMode = false;
const difficultIds = new Set();
const progress = {};
const nonNegativeNumber = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
const plainRecord = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const cleanCounts = value => Object.fromEntries(Object.entries(plainRecord(value)).filter(([key])=>key!=='__proto__').map(([key,count])=>[key,nonNegativeNumber(count)]));
function normalizeProgress() {
  progress.correct=nonNegativeNumber(progress.correct);
  progress.wrong=nonNegativeNumber(progress.wrong);
  progress.sessions=nonNegativeNumber(progress.sessions);
  progress.sessionProgress=Math.min(nonNegativeNumber(progress.sessionProgress),SESSION_SIZE-1);
  progress.mistakes=cleanCounts(progress.mistakes);
  progress.activityDays=cleanCounts(progress.activityDays);
  progress.byTense=Object.fromEntries(Object.entries(plainRecord(progress.byTense)).map(([key,value])=>[key,{correct:nonNegativeNumber(value?.correct),wrong:nonNegativeNumber(value?.wrong)}]));
  if(typeof normalizeExamProgress==='function')normalizeExamProgress();
  progress.firstActivity=typeof progress.firstActivity==='string' && /^\d{4}-\d{2}-\d{2}$/.test(progress.firstActivity) && !Number.isNaN(Date.parse(progress.firstActivity+'T12:00:00')) ? progress.firstActivity : null;
}
normalizeProgress();
let rewardSoundOn=appStorage.getItem('greekRewardSound')!=='off';
let rewardVoiceOn=appStorage.getItem('greekRewardVoice')!=='off';

const t = key => I18N[lang][key] || key;
const verbTrans = v => lang === 'en' ? v.english : v.russian;
const verbEx    = v => (lang === 'en' ? v.ex_en : v.ex_ru) || `${v.greek} — ${verbTrans(v)}`;
const verbExGreek = v => v.ex_gr || v.greek;
const verbExTranslation = v => (lang === 'en' ? v.ex_en : v.ex_ru) || verbTrans(v);
const sessionProgressText = (index,total) => `${t('task_lbl')} ${Math.min(index+1,total)} ${t('of')} ${total}`;

function updateAccessibleNames() {
  const languageButton=document.getElementById('langBtn');
  const languageLabel=lang==='ru'?'Текущий язык: русский. Переключить на английский':'Current language: English. Switch to Russian';
  languageButton.setAttribute('aria-label',languageLabel);
  languageButton.title=languageLabel;
  document.querySelectorAll('[data-i18n-aria]').forEach(el=>el.setAttribute('aria-label',t(el.dataset.i18nAria)));
  document.getElementById('progressBtn').setAttribute('aria-label',t('progress_title'));
  document.getElementById('olympusBtn').setAttribute('aria-label',lang==='ru'?'Мой Олимп':'My Olympus');
}

function showStorageNotice() {
  if(!appStorage.unavailable)return;
  let notice=document.getElementById('storageNotice');
  if(!notice){ notice=document.createElement('div'); notice.id='storageNotice'; notice.className='storage-notice'; notice.setAttribute('role','status'); document.body.prepend(notice); }
  notice.textContent=lang==='ru'?'Браузер не сохраняет данные: прогресс и настройки доступны только в текущей вкладке. Проверьте настройки хранилища.':'Your browser cannot save data. Progress and settings are available only in this tab; check your storage settings.';
}
document.addEventListener('storage-unavailable',showStorageNotice);

function toggleLang() {
  setLang(lang === 'en' ? 'ru' : 'en');
}

function setLang(l) {
  const previousLang=lang;
  lang = l;
  appStorage.setItem('greekTrainerLang', l);
  document.documentElement.lang = l;
  document.title = t('document_title');
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n).replace('{count}',ALL_VERBS.length);
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPh);
  });
  updateAccessibleNames();
  showStorageNotice();
  renderAuth();
  document.getElementById('langBtn').textContent = t('lang_toggle');
  const tourButton=document.getElementById('profileTourBtn');
  if(tourButton)tourButton.textContent=lang==='ru'?'🪽 Как работает сайт':'🪽 How the site works';
  window.updateThemeControl?.();
  if(document.getElementById('onboardingDialog')?.open)renderOnboarding();
  if(isExamPage()){window.updateThemeControl?.();renderExam();return;}
  setupControls();
  updateAccentHelp();
  document.querySelectorAll('.results-wrap').forEach(result => {
    const exercise = result.closest('.exercise');
    if (exercise) renderResults(exercise.id.replace('ex-',''), Number(result.dataset.correct), Number(result.dataset.total));
  });
  // Refresh active section
  const active = document.querySelector('.section.active');
  if (active) {
    const id = active.id.replace('sec-','');
    if (id === 'flashcards') renderFC();
    if (id === 'phrases')    { renderPhraseSelect(); renderPhrases(); }
    if (id === 'practice') refreshActiveExercise(previousLang);
  }
}

/* ── Hermes onboarding ───────────────────────────── */
let onboardingStep=0;
const ONBOARDING_STEPS={
  ru:[
    {icon:'👋',title:'Добро пожаловать!',text:'Я Гермес, твой проводник. Сначала познакомимся, а затем я покажу основные разделы прямо на сайте.',tip:'Καλώς ήρθες! Είμαι ο Ερμής, ο οδηγός σου.'}
  ],
  en:[
    {icon:'👋',title:'Welcome!',text:'I am Hermes, your guide. First we will meet, and then I will point out the main sections directly on the site.',tip:'Καλώς ήρθες! Είμαι ο Ερμής, ο οδηγός σου.'}
  ]
};
const TOUR_STEPS={
  ru:[
    {target:'nav-verbs',section:'verbs',title:'Глаголы',text:'Здесь ищут глагол, сравнивают три времени, открывают полное спряжение и озвучку.'},
    {target:'nav-flashcards',section:'flashcards',title:'Карточки',text:'Здесь переворачивают карточки, слушают греческий и отмечают трудные глаголы.'},
    {target:'nav-practice',section:'practice',title:'Практика',text:'Здесь выбирают тему, время и упражнение. Одна учебная сессия — 10 заданий.'},
    {target:'nav-phrases',section:'phrases',title:'Фразы и ситуации',text:'Здесь изучают живые фразы с переводом, картинками, диалогами и озвучкой.'},
    {target:'olympusBtn',section:'verbs',title:'Прогресс и Олимп',text:'Правильные ответы открывают награды и постепенно проявляют фигурки одну за другой.',demo:'olympus'}
  ],
  en:[
    {target:'nav-verbs',section:'verbs',title:'Verbs',text:'Find a verb, compare three tenses, then open its full conjugation and audio.'},
    {target:'nav-flashcards',section:'flashcards',title:'Flashcards',text:'Flip cards, listen to the Greek and mark difficult verbs for extra practice.'},
    {target:'nav-practice',section:'practice',title:'Practice',text:'Choose a topic, tense and exercise here. One learning session is 10 tasks.'},
    {target:'nav-phrases',section:'phrases',title:'Phrases and situations',text:'Learn living Greek with translations, pictures, dialogues and audio.'},
    {target:'olympusBtn',section:'verbs',title:'Progress and Olympus',text:'Correct answers unlock rewards and gradually reveal figurines one by one.',demo:'olympus'}
  ]
};
let tourIndex=0;
function onboardingStorageKey(){return `greekOnboarding:${currentUser?.email||'guest'}`;}
function playOnboardingHermes(event){
  event?.stopPropagation();
  stopDialogue();
  const audio=new Audio('assets/olympus/voices/hermes-welcome-male.mp3?v=2');
  dialogueAudio=audio;
  audio.volume=.84;
  audio.play().catch(()=>{
    const button=document.querySelector('.onboarding-audio');
    if(button)button.textContent=lang==='ru'?'Не удалось воспроизвести. Нажмите ещё раз':'Playback failed. Please try again';
  });
}
function chooseOnboardingLanguage(language){
  onboardingStep=0;
  setLang(language);
}

function startOnboarding(replay=false){
  if(!replay&&appStorage.getItem(onboardingStorageKey())==='done')return;
  onboardingStep=-1;
  renderOnboarding();
  const dialog=document.getElementById('onboardingDialog');
  if(!dialog.open)dialog.showModal();
}
function renderOnboarding(){
  stopDialogue();
  if(onboardingStep===-1){
    document.getElementById('onboardingContent').innerHTML=`
      <div class="onboarding-layout">
        <div class="onboarding-hermes"><img src="assets/olympus/mascots/hermes.png" alt="Hermes / Гермес"></div>
        <div class="onboarding-copy">
          <h2 id="onboardingTitle">Выберите язык<br>Choose your language</h2>
          <p>На каком языке показать сайт и подсказки?<br>Which language would you like for the site and tips?</p>
          <div class="onboarding-actions">
            <button class="fill-submit" type="button" onclick="chooseOnboardingLanguage('ru')">Русский</button>
            <button class="fill-submit" type="button" onclick="chooseOnboardingLanguage('en')">English</button>
          </div>
        </div>
      </div>`;
    return;
  }
  const steps=ONBOARDING_STEPS[lang],step=steps[onboardingStep];
  const dots=Array.from({length:6},(_,index)=>`<span class="onboarding-dot ${index===0?'active':''}" aria-hidden="true"></span>`).join('');
  document.getElementById('onboardingContent').innerHTML=`
    <div class="onboarding-layout">
      <div class="onboarding-hermes"><img src="assets/olympus/mascots/hermes.png" alt="${lang==='ru'?'Гермес':'Hermes'}"></div>
      <div class="onboarding-copy">
        <button class="dialog-close" type="button" onclick="finishOnboarding()" aria-label="${t('close')}">×</button>
        <div class="onboarding-step">${lang==='ru'?'Шаг':'Step'} 1 / 6</div>
        <div class="onboarding-icon" aria-hidden="true">${step.icon}</div>
        <h2 id="onboardingTitle">${step.title}</h2>
        <div class="onboarding-key">${step.tip}</div>
        <p class="onboarding-detail">${step.text}</p>
        ${onboardingStep===0?`<button class="audio-btn onboarding-audio" type="button" onclick="playOnboardingHermes(event)">🔊 ${lang==='ru'?'Послушать Гермеса':'Listen to Hermes'}</button>`:''}
        <div class="onboarding-dots">${dots}</div>
        <div class="onboarding-actions">
          <button class="tool-btn" type="button" onclick="finishOnboarding()">${lang==='ru'?'Пропустить':'Skip'}</button>
          ${onboardingStep?`<button class="tool-btn" type="button" onclick="onboardingStep--;renderOnboarding()">${lang==='ru'?'← Назад':'← Back'}</button>`:''}
          <button class="fill-submit" type="button" onclick="showOnboardingRegistration()">${lang==='ru'?'Далее →':'Next →'}</button>
        </div>
      </div>
    </div>`;
}
function showOnboardingRegistration(){
  stopDialogue();
  document.getElementById('onboardingContent').innerHTML=`
    <div class="onboarding-layout">
      <div class="onboarding-hermes"><img src="assets/olympus/mascots/hermes.png" alt="${lang==='ru'?'Гермес':'Hermes'}"></div>
      <div class="onboarding-copy onboarding-register-copy">
        <button class="dialog-close" type="button" onclick="finishOnboarding()" aria-label="${t('close')}">×</button>
        <div class="onboarding-step">${lang==='ru'?'Перед обзором сайта':'Before the site tour'}</div>
        <div class="onboarding-icon" aria-hidden="true">👤</div>
        <h2 id="onboardingTitle">${lang==='ru'?'Сохранять прогресс?':'Save your progress?'}</h2>
        <div class="onboarding-key">${lang==='ru'?'Аккаунт сохраняет ответы, награды и открытых персонажей.':'An account saves answers, rewards, and unlocked characters.'}</div>
        <button class="fill-submit onboarding-register-primary" type="button" onclick="openOnboardingAccount('register')">${lang==='ru'?'Создать аккаунт':'Create an account'}</button>
        <button class="onboarding-guest-link" type="button" onclick="continueOnboardingAsGuest()">${lang==='ru'?'Пройти онбординг без регистрации':'Continue onboarding without registration'}</button>
        <button class="onboarding-login-link" type="button" onclick="openOnboardingAccount('login')">${lang==='ru'?'Уже есть аккаунт? Войти':'Already have an account? Log in'}</button>
      </div>
    </div>`;
}
function openOnboardingAccount(mode){
  appStorage.setItem('greekOnboardingPending','tour');
  document.getElementById('onboardingDialog')?.close();
  navigateAccount(mode);
}
function continueOnboardingAsGuest(){
  appStorage.setItem('greekGuestOnboarding','yes');
  document.getElementById('onboardingDialog')?.close();
  startContextTour();
}
function clearContextTour(){
  document.querySelector('.tour-highlight')?.classList.remove('tour-highlight');
  document.getElementById('contextTourTooltip')?.remove();
  window.removeEventListener('resize',positionContextTour);
}
function startContextTour(){
  leaveAccountRoute();
  document.body.classList.remove('account-page');
  tourIndex=0; renderContextTour();
}
function positionContextTour(){
  const tooltip=document.getElementById('contextTourTooltip');
  const target=document.querySelector('.tour-highlight');
  if(!tooltip||!target)return;
  const rect=target.getBoundingClientRect();
  const width=Math.min(360,window.innerWidth-24);
  let left=Math.max(12,Math.min(window.innerWidth-width-12,rect.left+rect.width/2-width/2));
  let top=rect.bottom+22,side='top';
  if(top+tooltip.offsetHeight>window.innerHeight-12){top=Math.max(12,rect.top-tooltip.offsetHeight-22);side='bottom';}
  const arrowX=Math.max(26,Math.min(width-26,rect.left+rect.width/2-left));
  tooltip.style.width=`${width}px`;tooltip.style.left=`${left}px`;tooltip.style.top=`${top}px`;tooltip.style.setProperty('--tour-arrow-x',`${arrowX}px`);tooltip.dataset.arrow=side;
}
function renderContextTour(){
  clearContextTour();
  const steps=TOUR_STEPS[lang],step=steps[tourIndex];
  switchSection(step.section);
  const target=document.getElementById(step.target);
  if(!target){finishContextTour();return;}
  target.classList.add('tour-highlight');
  const tooltip=document.createElement('aside');
  tooltip.id='contextTourTooltip';tooltip.className='context-tour-tooltip';tooltip.setAttribute('role','dialog');
  const dots=Array.from({length:6},(_,index)=>`<span class="onboarding-dot ${index===tourIndex+1?'active':''}"></span>`).join('');
  const demo=step.demo==='olympus'?`<div class="collection-reveal-demo" aria-label="${lang==='ru'?'Фигурки открываются одна за другой':'Figurines unlock one by one'}">${['hermes','athena','apollo','aphrodite','zeus'].map((id,index)=>`<span style="--reveal-index:${index}"><img src="assets/olympus/mascots/${id}.png" alt=""><i>✓</i></span>`).join('')}</div><small class="collection-demo-label">${lang==='ru'?'Каждый этап делает следующую фигуру видимой':'Each milestone reveals the next figurine'}</small>`:'';
  tooltip.innerHTML=`<div class="context-tour-head"><img src="assets/olympus/mascots/hermes-login-v2.png" alt=""><div><span>${lang==='ru'?'Шаг':'Step'} ${tourIndex+2} / 6</span><h3>${step.title}</h3></div></div><p class="context-tour-message">${step.text}</p>${demo}<div class="context-tour-footer"><div class="onboarding-dots">${dots}</div><div class="context-tour-actions">${tourIndex?`<button class="tool-btn" onclick="tourIndex--;renderContextTour()">${lang==='ru'?'← Назад':'← Back'}</button>`:''}<button class="fill-submit" onclick="${tourIndex===steps.length-1?'finishContextTour()':'tourIndex++;renderContextTour()'}">${tourIndex===steps.length-1?(lang==='ru'?'Начать заниматься':'Start learning'):(lang==='ru'?'Далее →':'Next →')}</button></div></div>`;
  document.body.appendChild(tooltip);positionContextTour();window.addEventListener('resize',positionContextTour);
}
function finishContextTour(){
  clearContextTour();appStorage.setItem(onboardingStorageKey(),'done');switchSection('flashcards');
}
function showGuestRegistrationPrompt(){
  if(currentUser)return;
  stopDialogue();
  document.getElementById('onboardingContent').innerHTML=`<div class="onboarding-layout guest-register-layout"><div class="onboarding-hermes"><img src="assets/olympus/mascots/hermes.png" alt="${lang==='ru'?'Гермес':'Hermes'}"></div><div class="onboarding-copy"><button class="dialog-close" onclick="onboardingDialog.close()">×</button><div class="onboarding-icon">🎉</div><h2 id="onboardingTitle">${lang==='ru'?'Первая сессия завершена!':'Your first session is complete!'}</h2><div class="onboarding-key">${lang==='ru'?'Создай аккаунт, чтобы сохранить результат, получать награды и открывать персонажей Олимпа.':'Create an account to keep your result, earn rewards, and unlock the Olympians.'}</div><button class="fill-submit onboarding-register-primary" onclick="openOnboardingAccount('register')">${lang==='ru'?'Создать аккаунт':'Create an account'}</button><button class="onboarding-login-link" onclick="openOnboardingAccount('login')">${lang==='ru'?'Войти':'Log in'}</button><button class="onboarding-guest-link" onclick="onboardingDialog.close()">${lang==='ru'?'Продолжить без аккаунта':'Continue without an account'}</button></div></div>`;
  const dialog=document.getElementById('onboardingDialog');if(!dialog.open)dialog.showModal();
}
function finishOnboarding(goToCards=false){
  stopDialogue();
  appStorage.setItem(onboardingStorageKey(),'done');
  document.getElementById('onboardingDialog')?.close();
  if(goToCards){
    leaveAccountRoute();
    switchSection('flashcards');
  }
}

const topicLabel = id => id === 'all' ? t('topic_all') : (TOPICS.find(topic=>topic.id===id)?.[lang] || id);

let dialogueGeneration=0, dialogueAudio=null;
function speakGreek(text, event) {
  event?.stopPropagation();
  if (!('speechSynthesis' in window)) return;
  stopDialogue();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'el-GR'; utterance.rate = .82;
  const voice = speechSynthesis.getVoices().find(v=>v.lang.toLowerCase().startsWith('el'));
  if (voice) utterance.voice = voice;
  speechSynthesis.speak(utterance);
}

function stopDialogue() {
  dialogueGeneration++;
  if(dialogueAudio){dialogueAudio.pause(); dialogueAudio=null;}
  if('speechSynthesis' in window) speechSynthesis.cancel();
}

function situationAudioFingerprint(item){
  const payload=item.full.join('\n')+'\n'+item.lineSpeakers.join(',')+'\n'+item.speakers.map(speaker=>speaker.gender).join(',');
  return Array.from(payload).reduce((value,char)=>Math.imul(value^char.codePointAt(0),16777619)>>>0,2166136261);
}
function playSituationDialogue(item,event){
  event?.stopPropagation();stopDialogue();
  const status=document.getElementById('situationVoiceStatus');
  const recording=SITUATION_RECORDINGS[item.id];
  if(!recording||recording.fingerprint!==situationAudioFingerprint(item)){
    status.textContent=situationText('The recording needs updating for this dialogue.','Запись этого диалога нужно обновить.');return;
  }
  const generation=dialogueGeneration;
  const audio=new Audio(`${recording.src}?v=${recording.fingerprint}`);dialogueAudio=audio;
  status.textContent='';
  const failed=()=>{
    if(generation!==dialogueGeneration)return;
    if(dialogueAudio===audio){audio.pause();dialogueAudio=null;}
    status.textContent=situationText('Could not load the dialogue. Please try listening again.','Не удалось загрузить диалог. Нажмите «Послушать диалог» ещё раз.');
  };
  audio.onerror=failed;audio.onended=()=>{if(dialogueAudio===audio)dialogueAudio=null;};
  audio.play().catch(failed);
}

function saveProgress() { LearningStore.save(progress, difficultIds).catch(() => learningNotice('storage')); }
function localDayKey(date=new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
function recordAnswer(v, tense, ok) {
  const previousCorrect=progress.correct;
  progress[ok?'correct':'wrong']++;
  const key=tense||'mixed'; progress.byTense[key] ||= {correct:0,wrong:0}; progress.byTense[key][ok?'correct':'wrong']++;
  if (v) progress.mistakes[v.id] = Math.max(0,(progress.mistakes[v.id]||0)+(ok?-1:1));
  const today=localDayKey();
  progress.firstActivity ||= today;
  progress.activityDays[today]=(progress.activityDays[today]||0)+1;
  progress.sessionProgress++;
  if(progress.sessionProgress>=10){ progress.sessions++; progress.sessionProgress=0; }
  saveProgress();
  if(ok)checkOlympusMilestones(previousCorrect,progress.correct);
  if(!currentUser&&appStorage.getItem('greekGuestOnboarding')==='yes'&&previousCorrect<10&&progress.correct>=10&&appStorage.getItem('greekGuestRegistrationPrompt')!=='shown'){
    appStorage.setItem('greekGuestRegistrationPrompt','shown');
    setTimeout(showGuestRegistrationPrompt,450);
  }
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

const nikeReward=()=>({id:'nike',name:{ru:'Ника',en:'Nike'},gift:'🌿',giftName:{ru:'Лавровый лист',en:'Laurel leaf'},phrase:'Νέα νίκη! Έφτασες σε ένα ακόμη ορόσημο. Συνέχισε — τα καταφέρνεις υπέροχα!',text:{ru:'Новая победа! Ещё одна важная отметка достигнута. Продолжай — у тебя прекрасно получается!',en:'A new victory! You reached another milestone. Keep going — you are doing wonderfully!'},pitch:1.08});

function setRewardOption(type){
  if(type==='sound')rewardSoundOn=!rewardSoundOn;
  if(type==='voice')rewardVoiceOn=!rewardVoiceOn;
  appStorage.setItem('greekRewardSound',rewardSoundOn?'on':'off');
  appStorage.setItem('greekRewardVoice',rewardVoiceOn?'on':'off');
  showOlympus(true);
}

function speakReward(item){
  if(!rewardVoiceOn)return;
  stopDialogue();
  const recorded=new Audio(`assets/olympus/voices/${item.id}-v2.mp3`);
  dialogueAudio=recorded;
  recorded.volume=.82;
  // Keep each character's recorded voice; never substitute a device's default voice.
  recorded.play().catch(()=>{});
}

function playReward(item){
  if(!rewardSoundOn){speakReward(item);return;}
  const src=item.id==='nike'?'assets/olympus/sounds/nike-victory.wav':'assets/olympus/sounds/olympian-unlock.wav';
  const audio=new Audio(src); audio.volume=.55;
  audio.onended=()=>setTimeout(()=>speakReward(item),180);
  audio.play().catch(()=>speakReward(item));
}

function showReward(item){
  stopDialogue();
  const isNike=item.id==='nike';
  const title=isNike?(lang==='ru'?'Победа с Никой!':'Victory with Nike!'):(lang==='ru'?`${item.name.ru} присоединяется к Олимпу!`:`${item.name.en} joins your Olympus!`);
  const giftLabel=item.giftName[lang];
  document.getElementById('rewardContent').innerHTML=`<div class="reward-layout"><div class="reward-visual"><img src="assets/olympus/mascots/${item.id}.png" alt="${item.name[lang]}"></div><div class="reward-copy"><button class="dialog-close" onclick="rewardDialog.close()">×</button><h2>${title}</h2><div class="reward-gift">${item.gift}</div><strong>${giftLabel}</strong><p class="reward-greek">${item.phrase}</p><p class="reward-translation">${item.text[lang]}</p><div class="reward-actions"><button class="fill-submit" onclick="playReward(${item.id==='nike'?'nikeReward()':`OLYMPIANS.find(x=>x.id==='${item.id}')`})">🔊 ${lang==='ru'?'Послушать снова':'Listen again'}</button><button class="tool-btn" onclick="rewardDialog.close();showOlympus()">🏛️ ${lang==='ru'?'Мой Олимп':'My Olympus'}</button></div></div></div>`;
  const dialog=document.getElementById('rewardDialog');
  if(!dialog.open)dialog.showModal();
  setTimeout(()=>playReward(item),250);
}

function checkOlympusMilestones(before,after){
  const unlocked=OLYMPIANS.find(item=>before<item.milestone&&after>=item.milestone);
  if(unlocked){showReward(unlocked);return;}
  if(Math.floor(after/20)>Math.floor(before/20))showReward(nikeReward());
}

function showOlympus(refresh=false){
  const unlocked=OLYMPIANS.filter(item=>progress.correct>=item.milestone).length;
  const laurels=Math.floor(progress.correct/20);
  const cards=OLYMPIANS.map(item=>{const open=progress.correct>=item.milestone;return `<article class="olympian-card ${open?'open':'locked'}" ${open?`role="button" tabindex="0" onclick="olympusDialog.close();showReward(OLYMPIANS.find(x=>x.id==='${item.id}'))" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}"`:''}><img src="assets/olympus/mascots/${item.id}.png" alt="${item.name[lang]}">${open?'':`<span class="olympian-lock">🔒 ${item.milestone}</span>`}<h3 class="olympian-name">${item.name[lang]}</h3><p>${open?item.text[lang]:(lang==='ru'?`Откроется после ${item.milestone} правильных ответов`:`Unlocks after ${item.milestone} correct answers`)}</p>${open?`<span class="olympian-gift">${item.gift} ${item.giftName[lang]}</span>`:''}</article>`}).join('');
  document.getElementById('olympusContent').innerHTML=`<button class="dialog-close" onclick="olympusDialog.close()">×</button><div class="olympus-head"><div><h2>${lang==='ru'?'Мой Олимп':'My Olympus'}</h2><p class="progress-summary">🌿 ${laurels} · ${lang==='ru'?'лавровых листьев':'laurel leaves'} &nbsp; · &nbsp; ${unlocked}/${OLYMPIANS.length} ${lang==='ru'?'олимпийцев':'Olympians'}</p></div><div class="olympus-tools"><button class="tool-btn ${rewardSoundOn?'active':''}" onclick="setRewardOption('sound')">${rewardSoundOn?'🔊':'🔇'} ${lang==='ru'?'Звуки':'Sounds'}</button><button class="tool-btn ${rewardVoiceOn?'active':''}" onclick="setRewardOption('voice')">${rewardVoiceOn?'🗣️':'🤫'} ${lang==='ru'?'Голоса':'Voices'}</button></div></div><div class="olympus-grid">${cards}</div>`;
  const dialog=document.getElementById('olympusDialog'); if(!dialog.open)dialog.showModal();
}

function refreshActiveExercise(previousLang) {
  const ex = document.querySelector('.exercise.active');
  if (!ex) return;
  const result = ex.querySelector('.results-wrap');
  if (result) {
    renderResults(ex.id.replace('ex-',''), Number(result.dataset.correct), Number(result.dataset.total));
    return;
  }
  const id = ex.id.replace('ex-','');
  // Do not unlock an already recorded answer on language change.
  const answered = {quiz:qAnswered,tense:tAnswered,conj:cjAnswered,fill:fAnswered,change:ctAnswered,situation:situationAnswered};
  if (answered[id]) { translateAnsweredExercise(id,previousLang); return; }
  const input=ex.querySelector('input'); const typed=input?.value;
  if (id === 'quiz') renderQuiz();
  if (id === 'tense') renderTense();
  if (id === 'conj') renderConj();
  if (id === 'fill') renderFill();
  if (id === 'change') renderChange();
  if (id === 'situation') renderSituation();
  if (input && typed !== undefined) input.value=typed;
  if (id === 'match') {
    document.getElementById('matchColL').textContent = t('match_col_l');
    document.getElementById('matchColR').textContent = t('match_col_r');
    document.querySelectorAll('#matchRight .match-item').forEach(el => {
      const v = ALL_VERBS.find(item => item.id === el.dataset.key);
      if (v) el.textContent = verbTrans(v);
    });
    document.getElementById('matchInfo').textContent = matchPaired === matchTotal ? t('match_all') : t('match_info');
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

function translateAnsweredExercise(id, previousLang) {
  const set=(name,value)=>{document.getElementById(name).textContent=value;};
  const fb=(name,correct,wrong)=>{ const el=document.getElementById(name); el.textContent=el.classList.contains('correct')?correct:wrong; };
  const ex=document.getElementById('ex-'+id);
  const next=ex.querySelector('.ex-next-btn'); if(next)next.textContent=t('next');
  if(id==='quiz'){
    const v=qDeck[qIdx];
    set('qPrompt',t(qDir==='gr'?'q_gr_to_lang':'q_lang_to_gr'));
    set('qDirBtn',t(qDir==='gr'?'dir_gr_lang':'dir_lang_gr'));
    set('qVerb',qDir==='gr'?v.greek:verbTrans(v));
    document.getElementById('qAudioBtn').setAttribute('aria-label',t('fc_audio'));
    if(qDir==='gr') document.querySelectorAll('#qOpts .opt-btn').forEach(button=>{
      const option=ALL_VERBS.find(item=>(previousLang==='en'?item.english:item.russian)===button.dataset.key);
      if(option){button.textContent=verbTrans(option);button.dataset.key=verbTrans(option);}
    });
    fb('qFeedback',t('correct')+' '+verbEx(v),`${t('wrong')} ${t('ans_correct')} ${qDir==='gr'?verbTrans(v):v.greek}`);
    set('qScore',sessionProgressText(qIdx,qDeck.length));
  }
  if(id==='tense'){
    const item=tItems[tIdx]; set('tPrompt',t('q_tense')); set('tSub',`(${verbTrans(item.v)})`);
    document.getElementById('tAudioBtn').setAttribute('aria-label',t('fc_audio'));
    document.querySelectorAll('#tOpts .opt-btn').forEach((button,i)=>{button.textContent=t(['pres_t','past_t','fut_t'][i]);});
    fb('tFeedback',t('correct'),`${t('wrong')} ${item.form}: ${t('pres_t')} ${item.v.greek} · ${t('past_t')} ${item.v.past} · ${t('fut_t')} ${item.v.future}`);
    set('tScore',sessionProgressText(tIdx,tItems.length));
  }
  if(id==='conj'){
    const item=cjDeck[cjIdx]; set('cjPrompt',t('q_conj')); set('cjVerb',`${PERSONS[item.p]} + ${item.v.greek} · ${t(item.tense+'_t')} (${verbTrans(item.v)})`);
    fb('cjFeedback',t('correct'),`${t('wrong')} ${t('ans_correct')} ${item.correct}`); set('cjScore',sessionProgressText(cjIdx,cjDeck.length));
  }
  if(id==='change'){
    const item=ctDeck[ctIdx]; set('ctPrompt',t('q_change')); set('ctDir',lang==='en'?item.dir_en:item.dir_ru);
    fb('ctFeedback',t('correct'),`${t('wrong')} ${t('ans_correct')} ${item.answer}`); set('ctScore',sessionProgressText(ctIdx,ctDeck.length));
  }
  if(id==='fill'){
    const item=fDeck[fIdx], result=document.getElementById('fillFeedback').dataset.result;
    set('fillPrompt',t('q_fill')); set('fillHint',`${t('hint')} ${verbTrans(item.v)} · ${t(item.tense+'_t')}`); set('fillCheck',t(fStates[fIdx]?.attempted&&!fStates[fIdx]?.solved?'try_again':'check'));
    set('fillFeedback',result==='correct'?`${t('correct')} ${item.fullAnswer}`:result==='almost'?`${t('almost')} ${item.answer} → ${item.fullAnswer}`:`${t('wrong')} ${t('ans_correct')} ${item.answer} → ${item.fullAnswer}`);
    set('fillScore',sessionProgressText(fIdx,fDeck.length));
  }
  if(id==='situation') renderSituation();
}

function toggleAccent() {
  accentMode = document.getElementById('accentChk').checked;
  updateAccentHelp();
}

function accentRuleText() { return t(accentMode ? 'accent_rule_on' : 'accent_rule_off'); }
function accentHelpText() { return `${accentRuleText()} ${t('accent_tip')}`; }
function updateAccentHelp() {
  const checkbox=document.getElementById('accentChk');
  accentMode=Boolean(checkbox?.checked);
  const fillTip=document.getElementById('fillTip'); if(fillTip)fillTip.textContent=accentHelpText();
  const situationTip=document.getElementById('situationAccentTip'); if(situationTip)situationTip.textContent=accentHelpText();
}

function stripAccents(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
}

function checkStr(given, correct) {
  accentMode=Boolean(document.getElementById('accentChk')?.checked);
  const g = given.normalize('NFC').trim().replace(/\s+/g,' '), c = correct.normalize('NFC').trim().replace(/\s+/g,' ');
  if (!accentMode) return stripAccents(g) === stripAccents(c) ? 'correct' : 'wrong';
  if (g.toLocaleLowerCase('el') === c.toLocaleLowerCase('el')) return 'correct';
  if (stripAccents(g) === stripAccents(c)) return 'almost';
  return 'wrong';
}

/* ── Navigation ─────────────────────────────────── */
function switchSection(id) {
  if(isExamPage()&&id!=='exam'){navigateLearningPage('index.html?section='+encodeURIComponent(id));return;}
  if(id!=='practice') cancelAutoAdvance();
  document.body.classList.remove('account-page');
  leaveAccountRoute();
  if(id!=='practice' && document.getElementById('ex-situation')?.classList.contains('active')) stopDialogue();
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(b => b.classList.remove('active'));
  document.getElementById('sec-' + id).classList.add('active');
  document.getElementById('nav-' + id).classList.add('active');
  if (id === 'flashcards') renderFC();
  if (id === 'phrases')    { renderPhraseSelect(); renderPhrases(); }
}

function switchExercise(id) {
  cancelAutoAdvance();
  if(id!=='situation' && document.getElementById('ex-situation')?.classList.contains('active')) stopDialogue();
  if (id !== 'situation' && practicePool.length < 2) {
    document.getElementById('practiceMessage').textContent=t('empty_practice');
    document.getElementById('practiceMessage').className='setup-message show';
    return;
  }
  const typeSelect=document.getElementById('practiceType');
  if(id!=='image')typeSelect.value=id;
  updatePracticeSetup(id);
  document.querySelectorAll('.exercise').forEach(e => e.classList.remove('active'));
  document.querySelectorAll('.sub-tab').forEach(b => b.classList.remove('active'));
  document.getElementById('ex-' + id).classList.add('active');
  document.getElementById('subtab-' + id).classList.add('active');
  const activeTab = document.getElementById('subtab-' + id);
  activeTab.parentElement.scrollLeft = Math.max(0, activeTab.offsetLeft - activeTab.parentElement.offsetLeft - 12);
  const exercise = document.getElementById('ex-' + id);
  if(id==='fill'||id==='situation') document.getElementById(id==='fill'?'fillAccentSlot':'situationAccentSlot').appendChild(document.getElementById('accentSettings'));
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
      ${['fill','situation'].includes(exId)?`<button class="exercise-back" type="button" onclick="returnToLast('${exId}')">${t('previous')}</button>`:''}
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
    tr.className='verb-row'; tr.tabIndex=0; tr.onclick=()=>openVerb(v.id); tr.onkeydown=e=>{if(e.target===tr && e.key==='Enter')openVerb(v.id)};
    tr.innerHTML = `
      <td><button class="audio-btn" aria-label="${t('fc_audio')}" onclick="speakGreek('${v.greek.replaceAll("'","\\'")}',event)">🔊</button></td>
      <td class="td-greek">${v.greek}</td>
      <td class="td-tense" data-label="${t('tbl_past')}">${v.aoristSupported?v.past:'—'}</td>
      <td class="td-tense" data-label="${t('tbl_future')}">${v.future}</td>
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
  if(!v){
    document.getElementById('fcCounter').textContent='0 / 0';
    document.getElementById('fcVerb').textContent=t('empty_practice');
    document.getElementById('fcCard').classList.remove('revealed');
    ['fcShowBtn','fcNextBtn','markDifficultBtn','fcAudioBtn'].forEach(id=>document.getElementById(id).hidden=true);
    return;
  }
  ['fcShowBtn','markDifficultBtn','fcAudioBtn'].forEach(id=>document.getElementById(id).hidden=false);
  document.getElementById('fcNextBtn').hidden=false;
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
  fcIdx=0; renderFC();
}
function toggleDifficultMode(){ difficultMode=!difficultMode; document.getElementById('difficultBtn').classList.toggle('active',difficultMode); applyFlashFilter(); }
function toggleCurrentDifficult(){ const id=fcDeck[fcIdx].id; difficultIds.has(id)?difficultIds.delete(id):difficultIds.add(id); saveProgress(); if(difficultMode)applyFlashFilter(); else renderFC(); }

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('fcCard')?.addEventListener('click', fcFlip);
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
  qDeck = [...practicePool].sort(()=>Math.random()-0.5).slice(0,SESSION_SIZE);
  qIdx=0; qCorrect=0; qAnswered=false;
  document.getElementById('qDirBtn').textContent = qDir === 'gr' ? t('dir_gr_lang') : t('dir_lang_gr');
  renderQuiz();
}

function renderQuiz() {
  qAnswered = false;
  const v = qDeck[qIdx];
  const audioBtn=document.getElementById('qAudioBtn');
  document.getElementById('qFeedback').className = 'feedback';
  document.getElementById('qNext').classList.remove('show');
  document.getElementById('qScore').textContent = sessionProgressText(qIdx,qDeck.length);

  const others = practicePool.filter(x=>x!==v).sort(()=>Math.random()-0.5).slice(0,3);
  if (qDir === 'gr') {
    document.getElementById('qPrompt').textContent = t('q_gr_to_lang');
    document.getElementById('qVerb').textContent   = v.greek;
    document.getElementById('qSub').textContent    = '';
    audioBtn.hidden=false;
    audioBtn.setAttribute('aria-label',t('fc_audio'));
    audioBtn.onclick=event=>speakGreek(v.greek,event);
    const opts = [v,...others].sort(()=>Math.random()-0.5).map(x=>verbTrans(x));
    renderMC(opts, verbTrans(v), 'qOpts', (btn, chosen, correct) => handleQuizAnswer(btn, chosen, verbTrans(v), v));
  } else {
    document.getElementById('qPrompt').textContent = t('q_lang_to_gr');
    document.getElementById('qVerb').textContent   = verbTrans(v);
    document.getElementById('qSub').textContent    = '';
    audioBtn.hidden=true;
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
  document.getElementById('qScore').textContent = sessionProgressText(qIdx,qDeck.length);
}

function toggleQDir() {
  qDir = qDir === 'gr' ? 'lang' : 'gr';
  document.getElementById('qDirBtn').textContent = qDir === 'gr' ? t('dir_gr_lang') : t('dir_lang_gr');
  qIdx=0; qCorrect=0; renderQuiz();
}

function nextQuiz() { qIdx++; qIdx>=qDeck.length ? showResults('quiz',qCorrect,qDeck.length) : renderQuiz(); }

/* ── Matching (verb ↔ translation) ──────────────── */
let matchSel=null, matchPaired=0, matchTotal=0;

function initMatch() {
  matchSel=null; matchPaired=0;
  const sample = [...practicePool].sort(()=>Math.random()-0.5).slice(0,6);
  matchTotal=sample.length;
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
    const el = mkEl('button','match-item',matchForm(v)); el.dataset.key=v.id; el.dataset.side='left';
    el.onclick = ()=>handleMatch(el); lCol.appendChild(el);
  });
  rItems.forEach(v => {
    const el = mkEl('button','match-item ru',verbTrans(v)); el.dataset.key=v.id; el.dataset.side='right';
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
    if (matchPaired===matchTotal) { document.getElementById('matchInfo').textContent=t('match_all'); document.getElementById('matchRestart').classList.add('show'); }
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

function initTense() { tItems=buildTItems().slice(0,SESSION_SIZE); tIdx=0; tCorrect=0; renderTense(); }

function renderTense() {
  tAnswered=false;
  const item=tItems[tIdx];
  document.getElementById('tPrompt').textContent = t('q_tense');
  document.getElementById('tForm').textContent   = item.form;
  const audioBtn=document.getElementById('tAudioBtn');
  audioBtn.hidden=false;
  audioBtn.setAttribute('aria-label',t('fc_audio'));
  audioBtn.onclick=event=>speakGreek(item.form,event);
  document.getElementById('tSub').textContent    = `(${verbTrans(item.v)})`;
  document.getElementById('tFeedback').className = 'feedback';
  document.getElementById('tNext').classList.remove('show');
  document.getElementById('tScore').textContent  = sessionProgressText(tIdx,tItems.length);
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
    document.getElementById('tScore').textContent=sessionProgressText(tIdx,tItems.length);
  });
}

function nextTense() { tIdx++; tIdx>=tItems.length ? showResults('tense',tCorrect,tItems.length) : renderTense(); }

/* ── Conjugation ─────────────────────────────────── */
let cjDeck=[], cjIdx=0, cjCorrect=0, cjAnswered=false;

function buildCjItems() {
  const a=[];
  practicePool.forEach(v=>{ [0,1,2,3,4,5].forEach(p=>{
    if(v.conj_pres[p]&&(selectedPracticeTense==='mixed'||selectedPracticeTense==='pres'))a.push({v,p,tense:'pres',correct:v.conj_pres[p]});
    if(v.aoristSupported&&v.conj_past[p]&&(selectedPracticeTense==='mixed'||selectedPracticeTense==='past'))a.push({v,p,tense:'past',correct:v.conj_past[p]});
    if(v.conj_fut[p]&&(selectedPracticeTense==='mixed'||selectedPracticeTense==='fut'))a.push({v,p,tense:'fut',correct:v.conj_fut[p]});
  }); });
  return a.sort(()=>Math.random()-0.5);
}

function initConj() { cjDeck=buildCjItems().slice(0,SESSION_SIZE); cjIdx=0; cjCorrect=0; renderConj(); }

function renderConj() {
  cjAnswered=false;
  const item=cjDeck[cjIdx];
  document.getElementById('cjPrompt').textContent = t('q_conj');
  document.getElementById('cjVerb').textContent   = `${PERSONS[item.p]} + ${item.v.greek} · ${t(item.tense+'_t')} (${verbTrans(item.v)})`;
  document.getElementById('cjFeedback').className = 'feedback';
  document.getElementById('cjNext').classList.remove('show');
  document.getElementById('cjScore').textContent  = sessionProgressText(cjIdx,cjDeck.length);
  // Wrong options: other persons of same verb + one from another verb
  const forms=item.tense==='pres'?item.v.conj_pres:item.tense==='past'?item.v.conj_past:item.v.conj_fut;
  const wrongPool = [...new Set(forms.filter(form=>form&&form!==item.correct))];
  const otherVerbs=practicePool.filter(v=>v!==item.v&&(item.tense==='pres'?v.conj_pres:item.tense==='past'?v.conj_past:v.conj_fut)?.[item.p]);
  const other=otherVerbs[Math.floor(Math.random()*otherVerbs.length)]||item.v;
  const extra = (item.tense==='pres'?other.conj_pres:item.tense==='past'?other.conj_past:other.conj_fut)?.[item.p];
  const opts = [...new Set([item.correct, ...wrongPool.sort(()=>Math.random()-0.5), extra].filter(Boolean))].slice(0,4).sort(()=>Math.random()-0.5);
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
    document.getElementById('cjScore').textContent=sessionProgressText(cjIdx,cjDeck.length);
  });
}

function nextConj() { cjIdx++; cjIdx>=cjDeck.length ? showResults('conj',cjCorrect,cjDeck.length) : renderConj(); }

/* ── Fill in Blank ───────────────────────────────── */
let fDeck=[], fIdx=0, fCorrect=0, fAnswered=false, fStates=[];
let autoAdvanceTimer=null, autoAdvanceGeneration=0;
function cancelAutoAdvance(){ clearTimeout(autoAdvanceTimer); autoAdvanceGeneration++; }
function scheduleAutoAdvance(exId,index,advance){
  cancelAutoAdvance(); const generation=autoAdvanceGeneration;
  const go=()=>{
    if(generation!==autoAdvanceGeneration || !document.getElementById('sec-practice').classList.contains('active') || !document.getElementById('ex-'+exId).classList.contains('active'))return;
    if((exId==='fill'?fIdx:situationIdx)!==index)return;
    const reward=document.getElementById('rewardDialog');
    if(reward.open){reward.addEventListener('close',go,{once:true});return;}
    advance();
  };
  autoAdvanceTimer=setTimeout(go,1000);
}
function returnToLast(id){
  cancelAutoAdvance(); const exercise=document.getElementById('ex-'+id);
  exercise.querySelector('.results-wrap')?.remove();
  [...exercise.children].forEach(child=>{child.hidden=false;});
  if(id==='fill'){fIdx=fDeck.length-1;renderFill();}
  else {situationIdx=situationDeck.length-1;renderSituation();}
}

function buildFillItems() {
  const items=[];
  practicePool.forEach(v=>[0,1,2,3,4,5].forEach(p=>{
    const add=(tense,forms)=>{
      const fullAnswer=forms?.[p];
      if(!fullAnswer)return;
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
function initFill() { cancelAutoAdvance(); fDeck=buildFillItems().slice(0,SESSION_SIZE); fIdx=0; fCorrect=0; fAnswered=false; fStates=[]; renderFill(); }

function renderFill() {
  const item=fDeck[fIdx], state=fStates[fIdx]||{};
  fAnswered=Boolean(state.solved);
  document.getElementById('fillPrompt').textContent=t('q_fill');
  const gap=item.masked.match(/_+/);
  document.getElementById('fillPerson').textContent=PERSONS[item.p];
  document.getElementById('fillWordBefore').textContent=item.masked.slice(0,gap.index);
  document.getElementById('fillWordAfter').textContent=item.masked.slice(gap.index+gap[0].length);
  const audio=document.getElementById('fillAudio');
  audio.hidden=!('speechSynthesis' in window);
  audio.setAttribute('aria-label',t('fc_audio'));
  audio.onclick=event=>speakGreek(item.fullAnswer,event);
  document.getElementById('fillHint').textContent=`${t('hint')} ${verbTrans(item.v)} · ${t(item.tense+'_t')}`;
  document.getElementById('fillTip').textContent=accentHelpText();
  const input=document.getElementById('fillInput'); input.value=state.input||''; input.className='fill-input'+(state.solved?' correct':state.attempted?' wrong':'');
  input.readOnly=Boolean(state.solved);
  document.getElementById('fillInputMeasure').textContent=input.value||'_'.repeat(item.answer.length);
  const feedback=document.getElementById('fillFeedback'); feedback.dataset.result=state.result||'';
  feedback.className='feedback'+(state.solved?' correct':state.attempted?' wrong':'');
  feedback.textContent=state.solved?`${t('correct')} ${item.fullAnswer}`:state.attempted?`${t(state.result==='almost'?'retry_accent':'retry')} ${t('ans_correct')} ${item.answer}${item.fullAnswer?' → '+item.fullAnswer:''}`:'';
  document.getElementById('fillNext').classList.toggle('show',Boolean(state.solved));
  document.getElementById('fillPrev').disabled=fIdx===0;
  document.getElementById('fillCheck').textContent=t(state.attempted&&!state.solved?'try_again':'check');
  document.getElementById('fillCheck').disabled=Boolean(state.solved);
  document.getElementById('fillScore').textContent=sessionProgressText(fIdx,fDeck.length);
}

function checkFill() {
  const input=document.getElementById('fillInput'); if(!input.value.trim()||fAnswered)return;
  const item=fDeck[fIdx], state=fStates[fIdx]||(fStates[fIdx]={});
  const result=checkStr(input.value,item.answer), ok=result==='correct';
  recordAnswer(item.v,item.tense,ok); if(ok)fCorrect++;
  state.attempted=true; state.input=input.value; state.result=result; state.solved=ok;
  renderFill();
  if(ok)scheduleAutoAdvance('fill',fIdx,nextFill); else { input.focus(); input.select(); }
}

document.addEventListener('DOMContentLoaded', ()=>{
  document.documentElement.lang = lang;
  document.title = t('document_title');
  updateAccentHelp();
  document.getElementById('fillInput')?.addEventListener('keydown', e=>{ if(e.key==='Enter') checkFill(); });
  document.getElementById('fillInput')?.addEventListener('input', e=>{ (fStates[fIdx]||(fStates[fIdx]={})).input=e.target.value; document.getElementById('fillInputMeasure').textContent=e.target.value||'_'.repeat(fDeck[fIdx].answer.length); });
  document.getElementById('situationInput')?.addEventListener('keydown', e=>{ if(e.key==='Enter') checkSituation(); });
  document.getElementById('situationInput')?.addEventListener('input', e=>{ (situationStates[situationIdx]||(situationStates[situationIdx]={})).input=e.target.value; });
});

function nextFill() { if(!fStates[fIdx]?.solved)return; cancelAutoAdvance(); fIdx++; fIdx>=fDeck.length ? showResults('fill',fCorrect,fDeck.length) : renderFill(); }
function previousFill(){ if(fIdx<=0)return; cancelAutoAdvance(); fIdx--; renderFill(); }

/* ── Change the Tense ────────────────────────────── */
let ctDeck=[], ctIdx=0, ctCorrect=0, ctAnswered=false;

function buildChangeItems() {
  const labels={pres:['Present','Настоящее'],past:['Past (aorist)','Прошедшее (аорист)'],fut:['Simple future','Простое будущее']};
  const items=[];
  practicePool.forEach(v=>[0,1,2,3,4,5].forEach(p=>{
    const forms={pres:v.conj_pres,past:v.conj_past,fut:v.conj_fut};
    const available=['pres','fut',...(v.aoristSupported?['past']:[])];
    available.forEach(from=>available.filter(to=>to!==from&&(selectedPracticeTense==='mixed'||to===selectedPracticeTense)).forEach(to=>{
      const answer=forms[to]?.[p];
      if(!answer||!forms[from]?.[p])return;
      const distractors=[forms[from][p],...forms[to].filter((_,i)=>i!==p)].filter((x,i,a)=>x&&x!==answer&&a.indexOf(x)===i).slice(0,3);
      if(!distractors.length)return;
      items.push({person:PERSONS[p],dir_en:`${labels[from][0]} → ${labels[to][0]}`,dir_ru:`${labels[from][1]} → ${labels[to][1]}`,form:forms[from][p],opts:[answer,...distractors].sort(()=>Math.random()-0.5),answer,v,tense:to});
    }));
  }));
  return items.sort(()=>Math.random()-0.5);
}
function initChange() { ctDeck=buildChangeItems().slice(0,SESSION_SIZE); ctIdx=0; ctCorrect=0; renderChange(); }

function renderChange() {
  ctAnswered=false;
  const item=ctDeck[ctIdx];
  const dir = lang==='en'? item.dir_en : item.dir_ru;
  document.getElementById('ctPrompt').textContent = t('q_change');
  document.getElementById('ctDir').textContent    = dir;
  document.getElementById('ctForm').textContent   = `${item.person} ${item.form}`;
  document.getElementById('ctFeedback').className = 'feedback';
  document.getElementById('ctNext').classList.remove('show');
  document.getElementById('ctScore').textContent  = sessionProgressText(ctIdx,ctDeck.length);
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
    document.getElementById('ctScore').textContent=sessionProgressText(ctIdx,ctDeck.length);
  });
}

function nextChange() { ctIdx++; ctIdx>=ctDeck.length ? showResults('change',ctCorrect,ctDeck.length) : renderChange(); }

/* ── Picture situations & dialogues ─────────────── */
let situationDeck=[], situationIdx=0, situationCorrect=0, situationAnswered=false, situationStates=[];
let situationMode='drag', situationCategory='all', situationSelectedWord=null;
const SITUATION_LABELS={food:['Café & restaurant','Кафе и ресторан'],travel:['City & transport','Город и транспорт'],shopping:['Shopping','Покупки'],doctor:['At the doctor','У врача'],hotel:['Hotel','Отель'],lost:['Lost items','Потерянные вещи'],work:['Work & study','Работа и учёба'],social:['Meeting friends','Встречи с друзьями'],daily:['Daily routine','Распорядок дня'],visa:['Documents','Документы']};
const situationText=(en,ru)=>lang==='ru'?ru:en;
const escapeSituationValue=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const normalizeSituationLine=value=>String(value).replace(/^—\s*/,'').replace(/[.!;?]+$/,'').trim().toLocaleLowerCase('el');
function situationLineTranslation(item,lineIndex){
  const explicit=item.translations?.[lang]?.[lineIndex];
  if(explicit)return explicit;
  const complete=item.full?.[lineIndex]||'';
  const match=EXAM_PHRASES.find(phrase=>normalizeSituationLine(phrase.gr)===normalizeSituationLine(complete));
  return match?.[lang]||'';
}
const situationAnswers=item=>item.answers||[item.answer];
function initSituation(){
  cancelAutoAdvance();
  const categories=Object.keys(SITUATION_LABELS).filter(cat=>situationCategory==='all'||cat===situationCategory);
  situationDeck=categories.flatMap(cat=>SITUATIONS.filter(item=>item.cat===cat));
  situationIdx=0; situationCorrect=0; situationAnswered=false; situationStates=[]; situationSelectedWord=null;
  renderSituation();
}
function changeSituationTopic(category){situationCategory=category;initSituation();}
function setSituationMode(mode){
  if(!['type','drag'].includes(mode))return;
  situationMode=mode; situationSelectedWord=null; renderSituation(true);
}
function situationState(){
  const state=situationStates[situationIdx]||(situationStates[situationIdx]={});
  if(!state.slots)state.slots=situationAnswers(situationDeck[situationIdx]).map(()=>null);
  if(!state.inputs)state.inputs=situationAnswers(situationDeck[situationIdx]).map(()=>"");
  if(!state.bankOrder)state.bankOrder=situationAnswers(situationDeck[situationIdx]).map((_,i)=>i).sort(()=>Math.random()-.5);
  return state;
}
function placeSituationWord(slot,word){
  const state=situationState(), answers=situationAnswers(situationDeck[situationIdx]);
  if(state.solved||!Number.isInteger(slot)||slot<0||slot>=answers.length||!Number.isInteger(word)||word<0||word>=answers.length)return;
  state.slots=state.slots.map(value=>value===word?null:value);
  state.slots[slot]=word;state.attempted=false;situationSelectedWord=null;
  renderSituation(true);
}
function selectSituationGap(slot){
  const state=situationState();if(state.solved)return;
  if(situationSelectedWord!==null){placeSituationWord(slot,situationSelectedWord);return;}
  state.slots[slot]=null;state.attempted=false;renderSituation(true);
}
function selectSituationWord(word){
  if(situationState().solved)return;
  situationSelectedWord=situationSelectedWord===word?null:word;renderSituation(true);
}
function renderSituation(preserveAudio=false){
  if(!preserveAudio)stopDialogue();
  const item=situationDeck[situationIdx];if(!item)return;
  const state=situationState(),answers=situationAnswers(item),drag=situationMode==='drag';
  situationAnswered=Boolean(state.solved);
  const topic=document.getElementById('situationTopic');
  topic.innerHTML='<option value="all">'+t('topic_all')+'</option>'+Object.entries(SITUATION_LABELS).map(([cat,label])=>`<option value="${cat}">${label[lang==='ru'?1:0]}</option>`).join('');
  topic.value=situationCategory;
  document.getElementById('situationTopicLabel').textContent=situationText('Situation','Ситуация');
  document.getElementById('situationModeLabel').textContent=situationText('Answer mode','Режим ответа');
  for(const mode of ['drag','type']){
    const button=document.getElementById(mode==='drag'?'situationDragMode':'situationTypeMode');
    button.textContent=mode==='drag'?situationText('Drag words','Перетащить слова'):situationText('Type words','Вписать слова');
    button.setAttribute('aria-pressed',String(mode===situationMode));button.classList.toggle('active',mode===situationMode);
  }
  document.querySelector('.situation-card').classList.toggle('is-solved',situationAnswered);
  document.getElementById('situationImage').src=item.image;
  document.getElementById('situationImage').alt=lang==='en'?item.en:item.ru;
  document.getElementById('situationPrompt').textContent=t('situation_prompt');
  document.getElementById('situationContext').textContent=`${SITUATION_LABELS[item.cat][lang==='ru'?1:0]} · ${lang==='en'?item.en:item.ru}`;
  document.getElementById('situationInstructions').textContent=drag
    ?situationText('Drag words into the gaps, or select a word and then a gap. Select a filled gap to clear it.','Перетащите слова в пропуски или нажмите на слово, затем на пропуск. Нажмите на заполненный пропуск, чтобы очистить его.')
    :situationText('Type each missing word directly into its gap.','Введите каждое пропущенное слово прямо в соответствующий пропуск.');
  let gap=0;
  document.getElementById('situationDialogue').innerHTML=item.lines.map((line,lineIndex)=>'<p tabindex="0"><span class="situation-speaker">'+item.speakers[item.lineSpeakers[lineIndex]][lang]+'</span>'+line.replaceAll('___',()=>{
    const slot=gap++, value=state.solved?answers[slot]:(drag&&state.slots[slot]!==null?answers[state.slots[slot]]:'');
    if(!drag){
      const answerWidth=Math.max(9,answers[slot].length+3);
      return `<input class="situation-inline-input${state.solved?' correct':state.attempted?' wrong':''}" style="--answer-width:${answerWidth}ch" data-input-slot="${slot}" value="${escapeSituationValue(state.inputs[slot]||'')}" ${state.solved?'readonly':''} autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-label="${situationText('Gap','Пропуск')} ${slot+1}" placeholder="${slot+1} …">`;
    }
    return `<button type="button" class="situation-blank ${value?'filled':''}" data-slot="${slot}" ${state.solved?'disabled':''} aria-label="${situationText('Gap','Пропуск')} ${slot+1}">${value||String(slot+1)+' …'}</button>`;
  })+(()=>{const translation=situationLineTranslation(item,lineIndex);return translation?`<span class="situation-line-translation">${escapeSituationValue(translation)}</span>`:'';})()+'</p>').join('');
  document.getElementById('situationDialogue').querySelectorAll('[data-slot]').forEach(button=>{
    button.onclick=()=>selectSituationGap(Number(button.dataset.slot));
    button.ondragover=event=>{if(drag&&!state.solved)event.preventDefault();};
    button.ondrop=event=>{event.preventDefault();const value=event.dataTransfer.getData('text/plain');if(/^\d+$/.test(value))placeSituationWord(Number(button.dataset.slot),Number(value));};
  });
  document.getElementById('situationDialogue').querySelectorAll('[data-input-slot]').forEach(input=>{
    input.oninput=()=>{state.inputs[Number(input.dataset.inputSlot)]=input.value;state.attempted=false;};
    input.onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();checkSituation();}};
  });
  const bank=document.getElementById('situationWordBank');bank.hidden=!drag;
  bank.setAttribute('aria-label',situationText('Words for the gaps','Слова для пропусков'));
  bank.innerHTML=drag?state.bankOrder.map(index=>`<button type="button" class="tool-btn situation-word ${situationSelectedWord===index?'active':''}" data-word="${index}" draggable="${!state.solved}" aria-pressed="${situationSelectedWord===index}" ${state.solved||state.slots.includes(index)?'disabled':''}>${answers[index]}</button>`).join(''):'';
  bank.querySelectorAll('[data-word]').forEach(button=>{
    button.onclick=()=>selectSituationWord(Number(button.dataset.word));
    button.ondragstart=event=>{event.dataTransfer.setData('text/plain',button.dataset.word);event.dataTransfer.effectAllowed='move';};
  });
  const audio=document.getElementById('situationAudio');
  const voiceStatus=document.getElementById('situationVoiceStatus');
  const recording=SITUATION_RECORDINGS[item.id];
  const recordingReady=recording&&recording.fingerprint===situationAudioFingerprint(item);
  const audioSource=recordingReady?`${recording.src}?v=${recording.fingerprint}`:'';
  if(audio.dataset.source!==audioSource){audio.pause();audio.dataset.source=audioSource;if(audioSource)audio.src=audioSource;else audio.removeAttribute('src');audio.load();}
  audio.hidden=!recordingReady;
  dialogueAudio=recordingReady?audio:null;
  if(!preserveAudio)voiceStatus.textContent=recordingReady?'':situationText('The recording needs updating for this dialogue.','Запись этого диалога нужно обновить.');
  audio.onerror=()=>{voiceStatus.textContent=situationText('Could not load the dialogue. Please try again.','Не удалось загрузить диалог. Попробуйте ещё раз.');};
  document.getElementById('situationAccentTip').textContent=accentHelpText();
  document.getElementById('situationAccentTip').hidden=drag;
  document.getElementById('situationAccentSlot').hidden=drag;
  const input=document.getElementById('situationInput');input.value=state.inputs.join(' ');
  const feedback=document.getElementById('situationFeedback');feedback.dataset.result=state.result||'';
  feedback.className='feedback'+(state.solved?' correct':state.attempted?' wrong':'');
  feedback.textContent=state.solved?`${t('correct')} ${item.answer}`:state.attempted?`${t(state.result==='almost'?'retry_accent':'retry')} ${t('ans_correct')} ${item.answer}`:'';
  document.getElementById('situationCheck').textContent=t(state.attempted&&!state.solved?'try_again':'check');
  document.getElementById('situationCheck').disabled=Boolean(state.solved);
  document.getElementById('situationPrev').disabled=situationIdx===0;
  const categoryItems=situationDeck.filter(other=>other.cat===item.cat), number=categoryItems.indexOf(item)+1;
  document.getElementById('situationNext').textContent=number===categoryItems.length&&situationIdx<situationDeck.length-1?situationText('Next situation →','Следующая ситуация →'):t('next');
  document.getElementById('situationNext').classList.toggle('show',Boolean(state.solved));
  document.getElementById('situationScore').textContent=situationText(`Dialogue ${number} / ${categoryItems.length}`,`Диалог ${number} / ${categoryItems.length}`);
}
function checkSituation(){
  if(situationAnswered)return;
  const item=situationDeck[situationIdx],state=situationState(),answers=situationAnswers(item);
  const given=situationMode==='drag'?state.slots.map(index=>index===null?'':answers[index]).join(' '):state.inputs.join(' ');
  if(situationMode==='drag'?state.slots.some(index=>index===null):state.inputs.some(value=>!value.trim()))return;
  const result=checkStr(given,item.answer),ok=result==='correct';
  recordAnswer(null,'situation',ok);if(ok)situationCorrect++;
  state.attempted=true;state.result=result;state.solved=ok;
  renderSituation();
  if(ok)document.getElementById('situationNext').focus();else if(situationMode==='type'){const first=document.querySelector('.situation-inline-input');if(first){first.focus();first.select();}}
}
function nextSituation(){
  if(!situationStates[situationIdx]?.solved)return;cancelAutoAdvance();situationIdx++;situationSelectedWord=null;
  situationIdx>=situationDeck.length?showResults('situation',situationCorrect,situationDeck.length):renderSituation();
}
function previousSituation(){if(situationIdx<=0)return;cancelAutoAdvance();situationIdx--;situationSelectedWord=null;renderSituation();}

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
    const el=document.createElement('button'); el.type='button'; el.className='img-card'; el.dataset.key=img.answer; el.dataset.side='left';
    el.innerHTML=`<div class="img-emoji">${img.emoji}</div><div class="img-label">${lang==='en'?img.label_en:img.label_ru}</div>`;
    el.onclick=()=>handleImg(el); lCol.appendChild(el);
  });
  shuffledR.forEach(img=>{
    const el=document.createElement('button'); el.type='button'; el.className='match-item ru'; el.dataset.key=img.answer; el.dataset.side='right';
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
  const image=document.getElementById('phraseSceneImage');
  image.src=`assets/phrases/topics/${asset}.png`;
  image.alt=topicLabel(phraseCategory);
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
      <td class="td-phrase-greek"><div class="phrase-line"><span class="phrase-emoji" aria-hidden="true">${phraseEmoji(item)}</span><button class="audio-btn phrase-audio" aria-label="${t('fc_audio')}" onclick="speakGreek('${item.gr.replaceAll("'","\\'")}',event)">🔊</button><span class="phrase-text">${item.gr}</span></div></td>
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

function updatePracticeSetup(type=document.getElementById('practiceType').value) {
  const isSituation=type==='situation';
  document.getElementById('practiceTenseField').hidden=isSituation;
  document.getElementById('practiceTense').disabled=isSituation;
  document.getElementById('practiceSetup').classList.toggle('without-tense',isSituation);
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
  updatePracticeSetup();
  document.getElementById('difficultBtn').textContent=t('difficult_only');
  renderTable();
}

function startConfiguredPractice() {
  if(window.Subscriptions && !Subscriptions.require())return;
  const topic=document.getElementById('practiceTopic').value;
  const requested=document.getElementById('practiceType').value;
  const candidateTense=requested==='situation'?'mixed':document.getElementById('practiceTense').value;
  const candidatePool=ALL_VERBS.filter(v=>v.conj_pres).filter(v=>{
    if(topic==='all')return true;
    if(topic==='mistakes')return (progress.mistakes[v.id]||0)>0;
    return v.topics.includes(topic);
  }).filter(v=>candidateTense!=='past'||v.aoristSupported);
  const message=document.getElementById('practiceMessage');
  if(requested!=='situation' && candidatePool.length<2) { message.textContent=t('empty_practice'); message.className='setup-message show'; return; }
  practicePool=candidatePool; selectedPracticeTense=candidateTense;
  message.className='setup-message';
  let type=requested;
  if(type==='person')type='conj';
  if(type==='mixed')type=['quiz','match','tense','conj','change','situation','fill'][Math.floor(Math.random()*7)];
  switchExercise(type);
  document.getElementById('ex-'+type).scrollIntoView({behavior:'smooth',block:'start'});
}

/* ── Init ─────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async ()=>{
  document.querySelector('.wrap').inert = true;
  document.querySelector('nav').inert = true;
  try { await initAccount(); } catch { learningNotice('storage'); renderAuth(); routeAccount(); }
  document.querySelector('.wrap').inert = false;
  document.querySelector('nav').inert = false;
  if(!isExamPage()){
    renderFC();switchExercise('quiz');renderPhraseSelect();renderPhrases();setupControls();
    const section=new URLSearchParams(location.search).get('section');
    if(['verbs','flashcards','practice','phrases'].includes(section))switchSection(section);
  }
  if(!('speechSynthesis' in window)) document.querySelectorAll('.audio-btn').forEach(button=>button.hidden=true);
  updateAccessibleNames();
  showStorageNotice();
  document.getElementById('langBtn').textContent=t('lang_toggle');
  // apply initial i18n
  document.querySelectorAll('[data-i18n]').forEach(el=>{ el.textContent=t(el.dataset.i18n).replace('{count}',ALL_VERBS.length); });
  document.querySelectorAll('[data-i18n-ph]').forEach(el=>{ el.placeholder=t(el.dataset.i18nPh); });
  if(isExamPage())initExamPage();
  if(!isExamPage()&&new URLSearchParams(location.search).get('exercise')==='situation')switchExercise('situation');
  if(new URLSearchParams(location.search).get('onboarding')==='1')setTimeout(()=>startOnboarding(true),0);
});

// Flush account-scoped learning data before moving between the two trainers.
async function navigateLearningPage(path){
  if(isExamPage()&&typeof flushExamDrafts==='function')flushExamDrafts();
  try{await LearningStore.flush();}catch{learningNotice('storage');return;}
  location.href=path;
}

let refreshingLearning=false;
async function refreshSharedLearning(){
  if(!accountReady||authBusy||refreshingLearning)return;
  refreshingLearning=true;
  try{
    if(isExamPage()&&typeof flushExamDrafts==='function')flushExamDrafts();
    await LearningStore.flush();
    applyLearning(await LearningStore.load(currentUser));
    if(isExamPage())renderExam();
  }catch{learningNotice('storage');}finally{refreshingLearning=false;}
}
window.addEventListener?.('pageshow',event=>{if(event.persisted)refreshSharedLearning();});
window.addEventListener?.('focus',refreshSharedLearning);
