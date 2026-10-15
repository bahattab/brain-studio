'use strict';
// Real Electron renderer -> preload -> main -> AI core -> controlled loopback SSE.
// This exercises Ollama's compatible transport, not a real model or cloud provider.
const {_electron}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
  const root=path.resolve(__dirname,'../..'),evidence=path.join(root,'evidence','ai-native-'+Date.now());fs.mkdirSync(evidence,{recursive:true});
  const calls=[],timers=new Set();let secondClosed=false,app,page;
  const later=(fn,ms)=>{const timer=setTimeout(()=>{timers.delete(timer);fn();},ms);timers.add(timer);return timer;};
  const event=text=>'data: '+JSON.stringify({choices:[{delta:{content:text}}]})+'\n\n';
  const server=http.createServer((request,response)=>{
    let input='';request.on('data',chunk=>input+=chunk);request.on('end',()=>{
      try{
        assert.equal(request.url,'/v1/chat/completions');assert.equal(request.method,'POST');assert.equal(request.headers.authorization,undefined);
        const body=JSON.parse(input);assert.equal(body.model,'synthetic-native-model');assert.equal(body.stream,true);calls.push(body);
        response.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache'});
        if(calls.length===1){
          // Split inside a multi-byte Arabic character to exercise incremental UTF-8 decoding.
          const bytes=Buffer.from(event('مرحبا بالعالم — ')),split=bytes.indexOf(Buffer.from('م'))+1;response.write(bytes.subarray(0,split));
          later(()=>{response.write(bytes.subarray(split));response.write(event('Reflection in progress. '));},50);
          later(()=>{response.end(event('Complete ✓')+'data: '+JSON.stringify({choices:[{delta:{},finish_reason:'stop'}]})+'\n\ndata: [DONE]\n\n');},1800);
        }else{
          response.write(event('Cancellable reflection. '));
          const interval=setInterval(()=>response.write(event('Waiting for cancellation. ')),100);timers.add(interval);
          response.on('close',()=>{secondClosed=true;clearInterval(interval);timers.delete(interval);});
        }
      }catch(error){response.writeHead(500);response.end('Fixture validation failed');calls.push({error:error.message});}
    });
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    app=await _electron.launch({args:['.',...(process.platform==='linux'?['--no-sandbox']:[]),'--user-session-test','--evidence-dir='+evidence],cwd:root});page=await app.firstWindow();page.setDefaultTimeout(20000);const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.waitForFunction(()=>!!window.ProfessionalUI&&!!window.BrainAI);await page.locator('[data-route="library"]').click();await page.locator('[data-instrument="ohbds-20-v1"]').click();await page.locator('#professional-name').fill('Synthetic AI Native Review');
    for(let i=0;i<20;i++){await page.locator('[data-prof-value="3"]').click();await page.locator('#prof-next').click();}
    assert.deepEqual((await page.locator('.score-row strong').allTextContents()).map(Number),[60]);
    const before=await page.evaluate(()=>localStorage.getItem('brain-studio-workspace-v2'));
    await page.locator('[data-route="ai"]').click();await page.locator('#ai-provider').selectOption('ollama');await page.locator('#ai-endpoint').fill('http://127.0.0.1:'+server.address().port+'/v1/chat/completions');await page.locator('#ai-model').fill('synthetic-native-model');await page.locator('#ai-configure').click();
    await page.waitForFunction(()=>document.getElementById('ai-status').textContent.includes('Provider configured'));assert.equal(await page.locator('#ai-key').inputValue(),'');
    await page.locator('#ai-question').fill('Suggest one careful reflection exercise.');await page.locator('#ai-preview').click();await page.waitForFunction(()=>!document.getElementById('ai-send').disabled);
    const preview=JSON.parse(await page.locator('#ai-payload').inputValue());assert.equal(preview.model,'synthetic-native-model');assert.equal(preview.stream,true);assert(!JSON.stringify(preview).includes('Synthetic AI Native Review'));assert.equal(calls.length,0,'preview/configure must be network-free');
    await page.locator('#ai-send').click();await page.waitForFunction(()=>document.getElementById('ai-output').textContent.includes('Reflection in progress.'));
    assert(!((await page.locator('#ai-output').textContent()).includes('Complete')),'intermediate streamed text must precede completion');
    await page.waitForFunction(()=>document.getElementById('ai-output').textContent.includes('Complete ✓'));await page.waitForFunction(()=>document.getElementById('ai-cancel').disabled);assert.equal(await page.locator('#ai-output').textContent(),'مرحبا بالعالم — Reflection in progress. Complete ✓');assert.equal(calls.length,1);
    await page.screenshot({path:path.join(evidence,'stream-complete.png'),fullPage:true});
    await page.locator('#ai-question').fill('Start a second reflection for cancellation.');await page.locator('#ai-preview').click();await page.waitForFunction(()=>!document.getElementById('ai-send').disabled);assert.equal(calls.length,1);
    await page.locator('#ai-send').click();await page.waitForFunction(()=>document.getElementById('ai-output').textContent.includes('Cancellable reflection.'));await page.locator('#ai-cancel').click();
    await page.waitForFunction(()=>document.getElementById('ai-status').textContent.includes('cancelled'));await page.waitForFunction(()=>!document.getElementById('ai-preview').disabled);
    const cancelledText=await page.locator('#ai-output').textContent();await new Promise(resolve=>setTimeout(resolve,350));assert(secondClosed,'cancel must close the actual HTTP stream');assert.equal(await page.locator('#ai-output').textContent(),cancelledText);assert.equal(calls.length,2);assert(calls.every(call=>!call.error));
    assert.equal(await page.evaluate(()=>localStorage.getItem('brain-studio-workspace-v2')),before,'AI must not modify scores or stored records');assert.deepEqual(errors,[]);
    const results={passed:true,transport:'Real native IPC and loopback HTTP SSE; synthetic server, no cloud credentials or real Ollama inference',assessment:'OHBDS neutral 60',requests:calls.length,networkFreePreview:true,unicodeStreaming:true,cancelClosedSocket:secondClosed,assessmentRecordsUnchanged:true,errors};fs.writeFileSync(path.join(evidence,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({...results,evidence}));
  }catch(error){if(page){fs.writeFileSync(path.join(evidence,'failure.html'),await page.content());await page.screenshot({path:path.join(evidence,'failure.png'),fullPage:true}).catch(()=>{});}fs.writeFileSync(path.join(evidence,'failure.json'),JSON.stringify({error:error.message,calls:calls.length,secondClosed},null,2));throw error;
  }finally{for(const timer of timers){clearTimeout(timer);clearInterval(timer);}await app?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
