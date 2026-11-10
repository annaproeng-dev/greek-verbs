/* Authenticated account controls; the server is authoritative for identity and acceptance. */
(() => {
  'use strict';
  const panel = document.createElement('section');
  panel.className = 'account-privacy';
  panel.innerHTML = '<h3></h3><p class="legal-current-status" role="status"></p><label class="legal-acceptance"><input type="checkbox"><span></span></label><div class="privacy-actions"></div><p class="account-error" role="alert"></p>';
  const profile = document.querySelector('#sec-profile .account-card');
  if (!profile) return;
  profile.append(panel);
  const dialog = document.createElement('dialog');
  dialog.className = 'verb-dialog privacy-dialog';
  dialog.setAttribute('aria-labelledby','privacyActionTitle');
  dialog.innerHTML = '<form><h2 id="privacyActionTitle"></h2><p></p><label><span></span><input type="password" autocomplete="current-password" maxlength="128" required></label><p class="account-error" role="alert"></p><div class="privacy-actions"><button type="submit"></button><button type="button"></button></div></form>';
  document.body.append(dialog);
  const labels = {
    ru:{title:'Данные и безопасность',accepted:'Условия приняты.',pending:'Подтвердите обновлённые условия.',confirm:'Мне исполнилось 18 лет. Принимаю условия использования и подтверждаю ознакомление с политикой конфиденциальности.',accept:'Подтвердить условия',export_data:'Скачать мои данные',delete_account:'Удалить аккаунт',logout_all:'Выйти на всех устройствах',clear_local:'Удалить учебный прогресс',password:'Текущий пароль',cancel:'Отмена',continue:'Подтвердить',deleteInfo:'Аккаунт и прогресс будут удалены без возможности восстановления. Все устройства выйдут из аккаунта.',exportInfo:'Выгрузка содержит данные аккаунта, принятие условий и учебный прогресс с сервера. Пароли и токены не включаются.',logoutInfo:'Все активные сессии будут завершены. Прогресс сохранится.',clearInfo:'Будут удалены учебный прогресс на сервере и настройки в текущем браузере. Аккаунт останется. Это действие нельзя отменить.',localFailure:'Аккаунт удалён на сервере. Браузер не смог очистить локальные данные: удалите данные сайта в его настройках.'},
    en:{title:'Data & security',accepted:'Terms accepted.',pending:'Please confirm the updated terms.',confirm:'I am 18 or older. I accept the terms of use and acknowledge the privacy notice.',accept:'Confirm terms',export_data:'Download my data',delete_account:'Delete account',logout_all:'Log out everywhere',clear_local:'Clear learning progress',password:'Current password',cancel:'Cancel',continue:'Confirm',deleteInfo:'Your account and progress will be permanently deleted. All devices will be signed out.',exportInfo:'Your export contains account details, legal acceptances and learning progress from the server. Passwords and tokens are excluded.',logoutInfo:'All sessions will end. Learning progress will remain.',clearInfo:'This account’s learning progress on the server and preferences in this browser will be removed. Your account will remain. This cannot be undone.',localFailure:'The server account was deleted. Your browser could not erase local data: clear this site’s data in browser settings.'}
  };
  const locale = () => document.documentElement.lang === 'ru' ? 'ru' : 'en';
  let busy = false, action = null;
  function render() {
    const t = labels[locale()];
    panel.hidden = !currentUser;
    panel.querySelector('h3').textContent = t.title;
    const accepted = currentUser?.legal?.accepted === true;
    panel.querySelector('.legal-current-status').textContent = accepted ? t.accepted : t.pending;
    const label = panel.querySelector('label'); label.hidden = accepted;
    label.querySelector('span').replaceChildren();
    label.querySelector('span').append(t.confirm+' ');
    for (const kind of ['terms','privacy']) {
      const a = document.createElement('a'); a.href = window.SiteLegal.link(kind); a.target = '_blank'; a.rel = 'noopener'; a.textContent = kind === 'terms' ? (locale()==='ru'?'Условия':'Terms') : (locale()==='ru'?'Конфиденциальность':'Privacy');
      label.querySelector('span').append(a, ' ');
    }
    const buttons = panel.querySelector('.privacy-actions'); buttons.replaceChildren();
    for (const key of ['accept','export_data','logout_all','clear_local','delete_account']) {
      if (key === 'accept' && accepted) continue;
      const button = document.createElement('button'); button.type='button'; button.dataset.privacyAction=key; button.textContent=t[key];button.disabled=busy;
      button.onclick = () => key==='accept' ? accept() : open(key);
      buttons.append(button);
    }
  }
  async function accept() {
    const error = panel.querySelector('.account-error'); error.textContent='';
    if (!panel.querySelector('input').checked) {error.textContent=authT('legal_acceptance_required');return;}
    busy=true;render();
    try {currentUser=await authRequest('accept_legal',{legalAcceptance:await window.SiteLegal.acceptance(true)});panel.querySelector('input').checked=false;announceAccountChange();}
    catch (failure) {error.textContent=authT(failure.message);}
    finally {busy=false;render();}
  }
  function open(key) {
    if (busy || authBusy) return;
    action=key;
    const t=labels[locale()];
    dialog.querySelector('form').reset();dialog.querySelector('.account-error').textContent='';
    dialog.querySelector('h2').textContent=t[key];
    dialog.querySelector('p').textContent=t[{delete_account:'deleteInfo',export_data:'exportInfo',logout_all:'logoutInfo',clear_local:'clearInfo'}[key]];
    dialog.querySelector('label').hidden=key==='clear_local';
    dialog.querySelector('label span').textContent=t.password;
    dialog.querySelector('input').required=key!=='clear_local';dialog.querySelector('input').disabled=key==='clear_local';
    dialog.querySelector('[type="submit"]').textContent=t.continue;
    dialog.querySelector('[type="button"]').textContent=t.cancel;
    dialog.showModal();
  }
  dialog.querySelector('[type="button"]').onclick=()=>{if(!busy)dialog.close();};
  dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
  dialog.addEventListener('close',()=>dialog.querySelector('form').reset());
  dialog.querySelector('form').onsubmit=async event=>{
    event.preventDefault();if(busy||!currentUser)return;
    const account={...currentUser};
    const password=dialog.querySelector('input').value;
    const error=dialog.querySelector('.account-error');error.textContent='';
    busy=true;setAccountBusy(true);render();dialog.querySelectorAll('button').forEach(b=>b.disabled=true);
    let deleted=false;
    try {
      if(typeof flushExamDrafts==='function')flushExamDrafts();
      await LearningStore.flush();
      if(action==='clear_local') {
        await LearningStore.remove(account);
        appStorage.removeItem(profileAvatarKey(account.email));
        const wasReady=accountReady; accountReady=false;
        try { await changeAccount(account); } finally { accountReady=wasReady; }
      } else {
        const result=await authRequest(action,{password,...(action==='delete_account'?{confirmation:'DELETE'}:{})},true);
        if(action==='export_data') {
          const data={...result.export,learning:result.export.learning || await LearningStore.exportRecord(account)};
          const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
          const a=document.createElement('a');a.href=url;a.download='greekmaster-data.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
        } else {
          deleted=action==='delete_account';
          announceAccountChange();
          if(deleted){await LearningStore.clearLegacy(account);appStorage.removeItem(profileAvatarKey(account.email));}
          const wasReady=accountReady; accountReady=false;
          try { await changeAccount(null); } finally { accountReady=wasReady; }
          navigateAccount('login');
        }
      }
      dialog.close();
    } catch(failure) {
      if(deleted){currentUser=null;applyLearning({progress:{},difficult:[]});announceAccountChange();error.textContent=labels[locale()].localFailure;navigateAccount('login');}
      else error.textContent=authT(failure.message);
    } finally {busy=false;setAccountBusy(false);renderAuth();dialog.querySelectorAll('button').forEach(b=>b.disabled=false);}
  };
  window.AccountPrivacy=Object.freeze({render});
  render();
})();
