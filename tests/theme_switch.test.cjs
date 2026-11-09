// Run with Node.js: node tests/theme_switch.test.cjs
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

function run(saved, blocked = false) {
  const button = {attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }};
  const metas = {'color-scheme': {content: ''}, 'theme-color': {content: ''}};
  const storage = {getItem(key) { if (blocked) throw Error('blocked'); return key === 'greekTrainerTheme' ? saved : 'en'; }, setItem() { if (blocked) throw Error('blocked'); }};
  const document = {documentElement: {dataset: {}, lang: 'en'}, readyState: 'complete', getElementById() { return button; }, querySelector(selector) { return metas[selector.includes('color-scheme') ? 'color-scheme' : 'theme-color']; }};
  const scope = vm.createContext({window: {}, localStorage: storage, document});
  vm.runInContext(fs.readFileSync('theme.js', 'utf8'), scope);
  return {scope, document, button, metas};
}
for (const blocked of [false, true]) {
  const t = run('dark', blocked);
  if (!blocked) assert.equal(t.document.documentElement.dataset.theme, 'dark');
  t.scope.window.setTheme('light');
  assert.equal(t.document.documentElement.dataset.theme, 'light');
  assert.equal(t.metas['color-scheme'].content, 'only light');
  assert.equal(t.button.attrs['aria-pressed'], 'false');
  t.scope.window.toggleTheme();
  assert.equal(t.document.documentElement.dataset.theme, 'dark');
  assert.equal(t.metas['color-scheme'].content, 'dark');
  assert.equal(t.button.attrs['aria-pressed'], 'true');
}
const css = fs.readFileSync('style.css', 'utf8');
assert.match(css, /:root\s*\{\s*color-scheme:\s*only light;/);
assert.match(css, /html\[data-theme="dark"\]\s*\{\s*color-scheme:\s*dark;/);
console.log('Explicit light/dark modes and blocked storage: OK');
