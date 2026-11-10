const AUTH_TEXT = {
  ru: {
    legal_acceptance_required: "Подтвердите актуальные условия и совершеннолетие.",
    legal_unavailable: "Не удалось загрузить условия. Обновите страницу и попробуйте снова.",
    authentication_required: "Войдите в аккаунт.",
    deletion_confirmation_required: "Подтвердите удаление аккаунта.",
    storage_reset: "Прогресс изменён в другой вкладке. Обновите страницу.",
    login: 'Войти', register: 'Регистрация', profile: 'Профиль', logout: 'Выйти',
    loginTitle: 'С возвращением', registerTitle: 'Создать аккаунт',
    loginIntro: 'Войдите и продолжайте изучать греческий.', registerIntro: 'Ваш следующий шаг к свободному греческому.',
    email: 'Почта', password: 'Пароль', confirm: 'Повторите пароль', passwordHelp: 'От 8 до 128 символов',
    submitRegister: 'Зарегистрироваться', back: '← К глаголам', busy: 'Подождите…',
    localProgress: 'Прогресс аккаунта сохраняется на сервере и доступен на других устройствах.',
    invalid_credentials: 'Неверная почта или пароль.', email_exists: 'Эта почта уже зарегистрирована. Войдите в аккаунт.',
    password_mismatch: 'Пароли не совпадают.', password_length: 'Пароль должен содержать от 8 до 128 символов.',
    invalid_email: 'Введите корректный адрес почты.', rate_limited: 'Слишком много попыток. Попробуйте через 15 минут.',
    forgotPassword: 'Забыли пароль?', forgotTitle: 'Восстановление пароля', forgotIntro: 'Введите почту — мы отправим ссылку для создания нового пароля.',
    sendReset: 'Отправить ссылку', resetSent: 'Если аккаунт с такой почтой существует, ссылка уже отправлена. Проверьте также папку «Спам».', backToLogin: '← Вернуться ко входу',
    resetTitle: 'Создать новый пароль', resetIntro: 'Используйте не менее 8 символов.', newPassword: 'Новый пароль', savePassword: 'Сохранить новый пароль',
    resetComplete: 'Пароль изменён. Теперь войдите с новым паролем.', invalid_reset_token: 'Ссылка недействительна или устарела. Запросите новую.',
    email_unavailable: 'Отправка писем пока настраивается. Попробуйте немного позже.',
    unavailable: 'Не удалось связаться с сервером. Попробуйте ещё раз.', invalid_request: 'Проверьте введённые данные.',
    storage: 'Не удалось сохранить прогресс на сервере. Проверьте подключение и обновите страницу.',
    session: 'Не удалось проверить вход. Для повторной попытки обновите страницу.'
  },
  en: {
    legal_acceptance_required: "Confirm the current terms and that you are an adult.",
    legal_unavailable: "Could not load the terms. Reload and try again.",
    authentication_required: "Please log in.",
    deletion_confirmation_required: "Confirm account deletion.",
    storage_reset: "Progress was cleared in another tab. Reload this page.",
    login: 'Log in', register: 'Sign up', profile: 'Profile', logout: 'Log out',
    loginTitle: 'Welcome back', registerTitle: 'Create an account',
    loginIntro: 'Log in and keep learning Greek.', registerIntro: 'Your next step towards confident Greek.',
    email: 'Email', password: 'Password', confirm: 'Confirm password', passwordHelp: '8–128 characters',
    submitRegister: 'Create account', back: '← Back to verbs', busy: 'Please wait…',
    localProgress: 'Account progress is saved on the server and available on other devices.',
    invalid_credentials: 'Incorrect email or password.', email_exists: 'This email is already registered. Log in to your account.',
    password_mismatch: 'Passwords do not match.', password_length: 'Use a password with 8–128 characters.',
    invalid_email: 'Enter a valid email address.', rate_limited: 'Too many attempts. Try again in 15 minutes.',
    forgotPassword: 'Forgot password?', forgotTitle: 'Reset password', forgotIntro: 'Enter your email and we will send a link to create a new password.',
    sendReset: 'Send reset link', resetSent: 'If an account exists for this email, the link has been sent. Please also check spam.', backToLogin: '← Back to login',
    resetTitle: 'Create a new password', resetIntro: 'Use at least 8 characters.', newPassword: 'New password', savePassword: 'Save new password',
    resetComplete: 'Password changed. You can now log in with the new password.', invalid_reset_token: 'This link is invalid or expired. Request a new one.',
    email_unavailable: 'Email delivery is being configured. Please try again a little later.',
    unavailable: 'Could not reach the server. Please try again.', invalid_request: 'Please check your details.',
    storage: 'Could not save your progress on the server. Check your connection and reload this page.',
    session: 'Could not check your login. Reload the page to try again.'
  }
};
let currentUser = null;
let authMode = 'login';
let authBusy = false;
let passwordFlow = '';
const PROFILE_AVATARS=['hermes','athena','apollo','aphrodite','poseidon','artemis'];
let pendingProfileAvatar=appStorage.getItem('greekPendingAvatar')||'hermes';
const authT = key => AUTH_TEXT[lang][key] || AUTH_TEXT[lang].unavailable;

function profileAvatarKey(email=currentUser?.email){return `greekProfileAvatar:${encodeURIComponent(email||'guest')}`;}
function currentProfileAvatar(){return currentUser?appStorage.getItem(profileAvatarKey())||'hermes':pendingProfileAvatar;}
function profileAvatarName(id){
  const names={hermes:['Гермес','Hermes'],athena:['Афина','Athena'],apollo:['Аполлон','Apollo'],aphrodite:['Афродита','Aphrodite'],poseidon:['Посейдон','Poseidon'],artemis:['Артемида','Artemis']};
  return names[id]?.[lang==='ru'?0:1]||id;
}
function selectProfileAvatar(id,source='profile'){
  if(!PROFILE_AVATARS.includes(id))return;
  pendingProfileAvatar=id;appStorage.setItem('greekPendingAvatar',id);
  if(source==='profile'&&currentUser)appStorage.setItem(profileAvatarKey(),id);
  renderAuth();
}
function renderAvatarPickers(){
  const selected=currentProfileAvatar();
  document.querySelectorAll('[data-avatar-picker]').forEach(picker=>{
    picker.innerHTML=PROFILE_AVATARS.map(id=>`<button class="avatar-option ${id===selected?'selected':''}" type="button" onclick="selectProfileAvatar('${id}','${picker.dataset.avatarPicker}')" aria-pressed="${id===selected}" title="${profileAvatarName(id)}"><span class="avatar-image-frame"><img src="assets/olympus/mascots/${id}.png" alt="${profileAvatarName(id)}"></span><span class="avatar-option-name">${profileAvatarName(id)}</span></button>`).join('');
  });
  const avatar=document.getElementById('profileAvatar');
  if(avatar)avatar.innerHTML=`<img class="profile-crop profile-crop-${selected}" src="assets/olympus/mascots/${selected}.png" alt="${profileAvatarName(selected)}">`;
}

function learningNotice(key) {
  const notice = document.getElementById('learningNotice');
  notice.dataset.message = key;
  notice.textContent = authT(key);
  notice.hidden = false;
}

function applyLearning(record) {
  for (const key of Object.keys(progress)) delete progress[key];
  const source = plainRecord(record.progress);
  const defaults = {correct: 0, wrong: 0, sessions: 0, byTense: {}, mistakes: {}, activityDays: {}, sessionProgress: 0, firstActivity: null, exam: {}};
  for (const key of Object.keys(defaults)) progress[key] = Object.hasOwn(source, key) ? source[key] : defaults[key];
  normalizeProgress();
  difficultIds.clear();
  for (const id of Array.isArray(record.difficult) ? record.difficult : []) difficultIds.add(id);
}

async function authRequest(action, body, fullResponse = false) {
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
    return fullResponse ? result : result.user;
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
  let admin = document.getElementById('adminBtn');
  if (!admin) {
    admin = document.createElement('button');
    admin.id='adminBtn'; admin.className='lang-btn'; admin.type='button';
    admin.textContent='⚙'; admin.onclick=showAdminPanel;
    document.getElementById('accountBtn').before(admin);
  }
  admin.hidden=currentUser?.role!=='owner';
  admin.title=admin.ariaLabel=lang==='ru'?'Админпанель':'Admin panel';

  const button = document.getElementById('accountBtn');
  button.classList.toggle('profile-button', !!currentUser);
  button.setAttribute('aria-label', authT(currentUser ? 'profile' : 'login'));
  button.title = authT(currentUser ? 'profile' : 'login');
  button.innerHTML = currentUser ? `<img class="nav-profile-avatar profile-crop profile-crop-${currentProfileAvatar()}" src="assets/olympus/mascots/${currentProfileAvatar()}.png" alt="">` : authT('login');
  document.querySelectorAll('[data-auth-text]').forEach(el => el.textContent = authT(el.dataset.authText));
  if(typeof isExamPage==='function'&&isExamPage())document.querySelectorAll('[data-auth-text="back"]').forEach(el=>el.textContent=lang==='ru'?'← К подготовке A2':'← Back to A2 preparation');
  document.getElementById('authTitle').textContent = authT(authMode + 'Title');
  document.getElementById('authIntro').textContent = authT(authMode + 'Intro');
  document.getElementById('confirmField').hidden = authMode !== 'register';
  const legalAcceptance = document.getElementById('legalAcceptance');
  if (legalAcceptance) {
    legalAcceptance.hidden = authMode !== 'register';
    document.getElementById('acceptTerms').disabled = authMode !== 'register';
    document.getElementById('acceptTerms').required = authMode === 'register';
    document.getElementById('legalAcceptanceText').innerHTML = lang === 'ru'
      ? 'Мне исполнилось 18 лет. Я принимаю <a href="terms.html" target="_blank" rel="noopener">условия использования</a> и ознакомился(-ась) с <a href="privacy.html" target="_blank" rel="noopener">политикой конфиденциальности</a>.'
      : 'I am 18 or older. I accept the <a href="terms.en.html" target="_blank" rel="noopener">terms of use</a> and have read the <a href="privacy.en.html" target="_blank" rel="noopener">privacy notice</a>.';
  }
  document.getElementById('registrationAvatarPicker').hidden = authMode !== 'register';
  document.getElementById('registrationAvatarTitle').textContent = lang==='ru'?'Выберите персонажа профиля':'Choose your profile character';
  document.getElementById('profileAvatarTitle').textContent = lang==='ru'?'Персонаж профиля':'Profile character';
  document.getElementById('authHeroTitle').textContent = lang==='ru'?'10 заданий в день — и ты на шаг ближе к Олимпу':'10 tasks a day — one step closer to Olympus';
  document.getElementById('authHeroText').textContent = lang==='ru'?'Гермес сохранит твой прогресс и награды Олимпа.':'Hermes will keep your progress and Olympus rewards safe.';
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
  const inRecovery=passwordFlow==='forgot'||passwordFlow==='reset';
  document.getElementById('authForm').hidden=inRecovery;
  document.querySelector('.auth-tabs').hidden=inRecovery;
  document.getElementById('authTitle').hidden=inRecovery;
  document.getElementById('authIntro').hidden=inRecovery;
  document.getElementById('forgotPasswordBtn').hidden=inRecovery||authMode!=='login';
  document.getElementById('forgotForm').hidden=passwordFlow!=='forgot';
  document.getElementById('resetForm').hidden=passwordFlow!=='reset';
  document.getElementById('forgotPasswordBtn').textContent=authT('forgotPassword');
  document.getElementById('forgotTitle').textContent=authT('forgotTitle');
  document.getElementById('forgotIntro').textContent=authT('forgotIntro');
  document.getElementById('forgotEmailLabel').textContent=authT('email');
  document.getElementById('forgotSubmit').textContent=authT(authBusy?'busy':'sendReset');
  document.querySelector('#forgotForm .password-back-link').textContent=authT('backToLogin');
  document.getElementById('resetTitle').textContent=authT('resetTitle');
  document.getElementById('resetIntro').textContent=authT('resetIntro');
  document.getElementById('resetPasswordLabel').textContent=authT('newPassword');
  document.getElementById('resetConfirmLabel').textContent=authT('confirm');
  document.getElementById('resetSubmit').textContent=authT(authBusy?'busy':'savePassword');
  document.getElementById('forgotSubmit').disabled=authBusy;
  document.getElementById('resetSubmit').disabled=authBusy;
  document.getElementById('logoutBtn').disabled = authBusy;
  document.getElementById('profileEmail').textContent = currentUser?.email || '';
  window.Subscriptions?.render();
  renderAvatarPickers();
  const notice = document.getElementById('learningNotice');
  if (notice.dataset.message) notice.textContent = authT(notice.dataset.message);
  window.AccountPrivacy?.render();
}

let accountRoutes = {}, routingReady;
function initRouting() {
  return routingReady ||= fetch('/routes.json', {cache:'no-cache'}).then(async response => {
    if (!response.ok) throw new Error('routes_unavailable');
    accountRoutes = await response.json();
  });
}
function accountRoute() { return accountRoutes[location.pathname]?.view || ''; }
function accountHome() { return typeof isExamPage === 'function' && isExamPage() ? '/exam.html' : '/'; }
function navigateAccount(view, replace=false) {
  if (!Object.keys(accountRoutes).length) return initRouting().then(() => navigateAccount(view, replace));
  const destination = view ? Object.keys(accountRoutes).find(path => accountRoutes[path].view === view) : accountHome();
  if (!destination) throw new Error('unknown_route');
  if (location.pathname !== destination || location.hash || location.search) history[replace ? 'replaceState' : 'pushState'](null, '', destination);
  routeAccount();
}
function leaveAccountRoute() {
  if (accountRoute()) history.replaceState(null, '', accountHome());
}
function migrateLegacyRoute() {
  const view = location.hash.slice(1);
  const path = Object.keys(accountRoutes).find(path => accountRoutes[path].view === view);
  if (path) history.replaceState(null, '', path + location.search);
}

function setAuthMode(mode) {
  if (authBusy) return;
  authMode = mode;
  passwordFlow='';
  document.getElementById('authForm').reset();
  document.getElementById('authError').textContent = '';
  if (accountRoute() !== mode) navigateAccount(mode);
  renderAuth();
}

function routeAccount() {
  let route = accountRoute();
  if (!['login', 'register'].includes(route)) document.getElementById('authForm').reset();
  if (!['login', 'register', 'profile', 'forgot', 'reset'].includes(route)) {
    document.body.classList.remove('account-page');
    document.getElementById('sec-auth').classList.remove('active');
    document.getElementById('sec-profile').classList.remove('active');
    if (!document.querySelector('.section.active')) switchSection(typeof isExamPage==='function'&&isExamPage()?'exam':'verbs');
    return;
  }
  if (currentUser && route !== 'profile') { navigateAccount('profile', true); return; }
  if (!currentUser && route === 'profile') { navigateAccount('login', true); return; }
  document.body.classList.add('account-page');
  document.querySelectorAll('.section, .nav-link').forEach(el => el.classList.remove('active'));
  document.getElementById(route === 'profile' ? 'sec-profile' : 'sec-auth').classList.add('active');
  passwordFlow=['forgot','reset'].includes(route)?route:'';
  if (['login','register'].includes(route)) authMode = route;
  document.getElementById('authError').textContent = '';
  stopDialogue();
  renderAuth();
}

function openPasswordRecovery(){
  document.getElementById('authError').textContent='';
  document.getElementById('authSuccess').textContent='';
  navigateAccount('forgot');
}
function closePasswordRecovery(){navigateAccount('login');}

async function requestPasswordReset(event){
  event.preventDefault();if(authBusy)return;
  const email=document.getElementById('forgotEmail').value.trim();
  const error=document.getElementById('forgotError'),success=document.getElementById('forgotSuccess');
  error.textContent='';success.textContent='';setAccountBusy(true);renderAuth();
  try{
    await authRequest('request_reset',{email});
    success.textContent=authT('resetSent');
  }catch(failure){error.textContent=authT(failure.message);}
  finally{setAccountBusy(false);renderAuth();}
}

async function submitNewPassword(event){
  event.preventDefault();if(authBusy)return;
  const password=document.getElementById('resetPassword').value,confirmPassword=document.getElementById('resetConfirm').value;
  const error=document.getElementById('resetError');error.textContent='';
  if(password!==confirmPassword){error.textContent=authT('password_mismatch');return;}
  const token=new URLSearchParams(location.search).get('reset_token')||'';
  setAccountBusy(true);renderAuth();
  try{
    await authRequest('reset_password',{token,password,confirmPassword});
    navigateAccount('login',true);passwordFlow='';authMode='login';
    document.getElementById('resetForm').reset();document.getElementById('authSuccess').textContent=authT('resetComplete');routeAccount();
  }catch(failure){error.textContent=authT(failure.message);}
  finally{setAccountBusy(false);renderAuth();}
}

async function changeAccount(user, adoptGuest = false) {
  // The server session has already changed. Never save the previous identity's drafts
  // with the new session, and never let a failed pending write retain old identity.
  if (typeof examDraftTimer !== 'undefined') clearTimeout(examDraftTimer);
  currentUser = user;
  if(window.Subscriptions){Subscriptions.access=null;Subscriptions.identity=null;Subscriptions.keys=new WeakMap();Subscriptions.openPhrases=new Set();}
  applyLearning({progress: {}, difficult: []});
  renderAuth();
  try { await LearningStore.flush(); } catch { learningNotice('storage'); }
  const record = await LearningStore.load(user, adoptGuest);
  applyLearning(record);
  if(window.Subscriptions?.refresh)await Subscriptions.refresh();
  // Discard exercises started under the previous account.
  if(typeof isExamPage==='function'&&isExamPage()){
    resetExamAccount();
    for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();
    renderAuth();return;
  }
  difficultMode = false;
  applyFlashFilter();
  practicePool = ALL_VERBS.filter(v => v.conj_pres);
  selectedPracticeTense = 'mixed';
  switchExercise('quiz');
  renderPhrases();
  for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
  renderAuth();
}

function announceAccountChange() {
  authChannel?.postMessage('changed');
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
  if (authMode === 'register' && !document.getElementById('acceptTerms')?.checked) { error.textContent = lang === 'ru' ? 'Подтвердите возраст и принятие условий.' : 'Confirm your age and accept the terms.'; return; }
  setAccountBusy(true);
  error.textContent = '';
  renderAuth();
  let user;
  try {
    const legalAcceptance = authMode === 'register' ? await window.SiteLegal.acceptance(document.getElementById('acceptTerms').checked) : undefined;
    user = await authRequest(authMode, {email, password, confirmPassword, legalAcceptance});
    announceAccountChange();
    const justRegistered = authMode === 'register';
    await changeAccount(user, justRegistered);
    if(!user.legal?.accepted) { navigateAccount('profile'); return; }
    if(justRegistered)appStorage.setItem(profileAvatarKey(user.email),pendingProfileAvatar);
    document.getElementById('authForm').reset();
    navigateAccount('profile');
    const pendingTour=appStorage.getItem('greekOnboardingPending')==='tour';
    if(pendingTour){appStorage.setItem('greekOnboardingPending','');setTimeout(()=>startContextTour(),180);}
    else if (justRegistered) setTimeout(()=>startOnboarding(), 120);
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
  let revoked = false;
  try {
    await authRequest('logout');
    revoked = true;
    announceAccountChange();
    await changeAccount(null);
    document.getElementById('authForm').reset();
    navigateAccount('');
    switchSection(typeof isExamPage==='function'&&isExamPage()?'exam':'verbs');
  } catch (failure) {
    if (revoked) { location.reload(); return; }
    document.getElementById('profileError').textContent = authT(failure.message);
  } finally {
    setAccountBusy(false);
    renderAuth();
  }
}

let authChannel;
let checkingSession = false;
let accountReady = false;
async function revalidateSession() {
  if (!accountReady || authBusy || checkingSession) return;
  checkingSession = true;
  let switching = false;
  try {
    const user = await authRequest();
    if (authBusy) return;
    if (user?.id === currentUser?.id && user) { currentUser = user; renderAuth(); }
    if (user?.id !== currentUser?.id) {
      switching = true;
      setAccountBusy(true);
      await changeAccount(user);
      routeAccount();
    }
  } catch {
    learningNotice('session');
  } finally {
    checkingSession = false;
    if (switching) setAccountBusy(false);
  }
}

async function initAccount() {
  await initRouting();
  migrateLegacyRoute();
  window.addEventListener('popstate', routeAccount);
  window.addEventListener('hashchange', () => { migrateLegacyRoute(); routeAccount(); });
  window.addEventListener('storage', event => {
    if (event.key === 'greekAuthChanged') revalidateSession();
  });
  if ('BroadcastChannel' in window) {
    authChannel = new BroadcastChannel('greek-account');
    authChannel.onmessage = () => revalidateSession();
  }
  window.addEventListener('focus', revalidateSession);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') revalidateSession();
  });
  try { currentUser = await authRequest(); } catch { learningNotice('session'); }
  try {
    // Server ownership is session-scoped; never request the guest record while signed in.
    applyLearning(await LearningStore.load(currentUser));
  } catch {
    learningNotice('storage');
  }
  renderAuth();
  routeAccount();
  accountReady = true;
}

async function showAdminPanel() {
  if(currentUser?.role!=='owner') return;
  let dialog=document.getElementById('adminPanel');
  if(!dialog){
    dialog=document.createElement('dialog'); dialog.id='adminPanel';
    dialog.className='admin-panel'; document.body.append(dialog);
  }
  dialog.replaceChildren();
  const title=document.createElement('h2'); title.id='adminPanelTitle'; dialog.setAttribute('aria-labelledby',title.id); title.textContent=lang==='ru'?'Админпанель':'Admin panel';
  const close=document.createElement('button'); close.className='lang-btn'; close.textContent='×';
  close.ariaLabel=lang==='ru'?'Закрыть':'Close'; close.onclick=()=>dialog.close();
  dialog.append(close,title); dialog.showModal();
  const status=document.createElement('p'); status.textContent=lang==='ru'?'Загрузка…':'Loading…'; dialog.append(status);
  try {
    const response=await fetch('/api/auth?action=admin_users',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:'{}'});
    const result=await response.json(); if(!response.ok)throw new Error(result.error);
    status.remove();
    const table=document.createElement('table');
    const head=table.createTHead().insertRow();
    for(const label of ['Email',lang==='ru'?'Роль':'Role',lang==='ru'?'Подписка':'Subscription',lang==='ru'?'Выдать на 7 дней':'Grant for 7 days']) {const th=document.createElement('th');th.textContent=label;head.append(th);}
    const body=table.createTBody();
    for(const user of result.users){
      const row=body.insertRow();row.insertCell().textContent=user.email;
      row.insertCell().textContent=user.role==='owner'?(lang==='ru'?'Владелец':'Owner'):(lang==='ru'?'Пользователь':'User');
      const subscription=row.insertCell();
      const update=()=>{subscription.textContent=Subscriptions.label(user.subscription);};update();
      const actions=row.insertCell();
      for(const plan of ['plus','pro','free']){
        const button=document.createElement('button');button.className='tool-btn';button.textContent=plan==='free'?(lang==='ru'?'Сбросить':'Reset'):plan==='plus'?'Plus · 7 дней':'Pro · 7 дней';
        button.onclick=async()=>{
          const buttons=actions.querySelectorAll('button');buttons.forEach(b=>b.disabled=true);
          try{
            const response=await fetch('/api/auth?action=admin_subscription',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:user.id,plan})});
            const result=await response.json();if(!response.ok)throw new Error();
            user.subscription=result.subscription;update();
            if(currentUser.id===user.id){currentUser.subscription=result.subscription;Subscriptions.render();}
          }catch{subscription.textContent=lang==='ru'?'Ошибка. Попробуйте снова.':'Failed. Try again.';}
          finally{buttons.forEach(b=>b.disabled=false);}
        };actions.append(button);
      }
    }
    const search=document.createElement('input');search.type='search';search.placeholder=lang==='ru'?'Поиск по email':'Search by email';search.ariaLabel=search.placeholder;
    search.oninput=()=>{for(const row of body.rows)row.hidden=!row.cells[0].textContent.toLowerCase().includes(search.value.toLowerCase());};
    dialog.append(search,table);
  } catch {status.textContent=lang==='ru'?'Не удалось загрузить пользователей.':'Could not load users.';}
}
