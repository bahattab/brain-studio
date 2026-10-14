'use strict';
const { _electron }=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'../..'),evidence=path.join(root,'evidence','native-v2-locator-'+Date.now());fs.mkdirSync(evidence,{recursive:true});
 const app=await _electron.launch({args:['.','--user-session-test','--evidence-dir='+evidence],cwd:root});
 const page=await app.firstWindow(),errors=[];
 try{page.on('pageerror',error=>errors.push(error.message));await page.locator('[data-route="library"]').waitFor();
 assert(await page.evaluate(()=>typeof CSSMarginRule==='function'));
 const results=[],pdfs=[];
 for(const sample of [{id:'ohbds-20-v1',count:20,value:3,expected:[60]},{id:'ipip-50',count:50,value:1,expected:[30,26,26,42,22]}]){
 await page.locator('[data-route="library"]').click();await page.locator('[data-instrument="'+sample.id+'"]').click();await page.locator('#professional-name').fill('Synthetic Native Review');
 assert(await page.locator('#original-english').isChecked());
 for(let i=0;i<sample.count;i++){await page.locator('[data-prof-value="'+sample.value+'"]').click();await page.locator('#prof-next').click();}
 const scores=(await page.locator('.score-row strong').allTextContents()).map(Number);assert.deepEqual(scores,sample.expected);
 const pdf=await app.evaluate(async({BrowserWindow})=>{const win=BrowserWindow.getAllWindows()[0];return Array.from(await win.webContents.printToPDF({printBackground:true,pageSize:'A4',preferCSSPageSize:true}));});const pdfPath=path.join(evidence,sample.id+'.pdf');fs.writeFileSync(pdfPath,Buffer.from(pdf));pdfs.push(pdfPath);
 results.push({instrument:sample.id,answered:sample.count,scores});await page.screenshot({path:path.join(evidence,sample.id+'.png'),fullPage:true});
 }
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('brain-studio-workspace-v2')));assert.equal(saved.profiles.length,2);assert.equal(Object.keys(saved.profiles[0].answers).length,50);
 await page.selectOption('#language','ar');assert.equal(await page.locator('html').getAttribute('dir'),'rtl');await page.selectOption('#language','en');assert.equal(await page.locator('html').getAttribute('dir'),'ltr');
 await page.reload();await page.locator('[data-route="library"]').waitFor();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('brain-studio-workspace-v2')).profiles.length),2);assert.deepEqual(errors,[]);
 const validator=fs.readFileSync(path.join(root,'tests/platform/print-credit.test.cjs'),'utf8').match(/const validator=String.raw`([\s\S]*?)`;/)[1];const checked=require('node:child_process').spawnSync(process.env.PDF_VERIFICATION_PYTHON||'python',['-c',validator,'Created by Brain Studio, Emad Bahattab, Email: bahattab@yahoo.com',...pdfs],{encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'}});assert.equal(checked.status,0,checked.stderr);fs.writeFileSync(path.join(evidence,'pdf-geometry.json'),checked.stdout);
 fs.writeFileSync(path.join(evidence,'results.json'),JSON.stringify({passed:true,interaction:'Native Electron renderer with Playwright locator clicks; physical Windows desktop input unverified',results,errors},null,2));console.log(JSON.stringify({passed:true,evidence,results}));
 }catch(error){fs.writeFileSync(path.join(evidence,'failure.json'),JSON.stringify({error:error.message,errors,url:page.url(),controls:await page.locator('[data-route], [data-instrument]').evaluateAll(nodes=>nodes.map(n=>({text:n.textContent,route:n.dataset.route,instrument:n.dataset.instrument})))},null,2));fs.writeFileSync(path.join(evidence,'failure.html'),await page.content());await page.screenshot({path:path.join(evidence,'failure.png'),fullPage:true});console.error('Failure evidence: '+evidence);throw error;}finally{await app.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
