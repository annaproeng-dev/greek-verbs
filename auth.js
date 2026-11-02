const AUTH_TEXT = {
  ru: {
    login: 'Войти', register: 'Регистрация', profile: 'Профиль', logout: 'Выйти',
    loginTitle: 'С возвращением', registerTitle: 'Создать аккаунт',
    loginIntro: 'Войдите и продолжайте изучать греческий.', registerIntro: 'Ваш следующий шаг к свободному греческому.',
    email: 'Почта', password: 'Пароль', confirm: 'Повторите пароль', passwordHelp: 'От 8 до 128 символов',
    submitRegister: 'Зарегистрироваться', back: '← К глаголам', busy: 'Подождите…',
    localProgress: 'Прогресс сохраняется в этом браузере. На другом устройстве он будет отдельным.',
    invalid_credentials: 'Неверная почта или пароль.', email_exists: 'Эта почта уже зарегистрирована. Войдите в аккаунт.',
    password_mismatch: 'Пароли не совпадают.', password_length: 'Пароль должен содержать от 8 до 128 символов.',
    invalid_email: 'Введите корректный адрес почты.', rate_limited: 'Слишком много попыток. Попробуйте через 15 минут.',
    unavailable: 'Не удалось связаться с сервером. Попробуйте ещё раз.', invalid_request: 'Проверьте введённые данные.',
    storage: 'Не удалось сохранить прогресс в браузере. Разрешите хранение данных и обновите страницу.',
    session: 'Не удалось проверить вход. Для повторной попытки обновите страницу.'
  },
  en: {
    login: 'Log in', register: 'Sign up', profile: 'Profile', logout: 'Log out',
    loginTitle: 'Welcome back', registerTitle: 'Create an account',
    loginIntro: 'Log in and keep learning Greek.', registerIntro: 'Your next step towards confident Greek.',
    email: 'Email', password: 'Password', confirm: 'Confirm password', passwordHelp: '8–128 characters',
    submitRegister: 'Create account', back: '← Back to verbs', busy: 'Please wait…',
    localProgress: 'Your progress is saved in this browser. Other devices have their own progress.',
    invalid_credentials: 'Incorrect email or password.', email_exists: 'This email is already registered. Log in to your account.',
    password_mismatch: 'Passwords do not match.', password_length: 'Use a password with 8–128 characters.',
    invalid_email: 'Enter a valid email address.', rate_limited: 'Too many attempts. Try again in 15 minutes.',
    unavailable: 'Could not reach the server. Please try again.', invalid_request: 'Please check your details.',
    storage: 'Could not save your progress. Allow browser storage and reload this page.',
    session: 'Could not check your login. Reload the page to try again.'
  }
};
let currentUser = null;
let authMode = 'login';
let authBusy = false;
const authT = key => AUTH_TEXT[lang][key] || AUTH_TEXT[lang].unavailable;

function learningNotice(key) {
  const notice = document.getElementById('learningNotice');
  notice.dataset.message = key;
  notice.textContent = authT(key);
  notice.hidden = false;
}

function applyLearning(record) {
  for (const key of Object.keys(progress)) delete progress[key];
  Object.assign(progress, {correct: 0, wrong: 0, sessions: 0, byTense: {}, mistakes: {}, activityDays: {}, sessionProgress: 0, firstActivity: null}, plainRecord(record.progress));
  normalizeProgress();
  difficultIds.clear();
  for (const id of Array.isArray(record.difficult) ? record.difficult : []) difficultIds.add(id);
}

async function authRequest(action, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch('/api/auth' + (action ? '?action=' + action : ''), {
      method: action ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
      headers: action ? {'Content-Type': 'application/json'} : {},
      body: action ? JSON.stringify(body || {}) : undefined
    });
    let result;
    try { result = await response.json(); } catch { throw new Error('unavailable'); }
    if (!response.ok) throw new Error(result.error || 'unavailable');
    return result.user;
  } finally {
    clearTimeout(timeout);
  }
}

function setAccountBusy(value) {
  authBusy = value;
  document.querySelector('nav').inert = value;
  document.querySelector('.wrap').inert = value;
  document.getElementById('authForm').setAttribute('aria-busy', String(value));
}

function renderAuth() {
  const button = document.getElementById('accountBtn');
  button.classList.toggle('profile-button', !!currentUser);
  button.setAttribute('aria-label', authT(currentUser ? 'profile' : 'login'));
  button.title = authT(currentUser ? 'profile' : 'login');
  button.innerHTML = currentUser ? '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></svg>' : authT('login');
  document.querySelectorAll('[data-auth-text]').forEach(el => el.textContent = authT(el.dataset.authText));
  document.getElementById('authTitle').textContent = authT(authMode + 'Title');
  document.getElementById('authIntro').textContent = authT(authMode + 'Intro');
  document.getElementById('confirmField').hidden = authMode !== 'register';
  const confirm = document.getElementById('authConfirm');
  confirm.required = authMode === 'register';
  confirm.disabled = authMode !== 'register';
  const password = document.getElementById('authPassword');
  password.autocomplete = authMode === 'register' ? 'new-password' : 'current-password';
  password.minLength = authMode === 'register' ? 8 : 1;
  document.getElementById('passwordHelp').hidden = authMode !== 'register';
  document.getElementById('authSubmit').textContent = authT(authBusy ? 'busy' : authMode === 'register' ? 'submitRegister' : 'login');
  for (const mode of ['login', 'register']) {
    const tab = document.getElementById('authTab-' + mode);
    tab.classList.toggle('active', mode === authMode);
    tab.setAttribute('aria-pressed', String(mode === authMode));
    tab.disabled = authBusy;
  }
  document.getElementById('authSubmit').disabled = authBusy;
  document.getElementById('logoutBtn').disabled = authBusy;
  document.getElementById('profileEmail').textContent = currentUser?.email || '';
  const notice = document.getElementById('learningNotice');
  if (notice.dataset.message) notice.textContent = authT(notice.dataset.message);
}

function setAuthMode(mode) {
  if (authBusy) return;
  authMode = mode;
  document.getElementById('authForm').reset();
  document.getElementById('authError').textContent = '';
  if (location.hash !== '#' + mode) location.hash = mode;
  renderAuth();
}

function routeAccount() {
  let route = location.hash.slice(1);
  if (!['login', 'register', 'profile'].includes(route)) {
    document.body.classList.remove('account-page');
    document.getElementById('sec-auth').classList.remove('active');
    document.getElementById('sec-profile').classList.remove('active');
    if (!document.querySelector('.section.active')) switchSection('verbs');
    return;
  }
  if (currentUser && route !== 'profile') { location.replace('#profile'); return; }
  if (!currentUser && route === 'profile') { location.replace('#login'); return; }
  document.body.classList.add('account-page');
  document.querySelectorAll('.section, .nav-link').forEach(el => el.classList.remove('active'));
  document.getElementById(route === 'profile' ? 'sec-profile' : 'sec-auth').classList.add('active');
  if (route !== 'profile') authMode = route;
  document.getElementById('authError').textContent = '';
  stopDialogue();
  renderAuth();
}

async function changeAccount(user, adoptGuest = false) {
  await LearningStore.flush();
  const record = await LearningStore.load(user, adoptGuest);
  currentUser = user;
  applyLearning(record);
  // Discard exercises started under the previous account.
  difficultMode = false;
  applyFlashFilter();
  practicePool = ALL_VERBS.filter(v => v.conj_pres);
  selectedPracticeTense = 'mixed';
  switchExercise('quiz');
  for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
  renderAuth();
}

function announceAccountChange() {
  appStorage.setItem('greekAuthChanged', String(Date.now()) + Math.random());
}

async function submitAuth(event) {
  event.preventDefault();
  if (authBusy) return;
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const confirmPassword = document.getElementById('authConfirm').value;
  const error = document.getElementById('authError');
  if (authMode === 'register' && password !== confirmPassword) { error.textContent = authT('password_mismatch'); return; }
  setAccountBusy(true);
  error.textContent = '';
  renderAuth();
  let user;
  try {
    user = await authRequest(authMode, {email, password, confirmPassword});
    await changeAccount(user, authMode === 'register');
    document.getElementById('authForm').reset();
    location.hash = 'profile';
    announceAccountChange();
  } catch (failure) {
    if (user) { learningNotice('storage'); location.reload(); return; }
    error.textContent = authT(failure.message);
  } finally {
    setAccountBusy(false);
    renderAuth();
  }
}

async function logout() {
  if (authBusy) return;
  setAccountBusy(true);
  document.getElementById('profileError').textContent = '';
  renderAuth();
  try {
    await LearningStore.flush();
    await authRequest('logout');
    await changeAccount(null);
    document.getElementById('authForm').reset();
    location.hash = '';
    switchSection('verbs');
    announceAccountChange();
  } catch (failure) {
    document.getElementById('profileError').textContent = authT(failure.message);
  } finally {
    setAccountBusy(false);
    renderAuth();
  }
}

async function initAccount() {
  // Import the old guest data before any account can adopt it.
  await LearningStore.load(null);
  let user = null;
  try { user = await authRequest(); } catch { learningNotice('session'); }
  currentUser = user;
  applyLearning(await LearningStore.load(user));
  renderAuth();
  routeAccount();
  window.addEventListener('hashchange', routeAccount);
  window.addEventListener('storage', event => {
    if (event.key === 'greekAuthChanged') location.reload();
  });
}
