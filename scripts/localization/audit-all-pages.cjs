'use strict';
// Isolated synthetic UI audit; never reads user workspaces or contacts AI providers.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),app=path.join(root,'app');
const output=path.resolve(process.env.AUDIT_OUTPUT||path.join(root,'evidence','all-pages-locales-'+Date.now()));
fs.mkdirSync(output,{recursive:true});
function reviewFindings(result){
 const vm=require('node:vm'),context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(app,'translations.js'),'utf8'),context);const catalogs=context.window.BRAIN_TRANSLATIONS;
 const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const review=[],cache=new Map();
 for(const finding of result.findings){const id=finding.language+'\0'+finding.text;if(cache.has(id))continue;cache.set(id,true);const map=catalogs[finding.language];
  const fragments=Object.entries(map).filter(([key,value])=>key!==value&&value.length>=2&&!value.includes('{')).map(([,value])=>value).sort((a,b)=>b.length-a.length);
  let remainder=finding.text;
  const templates=Object.values(map).filter(v=>v.includes('{')).sort((a,b)=>b.length-a.length).map(v=>new RegExp(escape(v).replace(/\\\{(?:number|count|percent|thinking|perception|l|r)\\\}/g,'[\\p{N}.,]+').replace(/\\\{(?:left|right|name)\\\}/g,'.*'),'u'));
  for(const template of templates)remainder=remainder.replace(template,'');
  for(const part of Object.values(map).filter(v=>v.includes('{')).flatMap(v=>v.split(/\{\w+\}/)).filter(p=>p.trim().length>=3).sort((a,b)=>b.length-a.length))remainder=remainder.split(part).join('');
  for(const value of fragments)remainder=remainder.split(value).join('');
  for(const month of Array.from({length:12},(_,i)=>new Intl.DateTimeFormat(finding.language,{month:'long'}).format(new Date(2026,i,15))))remainder=remainder.split(month).join('');
  remainder=remainder.replace(/https?:\/\/\S+/g,'').replace(/Brain Studio|IPIP-?50|O\*NET®?|OHBDS|Enter|Learning Styles/g,'').replace(/[\p{N}\p{P}\p{S}\s\u200e\u200f\u2068\u2069]/gu,'');
  let reason=!/[A-Za-z]{3}/.test(remainder)?'localized catalog fragments, numbers, brand identifiers, keyboard key or citation title':null;
  if(Object.entries(map).some(([key,value])=>key!==value&&value===finding.text.replace(/^[\s·/]+/,'')))reason='exact localized catalog value with layout separator';
  if(finding.kind==='same-as-English catalog'&&((['es','pt','ms'].includes(finding.language)&&finding.text==='Visual')||(finding.language==='fr'&&['Question','20 questions · ~5 minutes'].includes(finding.text))||(finding.language==='de'&&finding.text==='(optional)')))reason='legitimate identical spelling in target language';
  review.push({language:finding.language,text:finding.text,remainder,reason,state:finding.state});
 }
 fs.writeFileSync(path.join(output,'candidate-review.json'),JSON.stringify(review,null,2));
 fs.writeFileSync(path.join(output,'unresolved-candidates.json'),JSON.stringify(review.filter(x=>!x.reason),null,2));
 return {unique:review.length,resolved:review.filter(x=>x.reason).length,unresolved:review.filter(x=>!x.reason).length};
}
function summarize(result,review){
 const checks={missing:[...new Set(result.states.flatMap(s=>s.missing||[]))],emptyEnglish:result.states.flatMap(s=>(s.english||[]).map(text=>({language:s.language,state:s.state,text}))),overflow:result.states.filter(s=>s.overflow).length,languageMismatch:result.states.filter(s=>s.lang&&s.lang!==s.language).length,directionMismatch:result.states.filter(s=>s.dir&&s.dir!==(['ar','ur','fa','he'].includes(s.language)?'rtl':'ltr')).length,coverageMismatch:result.languages.filter(language=>result.states.filter(s=>s.language===language).length!==325),sourceChanged:result.sourceFilesChangedDuringAudit||[]};
 const passed=!result.errors.length&&!checks.missing.length&&!checks.emptyEnglish.length&&!checks.overflow&&!checks.languageMismatch&&!checks.directionMismatch&&!checks.coverageMismatch.length&&!checks.sourceChanged.length&&!review.unresolved;
 const summary={passed,output,languages:result.languages.length,states:result.states.length,candidates:result.findings.length,uniqueCandidates:new Set(result.findings.map(f=>f.text)).size,review,checks,errors:result.errors};fs.writeFileSync(path.join(output,'summary.json'),JSON.stringify(summary,null,2));return summary;
}
if(process.env.AUDIT_REVIEW_ONLY){const result=JSON.parse(fs.readFileSync(path.join(output,'audit.json'),'utf8')),summary=summarize(result,reviewFindings(result));console.log(JSON.stringify(summary));process.exit(summary.passed?0:1);}
(async()=>{
 const server=http.createServer((req,res)=>{const file=path.resolve(app,'.'+(new URL(req.url,'http://localhost').pathname==='/'?'/index.html':new URL(req.url,'http://localhost').pathname));if(!file.startsWith(app+path.sep)){res.writeHead(403);return res.end();}try{res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 const sourceHashes=Object.fromEntries(fs.readdirSync(app,{recursive:true}).filter(f=>/\.(?:js|html|css)$/.test(f)).map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(app,f))).digest('hex')]));
 const result={created:new Date().toISOString(),sourceHashes,method:'Real Chromium DOM event handlers, synthetic local records, all details expanded; no real provider calls. English detection independent of I18n.missing. Unknown Latin fragments are review candidates, not automatically missing translations.',languages:[],states:[],findings:[],errors:[],exceptions:[]};
 try{
 browser=await chromium.launch({headless:true,channel:process.env.PLATFORM_BROWSER_CHANNEL||(process.platform==='win32'?'msedge':undefined)});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>result.errors.push(e.message));
 await page.addInitScript(()=>{const ok=value=>Promise.resolve({ok:true,value});window.desktop={aiConfigure:()=>ok({}),aiPreview:()=>ok({token:'synthetic',body:{fixture:true},endpoint:'https://example.invalid'}),aiSend:()=>ok({text:'',truncated:false}),aiClear:()=>ok({}),aiCancel:()=>ok({}),aiStatus:()=>ok({configured:false}),aiProvidersList:()=>ok({available:true,providers:[{id:'fixture',name:'◆',provider:'openai',model:'fixture-model'}]}),aiProvidersSave:()=>ok({}),aiProvidersActivate:()=>ok({provider:'openai',model:'fixture-model'}),aiProvidersDelete:()=>ok({}),exportJSON:()=>Promise.resolve({downloadRequested:true}),exportPDF:()=>Promise.resolve({printRequested:true})};});
 await page.goto('http://127.0.0.1:'+server.address().port);
 const languages=await page.evaluate(()=>I18n.languages.map(l=>l.code));
 result.languages=process.env.AUDIT_LANGUAGES?process.env.AUDIT_LANGUAGES.split(','):languages;
 // Empty-state routes first, then complete synthetic instruments and saved records.
 for(const language of result.languages){await page.selectOption('#language',language);const empty=await page.evaluate(()=>{let rows=[];for(const route of ['home','history','portfolio','roles','coaching','development','team','feedback','skills','workspace','ai','about']){BrainApp.navigate(route);document.querySelectorAll('details').forEach(d=>d.open=true);const missing=[...I18n.missing];I18n.missing.clear();const english=[];const walker=document.createTreeWalker(document.getElementById('content'),NodeFilter.SHOW_TEXT);let n;while(n=walker.nextNode()){const text=n.textContent.trim();if(n.parentElement.getClientRects().length&&Object.hasOwn(BRAIN_TRANSLATIONS.en,text)&&BRAIN_TRANSLATIONS[I18n.language][text]!==text)english.push(text);}rows.push({language:I18n.language,state:'empty/'+route,text:document.getElementById('content').innerText,missing,english,lang:document.documentElement.lang,dir:document.documentElement.dir});}return rows;});result.states.push(...empty.map(({text,...row})=>({...row,textLength:text.length})));}
 await page.evaluate(()=>{
  const descriptors=[...ResearchCore.instruments,...WorkspaceCore.instruments,...ThinkingCore.instruments];
  const profiles=descriptors.flatMap(d=>Array.from({length:d.id==='work-style'?3:1},(_,n)=>({id:d.id+'-'+n,instrumentId:d.id,instrumentVersion:d.metadata.version,name:'◆',date:1700000000000,answers:Object.fromEntries(d.items.map(item=>[item.id,d.responseOptions[Math.floor(d.responseOptions.length/2)].value])),answerLanguages:Object.fromEntries(d.items.map(item=>[item.id,'en']))})));
  const feedbacks=Object.entries(WorkspaceCore.feedbackSets).map(([kind,themes])=>({kind,date:1700000000000,raters:['self','manager','peer','peer'].map(role=>({role,ratings:Object.fromEntries(themes.map((_,i)=>['c'+i,3])),priorities:[0,1]}))}));
  localStorage.setItem('brain-studio-workspace-v2',JSON.stringify({profiles,feedbacks,plans:[{id:'fixture',action:'◆',outcome:'◆',owner:'◆',due:'2026-12-01',followUp:'2026-12-02',notes:'◆',done:false}],rubrics:[{date:1700000000000,rows:[{topic:'◆',earned:1,possible:2}]}]}));
  const answers=Object.fromEntries(BrainCore.questions.map(q=>[q.id,1]));localStorage.setItem('brain-studio-v1',JSON.stringify({answers,index:0,name:'◆',history:[{date:1700000000000,name:'◆',answers}]}));
 });await page.reload();
 for(const language of result.languages){
 await page.selectOption('#language',language);
 const batch=await page.evaluate(async()=>{
  const states=[],findings=[],exceptions=[],lang=I18n.language;
  const en=window.BRAIN_TRANSLATIONS.en,map=window.BRAIN_TRANSLATIONS[lang],localized=new Set(Object.values(map));
  const mirrored=s=>s.replace(/[←→↗]/g,c=>({'←':'→','→':'←','↗':'↖'}[c]));for(const value of [...localized])localized.add(mirrored(value));
  const knownNames=new Set(['brain','studio','b.','Brain Studio','Anthropic','OpenRouter','Google Gemini','OpenAI','OpenAI API','Ollama','HBDI','OHBDS','IPIP','API','JSON','PDF','MIT','RIASEC','fixture-model','openai']);
  const allDescriptors=[...ResearchCore.instruments,...WorkspaceCore.instruments,...ThinkingCore.instruments];
  const sourceText=new Set(allDescriptors.filter(d=>['ipip-50','ohbds-20-v1','onet-short-form-60'].includes(d.id)).flatMap(d=>[d.instructions,d.interpretationInstructions,d.description,...d.items.flatMap(i=>[i.prompt,...(i.choices||[])]),...d.responseOptions.map(o=>o.label)]).filter(Boolean));
  const attributions=new Set(allDescriptors.map(d=>d.metadata.attribution).filter(Boolean));
  const seen=new Set();
  function inspect(state){
   document.querySelectorAll('details').forEach(d=>d.open=true);
   const entries=[];const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;
   while(node=walker.nextNode()){const el=node.parentElement;if(!el||el.closest('script,style,#language')||el.hidden||el.closest('[hidden]'))continue;if(el.tagName!=='OPTION'&&(!el.getClientRects().length||getComputedStyle(el).opacity==='0'))continue;const text=node.textContent.trim();if(text)entries.push({text,el,attribute:null});}
   for(const el of document.querySelectorAll('[placeholder],[aria-label],[title]'))if(el.getClientRects().length)for(const attr of ['placeholder','aria-label','title'])if(el.hasAttribute(attr))entries.push({text:el.getAttribute(attr),el,attribute:attr});
   let count=0;for(const {text,el,attribute} of entries){if(lang==='en'||!/[A-Za-z]{3}/.test(text)||(localized.has(text)&&(!Object.hasOwn(en,text)||map[text]!==text)))continue;
    let exception=null;
    if(el.closest('#creator-credit')||text==='Created by Brain Studio, Emad Bahattab, Email: bahattab@yahoo.com')exception='exact user-required creator credit';
    else if(/^https?:\/\//.test(text))exception='source URL or endpoint';
    else if(sourceText.has(text)&&(el.closest('[lang="en"]')||el.closest('[data-i18n-skip]')))exception='exact published source English wording';
    else if(/^[a-z0-9]+(?:-[a-z0-9.]+)+(?: · [a-z]{2})?$/.test(text)||/^\d+\.\d+/.test(text))exception='stable technical identifier';
    else if(knownNames.has(text))exception='brand or technical name';
    else if(el.closest('#ai-saved-list'))exception='user supplied saved provider metadata';
    else if(attributions.has(text))exception='exact source attribution';
    else if(el.closest('time'))exception='localized date generated by Intl';
    const key=state+'|'+text+'|'+attribute;if(seen.has(key))continue;seen.add(key);
    if(exception){exceptions.push({language:lang,state,text,reason:exception});continue;}
    const exact=Object.hasOwn(en,text),kind=exact?(map[text]===text?'same-as-English catalog':'untranslated catalog text'):'unregistered Latin text';
    // Latin-script translations can contain Latin text; report unknown fragments as review candidates, not certified failures.
    findings.push({language:lang,state,text,kind,tag:el.tagName,attribute,skip:!!el.closest('[data-i18n-skip]')});count++;
   }
   states.push({language:lang,state,findings:count,missing:[...I18n.missing],lang:document.documentElement.lang,dir:document.documentElement.dir,overflow:document.documentElement.scrollWidth>innerWidth,textLength:document.getElementById('content').innerText.length});I18n.missing.clear();
  }
  const click=selector=>{const el=document.querySelector(selector);if(!el)throw Error('Missing '+selector);el.click();};
  const choose=(selector,value)=>{const el=document.querySelector(selector);if(!el)throw Error('Missing '+selector);el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}));};
  const route=r=>{BrainApp.navigate(r);inspect(r);};
  for(const r of ['home','assessment','results','history','about','library','portfolio','roles','coaching','development','team','feedback','skills','workspace'])route(r);
  route('assessment');for(let n=0;n<20;n++){click('[data-question="'+n+'"]');inspect('legacy/question/'+(n+1));}
  const descriptors=[...ResearchCore.instruments,...WorkspaceCore.instruments,...ThinkingCore.instruments];
  for(const d of descriptors){BrainApp.navigate('library');click('[data-instrument="'+d.id+'"]');if(document.querySelector('#original-english')?.checked)click('#original-english');for(let n=0;n<d.items.length;n++){click('[data-prof-question="'+n+'"]');inspect('instrument/'+d.id+'/question/'+(n+1));}if(document.querySelector('#original-english')){click('#original-english');inspect('instrument/'+d.id+'/explicit-source-English');click('#original-english');}}
  BrainApp.navigate('portfolio');const ids=[...document.querySelectorAll('#profile-select option')].map(o=>o.value);for(const id of ids){choose('#profile-select',id);inspect('portfolio/'+id);BrainApp.navigate('coaching');inspect('coaching/'+id);BrainApp.navigate('portfolio');}
  BrainApp.navigate('roles');const roleIds=[...document.querySelectorAll('#role-select option')].map(o=>o.value);for(const id of roleIds){choose('#role-select',id);inspect('roles/'+id);}
  BrainApp.navigate('team');click('#team-calculate');inspect('team/validation');const teamIds=[...document.querySelectorAll('[data-team-profile]')].filter(e=>e.dataset.teamProfile.startsWith('work-style'));for(const el of teamIds.slice(0,2))el.click();click('#team-calculate');inspect('team/pair-report');teamIds[2].click();click('#team-calculate');inspect('team/group-report');
  BrainApp.navigate('feedback');for(let i=0;i<3;i++){click('[data-open-feedback="'+i+'"]');inspect('feedback/'+i+'/private-report');click('#privacy-mode');inspect('feedback/'+i+'/expanded-report');}
  BrainApp.navigate('skills');click('[data-open-rubric="0"]');inspect('skills/rubric-report');click('#rubric-add');inspect('skills/extra-rubric-row');
  BrainApp.navigate('development');click('[data-plan-done]');inspect('development/completed');
  BrainApp.navigate('ai');await new Promise(r=>setTimeout(r,0));inspect('ai/settings');for(const provider of ['openai','anthropic','gemini','openrouter','ollama','custom']){choose('#ai-provider',provider);inspect('ai/provider/'+provider);}for(const selector of ['#ai-configure','#ai-save','#ai-activate','#ai-preview','#ai-send','#ai-delete','#ai-clear']){click(selector);await new Promise(r=>setTimeout(r,0));inspect('ai/action/'+selector.slice(1));}
  const desktop=window.desktop,configure=desktop.aiConfigure,list=desktop.aiProvidersList;
  desktop.aiConfigure=()=>Promise.resolve({ok:false,error:{message:'The provider operation could not be completed.'}});click('#ai-configure');await new Promise(r=>setTimeout(r,0));inspect('ai/provider-error');desktop.aiConfigure=configure;
  desktop.aiProvidersList=()=>Promise.resolve({ok:true,value:{available:false,providers:[]}});BrainApp.navigate('ai');await new Promise(r=>setTimeout(r,0));inspect('ai/storage-unavailable');desktop.aiProvidersList=list;
  window.desktop={};BrainApp.navigate('ai');inspect('ai/browser-edition');window.desktop=desktop;
  return {states,findings,exceptions};
 });result.states.push(...batch.states);result.findings.push(...batch.findings);result.exceptions.push(...batch.exceptions);
 if(language==='ar'){for(const route of ['home','results','history','about','library','portfolio','roles','coaching','development','team','feedback','skills','workspace','ai']){await page.evaluate(r=>{BrainApp.navigate(r);if(r==='feedback')document.querySelector('[data-open-feedback="0"]').click();if(r==='skills')document.querySelector('[data-open-rubric="0"]').click();if(r==='team'){[...document.querySelectorAll('[data-team-profile]')].filter(e=>e.dataset.teamProfile.startsWith('work-style')).forEach(e=>e.click());document.querySelector('#team-calculate').click();}},route);await page.locator('details').evaluateAll(es=>es.forEach(e=>e.open=true));await page.screenshot({path:path.join(output,'ar-'+route+'.png'),fullPage:true});}}
 if(language==='ar')for(const id of ['skills-practice','ipip-50','ohbds-20-v1']){await page.evaluate(id=>{BrainApp.navigate('library');document.querySelector('[data-instrument="'+id+'"]').click();document.querySelector('[data-prof-question="0"]').click();if(document.querySelector('#original-english')?.checked)document.querySelector('#original-english').click();},id);await page.screenshot({path:path.join(output,'ar-question-'+id+'.png'),fullPage:true});}
 fs.writeFileSync(path.join(output,'audit.json'),JSON.stringify(result,null,2));console.log(language+': '+batch.states.length+' populated states, '+batch.findings.length+' review candidates');
 }
 }catch(error){result.errors.push(error.stack);process.exitCode=1;}finally{result.sourceFilesChangedDuringAudit=Object.entries(result.sourceHashes).filter(([file,hash])=>crypto.createHash('sha256').update(fs.readFileSync(path.join(app,file))).digest('hex')!==hash).map(([file])=>file);fs.writeFileSync(path.join(output,'audit.json'),JSON.stringify(result,null,2));if(browser)await browser.close();await new Promise(r=>{server.close(r);server.closeAllConnections();});}
 const unique=[...new Set(result.findings.map(f=>f.text))];fs.writeFileSync(path.join(output,'candidate-texts.json'),JSON.stringify(unique,null,2));
 const summary=summarize(result,reviewFindings(result));console.log(JSON.stringify(summary));if(!summary.passed)process.exitCode=1;
})();



