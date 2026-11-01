const pageLang=localStorage.getItem('greekTrainerLang')||'en';
const pageT=key=>I18N[pageLang][key]||key;

function speakPageGreek(text,event){
  event?.stopPropagation();
  if(!('speechSynthesis' in window))return;
  speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(text);
  utterance.lang='el-GR'; utterance.rate=.78;
  const voice=speechSynthesis.getVoices().find(v=>v.lang.toLowerCase().startsWith('el'));
  if(voice)utterance.voice=voice;
  speechSynthesis.speak(utterance);
}

function renderVerbPage(){
  document.documentElement.lang=pageLang;
  document.getElementById('verbBack').textContent=pageT('back_to_verbs');
  const id=new URLSearchParams(location.search).get('id');
  const v=ALL_VERBS.find(item=>item.id===id);
  if(!v){document.getElementById('verbDetail').innerHTML=`<h1>${pageT('empty_practice')}</h1>`;return;}
  document.title=`${v.greek} — ${pageT('page_title')}`;
  const translation=pageLang==='en'?v.english:v.russian;
  const group=pageT('group_'+v.group);
  const rows=PERSONS.map((person,i)=>{
    const present=v.conj_pres[i], past=v.aoristSupported?v.conj_past[i]:'—', future=v.conj_fut[i];
    const speech=[person,present,...(v.aoristSupported?[past]:[]),future].join('. ');
    return `<tr><td class="td-person">${person}</td><td>${present}</td><td>${past}</td><td>${future}</td><td class="td-listen"><button class="audio-btn row-audio" title="${pageT('listen_row')}" aria-label="${pageT('listen_row')}" data-speech="${speech}">🔊 <span>${pageT('listen')}</span></button></td></tr>`;
  }).join('');
  document.getElementById('verbDetail').innerHTML=`
    <header class="verb-detail-head"><div><h1>${v.greek} <button class="audio-btn" id="headAudio">🔊</button></h1><p>${translation}</p></div></header>
    <div class="verb-badges"><span>${group}</span>${v.irregular?`<span>${pageT('irregular_label')}</span>`:''}</div>
    ${!v.aoristSupported?`<p class="tense-note">${pageT('aorist_unavailable')}</p>`:''}
    <div class="tbl-wrap"><table class="conjugation-table"><thead><tr><th></th><th>${pageT('pres_t')}</th><th>${pageT('past_t')}</th><th>${pageT('fut_t')}</th><th>${pageT('listen')}</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  document.getElementById('headAudio').onclick=e=>speakPageGreek(v.greek,e);
  document.querySelectorAll('.row-audio').forEach(button=>button.onclick=e=>speakPageGreek(button.dataset.speech,e));
}

document.addEventListener('DOMContentLoaded',renderVerbPage);
