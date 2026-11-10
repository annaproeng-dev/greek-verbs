/* The API owns grants; browser checks provide the demo experience, not content secrecy. */
window.Subscriptions={
  plan(subscription=typeof currentUser==='undefined'?null:currentUser?.subscription){return subscription?.expiresAt*1000>Date.now()&&['plus','pro'].includes(subscription.plan)?subscription.plan:'free';},
  label(subscription){const plan=this.plan(subscription);return (plan==='free'?(typeof lang!=='undefined'&&lang==='en'?'Free · Demo':'Бесплатный · Демо'):plan==='plus'?'Plus':'Pro')+(plan!=='free'?' · '+new Date(subscription.expiresAt*1000).toLocaleString(typeof lang!=='undefined'&&lang==='en'?'en-GB':'ru-RU'):'');},
  render(){const el=document.getElementById('profileSubscription');if(!el)return;el.replaceChildren();const title=document.createElement('strong');title.textContent=this.label(typeof currentUser==='undefined'?null:currentUser?.subscription);const link=document.createElement('a');link.href='/pricing';link.textContent=typeof lang!=='undefined'&&lang==='en'?'Compare plans →':'Сравнить тарифы →';el.append(title,link);},
  require(){if(this.plan()!=='free')return true;this.show();return false;},
  show(){let dialog=document.getElementById('subscriptionGate');if(!dialog){dialog=document.createElement('dialog');dialog.id='subscriptionGate';dialog.className='verb-dialog';const en=typeof lang!=='undefined'&&lang==='en';const title=document.createElement('h2');title.textContent=en?'Continue with Plus':'Продолжите с Plus';const text=document.createElement('p');text.textContent=en?'Free is a demo: explore every section. Plus unlocks practice and A2 preparation.':'Бесплатный тариф — демо: знакомьтесь со всеми разделами. Для тренировок и подготовки к A2 нужен Plus или Pro.';const link=document.createElement('a');link.className='account-primary';link.href='/pricing';link.textContent=en?'Compare plans':'Посмотреть тарифы';const close=document.createElement('button');close.className='tool-btn';close.textContent=en?'Keep exploring':'Продолжить знакомство';close.onclick=()=>dialog.close();dialog.append(title,text,link,close);document.body.append(dialog);}if(!dialog.open)dialog.showModal();}
};
document.addEventListener('click',event=>{
 const el=event.target.closest('button,input,textarea');if(!el||Subscriptions.plan()!=='free')return;
 const practice=el.closest('#sec-practice')&&!el.closest('#practiceSetup')&&!el.closest('.sub-tabs');
 const exam=el.closest('#examRoot')&&(el.matches('textarea,input[type="checkbox"]')||['answer','complete','audio','phrase-audio','mock-next'].includes(el.dataset.exAction));
 const cards=el.closest('#sec-flashcards')&&el.matches('button');
 if(practice||exam||cards){event.preventDefault();event.stopImmediatePropagation();Subscriptions.show();}
},true);
document.addEventListener('focusin',event=>{if(event.target.matches('#examRoot textarea')&&Subscriptions.plan()==='free'){event.target.blur();Subscriptions.show();}});
setInterval(()=>Subscriptions.render(),30000);

window.addEventListener('focus',async()=>{
 if(typeof currentUser==='undefined'||!currentUser)return;
 try{const response=await fetch('/api/auth',{credentials:'same-origin',cache:'no-store'});if(!response.ok)return;const result=await response.json();if(result.user?.id===currentUser.id){currentUser.subscription=result.user.subscription;Subscriptions.render();}}catch{}
});
