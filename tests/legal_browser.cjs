// NODE_PATH=<node_modules> LEGAL_TEST_URL=http://localhost:8785 node tests/legal_browser.cjs
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const base=process.env.LEGAL_TEST_URL||'http://localhost:8000';
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/');
  await page.waitForFunction(()=>typeof accountReady!=='undefined'&&accountReady);
  await page.evaluate(()=>SiteLegal.ready);
  await page.locator('.storage-notice').waitFor();
  assert(await page.locator('[data-footer-section=documents] a').count()===2);
  await page.locator('.storage-notice button').click();
  await page.reload();await page.waitForFunction(()=>accountReady);
  assert(await page.locator('.storage-notice').isHidden());
  await page.locator('.legal-footer button').click();assert(await page.locator('.storage-notice').isVisible());
  await page.locator('.storage-notice button').click();
  await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());location.hash='register';});
  await page.waitForSelector('#sec-auth.active');
  assert(await page.locator('#legalAcceptance').isVisible());
  assert(!await page.locator('#acceptTerms').isChecked());
  const email='legal-browser-'+Date.now()+'@example.test',password='browser-password-123';
  await page.fill('#authEmail',email);await page.fill('#authPassword',password);await page.fill('#authConfirm',password);
  await page.locator('#authSubmit').click();assert(!await page.evaluate(()=>!!currentUser));
  await page.locator('#acceptTerms').check();await page.locator('#authSubmit').click();
  await page.waitForFunction(()=>currentUser?.legal?.accepted===true&&!authBusy);
  await page.waitForSelector('#onboardingDialog[open]');
  await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());location.hash='profile';});
  await page.waitForSelector('#sec-profile.active');
  assert(await page.locator('.account-privacy').isVisible());
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const stale=await context.newPage();await stale.goto(base+'/exam.html');await stale.waitForFunction(()=>accountReady);
  await page.evaluate(async()=>{recordAnswer(null,'pres',true);await LearningStore.flush();});
  await stale.reload();await stale.waitForFunction(()=>accountReady);
  await page.locator('[data-privacy-action=clear_local]').click();
  await page.locator('.privacy-dialog [type="submit"]').click();
  await page.waitForFunction(()=>!authBusy);
  assert.equal(await page.evaluate(()=>progress.correct),0);
  const rejected=await stale.evaluate(async()=>{recordAnswer(null,'pres',true);try{await LearningStore.flush();return null;}catch(e){return e.message;}});
  assert.equal(rejected,'storage_reset');
  await stale.reload();await stale.waitForFunction(()=>accountReady);
  assert.equal(await stale.evaluate(()=>progress.correct),0);
  await page.locator('[data-privacy-action=export_data]').click();
  await page.locator('.privacy-dialog input').fill(password);
  const download=page.waitForEvent('download');await page.locator('.privacy-dialog [type="submit"]').click();
  const file=await download;const fs=require('node:fs');const data=JSON.parse(fs.readFileSync(await file.path(),'utf8'));
  assert.equal(data.account.email,email);assert.equal(data.legalAcceptances.length,1);
  assert(!JSON.stringify(data).includes('password_hash'));
  await page.locator('[data-privacy-action=delete_account]').click();
  await page.locator('.privacy-dialog input').fill(password);await page.locator('.privacy-dialog [type="submit"]').click();
  await page.waitForFunction(()=>currentUser===null&&!authBusy);
  await stale.bringToFront();await stale.waitForFunction(()=>currentUser===null,{},{timeout:10000}).catch(async e=>{console.error('STALE STATE',await stale.evaluate(()=>({currentUser,authBusy,checkingSession,accountReady,notice:document.getElementById('learningNotice').textContent})));throw e;});
  assert.deepEqual(errors,[]);
  // Language-specific documents and headers are available without JavaScript rendering.
  for(const path of ['/privacy.en.html','/terms.en.html','/privacy.html','/terms.html']){
   const response=await context.request.get(base+path);assert(response.ok());assert((await response.text()).includes('<h1>'));
  }
  // Storage denial must not prevent reading documents or dismissing the notice.
  const denied=await browser.newContext();await denied.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw Error('blocked');}});});
  const legal=await denied.newPage();await legal.goto(base+'/privacy.en.html');await legal.locator('.storage-notice').waitFor();await legal.locator('.storage-notice button').click();
  assert(await legal.locator('.storage-notice').isHidden());
  assert((await legal.locator('[role="status"]').innerText()).includes('could not save'));
  console.log('Legal browser: notice persistence/reopen, unchecked registration, server acceptance, export/delete, cross-tab logout, mobile and blocked storage OK');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
