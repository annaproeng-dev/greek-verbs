(function () {
  const STORAGE_KEY = 'greekTrainerTheme';

  function readSetting(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  function preferredTheme() {
    const saved = readSetting(STORAGE_KEY);
    return saved === 'dark' || saved === 'light' ? saved : 'light';
  }

  function themeLabel(theme) {
    const lang = readSetting('greekTrainerLang') || document.documentElement.lang || 'en';
    if (lang === 'ru') return theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему';
    return theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
  }

  function updateThemeControl() {
    const theme = document.documentElement.dataset.theme || preferredTheme();
    const button = document.getElementById('themeBtn');
    if (button) {
      button.textContent = theme === 'dark' ? '☀️' : '🌙';
      button.setAttribute('aria-label', themeLabel(theme));
      button.title = themeLabel(theme);
      button.setAttribute('aria-pressed', String(theme === 'dark'));
    }
    const scheme = document.querySelector('meta[name="color-scheme"]');
    if (scheme) scheme.content = theme === 'dark' ? 'dark' : 'only light';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'dark' ? '#101a27' : '#f4f1e9';
  }

  function setTheme(theme) {
    const next = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* Theme still works for this page. */ }
    updateThemeControl();
  }

  window.toggleTheme = function () {
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  };
  window.setTheme = setTheme;
  window.updateThemeControl = updateThemeControl;

  document.documentElement.dataset.theme = preferredTheme();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', updateThemeControl);
  else updateThemeControl();
})();
