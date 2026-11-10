/* The API owns allowance counters and subscriptions. Learning assets remain public. */
window.Subscriptions = {
  access: null, identity: null, loading: null, busy: false, keys: new WeakMap(),
  en(){return typeof lang!=='undefined'&&lang==='en';},
  owner(){return typeof currentUser!=='undefined'&&currentUser?'user:'+currentUser.id:'guest';},
  plan(subscription=typeof currentUser==='undefined'?null:currentUser?.subscription){return subscription?.expiresAt*1000>Date.now()&&['plus','pro'].includes(subscription.plan)?subscription.plan:'free';},
  label(subscription){const plan=this.plan(subscription);return (plan==='free'?(this.en()?'Free':'Бесплатный'):plan==='plus'?'Plus':'Pro')+(plan!=='free'?' · '+new Date(subscription.expiresAt*1000).toLocaleString(this.en()?'en-GB':'ru-RU'):'');},
  task(object){if(!this.keys.has(object))this.keys.set(object,crypto.randomUUID());return this.keys.get(object);},
  async request(operation='status',format,task){
    const owner=this.owner();
    const response=await fetch('/api/auth?action=practice_access',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation,format,task,owner})});
    const result=await response.json();
    if(this.owner()!==owner)throw new Error('account_changed');
    if(result.access){if(this.identity!==owner){this.keys=new WeakMap();this.openPhrases=new Set();}this.access=result.access;this.identity=owner;this.render();}
    if(!response.ok&&result.error!=='practice_limit')throw new Error(result.error||'unavailable');
    return response.ok;
  },
  invite(){if(this.owner()==='guest')this.show('welcome');},
  async refresh(){
    if(this.loading)return this.loading;
    this.loading=this.request().catch(()=>{this.access=null;this.paintCounter(this.en()?'Could not load limits. Try again.':'Не удалось загрузить лимиты. Попробуйте снова.');}).finally(()=>{this.loading=null;});
    return this.loading;
  },
  async use(format,task,action){
    if(this.busy)return;
    this.busy=true;
    try{
      if(await this.request('use',format,task))action();else this.show();
    }catch{this.show('error');}finally{this.busy=false;}
  },
  paintCounter(text){
    let el=document.getElementById('practiceAllowance');
    if(!el){el=document.createElement('div');el.id='practiceAllowance';el.className='practice-allowance';el.setAttribute('role','status');document.querySelector('.wrap')?.prepend(el);}
    el.textContent=text;
  },
  render(){
    const el=document.getElementById('profileSubscription');
    if(el){el.replaceChildren();const title=document.createElement('strong');title.textContent=this.label(typeof currentUser==='undefined'?null:currentUser?.subscription);const link=document.createElement('a');link.href='/pricing';link.textContent=this.en()?'Compare plans →':'Сравнить тарифы →';el.append(title,link);}
    if(!this.access||this.identity!==this.owner()){if(typeof accountReady!=='undefined'&&accountReady&&!this.loading)this.refresh();return;}
    const a=this.access;
    if(a.unlimited){this.paintCounter(this.en()?'Plus / Pro · Unlimited practice':'Plus / Pro · Практика без ограничений');return;}
    const names={cards:this.en()?'Cards':'Карточки',quiz:this.en()?'Translation':'Перевод',match:this.en()?'Pairs':'Пары',tense:this.en()?'Tense':'Определить время',conj:this.en()?'Conjugation':'Спряжение',change:this.en()?'Change tense':'Изменить время',situation:this.en()?'Situations':'Ситуации',fill:this.en()?'Missing letters':'Пропущенные буквы',phrases:'Phrases'};
    const bonus=Object.values(a.introRemaining).reduce((sum,n)=>sum+n,0);
    this.paintCounter(a.owner==='guest'?(this.en()?'Guest: up to 3 tasks in each format':'Гость: до 3 заданий каждого формата'):(this.en()?`Today: ${a.dailyRemaining} / ${a.dailyLimit} left · Welcome bonus: ${bonus}`:`Сегодня осталось: ${a.dailyRemaining} из ${a.dailyLimit} · Бонус: ${bonus}`));
    const counter=document.getElementById('practiceAllowance');
    const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent=this.en()?'Limits by format':'Остаток по форматам';details.append(summary);
    const list=document.createElement('p');list.textContent=Object.entries(a.introRemaining).map(([key,n])=>`${names[key]}: ${n}`).join(' · ');details.append(list);
    if(a.owner!=='guest'){const note=document.createElement('p');note.textContent=this.en()?`Bonus first, then a shared daily allowance. Resets at midnight (${a.timezone}).`:`Сначала расходуется бонус, затем общий дневной запас. Обновление в полночь (${a.timezone}).`;details.append(note);}counter.append(details);
  },
  require(){if(this.plan()!=='free')return true;this.show('exam');return false;},
  show(reason='limit'){
    let dialog=document.getElementById('subscriptionGate');if(!dialog){dialog=document.createElement('dialog');dialog.id='subscriptionGate';dialog.className='verb-dialog';document.body.append(dialog);}dialog.replaceChildren();
    const guest=this.owner()==='guest',en=this.en();
    const title=document.createElement('h2');title.textContent=reason==='error'?(en?'Please try again':'Попробуйте ещё раз'):reason==='exam'?(en?'A2 preparation with Plus':'Подготовка к A2 в Plus'):guest?(en?'Continue for free':'Продолжите бесплатно'):(en?'Your allowance is used':'Бесплатные задания закончились');
    const text=document.createElement('p');text.textContent=reason==='welcome'?(en?'Try 3 tasks in each format without an account. Register for 3 more in each format and a shared allowance of 10 every day.':'Без регистрации можно попробовать по 3 задания каждого формата. Создайте аккаунт: ещё по 3 каждого формата и общий запас 10 заданий каждый день.'):reason==='error'?(en?'We could not check your allowance. Nothing was opened. Check your connection and try again.':'Не удалось проверить лимит. Проверьте соединение и попробуйте снова.'):reason==='exam'?(en?'Full A2 practice is available with Plus and Pro.':'Полная подготовка к A2 доступна в Plus и Pro.'):guest?(en?'Create an account for 3 more tasks in each format and 10 shared tasks every day.':'Зарегистрируйтесь: ещё по 3 задания каждого формата и 10 общих заданий каждый день.'):(en?'Try a format with a remaining welcome bonus, come back tomorrow, or continue without limits with Plus.':'Выберите формат с оставшимся бонусом, возвращайтесь завтра или продолжайте без ограничений с Plus.');
    const link=document.createElement('a');link.className='account-primary';link.href=guest&&reason!=='exam'?'/register':'/pricing';link.textContent=guest&&reason!=='exam'?(en?'Create an account':'Зарегистрироваться'):(en?'Compare plans':'Посмотреть тарифы');
    const close=document.createElement('button');close.className='tool-btn';close.textContent=reason==='welcome'?(en?'Try without an account':'Попробовать без регистрации'):(en?'Close':'Закрыть');close.onclick=()=>dialog.close();dialog.append(title,text,link,close);if(!dialog.open)dialog.showModal();
  }
};
// Full exam preparation remains a Plus feature; the verb trainer uses allowances below.
document.addEventListener('click',event=>{
 const el=event.target.closest('button,input,textarea');if(!el||Subscriptions.plan()!=='free')return;
 if(el.closest('#examRoot')&&(el.matches('textarea,input[type="checkbox"]')||['answer','complete','audio','phrase-audio','mock-next','mock-reset'].includes(el.dataset.exAction))){event.preventDefault();event.stopImmediatePropagation();Subscriptions.show('exam');}
},true);
document.addEventListener('focusin',event=>{if(event.target.matches('#examRoot textarea')&&Subscriptions.plan()==='free'){event.target.blur();Subscriptions.show('exam');}});
setInterval(()=>{if(typeof accountReady!=='undefined'&&accountReady)Subscriptions.refresh();},60000);
window.addEventListener('focus',()=>{if(typeof accountReady!=='undefined'&&accountReady)Subscriptions.refresh();});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&typeof accountReady!=='undefined'&&accountReady)Subscriptions.refresh();});
