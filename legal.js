/* Necessary storage only. No analytics or advertising is loaded here. */
(() => {
  'use strict';
  const key = 'greekStorageNotice:v1';
  const ru = () => document.documentElement.lang === 'ru' || (typeof lang !== 'undefined' && lang === 'ru');
  const footer = document.createElement('footer');
  footer.className = 'legal-footer';
  const notice = document.createElement('aside');
  notice.className = 'storage-notice';
  notice.setAttribute('aria-label', 'Cookies / Хранение данных');
  let acknowledged = false;
  try { acknowledged = localStorage.getItem(key) === 'seen'; } catch {}
  notice.hidden = acknowledged;
  function render() {
    const russian = ru();
    footer.innerHTML = `<a href="privacy.html">${russian ? 'Конфиденциальность' : 'Privacy'}</a><a href="terms.html">${russian ? 'Условия использования' : 'Terms of use'}</a><button type="button">${russian ? 'Cookies и данные' : 'Cookies & storage'}</button>`;
    footer.querySelector('button').onclick = () => { notice.hidden = false; notice.querySelector('button').focus(); };
    notice.innerHTML = russian
      ? '<p><strong>Cookies и сохранение прогресса</strong><br>Для входа используется cookie сессии, а прогресс и настройки сохраняются в вашем браузере. Аналитических и рекламных трекеров нет. Это уведомление, а не запрос согласия на рекламу. <a href="privacy.html#storage">Подробнее о хранении</a></p><button type="button">Понятно</button>'
      : '<p><strong>Cookies & learning progress</strong><br>A session cookie keeps you signed in. Your browser stores your learning progress and settings. We use no analytics or advertising trackers. This is a storage notice, not advertising consent. <a href="privacy.html#storage">Storage details</a></p><button type="button">Got it</button>';
    notice.querySelector('button').onclick = () => {
      notice.hidden = true;
      try { localStorage.setItem(key, 'seen'); } catch {}
      footer.querySelector('button').focus();
    };
  }
  document.body.append(footer, notice);
  render();
  new MutationObserver(render).observe(document.documentElement, {attributes:true, attributeFilter:['lang']});
})();
