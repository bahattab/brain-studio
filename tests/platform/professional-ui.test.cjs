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
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>server.close());
  const browser=await chromium.launch({headless:true,channel:process.env.PLATFORM_BROWSER_CHANNEL||(process.platform==='win32'?'msedge':undefined)});t.after(()=>browser.close());
  const page=await browser.newPage({viewport:{width:1360,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  return {page,errors};
}
test('complete custom assessment through UI; language changes preserve answers and raw results',{timeout:120000},async t=>{
  const {page,errors}=await setup(t);
  await page.locator('[data-route="library"]').click();
  await page.locator('[data-instrument="work-style"]').click();
  await page.locator('#professional-name').fill('مثال Example');
  for(let i=0;i<36;i++){
    if(i===5)await page.selectOption('#language','ar');
    if(i===15)await page.selectOption('#language','ja');
    if(i===25)await page.selectOption('#language','en');
    await page.locator('[data-prof-value="3"]').click();
    await page.locator('#prof-next').click();
  }
  assert.equal(await page.locator('.score-row').count(),9);
  assert.equal(await page.locator('.report-ident h2').innerText(),'مثال Example');
  assert.deepEqual(await page.locator('.score-row strong').allTextContents(),Array(9).fill('12'));
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('brain-studio-workspace-v2')));
  assert.equal(saved.profiles.length,1);assert.equal(Object.keys(saved.profiles[0].answers).length,36);
  await page.locator('[data-route="roles"]').click();assert.equal(await page.locator('.comparison-row').count(),10);
  assert(!/NaN|undefined/.test(await page.locator('#content').innerText()));
  await page.reload();await page.locator('[data-route="portfolio"]').click();
  assert.deepEqual(await page.locator('.score-row strong').allTextContents(),Array(9).fill('12'));
  await page.selectOption('#language','ar');
  assert.equal(await page.locator('html').getAttribute('dir'),'rtl');
  const positions=await page.evaluate(()=>({side:document.querySelector('.sidebar').getBoundingClientRect().x,main:document.querySelector('.main-shell').getBoundingClientRect().x}));assert(positions.side>positions.main);
  for(const language of ['en','ar','zh','es','hi','fr','pt','ru','bn','ja','de','ur','id','ko','tr','it','fa','he','sw','vi','pa','mr','te','ta','th','gu','pl','uk','ms','ha']){
    await page.selectOption('#language',language);
    assert.equal(await page.locator('html').getAttribute('lang'),language);
    assert.equal(await page.locator('html').getAttribute('dir'),['ar','ur','fa','he'].includes(language)?'rtl':'ltr');
    assert.equal(await page.locator('.score-row strong').count(),9);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,language+': horizontal page overflow');
  }
  await page.setViewportSize({width:390,height:844});
  for(const language of ['ar','de','ja']){await page.selectOption('#language',language);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,language+': mobile overflow');}
  assert.deepEqual(errors,[]);
});
test('published source wording stays English across interface languages; all workspace pages render',{timeout:120000},async t=>{
  const {page,errors}=await setup(t);
  for(const language of ['ar','ur','fa','he','en','zh']){
    await page.selectOption('#language',language);
    await page.locator('[data-route="library"]').click();
    await page.locator('[data-instrument="onet-short-form-60"]').click();
    assert.equal(await page.locator('#professional-question').innerText(),R.instruments.find(x=>x.id==='onet-short-form-60').items[0].prompt);
    await page.locator('[data-prof-value="0"]').click();assert.equal(await page.locator('#prof-next').isEnabled(),true);
    await page.locator('[data-route="library"]').click();await page.locator('[data-instrument="ipip-50"]').click();
    assert.equal(await page.locator('#professional-question').innerText(),R.instruments[0].items[0].prompt);
    for(const route of ['portfolio','roles','coaching','development','team','feedback','skills','workspace']){await page.locator(`[data-route="${route}"]`).click();assert(await page.locator('#content h1').count());assert(!/NaN|undefined/.test(await page.locator('#content').innerText()));}
  }
  assert.deepEqual(errors,[]);
});
test('mixed wording provenance survives reload and cannot be pooled as source-English data',{timeout:120000},async t=>{
  const {page,errors}=await setup(t);
  await page.selectOption('#language','ar');await page.locator('[data-route="library"]').click();await page.locator('[data-instrument="ipip-50"]').click();
  await page.locator('#original-english').uncheck();
  assert(await page.locator('.method-note').isVisible());
  assert(!/Extraversion|Agreeableness|Conscientiousness/.test(await page.locator('.question-panel .eyebrow').innerText()));
  await page.locator('[data-prof-value="3"]').click();await page.locator('#prof-next').click();
  await page.selectOption('#language','en');await page.locator('#original-english').check();
  for(let i=1;i<50;i++){await page.locator('[data-prof-value="3"]').click();await page.locator('#prof-next').click();}
  const profile=await page.evaluate(()=>JSON.parse(localStorage.getItem('brain-studio-workspace-v2')).profiles[0]);
  assert.equal(profile.language,'mul');assert.equal(profile.answerLanguages.ipip01,'ar');assert.equal(profile.answerLanguages.ipip50,'en');
  assert.deepEqual(await page.locator('.score-row strong').allTextContents(),Array(5).fill('30'));
  await page.reload();await page.locator('[data-route="portfolio"]').click();assert(await page.locator('.method-note').innerText().then(text=>text.includes('not been psychometrically validated')));
  await page.locator('[data-route="team"]').click();await page.locator('[data-team-profile]').check();await page.locator('#team-calculate').click();
  assert((await page.locator('#toast').innerText()).includes('questionnaire language'));
  assert.equal(await page.locator('#team-result .comparison-row').count(),0);assert.deepEqual(errors,[]);
});
test('feedback privacy suppresses small subgroups, sessions reopen and grading retains weighted partial credit',{timeout:120000},async t=>{
  const {page,errors}=await setup(t);
  await page.locator('[data-route="feedback"]').click();await page.locator('#add-rater').click();await page.locator('#add-rater').click();
  await page.selectOption('[data-rater-role="2"]','peer');await page.selectOption('[data-rater-role="3"]','direct-report');
  for(let r=0;r<4;r++)for(let c=0;c<12;c++)await page.selectOption(`[data-rater="${r}"][data-competency="c${c}"]`,String([3,1,3,5][r]));
  await page.locator('#feedback-calculate').click();
  await page.evaluate(()=>{window.desktop={exportJSON:async report=>{window.capturedReport=report;return {downloadRequested:true};}};});
  await page.locator('#feedback-export').click();const exported=await page.evaluate(()=>window.capturedReport);
  assert.equal(exported.result.rows[0].othersMean,3);assert.deepEqual(exported.result.rows[0].groups,[]);assert.equal(exported.privacyMode,true);
  await page.locator('#feedback-save').click();await page.locator('[data-route="skills"]').click();
  await page.locator('#rubric-add').click();
  for(let i=0;i<4;i++){await page.locator(`[name="topic${i}"]`).fill(i<2?'Reasoning':'Numerical');await page.locator(`[name="earned${i}"]`).fill(String(i+0.5));await page.locator(`[name="possible${i}"]`).fill('5');}
  await page.locator('#rubric-form button[type="submit"]').click();await page.locator('#rubric-export').click();
  const rubric=await page.evaluate(()=>window.capturedReport);assert.equal(rubric.result.earned,8);assert.equal(rubric.result.possible,20);assert.equal(rubric.result.taskCount,4);
  await page.locator('#rubric-save').click();await page.reload();await page.locator('[data-route="skills"]').click();await page.locator('[data-open-rubric="0"]').click();assert.equal(await page.locator('#rubric-rows .rubric-row').count(),4);
  await page.locator('[data-route="feedback"]').click();await page.locator('[data-open-feedback="0"]').click();assert.equal(await page.locator('#feedback-result .feedback-row').count(),13);
  assert.deepEqual(errors,[]);
});
test('calculated report remains exportable after storage failure; interest choices do not change raw scores',{timeout:120000},async t=>{
  const {page,errors}=await setup(t);
  await page.locator('[data-route="library"]').click();await page.locator('[data-instrument="onet-short-form-60"]').click();
  for(let i=0;i<60;i++){await page.locator('[data-prof-value="0"]').click();if(i===59)await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw new Error('Synthetic full-storage condition');};});await page.locator('#prof-next').click();}
  assert.equal(await page.locator('.portfolio-report').count(),1);assert.equal(await page.locator('.storage-warning').count(),1);
  await page.evaluate(()=>{window.desktop={exportJSON:async report=>{window.capturedReport=report;return {downloadRequested:true};}};});await page.locator('#report-json').click();
  assert.equal((await page.evaluate(()=>window.capturedReport)).profile.language,'en');
  for(const [index,theme] of ['realistic','investigative','artistic'].entries())await page.selectOption(`[name="interest${index}"]`,theme);
  await page.locator('#interest-order-form button').click();await page.locator('#report-json').click();
  const report=await page.evaluate(()=>window.capturedReport);assert.deepEqual(report.profile.interestOrder,['realistic','investigative','artistic']);assert.deepEqual(report.result.scales.map(s=>s.sum),[0,0,0,0,0,0]);
  await page.locator('[data-route="workspace"]').click();await page.locator('#workspace-export').click();assert.equal((await page.evaluate(()=>window.capturedReport)).profiles.length,1);
  assert.deepEqual(errors,[]);
});
test('all thirty locales cover professional routes, custom prompts, optional IPIP wording and reports',{timeout:120000},async t=>{
  const {page,errors}=await setup(t);
  const fixtures=[...R.instruments,...W.instruments,...W.instruments.filter(d=>d.id==='work-style')].map((d,index)=>({id:'locale-fixture-'+index,name:'Synthetic participant '+index,instrumentId:d.id,instrumentVersion:d.metadata.version,date:Date.now(),answers:Object.fromEntries(d.items.map(item=>[item.id,d.id==='onet-short-form-60'?0:3])),answerLanguages:Object.fromEntries(d.items.map(item=>[item.id,'en']))}));
  await page.evaluate(profiles=>localStorage.setItem('brain-studio-workspace-v2',JSON.stringify({profiles})),fixtures);await page.reload();
  const failures=await page.evaluate(()=>{
    const failures=[];
    for(const language of I18n.languages){
      I18n.setLanguage(language.code);document.querySelector('#language').value=language.code;
      for(const route of ['library','portfolio','roles','coaching','development','team','feedback','skills','workspace'])BrainApp.navigate(route);
      BrainApp.navigate('team');const checkboxes=[...document.querySelectorAll('[data-team-profile]')];checkboxes.filter(e=>['locale-fixture-2','locale-fixture-6'].includes(e.dataset.teamProfile)).forEach(e=>e.checked=true);document.querySelector('#team-calculate').click();
      for(const id of ['work-style','emotional-reflection','communication-style','ipip-50']){
        BrainApp.navigate('library');document.querySelector(`[data-instrument="${id}"]`).click();
        if(id==='ipip-50'){const checkbox=document.querySelector('#original-english');checkbox.checked=false;checkbox.dispatchEvent(new Event('change'));}
        const count=document.querySelectorAll('[data-prof-question]').length;
        for(let index=0;index<count;index++)document.querySelector(`[data-prof-question="${index}"]`).click();
      }
      if(I18n.missing.size)failures.push({language:language.code,missing:[...I18n.missing]});
    }
    return failures;
  });
  if(failures.length){fs.mkdirSync(path.join(root,'dist/platform-evidence'),{recursive:true});fs.writeFileSync(path.join(root,'dist/platform-evidence/locale-coverage-failures.json'),JSON.stringify(failures,null,2));}
  assert.equal(failures.length,0,JSON.stringify(failures.slice(0,1)));assert.deepEqual(errors,[]);
});
test('selected-team PDF excludes unselected identities; privacy toggles recalculate exports immediately',{timeout:120000},async t=>{
  const {page,errors}=await setup(t),d=W.instruments.find(x=>x.id==='work-style');
  const profiles=['SELECTED_ONE','SELECTED_TWO','PRIVATE_UNSELECTED_FIXTURE'].map((name,index)=>({id:'print-'+index,name,instrumentId:d.id,instrumentVersion:d.metadata.version,date:Date.now(),answers:Object.fromEntries(d.items.map(item=>[item.id,3])),answerLanguages:Object.fromEntries(d.items.map(item=>[item.id,'en']))}));
  await page.evaluate(profiles=>localStorage.setItem('brain-studio-workspace-v2',JSON.stringify({profiles})),profiles);await page.reload();
  await page.locator('[data-route="team"]').click();await page.locator('[data-team-profile="print-0"]').check();await page.locator('[data-team-profile="print-1"]').check();await page.locator('#team-calculate').click();
  await page.evaluate(()=>{window.desktop={exportPDF:async()=>new Promise(resolve=>window.finishPDF=resolve),exportJSON:async report=>{window.capturedReport=report;return {downloadRequested:true};}};});
  await page.locator('#report-pdf').click();await page.waitForFunction(()=>document.body.dataset.printScope==='report');
  assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('.profile-checks')).display),'grid');
  await page.emulateMedia({media:'print'});assert.equal(await page.locator('.profile-checks').isVisible(),false);
  const pdf=await page.pdf({printBackground:true});
  const parsed=spawnSync('python',['-c',"import fitz,sys;doc=fitz.open(stream=sys.stdin.buffer.read(),filetype='pdf');print('\\n'.join(page.get_text() for page in doc))"],{input:pdf,encoding:'utf8'});
  assert.equal(parsed.status,0,parsed.stderr);assert(!parsed.stdout.includes('PRIVATE_UNSELECTED_FIXTURE'));assert(parsed.stdout.includes('SELECTED_ONE'));assert(parsed.stdout.includes('SELECTED_TWO'));
  await page.evaluate(()=>window.finishPDF({saved:true}));await page.emulateMedia({media:'screen'});
  await page.locator('[data-route="feedback"]').click();await page.locator('#privacy-mode').uncheck();
  for(let r=0;r<2;r++)for(let c=0;c<12;c++)await page.selectOption(`[data-rater="${r}"][data-competency="c${c}"]`,String(r?1:5));
  await page.locator('#feedback-calculate').click();await page.locator('#privacy-mode').check();await page.locator('#feedback-export').click();
  const report=await page.evaluate(()=>window.capturedReport);assert.equal(report.privacyMode,true);assert.equal(report.result.rows[0].othersMean,null);assert.deepEqual(report.result.rows[0].groups,[]);
  assert.deepEqual(errors,[]);
});

