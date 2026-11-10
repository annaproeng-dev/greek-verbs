const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base=process.env.ACCESS_TEST_URL||'http://localhost:8012';
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
 const context=await browser.newContext({viewport:{width:390,height:844}});
 const errors=[];const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 const ready=async()=>{await page.waitForFunction(()=>typeof accountReady!=='undefined'&&accountReady&&!document.querySelector('.wrap').inert&&Subscriptions.access);};
 const idle=()=>page.waitForFunction(()=>!Subscriptions.busy);
 await page.goto(base);await ready();
 await page.locator('#onboardingDialog[open]').waitFor();
 await page.locator('#onboardingDialog button').filter({hasText:'Пропустить / Skip'}).click();
 await page.locator('#subscriptionGate[open]').waitFor();
 assert.match(await page.locator('#subscriptionGate').innerText(),/10/);
 await page.locator('#subscriptionGate button').click();
 await page.evaluate(()=>switchSection('flashcards'));
 for(let i=0;i<3;i++){
   await page.locator('#fcShowBtn').click();await idle();
   assert(await page.locator('#fcCard').evaluate(e=>e.classList.contains('revealed')));
   // Reopening the current card costs no second allowance.
   await page.evaluate(()=>{fcHide();fcShow();});await idle();
   assert.equal(await page.evaluate(()=>Subscriptions.access.introRemaining.cards),2-i);
   await page.locator('#fcNextBtn').click();
 }
 await page.locator('#fcShowBtn').click();await idle();
 assert(await page.locator('#subscriptionGate').evaluate(e=>e.open));
 assert(!(await page.locator('#fcCard').evaluate(e=>e.classList.contains('revealed'))));
 await page.locator('#subscriptionGate button').click();
 await page.reload();await ready();
 assert.equal(await page.evaluate(()=>Subscriptions.access.introRemaining.cards),0);
 assert(!(await page.locator('#onboardingDialog').evaluate(e=>e.open)));
 await page.evaluate(()=>{switchSection('practice');switchExercise('quiz');});
 for(let i=0;i<3;i++){
  await page.locator('#qOpts button').first().click();await idle();
  assert.equal(await page.evaluate(()=>Subscriptions.access.introRemaining.quiz),2-i);
  await page.locator('#qNext').click();
 }
 await page.locator('#qOpts button').first().click();await idle();
 assert(await page.locator('#subscriptionGate').evaluate(e=>e.open));
 await page.locator('#subscriptionGate button').click();
 // Actual signup obtains an independent account bonus and daily pool.
 await page.goto(base+'/register');await ready();
 await page.fill('#authEmail',`browser-${Date.now()}@example.test`);
 await page.fill('#authPassword','test-password-123');await page.fill('#authConfirm','test-password-123');
 await page.check('#acceptTerms');await page.click('#authSubmit');
 await page.waitForFunction(()=>currentUser&&Subscriptions.access?.owner==='user:'+currentUser.id);
 await page.waitForFunction(()=>!authBusy);
 await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());appStorage.setItem(onboardingStorageKey(),'done');});
 assert.equal(await page.evaluate(()=>Subscriptions.access.introRemaining.quiz),3);
 assert.equal(await page.evaluate(()=>Subscriptions.access.dailyRemaining),10);
 await page.evaluate(()=>{switchSection('practice');switchExercise('quiz');});
 for(let i=0;i<4;i++){
  await page.locator('#qOpts button').first().click();await idle();
  await page.locator('#qNext').click();
 }
 assert.equal(await page.evaluate(()=>Subscriptions.access.introRemaining.quiz),0);
 assert.equal(await page.evaluate(()=>Subscriptions.access.dailyRemaining),9);
 await page.evaluate(()=>switchSection('phrases'));
 await page.locator('#phrasesTbody button').first().click();await idle();
 assert.equal(await page.evaluate(()=>Subscriptions.access.introRemaining.phrases),2);
 await page.locator('#phrasesTbody .audio-btn').first().click();
 assert.equal(await page.evaluate(()=>Subscriptions.access.introRemaining.phrases),2);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:'output/free-access-mobile.png',fullPage:true});
 // Independent guest verifies each of the other exercise entry points at its boundary.
 const trial=await browser.newContext();
 await trial.addInitScript(()=>localStorage.setItem('greekOnboarding:guest','done'));
 const other=await trial.newPage();other.on('pageerror',e=>errors.push(e.message));
 await other.goto(base);await other.waitForFunction(()=>typeof accountReady!=='undefined'&&accountReady&&Subscriptions.access);
 for(const [format,type,opts,next] of [['tense','tense','tOpts','tNext'],['conj','conj','cjOpts','cjNext'],['change','change','ctOpts','ctNext']]){
   await other.evaluate(type=>{switchSection('practice');switchExercise(type);},type);
   for(let i=0;i<3;i++){await other.locator('#'+opts+' button').first().click();await other.waitForFunction(()=>!Subscriptions.busy);await other.locator('#'+next).click();}
   await other.locator('#'+opts+' button').first().click();await other.waitForFunction(()=>!Subscriptions.busy);
   assert(await other.locator('#subscriptionGate').evaluate(e=>e.open),format);
   await other.locator('#subscriptionGate button').click();
 }
 await other.evaluate(()=>{switchExercise('fill');});
 for(let i=0;i<4;i++){
   await other.locator('#fillInput').fill(await other.evaluate(()=>fDeck[fIdx].answer));
   await other.locator('#fillCheck').click();await other.waitForFunction(()=>!Subscriptions.busy);
   if(i<3)await other.evaluate(()=>{cancelAutoAdvance();nextFill();});
 }
 assert(await other.locator('#subscriptionGate').evaluate(e=>e.open));await other.locator('#subscriptionGate button').click();
 await other.evaluate(()=>{switchExercise('situation');setSituationMode('type');});
 for(let i=0;i<4;i++){
   const answers=await other.evaluate(()=>situationAnswers(situationDeck[situationIdx]));
   for(let j=0;j<answers.length;j++)await other.locator('.situation-inline-input').nth(j).fill(answers[j]);
   await other.locator('#situationCheck').click();await other.waitForFunction(()=>!Subscriptions.busy);
   if(i<3)await other.locator('#situationNext').click();
 }
 assert(await other.locator('#subscriptionGate').evaluate(e=>e.open));await other.locator('#subscriptionGate button').click();
 await other.evaluate(()=>switchExercise('match'));
 for(let i=0;i<4;i++){
   const left=other.locator('#matchLeft .match-item:not(.matched)').first();const key=await left.getAttribute('data-key');
   await left.click();await other.locator(`#matchRight [data-key="${key}"]`).click();await other.waitForFunction(()=>!Subscriptions.busy);
 }
 assert(await other.locator('#subscriptionGate').evaluate(e=>e.open));await other.locator('#subscriptionGate button').click();
 await other.evaluate(()=>switchSection('phrases'));
 for(let i=0;i<4;i++){await other.locator('#phrasesTbody .tool-btn').first().click();await other.waitForFunction(()=>!Subscriptions.busy);}
 assert(await other.locator('#subscriptionGate').evaluate(e=>e.open));
 await trial.close();
 assert.deepEqual(errors,[]);
 console.log('PASS: Hermes/skip, guest limits, free retries, reload persistence, real signup bonus, shared daily pool, phrases, mobile layout.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
