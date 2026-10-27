'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {chromium}=require('playwright');
const {buildWeb}=require('../../scripts/platform/build-web.cjs');
const W=require('../../app/workspace-core.js'),R=require('../../app/research-core.js');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
async function setup(t){
  const built=buildWeb({root,output:fs.mkdtempSync(path.join(os.tmpdir(),'brain-professional-'))});
  const server=http.createServer((req,res)=>{const p=path.resolve(built.output,decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html');if(!p.startsWith(built.output+path.sep)){res.writeHead(403);res.end();return;}try{res.setHeader('content-type',({'.js':'application/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json'})[path.extname(p)]||'application/octet-stream');res.end(fs.readFileSync(p));}catch{res.writeHead(404);res.end();}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>{server.close();server.closeAllConnections();});
  const browser=await chromium.launch({headless:true,channel:process.env.PLATFORM_BROWSER_CHANNEL||(process.platform==='win32'?'msedge':undefined)});t.after(()=>browser.close());
  const context=await browser.newContext({viewport:{width:1360,height:900}});const page=await context.newPage(),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  return {page,errors,browser};
}
const C=require('../../app/imported-core.js');
function fixture(type='group-sum'){
 const groups=Array.from({length:6},(_,i)=>({id:'group-'+i,title:'مجموعة '+i}));
 return {version:1,id:'synthetic-'+type,title:'استبيان تجريبي',language:'ar',sourceHash:'a'.repeat(64),scoring:type==='group-sum'?{type,groups,min:1,max:10}:{type},sections:[{id:'section-one',title:'قسم تجريبي',instructions:'تعليمات تجريبية',items:Array.from({length:type==='group-sum'?30:2},(_,i)=>({id:'item-'+i,prompt:'سؤال تجريبي '+i,...(type==='group-sum'?{scaleId:groups[Math.floor(i/5)].id}:{}),options:type==='group-sum'?Array.from({length:10},(_,n)=>({value:String(n+1),label:String(n+1)})):[{value:'yes',label:'نعم'},{value:'no',label:'لا'}]}))}]};
}
async function upload(page,pkg){await page.locator('#questionnaire-file').evaluate(input=>{const handler=input.onchange;window.syntheticUploadComplete=false;input.onchange=async event=>{try{await handler(event);}finally{window.syntheticUploadComplete=true;}};});await page.locator('#questionnaire-file').setInputFiles({name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(typeof pkg==='string'?pkg:JSON.stringify(pkg))});await page.waitForFunction(()=>window.syntheticUploadComplete===true);}
async function captureExport(page){await page.evaluate(()=>{window.desktop={...window.desktop,exportJSON:async payload=>{window.syntheticExport=JSON.parse(JSON.stringify(payload));return {downloadRequested:true};}};});await page.locator('#imported-export').click();return page.evaluate(()=>window.syntheticExport);}

test('imported group sums answer thirty items, preserve source direction and persist exact report',{timeout:120000},async t=>{
 const {page,errors}=await setup(t),pkg=fixture();
 await page.locator('[data-route="imported"]').click();await upload(page,pkg);await page.locator('#imported-prompt').waitFor();
 assert.equal(await page.locator('#imported-prompt span').getAttribute('dir'),'rtl');
 for(const language of ['ar','en']){await page.selectOption('#language',language);assert.equal(await page.locator('html').getAttribute('dir'),language==='ar'?'rtl':'ltr');assert.equal(await page.locator('#imported-prompt').innerText(),pkg.sections[0].items[0].prompt);}
 const name='<img src=x onerror="window.importedInjection=true">';await page.locator('#imported-name').fill(name);
 await page.locator('#imported-result').click();assert.match(await page.locator('#content').innerText(),/This report is incomplete/);
 const partial=await captureExport(page);assert.equal(partial.result.complete,false);assert.equal(partial.result.answered,0);assert(partial.result.groups.every(g=>g.mean===null&&g.sum===0&&g.count===0));
 assert.equal(await page.locator('#content img').count(),0);assert.equal(await page.evaluate(()=>window.importedInjection),undefined);
 await page.locator('#imported-back').click();
 for(let i=0;i<30;i++){await page.locator('[data-imported-choice="9"]').click();if(i<29)await page.locator('#imported-next').click();}
 await page.locator('#imported-result').click();assert.match(await page.locator('#content').innerText(),/All questions answered/);
 assert.equal(await page.locator('.comparison-row').count(),6);for(const row of await page.locator('.comparison-row').allTextContents()){assert.match(row,/Raw sum: 50/);assert.match(row,/Answered: 5 \/ 5/);assert.match(row,/Mean: 10/);}
 const expectedAnswers=Object.fromEntries(pkg.sections[0].items.map(item=>[item.id,'10']));
 const exported=await captureExport(page);assert.equal(exported.version,2);assert.equal(exported.name,name);assert.deepEqual(exported.answers,expectedAnswers);assert.deepEqual(exported.session.answers,expectedAnswers);assert.equal(exported.session.name,name);assert.equal(exported.session.attribution,'confirmed');assert.deepEqual(exported.questionnaire,C.validatePackage(pkg));assert.deepEqual(exported.result,C.score(pkg,expectedAnswers));assert(exported.session.id);
 await page.reload();await page.locator('[data-route="imported"]').click();await page.locator('[data-imported-report="0"]').click();assert.deepEqual(await captureExport(page),exported);
 assert.equal(await page.locator('#content img').count(),0);assert.deepEqual(errors,[]);
});

test('unscored imports never fabricate scores and invalid or conflicting packages are rejected',{timeout:120000},async t=>{
 const {page,errors}=await setup(t),pkg=fixture('unscored');await page.locator('[data-route="imported"]').click();
 await upload(page,'{bad json');assert.match(await page.locator('#toast').innerText(),/invalid or conflicts/);assert.equal(await page.locator('[data-imported-open]').count(),0);
 const malicious=structuredClone(pkg);malicious.title='<img src=x onerror="window.importedInjection=true">';await upload(page,malicious);assert.match(await page.locator('#toast').innerText(),/invalid or conflicts/);assert.equal(await page.locator('#content img').count(),0);assert.equal(await page.locator('[data-imported-open]').count(),0);
 await upload(page,pkg);await page.locator('#imported-prompt').waitFor();await page.locator('[data-imported-choice="0"]').click();await page.locator('#imported-result').click();
 assert.match(await page.locator('#content').innerText(),/No verified scoring key/);assert.equal(await page.locator('.comparison-table').count(),0);
 const first=await captureExport(page);assert.equal(first.result.complete,false);assert.equal(first.result.answered,1);assert.equal(Object.hasOwn(first.result,'groups'),false);
 await page.locator('#imported-back').click();await page.locator('#imported-next').click();await page.locator('[data-imported-choice="1"]').click();await page.locator('#imported-result').click();const complete=await captureExport(page);assert.equal(complete.result.complete,true);assert.equal(Object.hasOwn(complete.result,'groups'),false);
 await page.locator('#imported-home').click();const changed=structuredClone(pkg);changed.sections[0].items[0].prompt='Changed synthetic wording';await upload(page,changed);assert.match(await page.locator('#toast').innerText(),/These imported answers conflict/);assert.equal(await page.locator('[data-imported-open]').count(),1);
 await page.locator('[data-imported-report="0"]').click();assert.deepEqual(await captureExport(page),complete);
 assert.equal(await page.evaluate(()=>window.importedInjection),undefined);assert.deepEqual(errors,[]);
});

function experimentalFixture(){
 const pkg=fixture('unscored');pkg.id='synthetic-experimental';
 pkg.sections[0].items[0]={id:'multi-item',prompt:'اختر ثلاثة خيارات تجريبية',responseMode:'multiple',minSelections:3,maxSelections:3,options:Array.from({length:16},(_,i)=>({value:'v'+i,label:'خيار '+i}))};
 pkg.scoring={type:'experimental',notice:'تحليل تجريبي مستقل غير معتمد',scales:[{id:'scale-a',title:'مقياس تجريبي',description:'وصف تجريبي مستقل',kind:'reflection'}],keys:[{itemId:'multi-item',scaleId:'scale-a',values:Object.fromEntries(Array.from({length:16},(_,i)=>['v'+i,i===0?1:0])),rationale:'مبرر تجريبي للاختيار المتعدد'},{itemId:'item-1',scaleId:'scale-a',values:{yes:1,no:0},rationale:'مبرر تجريبي للاختيار الفردي'}]};return pkg;
}

test('experimental multiple responses require three selections, retain zero scores and localize all thirty interfaces',{timeout:180000},async t=>{
 const {page,errors}=await setup(t),pkg=experimentalFixture();
 await page.locator('[data-route="imported"]').click();await upload(page,pkg);await page.locator('#imported-prompt').waitFor();
 await page.locator('[data-imported-choice="1"]').click();await page.locator('[data-imported-choice="2"]').click();await page.locator('#imported-result').click();
 const partial=await captureExport(page);assert.equal(partial.result.answered,0);assert.equal(partial.result.complete,false);assert.equal(partial.result.groups[0].count,0);assert.equal(partial.result.groups[0].sum,0);assert.equal(partial.result.groups[0].mean,null);assert.deepEqual(partial.result.reviews,[]);
 await page.locator('#imported-back').click();await page.locator('[data-imported-choice="3"]').click();assert.equal(await page.locator('[data-imported-choice]:disabled').count(),13);assert.equal(await page.locator('[data-imported-choice="1"]').isEnabled(),true);
 await page.reload();await page.locator('[data-route="imported"]').click();await page.locator('[data-imported-open="0"]').click();assert.equal(await page.locator('[data-imported-choice][aria-pressed="true"]').count(),3);
 for(const choice of [1,2,3])assert.equal(await page.locator(`[data-imported-choice="${choice}"]`).getAttribute('aria-pressed'),'true');
 await page.locator('#imported-next').click();await page.locator('[data-imported-choice="1"]').click();await page.locator('#imported-result').click();
 const complete=await captureExport(page);assert.equal(complete.result.experimental,true);assert.equal(complete.result.complete,true);assert.equal(complete.result.groups[0].sum,0);assert.equal(complete.result.groups[0].mean,0);assert.equal(complete.result.groups[0].count,2);assert.equal(complete.result.reviews.length,2);assert(complete.result.reviews.every(r=>r.value===0));assert.deepEqual(complete.answers,{'multi-item':['v1','v2','v3'],'item-1':'no'});
 await page.locator('details').first().evaluate(node=>node.open=true);assert((await page.locator('details').first().innerText()).includes(pkg.scoring.keys[0].rationale));assert((await page.locator('details').first().innerText()).includes(pkg.scoring.keys[1].rationale));
 for(const language of await page.evaluate(()=>I18n.languages.map(l=>l.code))){
   await page.evaluate(()=>I18n.missing.clear());await page.selectOption('#language',language);
   assert.equal(await page.locator('html').getAttribute('dir'),['ar','fa','he','ur'].includes(language)?'rtl':'ltr');
   const expected=await page.evaluate(()=>({report:I18n.t('Experimental analysis'),nav:I18n.t('Imported questionnaires')}));
   assert.equal(await page.locator('.method-note h3').innerText(),expected.report);assert((await page.locator('[data-route="imported"]').innerText()).includes(expected.nav));
   await page.locator('#imported-home').click();assert.equal(await page.locator('#content h1').innerText(),expected.nav);
   await page.locator('[data-imported-open="0"]').click();assert.equal(await page.locator('#imported-prompt').innerText(),pkg.sections[0].items[0].prompt);assert.equal(await page.locator('#imported-prompt span').getAttribute('dir'),'rtl');
   await page.locator('#imported-result').click();assert.deepEqual(await page.evaluate(()=>[...I18n.missing]),[],language+': imported home/question/report translations');
 }
 assert.deepEqual((await captureExport(page)).answers,complete.answers);assert.deepEqual(errors,[]);
});

test('respondent sessions stay independent and real answer downloads restore identity with recomputed results',{timeout:120000},async t=>{
 const {page,errors}=await setup(t),pkg=fixture('unscored');await page.locator('[data-route="imported"]').click();await upload(page,pkg);
 await page.locator('#imported-name').fill('Synthetic respondent A');await page.locator('[data-imported-choice="0"]').click();await page.locator('#imported-result').click();
 const downloading=page.waitForEvent('download');await page.locator('#imported-export').click();const download=await downloading;const payload=JSON.parse(fs.readFileSync(await download.path(),'utf8'));assert.equal(payload.version,2);assert.equal(payload.name,'Synthetic respondent A');assert.deepEqual(payload.answers,{'item-0':'yes'});
 await page.locator('#imported-home').click();await page.locator('[data-imported-new="0"]').click();assert.equal(await page.locator('#imported-name').inputValue(),'');assert.equal(await page.locator('[aria-pressed="true"]').count(),0);await page.locator('#imported-name').fill('Synthetic respondent B');await page.locator('[data-imported-choice="1"]').click();
 let state=await page.evaluate(()=>JSON.parse(localStorage.getItem(ImportedStore.KEY)));assert.equal(state.sessions.length,2);assert.notEqual(state.sessions[0].id,state.sessions[1].id);assert.deepEqual(state.sessions[0].answers,{'item-0':'yes'});assert.deepEqual(state.sessions[1].answers,{'item-0':'no'});
 await page.evaluate(()=>{localStorage.removeItem(ImportedStore.KEY);localStorage.removeItem(ImportedStore.LEGACY_KEY);});await page.reload();await page.locator('[data-route="imported"]').click();payload.result={complete:true,answered:999,groups:[{sum:999}]};await upload(page,payload);await page.locator('#imported-export').waitFor();const restored=await captureExport(page);assert.deepEqual(restored.session,payload.session);assert.deepEqual(restored.result,C.score(pkg,payload.answers));assert.equal(restored.result.answered,1);
 await page.locator('#imported-home').click();await upload(page,payload);await page.locator('#imported-home').click();assert.equal(await page.locator('[data-imported-open]').count(),1);assert.deepEqual(errors,[]);
});

test('professional clearing removes v1 and v2 imported answers and stale second-page handlers cannot resurrect them',{timeout:120000},async t=>{
 const {page,errors}=await setup(t),pkg=fixture('unscored');await page.locator('[data-route="imported"]').click();await upload(page,pkg);await page.locator('[data-imported-choice="0"]').click();
 await page.evaluate(pkg=>localStorage.setItem(ImportedStore.LEGACY_KEY,JSON.stringify([{pkg,name:'Synthetic legacy',answers:{'item-0':'yes'}}])),pkg);
 const second=await page.context().newPage();
 // Delay the professional reload listener to exercise a still-live stale imported closure.
 await second.addInitScript(()=>{const original=window.addEventListener;window.addEventListener=function(type,listener,...rest){return original.call(this,type,type==='storage'?event=>{if(event.key!=='brain-studio-workspace-v2')listener(event);}:listener,...rest);};});await second.goto(page.url());await second.locator('[data-route="imported"]').click();await second.locator('[data-imported-open="0"]').click();await second.evaluate(()=>{window.staleName=document.querySelector('#imported-name');window.staleChoice=document.querySelector('[data-imported-choice="1"]');window.staleHandler=window.staleChoice.onclick;});
 await page.locator('[data-route="workspace"]').click();page.once('dialog',d=>d.accept());await page.locator('#workspace-clear').click();assert.match(await page.locator('#toast').innerText(),/workspace data cleared/);
 await second.waitForFunction(()=>document.querySelectorAll('[data-imported-open]').length===0);await second.evaluate(()=>{window.staleName.value='Must not resurrect';window.staleName.oninput({target:window.staleName});window.staleHandler();});
 for(const target of [page,second]){await target.reload();await target.locator('[data-route="imported"]').click();assert.equal(await target.locator('[data-imported-open]').count(),0);assert.equal(await target.locator('[data-imported-new]').count(),0);const saved=await target.evaluate(()=>({legacy:localStorage.getItem(ImportedStore.LEGACY_KEY),current:JSON.parse(localStorage.getItem(ImportedStore.KEY))}));assert.equal(saved.legacy,null);assert.deepEqual(saved.current.sessions,[]);assert.deepEqual(saved.current.packages,[]);}
 await second.close();assert.deepEqual(errors,[]);
});

test('legacy attribution requires confirmation, twelve-package cap is accurate and failed writes never claim success',{timeout:180000},async t=>{
 const {page,errors}=await setup(t),pkg=fixture('unscored');await page.evaluate(pkg=>localStorage.setItem(ImportedStore.LEGACY_KEY,JSON.stringify([{pkg,name:'Synthetic legacy',answers:{'item-0':'yes'}}])),pkg);await page.reload();await page.locator('[data-route="imported"]').click();await page.locator('[data-imported-report="0"]').click();assert.equal(await page.locator('#imported-export').isDisabled(),true);assert.equal(await page.locator('#imported-pdf').isDisabled(),true);
 let state=await page.evaluate(()=>JSON.parse(localStorage.getItem(ImportedStore.KEY)));assert.equal(state.sessions[0].attribution,'legacy-unverified');assert.equal(await page.evaluate(()=>localStorage.getItem(ImportedStore.LEGACY_KEY)),null);
 const captions=['New respondent','Saved respondent sessions','Delete questionnaire','Delete respondent session','Clear imported questionnaires and respondent sessions','Legacy answers need attribution review. Verify whose answers these are before using or exporting this report.','Confirm respondent attribution','Confirm attribution before exporting or interpreting this report.'];
 for(const language of await page.evaluate(()=>I18n.languages.map(l=>l.code))){await page.evaluate(()=>I18n.missing.clear());await page.selectOption('#language',language);assert.equal(await page.locator('#imported-confirm').innerText(),await page.evaluate(()=>I18n.t('Confirm respondent attribution')));await page.locator('#imported-home').click();for(const text of captions.slice(0,5))assert((await page.locator('#content').innerText()).includes(await page.evaluate(text=>I18n.t(text),text)));await page.locator('[data-imported-report="0"]').click();assert.deepEqual(await page.evaluate(()=>[...I18n.missing]),[],language);for(const text of captions)assert(await page.evaluate(text=>I18n.t(text)!==text||I18n.language==='en',text),language+': '+text);}
 await page.selectOption('#language','en');page.once('dialog',d=>d.accept());await page.locator('#imported-confirm').click();assert.equal(await page.locator('#imported-export').isEnabled(),true);assert.equal((await captureExport(page)).session.attribution,'confirmed');await page.locator('#imported-home').click();
 for(let i=1;i<12;i++){await upload(page,{...pkg,id:'synthetic-cap-'+i});await page.locator('#imported-home').click();}assert.equal(await page.locator('[data-imported-new]').count(),12);await upload(page,{...pkg,id:'synthetic-cap-over'});assert.match(await page.locator('#toast').innerText(),/Twelve questionnaires/);assert.equal(await page.locator('[data-imported-new]').count(),12);
 page.once('dialog',d=>d.accept());await page.locator('[data-imported-delete-package="0"]').click();await upload(page,{...pkg,id:'synthetic-cap-over'});await page.locator('#imported-home').click();assert.equal(await page.locator('[data-imported-new]').count(),12);
 const before=await page.evaluate(()=>localStorage.getItem(ImportedStore.KEY));await page.evaluate(()=>{window.originalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===ImportedStore.KEY)throw new DOMException('Synthetic quota','QuotaExceededError');return window.originalSet.call(this,k,v);};});page.once('dialog',d=>d.accept());await page.locator('[data-imported-delete-package="0"]').click();assert.match(await page.locator('#toast').innerText(),/could not be saved/);assert.equal(await page.evaluate(()=>localStorage.getItem(ImportedStore.KEY)),before);assert.equal(await page.locator('[data-imported-new]').count(),12);await page.locator('[data-route="workspace"]').click();page.once('dialog',d=>d.accept());await page.locator('#workspace-clear').click();assert.match(await page.locator('#toast').innerText(),/could not be saved/);assert.equal(await page.evaluate(()=>localStorage.getItem(ImportedStore.KEY)),before);await page.evaluate(()=>Storage.prototype.setItem=window.originalSet);assert.deepEqual(errors,[]);
});

test('large accepted experimental package exports above two megabytes and restores its actual download',{timeout:120000},async t=>{
 const {page,errors}=await setup(t),pkg=fixture('unscored');pkg.id='synthetic-large-export';pkg.language='en';pkg.title='Synthetic large export boundary';pkg.sections[0].items=pkg.sections[0].items.slice(0,1);
 const rationale='Synthetic boundary rationale. '.repeat(300);
 pkg.scoring={type:'experimental',notice:'Synthetic arithmetic boundary only.',scales:Array.from({length:160},(_,i)=>({id:'large-scale-'+i,title:'Synthetic scale '+i,description:'Synthetic fixture scale.',kind:'reflection'})),keys:Array.from({length:160},(_,i)=>({itemId:'item-0',scaleId:'large-scale-'+i,values:{yes:1,no:0},rationale}))};
 const packageBytes=Buffer.byteLength(JSON.stringify(pkg));assert(packageBytes<2000000,`package bytes: ${packageBytes}`);C.validatePackage(pkg);
 await page.locator('[data-route="imported"]').click();await upload(page,pkg);await page.locator('#imported-name').fill('Synthetic large respondent');await page.locator('[data-imported-choice="0"]').click();await page.locator('#imported-result').click();
 const downloading=page.waitForEvent('download');await page.locator('#imported-export').click();const download=await downloading,bytes=fs.readFileSync(await download.path()),payload=JSON.parse(bytes.toString('utf8'));assert(bytes.length>2000000,`export bytes: ${bytes.length}`);assert(bytes.toString('utf8').length<4000000);assert(JSON.stringify(payload).length<4000000);assert.equal(payload.result.reviews.length,160);assert(payload.result.groups.every(g=>g.sum===1));
 await page.evaluate(()=>{localStorage.removeItem(ImportedStore.KEY);localStorage.removeItem(ImportedStore.LEGACY_KEY);});await page.reload();await page.locator('[data-route="imported"]').click();await page.locator('#questionnaire-file').setInputFiles({name:'synthetic-large-answers.json',mimeType:'application/json',buffer:bytes});await page.locator('#imported-export').waitFor();
 const restored=await captureExport(page);assert.deepEqual(restored.session,payload.session);assert.deepEqual(restored.answers,{'item-0':'yes'});assert.deepEqual(restored.result,C.score(pkg,restored.answers));assert.equal(restored.result.reviews.length,160);assert.deepEqual(errors,[]);
});

// Imported questionnaires have four navigation actions, unlike the short standard quiz.
test('imported question navigation wraps within narrow Arabic and English layouts',{timeout:90000},async t=>{
 const {page,errors}=await setup(t),pkg=fixture();
 await page.locator('[data-route="imported"]').click();await upload(page,pkg);
 for(const width of [320,390,600]){
  await page.setViewportSize({width,height:844});
  for(const language of ['ar','en']){
   await page.selectOption('#language',language);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1),false,language+': '+width+'px overflow');
   const bounds=await page.locator('.quiz-actions').evaluate(row=>({left:row.getBoundingClientRect().left,right:row.getBoundingClientRect().right,children:[...row.children].map(c=>({left:c.getBoundingClientRect().left,right:c.getBoundingClientRect().right}))}));
   assert(bounds.children.every(c=>c.left>=bounds.left-1&&c.right<=bounds.right+1),language+': actions remain inside their panel');
   await page.locator('#imported-next').click();assert.equal(await page.locator('#imported-prompt').innerText(),pkg.sections[0].items[1].prompt);await page.locator('#imported-prev').click();
  }
 }
 assert.deepEqual(errors,[]);
});
