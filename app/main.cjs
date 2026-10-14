const { app, BrowserWindow, ipcMain, dialog, session, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { pathToFileURL } = require('node:url');
const smoke = process.argv.includes('--smoke-test');
const userSessionTest = process.argv.includes('--user-session-test');
const smokeDir = process.argv.find(x=>x.startsWith('--evidence-dir='))?.slice('--evidence-dir='.length) || path.resolve(__dirname,'../evidence');
if(smoke||userSessionTest) app.setPath('userData', path.join(smokeDir,smoke?'smoke-user-data':'user-session-data'));
let win;
function trusted(event) { if (!win || event.sender !== win.webContents || event.senderFrame?.url !== pathToFileURL(path.join(__dirname,'index.html')).href) throw new Error('Untrusted export request'); }
const permittedSources=new Set(require('./research-core.js').instruments.flatMap(instrument=>[...(instrument.metadata.sourceURLs||[]),instrument.metadata.licenseURL].filter(Boolean)));
ipcMain.handle('open-source',async(event,url)=>{trusted(event);if(typeof url!=='string'||!permittedSources.has(url)||!url.startsWith('https://'))throw new Error('Unsupported source page');await shell.openExternal(url);return {opened:true};});
function localeText(language,text){if(!['ar','zh','es','hi','fr','pt','ru','bn','ja','de','ur','id','ko','tr','it','fa','he','sw','vi','pa','mr','te','ta','th','gu','pl','uk','ms','ha'].includes(language))return text;try{return require('./locales/'+language+'.json')[text]||text;}catch{return text;}}
ipcMain.handle('export-pdf',async(event,language)=>{trusted(event);const result=await dialog.showSaveDialog(win,{title:localeText(language,'Save your profile report'),defaultPath:'Brain Studio Profile.pdf',filters:[{name:localeText(language,'PDF report'),extensions:['pdf']}]});if(result.canceled)return {saved:false};await fs.writeFile(result.filePath,await win.webContents.printToPDF({printBackground:true,pageSize:'A4',preferCSSPageSize:true}));return {saved:true};});
ipcMain.handle('export-json',async(event,report)=>{trusted(event);const json=JSON.stringify(report,null,2);if(json.length>3000000)throw new Error('Report is too large');const language=report?.language;const result=await dialog.showSaveDialog(win,{title:localeText(language,'Export your answers'),defaultPath:'Brain Studio Answers.json',filters:[{name:localeText(language,'JSON answers'),extensions:['json']}]});if(result.canceled)return {saved:false};await fs.writeFile(result.filePath,json,'utf8');return {saved:true};});
app.whenReady().then(async()=>{
  session.defaultSession.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
  session.defaultSession.setPermissionCheckHandler(()=>false);
  session.defaultSession.webRequest.onBeforeRequest((details,callback)=>callback({cancel:!details.url.startsWith('file:')&&!details.url.startsWith('devtools:')}));
  win=new BrowserWindow({width:1280,height:880,minWidth:760,minHeight:650,title:'Brain Studio',backgroundColor:'#f5f7fb',autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  win.removeMenu();
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',event=>event.preventDefault());
  const errors=[];
  win.webContents.on('console-message',(details)=>{if(details.level==='error')errors.push(String(details.message));});
  await win.loadFile(path.join(__dirname,'index.html'));
  if(userSessionTest)win.show();
  if(smoke){try{await runSmoke(errors);app.exit(0);}catch(error){await fs.mkdir(smokeDir,{recursive:true});await fs.writeFile(path.join(smokeDir,'smoke-failure.txt'),error.stack);console.error(error);app.exit(1);}}
});
app.on('window-all-closed',()=>app.quit());
async function runSmoke(errors){
  await fs.mkdir(smokeDir,{recursive:true});
  await fs.rm(path.join(smokeDir,'smoke-failure.txt'),{force:true});
  const watchdog=setTimeout(()=>{console.error('Smoke test timed out');app.exit(1);},180000);
  const js=code=>win.webContents.executeJavaScript(code,true);
  const reload=async(code)=>{await js(code.replace('location.reload()','void 0'));await win.loadFile(path.join(__dirname,'index.html'));};
  const assert=async(code,label)=>{if(!await js(code))throw new Error(label);};
  const shot=async(name)=>{win.show();if(win.isMinimized())win.restore();await js(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);let lastError;for(let attempt=0;attempt<3;attempt++){await new Promise(resolve=>setTimeout(resolve,300*(attempt+1)));try{const captured=await win.webContents.capturePage(undefined,{stayAwake:true});if(captured.isEmpty())throw new Error('Empty native screenshot');await fs.writeFile(path.join(smokeDir,name),captured.toPNG());return;}catch(error){lastError=error;}}throw new Error('Native screenshot failed: '+name,{cause:lastError});};
  console.log('Smoke: resetting assessment');
  await reload(`localStorage.clear(); location.reload();`);
  await assert(`document.querySelector('#start').textContent.includes('Discover')`,'Home page missing');
  await shot('01-overview.png');
  win.setSize(820,760);await new Promise(resolve=>setTimeout(resolve,150));
  await assert(`document.documentElement.scrollWidth<=innerWidth`,'Narrow layout must not overflow horizontally');
  await shot('04-compact-overview.png');win.setSize(1280,880);
  await js(`document.querySelector('#start').click()`);
  await assert(`document.querySelector('#next').disabled`,'Unanswered question must prevent next');
  await js(`document.querySelector('[data-choice="0"]').click(); document.querySelector('#name').value='Alex'; document.querySelector('#name').dispatchEvent(new Event('input'));`);
  await shot('02-assessment.png');
  await js(`document.querySelector('#next').click()`);
  await assert(`document.querySelector('#question-title').textContent===BrainCore.questions[1].prompt`,'Question progression failed');
  console.log('Smoke: checking resume');
  await reload(`location.reload()`);
  await assert(`document.querySelector('#start').textContent.includes('Continue')`,'Resume did not persist');
  await js(`document.querySelector('#start').click()`);
  await assert(`document.querySelector('#question-title').textContent===BrainCore.questions[1].prompt`,'Resume position incorrect');
  for(let i=1;i<20;i++)await js(`document.querySelector('[data-choice="${i%3}"]').click(); document.querySelector('#next').click()`);
  await assert(`Boolean(document.querySelector('#profile-title'))`,'Profile missing');
  await assert(`document.querySelectorAll('.matrix-cell.chosen').length===1`,'Profile matrix position missing');
  await assert(`typeof require==='undefined' && typeof process==='undefined'`,'Renderer isolation failed');
  await js(`document.querySelector('#save-profile').click()`);
  await assert(`document.querySelector('#save-profile').disabled && document.querySelector('#history-count').textContent==='1'`,'Save profile failed');
  await shot('03-profile.png');
  const pdf=await win.webContents.printToPDF({printBackground:true,pageSize:'A4'});if(pdf.subarray(0,5).toString()!=='%PDF-')throw new Error('PDF generation failed');await fs.writeFile(path.join(smokeDir,'sample-profile.pdf'),pdf);
  await js(`document.querySelector('[data-route="history"]').click()`);
  await assert(`document.querySelectorAll('.history-row').length===1`,'History missing');
  await js(`document.querySelector('[data-view="0"]').click(); document.querySelector('#review').click()`);
  await assert(`document.querySelector('[data-choice="0"]').getAttribute('aria-pressed')==='true'`,'Review answers failed');
  await js(`document.querySelector('[data-choice="2"]').click()`);
  await assert(`JSON.parse(localStorage.getItem('brain-studio-v1')).history[0].answers.q01===0`,'Review mutated saved snapshot');
  win.webContents.sendInputEvent({type:'keyDown',keyCode:'Return'});win.webContents.sendInputEvent({type:'keyUp',keyCode:'Return'});
  await new Promise(resolve=>setTimeout(resolve,100));
  await assert(`document.querySelector('#question-title').textContent===BrainCore.questions[1].prompt`,'Enter must advance after selecting an answer');
  await js(`document.querySelector('#name').value='<script>alert(1)</script>';document.querySelector('#name').dispatchEvent(new Event('input'));document.querySelector('[data-question="19"]').click();document.querySelector('#next').click();`);
  await assert(`!document.querySelector('#content script') && document.querySelector('h1').textContent.includes('<script>')`,'Name must render as text');
  await js(`window.testOriginalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw new Error('Test storage unavailable')};document.querySelector('#save-profile').click();`);
  await assert(`!document.querySelector('#save-profile').disabled && document.querySelector('#toast').textContent.includes('could not be saved')`,'Failed persistence must not show success');
  await js(`Storage.prototype.setItem=window.testOriginalSetItem;void 0;`);
  await js(`window.confirm=()=>true;document.querySelector('#restart').click();`);
  await assert(`JSON.parse(localStorage.getItem('brain-studio-v1')).history.length===1 && Object.keys(JSON.parse(localStorage.getItem('brain-studio-v1')).answers).length===0`,'New assessment must retain saved history');
  await js(`document.querySelector('[data-route="history"]').click();document.querySelector('[data-delete="0"]').click();`);
  await assert(`document.querySelector('#history-count').textContent==='0' && JSON.parse(localStorage.getItem('brain-studio-v1')).history.length===0`,'Delete saved profile failed');
  await reload(`localStorage.setItem('brain-studio-v1','{bad json'); location.reload()`);
  await assert(`Boolean(document.querySelector('#start')) && Boolean(document.querySelector('.storage-warning'))`,'Corrupt saved data recovery failed');
  const localeChecks=[];
  await reload(`localStorage.setItem('brain-studio-v1',JSON.stringify({answers:Object.fromEntries(BrainCore.questions.map(q=>[q.id,1])),index:19,name:'Alex',history:[]}));localStorage.setItem('brain-studio-language','en');location.reload();`);
  await js(`document.querySelector('[data-route="assessment"]').click();document.querySelector('#next').click();`);
  const languageCodes=await js(`Array.from(document.querySelector('#language').options).map(x=>x.value)`);
  for(const language of languageCodes){
    await js(`document.querySelector('#language').value=${JSON.stringify(language)};document.querySelector('#language').dispatchEvent(new Event('change'));`);
    await assert(`document.documentElement.lang===${JSON.stringify(language)} && document.documentElement.dir===${JSON.stringify(['ar','ur','fa','he'].includes(language)?'rtl':'ltr')}`,'Locale or layout direction incorrect: '+language);
    await assert(`document.querySelectorAll('.matrix-cell.chosen').length===1 && BrainCore.score(JSON.parse(localStorage.getItem('brain-studio-v1')).answers).analytical===50`,'Language must preserve answers and scoring: '+language);
    await assert(`document.documentElement.scrollWidth<=innerWidth`,'Full-width language overflow: '+language);
    if(language==='ar'){await shot('05-arabic-profile.png');const report=await win.webContents.printToPDF({printBackground:true,pageSize:'A4'});await fs.writeFile(path.join(smokeDir,'arabic-profile.pdf'),report);}
    await js(`document.querySelector('#review').click();`);
    if(language==='zh')await shot('08-chinese-assessment.png');
    for(let i=0;i<20;i++){
      await js(`document.querySelector('[data-question="${i}"]').click();`);
      await assert(`document.querySelector('#question-title').textContent===BrainCoreLocalized.questions[${i}].prompt`,'Localized questionnaire mismatch: '+language+' '+i);
    }
    await js(`document.querySelector('[data-route="about"]').click()`);
    await assert(`document.querySelector('.about').textContent.includes(I18n.t('Privacy by design'))`,'Localized help missing: '+language);
    await js(`document.querySelector('[data-route="home"]').click()`);
    if(language==='ar')await shot('07-arabic-full-overview.png');
    if(language!=='en')await assert(`document.querySelector('h1').textContent!==BRAIN_TRANSLATIONS.en['Get to know your thinking.']`,'Untranslated home heading: '+language);
    win.setSize(820,760);await new Promise(resolve=>setTimeout(resolve,50));
    await assert(`document.documentElement.scrollWidth<=innerWidth`,'Compact language overflow: '+language);
    if(language==='ar')await shot('06-arabic-overview.png');
    win.setSize(1280,880);
    await assert(`I18n.missing.size===0`,'Missing translations: '+language);
    localeChecks.push({language,dir:['ar','ur','fa','he'].includes(language)?'rtl':'ltr',questions:20,home:true,results:true,help:true,compact:true});
    await js(`document.querySelector('[data-route="assessment"]').click();document.querySelector('[data-question="19"]').click();document.querySelector('#next').click();`);
  }
  if(languageCodes.length!==30)throw new Error('Expected 30 complete language options, got '+languageCodes.length);
  await reload(`localStorage.setItem('brain-studio-language','ar');location.reload();`);
  await assert(`document.documentElement.lang==='ar' && document.documentElement.dir==='rtl'`,'Language preference did not persist');
  await js(`document.querySelector('[data-route="assessment"]').click();document.querySelector('#name').value='Visual';document.querySelector('#name').dispatchEvent(new Event('input'));document.querySelector('[data-question="19"]').click();document.querySelector('#next').click();document.querySelector('#save-profile').click();document.querySelector('[data-route="history"]').click();`);
  await assert(`document.querySelector('.history-row bdi').textContent==='Visual'`,'User names must not be translated as catalog phrases');
  await js(`document.querySelector('[data-route="assessment"]').click();document.querySelector('[data-question="0"]').click();document.dispatchEvent(new KeyboardEvent('keydown',{key:'١',bubbles:true}));`);
  await assert(`document.querySelector('[data-choice="0"]').getAttribute('aria-pressed')==='true'`,'Arabic number shortcut failed');
  console.log('Smoke: professional research and workspace workflows');
  await js(`I18n.setLanguage('en');document.querySelector('#language').value='en';BrainApp.navigate('library');document.querySelector('[data-instrument="ipip-50"]').click();`);
  for(let index=0;index<50;index++)await js(`document.querySelector('[data-prof-value="3"]').click();document.querySelector('#prof-next').click();`);
  await assert(`document.querySelectorAll('.score-row').length===5&&Array.from(document.querySelectorAll('.score-row strong')).every(node=>node.textContent==='30')`,'Published neutral IPIP result must be five independently expected sums of30');
  await assert(`JSON.parse(localStorage.getItem('brain-studio-workspace-v2')).profiles[0].language==='en'`,'Research administration language must preserve source English');
  await shot('09-published-ipip-report.png');
  const researchPDF=await win.webContents.printToPDF({printBackground:true,pageSize:'A4'});await fs.writeFile(path.join(smokeDir,'published-ipip-report.pdf'),researchPDF);
  await js(`BrainApp.navigate('library');document.querySelector('[data-instrument="work-style"]').click();`);
  for(let index=0;index<36;index++)await js(`document.querySelector('[data-prof-value="3"]').click();document.querySelector('#prof-next').click();`);
  await assert(`document.querySelectorAll('.score-row').length===9&&Array.from(document.querySelectorAll('.score-row strong')).every(node=>node.textContent==='12')`,'Custom neutral response sums must be12 on all9 scales');
  const professionalLocales=[];
  for(const language of languageCodes){
    await js(`document.querySelector('#language').value=${JSON.stringify(language)};document.querySelector('#language').dispatchEvent(new Event('change'));`);
    await assert(`document.querySelectorAll('.score-row').length===9&&document.documentElement.scrollWidth<=innerWidth`,'Professional report layout/scoring failed: '+language);
    for(const route of ['library','portfolio','roles','coaching','development','team','feedback','skills','workspace'])await js(`BrainApp.navigate(${JSON.stringify(route)});`);
    await assert(`I18n.missing.size===0`,'Missing professional translations: '+language+' '+await js('JSON.stringify([...I18n.missing])'));
    professionalLocales.push({language,routes:9,rawScoresPreserved:true});
    await js(`BrainApp.navigate('portfolio');`);
    if(language==='ar'){await shot('10-arabic-workspace-report.png');await fs.writeFile(path.join(smokeDir,'arabic-workspace-report.pdf'),await win.webContents.printToPDF({printBackground:true,pageSize:'A4'}));}
  }
  await fs.writeFile(path.join(smokeDir,'professional-smoke-results.json'),JSON.stringify({passed:true,ipipNeutralExpected:[30,30,30,30,30],workingNeutralExpected:Array(9).fill(12),locales:professionalLocales,sourceEnglishPreserved:true},null,2));
  await fs.writeFile(path.join(smokeDir,'locale-smoke-results.json'),JSON.stringify({passed:true,languages:localeChecks,languagePersistence:true,userNamePreservation:true,arabicNumberShortcut:true},null,2));
  if(errors.length)throw new Error('Renderer errors: '+errors.join('\n'));
  await fs.writeFile(path.join(smokeDir,'smoke-results.json'),JSON.stringify({passed:true,checks:['home','compact layout','answer gate','progression','resume and saved position','20-question completion','matrix marker','name HTML escaping','renderer isolation','save history','PDF generation','reopen report','review answers','snapshot isolation','Enter shortcut','failed persistence handling','restart retains history','delete history','corrupt storage recovery'],electron:process.versions.electron,pdfBytes:pdf.length},null,2));
  console.log('Native smoke checks passed.');
  clearTimeout(watchdog);
}
