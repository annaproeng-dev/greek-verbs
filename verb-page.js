const pageLang=['en','ru'].includes(appStorage.getItem('greekTrainerLang'))?appStorage.getItem('greekTrainerLang'):'en';
const pageT=key=>I18N[pageLang][key]||key;
let pageSpeechSpeed=appStorage.getItem('greekSpeechSpeed')||'slow';
const pageSpeechRate=()=>pageSpeechSpeed==='slow' ? 0.58 : 0.78;

let pageSpeechGeneration=0, pageSpeechTimer;
function stopPageSpeech(){ pageSpeechGeneration++; clearTimeout(pageSpeechTimer); speechSynthesis.cancel(); }
function speakPageGreek(text,event){
  event?.stopPropagation();
  if(!('speechSynthesis' in window))return;
  stopPageSpeech();
  const utterance=new SpeechSynthesisUtterance(text);
  utterance.lang='el-GR'; utterance.rate=pageSpeechRate();
  const voice=speechSynthesis.getVoices().find(v=>v.lang.toLowerCase().startsWith('el'));
  if(voice)utterance.voice=voice;
  speechSynthesis.speak(utterance);
}

function speakPageRow(parts,event){
  event?.stopPropagation();
  if(!('speechSynthesis' in window))return;
  stopPageSpeech();
  const generation=pageSpeechGeneration;
  const voice=speechSynthesis.getVoices().find(v=>v.lang.toLowerCase().startsWith('el'));
  let index=0;
  const next=()=>{
    if(generation!==pageSpeechGeneration || index>=parts.length)return;
    const utterance=new SpeechSynthesisUtterance(parts[index++]);
    utterance.lang='el-GR'; utterance.rate=pageSpeechRate();
    if(voice)utterance.voice=voice;
    utterance.onend=()=>{ if(generation===pageSpeechGeneration) pageSpeechTimer=setTimeout(next,pageSpeechSpeed==='slow'?500:260); };
    speechSynthesis.speak(utterance);
  };
  next();
}

function setPageSpeechSpeed(speed){
  pageSpeechSpeed=speed;
  appStorage.setItem('greekSpeechSpeed',speed);
  document.querySelectorAll('.speech-speed-btn').forEach(button=>button.classList.toggle('active',button.dataset.speed===speed));
}

function showPageStorageNotice(){
  if(!appStorage.unavailable || document.getElementById('storageNotice'))return;
  const notice=document.createElement('div'); notice.id='storageNotice'; notice.className='storage-notice'; notice.setAttribute('role','status');
  notice.textContent=pageLang==='ru'?'Браузер не сохраняет настройки.':'Your browser cannot save settings.'; document.body.prepend(notice);
}
document.addEventListener('storage-unavailable',showPageStorageNotice);

function renderVerbPage(){
  showPageStorageNotice();
  document.documentElement.lang=pageLang;
  window.updateThemeControl?.();
  document.getElementById('verbBack').textContent=pageT('back_to_verbs');
  const id=new URLSearchParams(location.search).get('id');
  const v=ALL_VERBS.find(item=>item.id===id);
  if(!v){document.getElementById('verbDetail').innerHTML=`<h1>${pageT('empty_practice')}</h1>`;return;}
  document.title=`${v.greek} — ${pageT('page_title')}`;
  const translation=pageLang==='en'?v.english:v.russian;
  const group=pageT('group_'+v.group);
  const pastLabel=pageT(v.aoristSupported?'past_t':'past_imperfect');
  const rows=PERSONS.map((person,i)=>{
    const present=v.conj_pres[i] || '—', past=v.conj_past[i] || '—', future=v.conj_fut[i] || '—';
    const speech=[person,present,past,future].filter(form=>form!=='—').join('|');
    return `<tr><td class="td-person">${person}</td><td data-label="${pageT('pres_t')}">${present}</td><td data-label="${pastLabel}">${past}</td><td data-label="${pageT('fut_t')}">${future}</td><td class="td-listen"><button class="audio-btn row-audio" title="${pageT('listen_row')}" aria-label="${pageT('listen_row')}" data-speech="${speech}">🔊 <span>${pageT('listen')}</span></button></td></tr>`;
  }).join('');
  document.getElementById('verbDetail').innerHTML=`
    <header class="verb-detail-head"><div><h1>${v.greek} <button class="audio-btn" id="headAudio" aria-label="${pageT('fc_audio')}">🔊</button></h1><p>${translation}</p></div></header>
    <div class="verb-badges"><span>${group}</span>${v.irregular?`<span>${pageT('irregular_label')}</span>`:''}</div>
    ${!v.aoristSupported?`<p class="tense-note">${pageT('aorist_unavailable')}</p>`:''}
    ${[v.conj_pres,v.conj_fut,...(v.aoristSupported?[v.conj_past]:[])].some(forms=>forms.some(form=>!form))?`<p class="tense-note">${pageT('forms_unavailable')}</p>`:''}
    <div class="speech-speed"><span>${pageT('audio_speed')}</span><button class="tool-btn speech-speed-btn" data-speed="slow">${pageT('audio_slow')}</button><button class="tool-btn speech-speed-btn" data-speed="normal">${pageT('audio_normal')}</button></div>
    <div class="tbl-wrap"><table class="conjugation-table"><thead><tr><th></th><th>${pageT('pres_t')}</th><th>${pastLabel}</th><th>${pageT('fut_t')}</th><th>${pageT('listen')}</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  document.getElementById('headAudio').onclick=e=>speakPageGreek(v.greek,e);
  document.querySelectorAll('.row-audio').forEach(button=>button.onclick=e=>speakPageRow(button.dataset.speech.split('|'),e));
  document.querySelectorAll('.speech-speed-btn').forEach(button=>button.onclick=()=>setPageSpeechSpeed(button.dataset.speed));
  setPageSpeechSpeed(pageSpeechSpeed);
}

document.addEventListener('DOMContentLoaded',renderVerbPage);
