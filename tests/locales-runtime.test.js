const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function runtime(){
 const values={en:{'Choose a rating':'Choose a rating','Question {number}':'Question {number}','Report 360 ready':'Report 360 ready'},ar:{'Choose a rating':'اختر تقييماً','Question {number}':'السؤال {number}','Report 360 ready':'التقرير 360 جاهز'},fr:{'Choose a rating':'Choisissez une note','Question {number}':'Question {number}','Report 360 ready':'Rapport 360 prêt'}};
 const document={documentElement:{},createTreeWalker(root){let index=0;return {nextNode:()=>root.nodes[index++]||null};}};
 const window={BRAIN_TRANSLATIONS:values,BrainCore:{}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../app/i18n.js'),'utf8'),{window,document,Intl,NodeFilter:{SHOW_TEXT:4},localStorage:{getItem(){return null;},setItem(){}}});
 return window.I18n;
}
function element(tagName,skip=false,attrs={}){return {tagName,closest(){return skip?this:null;},hasAttribute:key=>Object.hasOwn(attrs,key),getAttribute:key=>attrs[key],setAttribute:(key,value)=>attrs[key]=value,attrs};}
function root(nodes,elements=[]){return {nodes,querySelectorAll(){return elements;}};}
test('unregistered dynamic UI prose including numbers is reported, missing locale keys fall back to English',()=>{
 const t=runtime();t.setLanguage('ar');
 assert.equal(t.t('Unregistered report 360'),'Unregistered report 360');
 assert.equal(t.translate('Unhandled summary 12'),'Unhandled summary 12');
 assert.ok(t.missing.has('ar:unregistered:Unregistered report 360'));
 assert.ok(t.missing.has('ar:unregistered:Unhandled summary 12'));
 assert.equal(t.translate('Report 360 ready'),'التقرير 360 جاهز');
 assert.equal(t.translate('السؤال ٢'),'السؤال ٢');assert.ok(!t.missing.has('ar:unregistered:السؤال ٢'));
 t.setLanguage('fr');assert.equal(t.translate('Question 2'),'Question 2');assert.equal(t.missing.size,0);
});
test('option labels translate while user content, source text and textarea contents stay unchanged',()=>{
 const t=runtime();t.setLanguage('ar');
 const option={parentElement:element('OPTION'),textContent:'Choose a rating'};
 const savedName={parentElement:element('OPTION',true),textContent:'Choose a rating'};
 const textarea={parentElement:element('TEXTAREA'),textContent:'Choose a rating'};
 const source={parentElement:element('SPAN',true),textContent:'Report 360 ready'};
 const dom=root([option,savedName,textarea,source]);t.translateDOM(dom);
 assert.equal(option.textContent,'اختر تقييماً');
 assert.equal(savedName.textContent,'Choose a rating');assert.equal(textarea.textContent,'Choose a rating');assert.equal(source.textContent,'Report 360 ready');
 t.setLanguage('fr');t.translateDOM(dom);assert.equal(option.textContent,'Choisissez une note');
 t.setLanguage('en');t.translateDOM(dom);assert.equal(option.textContent,'Choose a rating');
});
test('translation includes root attributes and respects explicit skip for attributes',()=>{
 const t=runtime();t.setLanguage('ar');
 const host=Object.assign(element('BUTTON',false,{'aria-label':'Choose a rating'}),root([]));host.matches=()=>true;
 const preserved=element('INPUT',true,{placeholder:'Choose a rating'});host.querySelectorAll=()=>[preserved];t.translateDOM(host);
 assert.equal(host.attrs['aria-label'],'اختر تقييماً');assert.equal(preserved.attrs.placeholder,'Choose a rating');
});

test('trailing structural separators translate their label without hiding missing English',()=>{
 const t=runtime();t.setLanguage('ar');
 assert.equal(t.translate('Choose a rating ·'),'اختر تقييماً ·');
 assert.equal(t.translate('اختر تقييماً /'),'اختر تقييماً /');
 assert.equal(t.missing.size,0);
 t.translate('Unhandled observer 360 ·');
 assert.ok(t.missing.has('ar:unregistered:Unhandled observer 360'));
});
