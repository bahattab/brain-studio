'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events');
const C=require('../app/ai-core');
const base={provider:'openai',model:'user-chosen-model',apiKey:'testing-secret-key'};
const input={prompt:'Reflect cautiously.',context:{instrumentId:'sample',scales:[{id:'a',title:'A',sum:3,mean:3,min:1,max:5}]}};
function transport(packets){const calls=[];return {calls,request(url,options,callback){const req=new EventEmitter();req.destroy=()=>{};req.end=body=>{calls.push({url:url.href,options,body:JSON.parse(body)});queueMicrotask(()=>{const res=new EventEmitter();res.statusCode=200;res.destroy=()=>{};callback(res);for(const p of packets)res.emit('data',Buffer.isBuffer(p)?p:Buffer.from(p));res.emit('end');});};return req;}};}
async function run(provider,packets,extras={}){const settings=C.validateSettings({...base,provider,...extras}),mock=transport(packets),chunks=[];const client=C.createClient({request:mock.request,lookup:async()=>[{address:provider==='ollama'?'127.0.0.1':'8.8.8.8',family:4}]});const result=await client.send(settings,C.buildPayload(settings,input),chunk=>chunks.push(chunk));return {result,chunks,call:mock.calls[0]};}
const event=obj=>'data: '+JSON.stringify(obj)+'\n\n';
test('native provider payloads, exact model endpoint and authentication headers',async()=>{
 const a=await run('anthropic',[JSON.stringify({content:[{type:'text',text:'Claude text'}]})]);assert.equal(a.result.text,'Claude text');assert.equal(a.call.options.headers['anthropic-version'],'2023-06-01');assert.equal(a.call.options.headers['x-api-key'],base.apiKey);assert.equal(a.call.options.headers.Authorization,undefined);assert(a.call.body.system);assert.equal(a.call.body.max_tokens,1200);
 const g=await run('gemini',[JSON.stringify({candidates:[{content:{parts:[{text:'Gemini text'}]}}]})]);assert.equal(g.result.text,'Gemini text');assert.equal(g.call.options.headers['x-goog-api-key'],base.apiKey);assert(g.call.url.endsWith('user-chosen-model:generateContent'));assert(g.call.body.systemInstruction);assert.equal(g.call.body.generationConfig.maxOutputTokens,1200);
 const o=await run('openrouter',[JSON.stringify({choices:[{message:{content:'Router text'}}]})]);assert.equal(o.call.url,C.PROVIDERS.openrouter);assert.equal(o.call.body.model,base.model);
});
test('Ollama permits explicit loopback only, key optional, DNS cannot escape loopback',async()=>{
 for(const endpoint of ['http://localhost:11434/v1/chat/completions','http://127.0.0.1:11434/v1/chat/completions','http://[::1]:11434/v1/chat/completions'])assert(C.validateSettings({...base,provider:'ollama',endpoint,apiKey:''}));
 for(const endpoint of ['http://192.168.1.2:11434/v1','http://0.0.0.0:11434/v1','https://provider.ai/v1','http://localhost.evil.com/v1'])assert.throws(()=>C.validateSettings({...base,provider:'ollama',endpoint,apiKey:''}));
 const local=await run('ollama',[JSON.stringify({choices:[{message:{content:'Local reflection'}}]})],{apiKey:''});assert.equal(local.result.text,'Local reflection');assert.equal(local.call.options.headers.Authorization,undefined);
 const config=C.validateSettings({...base,provider:'ollama',apiKey:''}),client=C.createClient({request:()=>assert.fail(),lookup:async()=>[{address:'8.8.8.8',family:4}]});await assert.rejects(client.send(config,C.buildPayload(config,input)),e=>e.code==='ADDRESS');
});
test('SSE handles bytewise UTF8 packets, split secret and completion marker',async()=>{
 const payload=event({choices:[{delta:{content:'مرحبا '+base.apiKey.slice(0,7)}}]})+event({choices:[{delta:{content:base.apiKey.slice(7)+' world'}}]})+'data: [DONE]\n\n';
 const out=await run('openai',[...Buffer.from(payload)].map(byte=>Buffer.from([byte])),{stream:true});assert.equal(out.result.text,'مرحبا [redacted] world');assert.equal(out.chunks.join(''),out.result.text);assert(!out.chunks.join('').includes(base.apiKey));assert.equal(out.call.body.stream,true);
});
test('Anthropic and Gemini native SSE completion and text extraction',async()=>{
 const a=await run('anthropic',[event({type:'content_block_delta',delta:{type:'text_delta',text:'Hello'}}),event({type:'message_stop'})],{stream:true});assert.equal(a.result.text,'Hello');
 const g=await run('gemini',[event({candidates:[{content:{parts:[{thought:true,text:'private thought'},{text:'Visible'}]}}]}),event({candidates:[{finishReason:'STOP'}]})],{stream:true});assert.equal(g.result.text,'Visible');assert(g.call.url.endsWith(':streamGenerateContent?alt=sse'));
});
test('SSE rejects provider error, malformed event, missing terminal marker and oversized output',async()=>{
 for(const packet of [event({error:{message:base.apiKey}}),'data: not-json\n\n',event({choices:[{delta:{content:'unfinished'}}]}),'data: '+JSON.stringify({choices:[{delta:{content:'x'.repeat(40001)}}]})+'\n\n'])await assert.rejects(run('openai',[packet],{stream:true}),e=>!e.message.includes(base.apiKey));
 await assert.rejects(run('openai',['data: [DONE]'],{stream:true}));
});
test('provider settings reject invalid streaming values and never store a key in preview',async()=>{
 assert.throws(()=>C.validateSettings({...base,stream:'true'}));let callbackSeen=false;const service=C.createService({client:{cancel(){},async send(settings,body,callback){callback('safe');return {text:'safe'};}},randomToken:()=> 'token'});service.configure({...base,provider:'gemini',stream:true});const p=service.preview(input);assert(!JSON.stringify(p).includes(base.apiKey));assert(p.endpoint.includes('alt=sse'));await service.send({token:p.token},()=>callbackSeen=true);assert(callbackSeen);await assert.rejects(service.send({token:p.token}));
});
test('real local HTTP compatible model streams only after an explicit approved send',async()=>{
 const http=require('node:http');let calls=0;
 const server=http.createServer((req,res)=>{calls++;assert.equal(req.headers.authorization,undefined);let body='';req.on('data',b=>body+=b);req.on('end',()=>{assert.equal(JSON.parse(body).model,'local-model');res.writeHead(200,{'Content-Type':'text/event-stream'});res.write(event({choices:[{delta:{content:'Local '}}]}));res.end(event({choices:[{delta:{content:'result'}}]})+'data: [DONE]\n\n');});});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{const service=C.createService();service.configure({provider:'ollama',endpoint:'http://127.0.0.1:'+server.address().port+'/v1/chat/completions',model:'local-model',apiKey:'',stream:true});const preview=service.preview(input);assert.equal(calls,0);const chunks=[];const result=await service.send({token:preview.token},text=>chunks.push(text));assert.equal(result.text,'Local result');assert.equal(chunks.join(''),result.text);assert.equal(calls,1);service.clear();}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
test('terminal stream events cannot append text; token limits and blocked Gemini results are explicit',async()=>{
 const g=await run('gemini',[event({candidates:[{content:{parts:[{text:'Partial'}]},finishReason:'MAX_TOKENS'}]}),event({candidates:[{content:{parts:[{text:'ignored'}]}}]})],{stream:true});assert.equal(g.result.text,'Partial');assert.equal(g.result.truncated,true);
 await assert.rejects(run('gemini',[event({candidates:[{finishReason:'SAFETY'}]})],{stream:true}),e=>e.code==='PROVIDER');
 const o=await run('openai',[event({choices:[{delta:{content:'Good'}}]})+'data: [DONE]\n\n'+event({choices:[{delta:{content:'ignored'}}]})],{stream:true});assert.equal(o.result.text,'Good');
});
test('real loopback HTTP streaming request cancels while awaiting completion',async()=>{
 const http=require('node:http');let started;const start=new Promise(resolve=>started=resolve);
 const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/event-stream'});res.write(event({choices:[{delta:{content:'Pending'}}]}));started();});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{const service=C.createService();service.configure({provider:'ollama',endpoint:'http://127.0.0.1:'+server.address().port+'/v1/chat/completions',model:'local',apiKey:'',stream:true});const p=service.preview(input),sending=service.send({token:p.token});await start;service.cancel();await assert.rejects(sending,e=>e.code==='CANCELLED');}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
test('nonstream token limits are reported, safety is rejected and overlong text is not silently cut',async()=>{
 const samples=[['openai',{choices:[{message:{content:'Partial'},finish_reason:'length'}]}],['anthropic',{content:[{type:'text',text:'Partial'}],stop_reason:'max_tokens'}],['gemini',{candidates:[{content:{parts:[{text:'Partial'}]},finishReason:'MAX_TOKENS'}]}]];
 for(const [provider,body] of samples){const result=await run(provider,[JSON.stringify(body)]);assert.equal(result.result.truncated,true);assert.equal(result.result.text,'Partial');}
 await assert.rejects(run('gemini',[JSON.stringify({candidates:[{content:{parts:[{text:'blocked'}]},finishReason:'SAFETY'}]})]),e=>e.code==='PROVIDER');
 await assert.rejects(run('gemini',[JSON.stringify({promptFeedback:{blockReason:'SAFETY'}})]),e=>e.code==='PROVIDER');
 await assert.rejects(run('openai',[JSON.stringify({choices:[{message:{content:'x'.repeat(40001)}}]})]),e=>e.code==='RESPONSE');
});
test('Ollama base URLs normalize to compatible route and native incompatible paths are rejected',()=>{
 for(const suffix of ['', '/', '/v1', '/v1/','/v1/chat/completions'])assert.equal(C.validateSettings({...base,provider:'ollama',endpoint:'http://localhost:11434'+suffix,apiKey:''}).endpoint,'http://localhost:11434/v1/chat/completions');
 for(const suffix of ['/api/chat','/api/generate','/other','/v1/chat/completions/'])assert.throws(()=>C.validateSettings({...base,provider:'ollama',endpoint:'http://localhost:11434'+suffix,apiKey:''}),e=>e.code==='ENDPOINT');
});
test('unsupported OpenAI and Anthropic stop reasons never masquerade as completed text',async()=>{
 for(const reason of ['content_filter','tool_calls','function_call']){
   await assert.rejects(run('openai',[JSON.stringify({choices:[{message:{content:'Partial'},finish_reason:reason}]})]),e=>e.code==='PROVIDER');
   await assert.rejects(run('openai',[event({choices:[{delta:{content:'Partial'}}]})+event({choices:[{delta:{},finish_reason:reason}]})+'data: [DONE]\n\n'],{stream:true}),e=>e.code==='PROVIDER');
 }
 for(const reason of ['tool_use','pause_turn','refusal']){
   await assert.rejects(run('anthropic',[JSON.stringify({content:[{type:'text',text:'Partial'}],stop_reason:reason})]),e=>e.code==='PROVIDER');
   await assert.rejects(run('anthropic',[event({type:'content_block_delta',delta:{type:'text_delta',text:'Partial'}})+event({type:'message_delta',delta:{stop_reason:reason}})+event({type:'message_stop'})],{stream:true}),e=>e.code==='PROVIDER');
 }
});
