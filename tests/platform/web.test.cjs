'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const http=require('node:http');
const {buildWeb,walk}=require('../../scripts/platform/build-web.cjs');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
function bundle(){return buildWeb({root,output:fs.mkdtempSync(path.join(os.tmpdir(),'brain-web-'))});}
test('web bundle excludes Electron, precaches portable modules and preserves desktop CSP',()=>{
  const original=fs.readFileSync(path.join(root,'app/index.html'),'utf8'),built=bundle();
  assert(!walk(built.output).some(f=>f.endsWith('.cjs')));
  const html=fs.readFileSync(path.join(built.output,'index.html'),'utf8');
  assert(html.indexOf('web-adapter.js')<html.indexOf('src="ui.js"'));
  assert.match(html,/worker-src 'self'/);assert.match(html,/connect-src 'self'/);
  assert.equal(fs.readFileSync(path.join(root,'app/index.html'),'utf8'),original);
  const manifest=JSON.parse(fs.readFileSync(path.join(built.output,'manifest.webmanifest'),'utf8'));
  assert.equal(manifest.scope,'./');assert.equal(manifest.start_url,'./index.html');assert.equal(manifest.display,'standalone');
  assert.deepEqual(manifest.icons.map(i=>i.sizes),['192x192','512x512']);
  assert(built.files.includes('research-core.js'));assert(built.files.includes('translations.js'));assert(built.files.includes('locales/ar.json'));
  const sw=fs.readFileSync(path.join(built.output,'service-worker.js'),'utf8');
  for(const file of built.files)assert(sw.includes(JSON.stringify('./'+file)),`Missing precache: ${file}`);
  assert.throws(()=>buildWeb({root,output:built.output}),/must be empty/);
});
test('PWA operates offline in browser; exports are requested without false save confirmation',{timeout:60000},async t=>{
  const built=bundle();
  const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml'};
  const server=http.createServer((request,response)=>{
    const requested=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
    if(!requested.startsWith('/studio/')){response.writeHead(404);response.end();return;}
    const file=path.resolve(built.output,requested.slice('/studio/'.length)||'index.html');
    if(!file.startsWith(built.output+path.sep)){response.writeHead(403);response.end();return;}
    try{response.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream'});response.end(fs.readFileSync(file));}
    catch{response.writeHead(404);response.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>server.close());
  const browser=await chromium.launch({headless:true,channel:process.env.PLATFORM_BROWSER_CHANNEL||(process.platform==='win32'?'msedge':undefined)});t.after(()=>browser.close());
  const context=await browser.newContext({acceptDownloads:true});const page=await context.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error'||message.type()==='warning')errors.push(message.text());});
  await page.goto(`http://127.0.0.1:${server.address().port}/studio/index.html`);
  await page.waitForFunction(()=>document.querySelector('#content')?.children.length>0);
  try { await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller),{},{timeout:20000}); }
  catch(error){throw new Error(`Offline worker did not activate: ${errors.join('; ')}; ${error.message}`);}
  assert.equal(await page.evaluate(()=>navigator.serviceWorker.controller.scriptURL.endsWith('/studio/service-worker.js')),true);
  const languageCount=await page.locator('#language option').count();assert.equal(languageCount,30);
  await page.evaluate(()=>caches.open('brain-studio:unrelated-scope:fixture'));
  assert((await page.evaluate(()=>caches.keys())).includes('brain-studio:unrelated-scope:fixture'));
  await page.evaluate(()=>localStorage.setItem('platform-test','offline fixture'));
  await context.setOffline(true);await page.reload();
  await page.waitForFunction(()=>document.querySelector('#content')?.children.length>0);
  assert.equal(await page.evaluate(()=>localStorage.getItem('platform-test')),'offline fixture');
  assert.equal(await page.locator('#language option').count(),languageCount);
  assert.deepEqual(await page.evaluate(async()=>{let called=false;window.print=()=>{called=true;};const result=await window.desktop.exportPDF('ar');return {called,saved:result.saved,requested:result.printRequested};}),{called:true,saved:false,requested:true});
  const downloading=page.waitForEvent('download');
  const returned=await page.evaluate(()=>window.desktop.exportJSON({language:'ar',answers:{one:4},note:'اختبار'}));
  const download=await downloading;const file=path.join(built.output,'test-export.json');await download.saveAs(file);
  assert.equal(returned.saved,false);assert.equal(returned.downloadRequested,true);
  assert.deepEqual(JSON.parse(fs.readFileSync(file,'utf8')),{language:'ar',answers:{one:4},note:'اختبار'});
  assert.deepEqual(errors,[]);
});
