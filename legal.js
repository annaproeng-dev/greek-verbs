/* Necessary storage notice. Optional trackers must never be loaded here. */
(() => {
  'use strict';
  const NOTICE_KEY = 'greekStorageNotice:v2';
  const text = {
    ru: {privacy:'Конфиденциальность',terms:'Условия использования',storage:'Cookies и данные',title:'Cookies',body:'Используем необходимые cookies для входа и сохранения прогресса. Без рекламы и аналитики.',details:'Подробнее о хранении',done:'Понятно',unsaved:'Браузер не разрешил сохранить отметку. При следующем посещении уведомление появится снова.'},
    en: {privacy:'Privacy',terms:'Terms of use',storage:'Cookies & storage',title:'Cookies',body:'We use necessary cookies to keep you signed in and save progress. No advertising or analytics.',details:'Storage details',done:'Got it',unsaved:'Your browser could not save this acknowledgement. The notice will appear on your next visit.'}
  };
  const language = () => document.documentElement.lang === 'ru' ? 'ru' : 'en';
  const link = (kind, locale = language()) => `${kind}${locale === 'en' ? '.en' : ''}.html`;
  const ready = fetch('/legal-manifest.json', {cache:'no-cache',credentials:'same-origin'})
    .then(response => { if (!response.ok) throw Error('legal_unavailable'); return response.json(); })
    .then(manifest => {
      if (!manifest.version || manifest.optionalTracking !== false || !Number.isInteger(manifest.noticeDays)) throw Error('legal_unavailable');
      return manifest;
    }).catch(() => null);
  window.SiteLegal = Object.freeze({ready, link, language, async acceptance(checked) {
    const manifest = await ready;
    if (!manifest) throw Error('legal_unavailable');
    return {version:manifest.version, language:language(), termsAccepted:checked === true, privacyAcknowledged:checked === true, adultConfirmed:checked === true};
  }});
  const footer = document.createElement('footer');
  footer.className = 'legal-footer';
  const notice = document.createElement('aside');
  notice.className = 'storage-notice';
  notice.setAttribute('aria-labelledby','storageNoticeTitle');
  const status = document.createElement('p');
  status.className = 'legal-storage-status';
  status.setAttribute('role','status');
  let manifest = null;
  function isAcknowledged() {
    if (!manifest) return false;
    try {
      const record = JSON.parse(localStorage.getItem(NOTICE_KEY));
      return record?.version === manifest.version && Number.isFinite(record.expiresAt) && record.expiresAt > Date.now();
    } catch { return false; }
  }
  function render() {
    const t = text[language()];
    footer.replaceChildren();
    for (const kind of ['privacy','terms']) {
      const anchor = document.createElement('a'); anchor.href = link(kind); anchor.textContent = t[kind]; footer.append(anchor);
    }
    const settings = document.createElement('button'); settings.type = 'button'; settings.textContent = t.storage;
    settings.onclick = () => {notice.hidden = false; notice.querySelector('button').focus();};
    footer.append(settings);
    notice.innerHTML = '<h2 id="storageNoticeTitle"></h2><p></p><a></a> <button type="button"></button>';
    notice.querySelector('h2').textContent = t.title;
    notice.querySelector('p').textContent = t.body;
    Object.assign(notice.querySelector('a'), {href:link('privacy')+'?section=storage',textContent:t.details});
    const done = notice.querySelector('button'); done.textContent = t.done;
    done.onclick = () => {
      if (manifest) {
        try {
          localStorage.setItem(NOTICE_KEY, JSON.stringify({version:manifest.version,expiresAt:Date.now()+manifest.noticeDays*86400000}));
          localStorage.removeItem('greekStorageNotice:v1');
        } catch {status.textContent = t.unsaved;}
      }
      notice.hidden = true; settings.focus();
    };
  }
  notice.hidden = true;
  document.body.append(footer, notice, status);
  render();
  ready.then(value => {manifest = value; notice.hidden = isAcknowledged();});
  new MutationObserver(render).observe(document.documentElement, {attributes:true,attributeFilter:['lang']});
  window.addEventListener('storage', event => {if (event.key === NOTICE_KEY || event.key === null) notice.hidden = isAcknowledged();});
})();

if(new URLSearchParams(location.search).get("section")==="storage")document.getElementById("storage")?.scrollIntoView();
