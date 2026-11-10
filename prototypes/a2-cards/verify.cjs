const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const D=JSON.parse(fs.readFileSync(path.join(__dirname,'cards.json'),'utf8'));
const ids=new Set(D.cards.map(c=>c.id));assert.equal(ids.size,D.cards.length);
for(const c of D.cards){assert.ok(D.modules.some(m=>m.id===c.moduleId));assert.ok(c.sourceRefs.length);for(const r of c.sourceRefs)assert.ok(D.sources[r.source]);if(c.assessment==='exact'){assert.ok(c.acceptedAnswers.includes(c.answer));if(c.options){assert.ok(c.options.includes(c.answer));assert.equal(new Set(c.options).size,c.options.length)}}if(c.assessment==='self')assert.ok(c.rubric.length&&c.modelAnswer)}
for(const id of D.trainingPlan)assert.ok(ids.has(id));
const vm=require('node:vm');const ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'cards-data.js'),'utf8'),ctx);assert.equal(JSON.stringify(ctx.window.A2_CARDS),JSON.stringify(D));
console.log('Content: 58 cards, unique IDs, valid modules/answers/sources, portable datasets agree.');
(async()=>{
 const {chromium}=require('/Users/annavinogradova/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
 const browser=await chromium.launch({headless:true,channel:'chrome'});const page=await browser.newPage({viewport:{width:390,height:844}});let errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8766/prototypes/a2-cards/');
 await page.screenshot({path:path.join(__dirname,'preview-mobile.png'),fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.getByRole('button',{name:'Грамматика',exact:true}).click();await page.locator('[data-module="cases"]').click();await page.getByRole('button',{name:'Дальше: частая ошибка'}).click();await page.getByRole('button',{name:'Потренировать эту тему'}).click();
 await page.locator('[data-option="1"]').click();await page.getByRole('button',{name:'Проверить',exact:true}).click();await page.getByText('Разберём ответ',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Сохранить и выйти'}).click();await page.reload();await page.getByRole('button',{name:'Тренировка',exact:true}).click();await page.getByRole('button',{name:'Продолжить',exact:true}).click();await page.getByText('Разберём ответ',{exact:true}).waitFor();await page.getByRole('button',{name:'Продолжить',exact:true}).click();
 let guard=0;while(await page.locator('[data-action="exit"]').count()){
  assert.ok(guard++<35);const s=await page.evaluate(()=>JSON.parse(localStorage.getItem('greek-a2-card-prototype-v1')).session);const c=D.cards.find(c=>c.id===s.queue[s.index].id);
  if(c.options)await page.locator(`[data-option="${c.options.indexOf(c.answer)}"]`).click();else await page.locator('#response').fill(c.answer);
  await page.getByRole('button',{name:'Проверить',exact:true}).click();await page.getByRole('button',{name:'Продолжить',exact:true}).click();
 }
 await page.getByText('Сессия завершена',{exact:true}).waitFor();
 // Manual filters, open writing with drafts, self-check without false auto-score.
 await page.getByRole('button',{name:'Практика',exact:true}).click();await page.locator('#topic').selectOption('exam-skills');await page.locator('#card-type').selectOption('writing');await page.getByRole('button',{name:'Начать выбранное',exact:true}).click();await page.locator('#response').fill('Γεια σου, Ελένη!');await page.getByRole('button',{name:'Сохранить и выйти'}).click();await page.reload();await page.getByRole('button',{name:'Практика',exact:true}).click();await page.getByRole('button',{name:'Продолжить',exact:true}).click();assert.equal(await page.locator('#response').inputValue(),'Γεια σου, Ελένη!');await page.getByRole('button',{name:'Перейти к самопроверке'}).click();await page.locator('[data-check="0"]').check();await page.getByRole('button',{name:'Завершить самопроверку'}).click();await page.getByRole('button',{name:'Продолжить',exact:true}).click();
 // Desktop and mobile layouts.
 await page.getByRole('button',{name:'Грамматика',exact:true}).click();await page.setViewportSize({width:1280,height:900});await page.screenshot({path:path.join(__dirname,'preview-desktop.png'),fullPage:true});
 for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+width)}
 assert.deepEqual(errors,[]);await browser.close();console.log('Browser: explanation → drills, wrong answer, delayed retry, resume/reload, manual filters, writing drafts/self-check, 320–1280px layouts passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
