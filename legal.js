/* Necessary storage notice. Optional trackers must never be loaded here. */
(() => {
  'use strict';
  const NOTICE_KEY = 'greekStorageNotice:v2';
  const text = {
    ru: {tagline:'Греческий в своём темпе',useful:'Полезное',documents:'Документы',plans:'Тарифы',support:'Поддержка',report:'Сообщить об ошибке',tax:'ИНН',home:'На главную',reportSubject:'Greekmaster — ошибка на сайте',reportBody:'Страница: ',privacy:'Конфиденциальность',terms:'Условия использования',storage:'Cookies и данные',title:'Cookies',body:'Используем необходимые cookies для входа и сохранения прогресса. Без рекламы и аналитики.',details:'Подробнее о хранении',done:'Понятно',unsaved:'Браузер не разрешил сохранить отметку. При следующем посещении уведомление появится снова.'},
    en: {tagline:'Greek at your own pace',useful:'Useful links',documents:'Legal',plans:'Plans',support:'Support',report:'Report a problem',tax:'Tax ID',home:'Home',reportSubject:'Greekmaster — website issue',reportBody:'Page: ',privacy:'Privacy',terms:'Terms of use',storage:'Cookies & storage',title:'Cookies',body:'We use necessary cookies to keep you signed in and save progress. No advertising or analytics.',details:'Storage details',done:'Got it',unsaved:'Your browser could not save this acknowledgement. The notice will appear on your next visit.'}
  };
  let siteInfo = null;
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
  footer.dataset.bottomNav = String(!!document.querySelector('.nav-links'));
  const notice = document.createElement('aside');
  notice.className = 'storage-notice';
  notice.dataset.bottomNav = footer.dataset.bottomNav;
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
    const content = document.createElement('div'); content.className = 'site-footer-content';
    const brand = document.createElement('div'); brand.className = 'site-footer-brand';
    const home = document.createElement('a'); home.href = '/'; home.textContent = siteInfo?.name || t.home;
    const tagline = document.createElement('p'); tagline.textContent = t.tagline; brand.append(home, tagline);
    function group(title, section) {
      const block = document.createElement('div'); block.className = 'site-footer-group'; block.dataset.footerSection = section;
      const heading = document.createElement('h2'); heading.textContent = title;
      const list = document.createElement('ul'); block.append(heading, list); content.append(block);
      return {list, append(element) {const item=document.createElement('li');item.append(element);list.append(item);}};
    }
    function anchor(label, href) {const element=document.createElement('a');element.textContent=label;element.href=href;return element;}
    content.append(brand);
    const useful = group(t.useful, 'useful');
    useful.append(anchor(t.plans, '/pricing'));
    if (siteInfo?.operator?.email) {
      const email = 'mailto:' + siteInfo.operator.email;
      useful.append(anchor(t.support, email));
      const body = t.reportBody + location.origin + location.pathname + '\n\n';
      useful.append(anchor(t.report, email+'?subject='+encodeURIComponent(t.reportSubject)+'&body='+encodeURIComponent(body)));
    }
    const documents = group(t.documents, 'documents');
    for (const kind of ['terms','privacy']) documents.append(anchor(t[kind], link(kind)));
    const settings = document.createElement('button'); settings.type = 'button'; settings.textContent = 'Cookies';
    settings.onclick = () => {notice.hidden = false; notice.querySelector('button').focus();};
    documents.append(settings);
    const copyright = document.createElement('p'); copyright.className = 'site-footer-copyright';
    if (siteInfo) {
      const owner = language() === 'ru' ? siteInfo.operator.name : siteInfo.operator.nameEn;
      copyright.textContent = `© ${new Date().getUTCFullYear()} ${siteInfo.name} · ${owner} · ${t.tax} ${siteInfo.operator.taxId}`;
    }
    footer.append(content, copyright);
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
  fetch('/site-info.json', {cache:'no-cache',credentials:'same-origin'})
    .then(response => {if (!response.ok) throw Error('site_info_unavailable');return response.json();})
    .then(value => {if (typeof value.name !== 'string' || !value.operator || !/^[^\s@]+@[^\s@]+$/.test(value.operator.email)) return;siteInfo=value;render();})
    .catch(() => {});
  ready.then(value => {manifest = value; notice.hidden = isAcknowledged();});
  new MutationObserver(render).observe(document.documentElement, {attributes:true,attributeFilter:['lang']});
  window.addEventListener('storage', event => {if (event.key === NOTICE_KEY || event.key === null) notice.hidden = isAcknowledged();});
})();

if(new URLSearchParams(location.search).get("section")==="storage")document.getElementById("storage")?.scrollIntoView();
