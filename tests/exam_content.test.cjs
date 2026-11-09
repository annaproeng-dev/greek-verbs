const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const context=vm.createContext({fs,assert,console});
vm.runInContext(fs.readFileSync('exam-data.js','utf8'),context);
vm.runInContext(`
  for(const picture of A2_CONTENT.pictures){
    assert.ok(fs.existsSync(picture.image));
    for(const q of picture.quiz){assert.ok(q.options.includes(q.answer));assert.equal(new Set(q.options).size,q.options.length);}
  }
  assert.deepEqual(A2_CONTENT.readings.map(pack=>pack.kind),['tf','choice','match','gaps']);
  for(const pack of A2_CONTENT.readings){assert.equal(pack.questions.length,6);for(const q of pack.questions)assert.ok(q.options.includes(q.answer));}
  for(const task of A2_CONTENT.writing){
    const count=(task.model.match(/[\\p{L}\\p{N}]+(?:[’'ʼ-][\\p{L}\\p{N}]+)*/gu)||[]).length;
    assert.ok(count>=80&&count<=100,task.id+': '+count);
    assert.equal(task.points.length,3);
  }
  for(const kind of ['pictures','speaking','writing'])for(const item of A2_CONTENT[kind]){
    const path='assets/exam-audio/'+kind+'-'+item.id+'.mp3';
    assert.ok(fs.statSync(path).size>1000,path);
  }
  console.log('A2 content: answer keys, four reading formats, 80–100-word models, pictures and 18 recordings OK');
`,context);
