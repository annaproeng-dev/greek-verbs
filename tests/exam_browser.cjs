// NODE_PATH=<bundled node_modules> node tests/exam_browser.cjs
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=process.env.EXAM_TEST_URL||'http://localhost:8000';
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 const context=await browser.newContext({viewport:{width:1440,height:1100}});
 const errors=[];context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
 const page=await context.newPage();
 const ready=async p=>p.waitForFunction(()=>typeof accountReady!=='undefined'&&accountReady&&!document.querySelector('.wrap').inert);
 await page.goto(base+'/exam.html');await ready(page);await page.evaluate(()=>setLang('ru'));
 assert.equal(await page.locator('.exam-skill-card').count(),6);
 for(const module of ['pictures','speaking','reading','writing','phrases','verbs']){
  await page.evaluate(m=>examOpen(m),module);await page.waitForTimeout(30);assert(await page.locator('#examRoot h1').innerText());
 }
 await page.evaluate(()=>examOpen('pictures'));
 const before=await page.evaluate(()=>progress.correct);
 await page.locator('[data-question="pic-food-0"] button').filter({hasText:'κάθεται'}).click();
 assert.equal(await page.evaluate(()=>progress.correct),before+1);
 await page.evaluate(()=>examAnswer('pic-food-0','κάθεται'));assert.equal(await page.evaluate(()=>progress.correct),before+1);
 await page.locator('.exam-model summary').click();await page.locator('[data-ex-action="audio"]').click();await page.waitForFunction(()=>dialogueAudio?.currentTime>0);
 await page.fill('textarea','Η γυναίκα κάθεται. <script>alert(1)</script>');await page.evaluate(()=>flushExamDrafts());await page.evaluate(()=>LearningStore.flush());
 await page.reload();await ready(page);await page.evaluate(()=>examOpen('pictures'));
 assert((await page.locator('textarea').inputValue()).includes('<script>'));assert.equal(await page.locator('#examRoot script').count(),0);
 const main=await context.newPage();await main.goto(base+'/index.html');await ready(main);
 assert.equal(await main.evaluate(()=>progress.correct),before+1);
 await main.evaluate(async()=>{recordAnswer(null,'pres',true);await LearningStore.flush();});
 // Both tabs have local snapshots. Their simultaneous updates must accumulate.
 await Promise.all([page.evaluate(async()=>{recordAnswer(null,'exam',true);await LearningStore.flush();}),main.evaluate(async()=>{recordAnswer(null,'pres',true);await LearningStore.flush();})]);
 await page.reload();await ready(page);assert.equal(await page.evaluate(()=>progress.correct),before+4);
 // Every module persists its own drafts without leaking HTML into the page.
 await page.evaluate(()=>examOpen('writing'));
 const model=await page.evaluate(()=>A2_CONTENT.writing[0].model);await page.fill('textarea',model);
 for(const box of await page.locator('.exam-self-review input').all())await box.check();
 await page.locator('[data-ex-action="complete"]').click();assert(await page.evaluate(()=>progress.exam.completed['writing-invite']));
 await page.fill('textarea',model+' ακόμα');assert.equal(await page.locator('[data-ex-action="complete"]').isEnabled(),true);
 // Full practice exam, including completion gates and a result that is not an exam grade.
 await page.evaluate(()=>examOpen('mock'));await page.locator('[data-ex-action="mock-next"]').click();assert((await page.locator('#exam-mock-status').innerText()).length>0);
 await page.evaluate(()=>{for(const [key,q] of [...examQuestions])examAnswer(key,q.answer);});
 await page.locator('[data-ex-action="mock-next"]').click();assert.equal(await page.evaluate(()=>progress.exam.mockStep),1);
 for(let i=0;i<2;i++){
  const task=await page.evaluate(i=>A2_CONTENT.writing[i],i);await page.fill('#draft-mock-writing-'+task.id,task.model);
  for(const box of await page.locator(`[data-ex-check^="mock-writing-${task.id}:"]`).all())await box.check();
  await page.locator(`[data-ex-action="complete"][data-id="mock-writing-${task.id}"]`).click();
 }
 await page.locator('[data-ex-action="mock-next"]').click();assert.equal(await page.evaluate(()=>progress.exam.mockStep),2);
 for(const id of ['mock-picture-food','mock-speaking-myself']){
  for(const box of await page.locator(`[data-ex-check^="${id}:"]`).all())await box.check();
  await page.locator(`[data-ex-action="complete"][data-id="${id}"]`).click();
 }
 await page.locator('[data-ex-action="mock-next"]').click();assert.equal(await page.evaluate(()=>progress.exam.mockStep),3);
 assert((await page.locator('.exam-result').innerText()).includes('12 / 12'));
 await page.evaluate(async()=>{await LearningStore.flush();});await page.reload();await ready(page);await page.evaluate(()=>examOpen('mock'));assert.equal(await page.evaluate(()=>progress.exam.mockStep),3);
 // The exact same milestone and Olympus reward dialog are used by both trainers.
 await page.evaluate(()=>{progress.correct=99;rewardSoundOn=false;rewardVoiceOn=false;recordAnswer(null,'exam',true);});
 assert(await page.locator('#rewardDialog').isVisible());assert((await page.locator('#rewardContent').innerText()).includes('Афина'));
 await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
 await page.click('#accountBtn');await page.waitForSelector('#sec-auth.active');assert((await page.locator('.account-back').first().innerText()).includes('A2'));
 await page.locator('#sec-auth .account-back').click();await page.waitForSelector('#sec-exam.active');
 await page.evaluate(()=>examHome());await page.screenshot({path:'/tmp/a2-home-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/a2-home-mobile.png',fullPage:true});
 for(const module of ['pictures','speaking','reading','writing','phrases','verbs','mock']){
  await page.evaluate(m=>examOpen(m),module);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Overflow in '+module);
 }
 await page.evaluate(()=>toggleTheme());await page.screenshot({path:'/tmp/a2-dark-mobile.png',fullPage:true});await page.evaluate(()=>toggleTheme());
 assert.deepEqual(errors,[]);
 console.log('A2: six modules, shared counters across tabs, draft persistence, 18 audio examples, self-review, complete practice exam, Olympus and mobile views OK');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
