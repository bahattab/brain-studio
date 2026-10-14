'use strict';
// Local-only browser route sweep with a mocked desktop AI interface. No keys,
// provider transport, personal profiles, or external service calls are involved.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
(async()=>{
  const app=path.resolve(__dirname,'../../app');
  const server=http.createServer((request,response)=>{
    const url=new URL(request.url,'http://localhost');
    const file=path.resolve(app,'.'+(url.pathname==='/'?'/index.html':url.pathname));
    if(!file.startsWith(app+path.sep)){response.writeHead(403);return response.end();}
    let data;try{data=fs.readFileSync(file);}catch{response.writeHead(404);return response.end();}
    const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json'};
    response.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});response.end(data);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch({headless:true,channel:process.env.PLATFORM_BROWSER_CHANNEL||(process.platform==='win32'?'msedge':undefined)});
    const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(()=>{
      window.desktop={
        aiConfigure:async()=>({ok:true,value:{}}),
        aiPreview:async()=>({ok:false,error:{message:'Select a complete assessment report first.'}}),
        aiSend:async()=>({ok:false,error:{message:'The provider operation could not be completed.'}}),
        aiClear:async()=>({ok:true,value:{}}),aiCancel:async()=>({ok:true,value:{}}),
        aiStatus:async()=>({ok:true,value:{configured:true,provider:'openai',endpoint:'https://api.openai.com/v1/chat/completions',model:'locale-fixture'}})
      };
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.waitForSelector('#language option',{state:'attached'});
    const languages=await page.locator('#language option').evaluateAll(options=>options.map(option=>option.value));
    let visits=0;
    for(const language of languages){
      await page.selectOption('#language',language);
      for(const route of ['library','ai','about']){
        await page.locator(`[data-route="${route}"]`).click();
        const state=await page.evaluate(()=>({missing:[...I18n.missing],lang:document.documentElement.lang,dir:document.documentElement.dir}));
        const expectedDir=['ar','ur','fa','he'].includes(language)?'rtl':'ltr';
        if(state.lang!==language||state.dir!==expectedDir||state.missing.length)throw Error(`${language} ${route} ${JSON.stringify(state)}`);
        visits++;
      }
      await page.locator('[data-route="library"]').click();
      await page.locator('[data-instrument="ohbds-20-v1"]').click();
      const toggle=page.locator('#original-english');if(!await toggle.isChecked())await toggle.check();
      const english=await page.locator('#professional-question').textContent();
      if(english!=='I do not need others praise.')throw Error('Source English changed: '+language);
      if(language!=='en'){
        await toggle.uncheck();
        if(await page.locator('#professional-question').textContent()===english)throw Error('Optional OHBDS adaptation absent: '+language);
      }
      const missing=await page.evaluate(()=>[...I18n.missing]);if(missing.length)throw Error(`${language} instrument ${JSON.stringify(missing)}`);
      visits++;
    }
    // A synthetic complete report enables the full desktop AI form. The mocked
    // status is configured; transport functions still cannot make a live request.
    await page.evaluate(()=>{
      const instrument=ThinkingCore.instruments[0],answers=Object.fromEntries(instrument.items.map(item=>[item.id,3]));
      const profile={id:'locale-fixture',instrumentId:instrument.id,instrumentVersion:instrument.metadata.version,name:'Locale fixture',date:Date.now(),elapsedWallTimeMs:0,language:'en',answers,answerLanguages:Object.fromEntries(instrument.items.map(item=>[item.id,'en']))};
      localStorage.setItem('brain-studio-workspace-v2',JSON.stringify({drafts:{},profiles:[profile],models:[],plans:[],notes:{},feedbacks:[],rubrics:[]}));
    });
    await page.reload();
    for(const language of languages){
      await page.selectOption('#language',language);await page.locator('[data-route="ai"]').click();
      await page.waitForSelector('#ai-provider');
      const missing=await page.evaluate(()=>[...I18n.missing]);if(missing.length)throw Error(`${language} full AI form ${JSON.stringify(missing)}`);
      visits++;
    }
    if(errors.length)throw Error(JSON.stringify(errors));
    console.log(JSON.stringify({languages:languages.length,routeVisits:visits,routes:['library','AI empty/full configured mock','about','OHBDS original/optional'],missing:0,pageErrors:0,liveProviderCalls:0}));
  }finally{try{if(browser)await browser.close();}finally{await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});}}
})().catch(error=>{console.error(error);process.exitCode=1;});
