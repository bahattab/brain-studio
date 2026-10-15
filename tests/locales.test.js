const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const folder=path.join(__dirname,'../app/locales');const catalog=JSON.parse(fs.readFileSync(path.join(folder,'catalog.json'),'utf8'));
const expected=['ar','zh','es','hi','fr','pt','ru','bn','ja','de','ur','id','ko','tr','it','fa','he','sw','vi','pa','mr','te','ta','th','gu','pl','uk','ms','ha'];
const placeholders=value=>[...value.matchAll(/\{(\w+)\}/g)].map(x=>x[1]).sort();
test('all twenty-nine translations cover the complete catalog with intact placeholders',()=>{for(const language of expected){const map=JSON.parse(fs.readFileSync(path.join(folder,language+'.json'),'utf8'));assert.deepEqual(Object.keys(map).sort(),Object.keys(catalog).sort(),language);for(const [key,value] of Object.entries(map)){assert.equal(typeof value,'string',language+': '+key);assert.ok(value.trim(),language+': '+key);assert.deepEqual(placeholders(value),placeholders(key),language+': '+key);assert.ok(!/\uFFFD|â€™|Â·/.test(value),language+': encoding '+key);}assert.notEqual(map['Get to know your thinking.'],catalog['Get to know your thinking.'],language);assert.notEqual(map['When starting an unfamiliar project, what helps you begin?'],catalog['When starting an unfamiliar project, what helps you begin?'],language);}});
test('locale changes preserve scores and choose correct document direction',()=>{const storage=new Map();const window={BrainCore:require('../app/core.js')};const document={documentElement:{},};const context={window,document,localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},Intl,console};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../app/translations.js'),'utf8'),context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../app/i18n.js'),'utf8'),context);const answers=Object.fromEntries(window.BrainCore.questions.map((q,i)=>[q.id,i%3]));const baseline=window.BrainCore.score(answers);for(const language of ['en',...expected]){window.I18n.setLanguage(language);assert.equal(document.documentElement.lang,language);assert.equal(document.documentElement.dir,['ar','ur','fa','he'].includes(language)?'rtl':'ltr');assert.deepEqual(window.BrainCoreLocalized.score(answers),baseline);assert.equal(window.BrainCoreLocalized.questions.length,20);const profile=window.BrainCoreLocalized.profile(baseline);assert.ok(profile.title);assert.ok(profile.tips.every(x=>typeof x==='string'));assert.equal(window.I18n.missing.size,0,language+': missing questionnaire/profile strings');}window.I18n.setLanguage('../../bad');assert.equal(window.I18n.language,'en');});

// Key coverage alone accepts English copies and cannot detect data-i18n-skip.
// Authored skills prose must have actual translated values in every locale.
test('all locales translate authored skills questions and explanations',()=>{
  const instrument=require('../app/workspace-core.js').instruments.find(d=>d.id==='skills-practice');
  for(const language of expected){
    const map=JSON.parse(fs.readFileSync(path.join(folder,language+'.json'),'utf8'));
    for(const item of instrument.items)for(const source of [item.prompt,item.explanation]){
      assert.ok(Object.hasOwn(map,source),language+': absent skills text '+source);
      assert.notEqual(map[source],source,language+': untranslated skills prose '+source);
    }
  }
});
