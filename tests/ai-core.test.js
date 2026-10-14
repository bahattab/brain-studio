'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const C=require('../app/ai-core.js');
const settings={provider:'custom',endpoint:'https://provider.ai/v1/chat/completions',model:'mock-model',apiKey:'fake-key-for-tests-only'};
const context={instrumentId:'ipip-50',instrumentVersion:'source-v1',administrationLanguage:'ar',scales:[{id:'factor',title:'A descriptive factor',sum:30,mean:3,min:10,max:50}],limitations:['Translation not psychometrically validated.'],validationStatus:'Arithmetic verified only.',interpretation:'No neural diagnosis.'};
const input=()=>({context:context,prompt:'Suggest a small reflection experiment.',language:'en'});
const publicDNS=async()=>[{address:'8.8.8.8',family:4}];
function mockTransport({status=200,body={choices:[{message:{content:'Mock educational text'}}]},silent=false}={}) {
  const calls=[];
  const request=(url,options,callback)=>{
    const req=new EventEmitter();req.destroy=()=>{req.destroyed=true;};
    req.end=data=>{calls.push({url:url.href,options,body:data});if(silent)return;queueMicrotask(()=>{const res=new EventEmitter();res.statusCode=status;res.destroy=()=>{res.destroyed=true;};callback(res);if(res.destroyed)return;res.emit('data',Buffer.from(typeof body==='string'?body:JSON.stringify(body)));res.emit('end');});};
    return req;
  };
  return {request,calls};
}
test('HTTPS settings reject URL credentials, localhost and literal private/special endpoints',()=>{
  for(const endpoint of ['http://provider.ai/v1','https://user:pass@provider.ai/v1','https://provider.ai/v1?key=secret','https://localhost/v1','https://service.local/v1','https://metadata.internal/v1','https://127.0.0.1/v1','https://2130706433/v1','https://0x7f000001/v1','https://10.0.0.1/v1','https://[::1]/v1','https://[::ffff:127.0.0.1]/v1','https://169.254.169.254/v1'])assert.throws(()=>C.validateSettings({...settings,endpoint}));
  assert.equal(C.validateSettings({...settings,endpoint:'https://provider.ai:8443/v1/chat/completions'}).endpoint,'https://provider.ai:8443/v1/chat/completions');
  assert.equal(C.validateSettings({...settings,provider:'openai',endpoint:'https://127.0.0.1'}).endpoint,C.DEFAULT_ENDPOINT);
  assert.throws(()=>C.validateSettings({...settings,apiKey:'fake\r\nheader'}));
});
test('public address classifier fails closed on IPv4/IPv6 reserved, mapped, tunnel and link-local ranges',()=>{
  for(const address of ['0.0.0.0','10.2.3.4','100.64.0.1','127.0.0.1','169.254.169.254','172.16.1.2','172.31.2.3','192.168.0.1','192.0.0.1','192.0.2.1','192.88.99.1','198.18.0.1','198.51.100.1','203.0.113.1','224.0.0.1','255.255.255.255','::1','::','fc00::1','fe80::1','fe80::1%eth0','::ffff:8.8.8.8','64:ff9b::808:808','2001:db8::1','2001::1','2002:7f00:1::','3fff::1'])assert.equal(C.isPublicAddress(address),false,address);
  for(const address of ['8.8.8.8','1.1.1.1','172.32.0.1','2001:4860:4860::8888','2606:4700:4700::1111'])assert.equal(C.isPublicAddress(address),true,address);
});
test('allowlisted context is idempotent and preserves scientific boundaries, stripping participant data',()=>{
  const profile={id:'private-id',name:'Private Name',language:'ar',answers:{secret:5},notes:'Private notes',apiKey:'private-key'};
  const result={instrumentId:'ipip-50',scales:context.scales,metadata:{version:'source-v1',limitations:context.limitations,validationStatus:context.validationStatus,interpretation:context.interpretation}};
  const summary=C.sanitizeContext(profile,result);
  assert.deepEqual(C.sanitizeContext(summary,summary),summary);
  const body=C.buildPayload(settings,{...input(),context:summary});
  const sent=JSON.parse(body.messages[1].content).assessment;
  assert.equal(sent.administrationLanguage,'ar');assert.deepEqual(sent.limitations,context.limitations);assert.equal(sent.validationStatus,context.validationStatus);assert.equal(sent.interpretation,context.interpretation);
  const serialized=JSON.stringify(body);for(const secret of ['private-id','Private Name','Private notes','private-key',settings.apiKey])assert(!serialized.includes(secret));
  assert.equal(body.max_tokens,1200);assert.equal(body.stream,false);
  assert.equal(C.buildPayload({...settings,provider:'openai'},input()).max_completion_tokens,1200);
});
test('payload limits and accidental credential inclusion are rejected',()=>{
  assert.throws(()=>C.buildPayload(settings,{...input(),prompt:'x'.repeat(6001)}));
  assert.throws(()=>C.buildPayload(settings,{...input(),prompt:settings.apiKey}));
  const large={...context,scales:Array.from({length:32},()=>({...context.scales[0],title:'字'.repeat(160)})),limitations:Array(12).fill('字'.repeat(600))};
  assert.throws(()=>C.buildPayload(settings,{...input(),context:large}),e=>e.code==='PAYLOAD');
});
test('configuration and preview are network-free; send requires current one-use approved snapshot',async()=>{
  const sent=[];let n=0;
  const service=C.createService({randomToken:()=>String(++n),client:{cancel(){},send:async(config,body)=>{sent.push({config,body});return {text:'mock'};}}});
  const status=service.configure(settings);assert(!JSON.stringify(status).includes(settings.apiKey));
  assert.equal(sent.length,0);await assert.rejects(service.send({token:'wrong'}));
  const first=service.preview(input());first.body.messages[1].content='tampered renderer content';assert.equal(sent.length,0);
  await service.send({token:first.token});assert.notEqual(sent[0].body.messages[1].content,'tampered renderer content');
  await assert.rejects(service.send({token:first.token}));
  const old=service.preview(input());service.configure({...settings,model:'changed-model'});await assert.rejects(service.send({token:old.token}));
  service.clear();assert.equal(service.status().configured,false);assert(!JSON.stringify(service.status()).includes(settings.apiKey));
});
test('HTTPS POST uses only authentication header, pins vetted DNS and preserves original hostname',async()=>{
  const mock=mockTransport(),client=C.createClient({lookup:publicDNS,request:mock.request});
  const result=await client.send(settings,C.buildPayload(settings,input()));assert.equal(result.text,'Mock educational text');assert.equal(mock.calls.length,1);
  const call=mock.calls[0];assert.equal(call.options.method,'POST');assert.equal(call.options.headers.Authorization,'Bearer '+settings.apiKey);assert(!call.body.includes(settings.apiKey));assert.equal(call.options.rejectUnauthorized,true);assert.equal(call.options.agent,false);
  let pinned;call.options.lookup('provider.ai',{},(...values)=>pinned=values);assert.deepEqual(pinned,[null,'8.8.8.8',4]);
  assert.equal(new URL(call.url).hostname,'provider.ai');
});
test('mixed DNS answers including one private address are blocked before transport',async()=>{
  const mock=mockTransport(),client=C.createClient({lookup:async()=>[{address:'8.8.8.8',family:4},{address:'127.0.0.1',family:4}],request:mock.request});
  await assert.rejects(client.send(settings,C.buildPayload(settings,input())),e=>e.code==='ADDRESS');assert.equal(mock.calls.length,0);
});
test('redirects do not forward authorization or retry; provider errors do not disclose response bodies',async()=>{
  for(const status of [302,401,403,429,500]){
    const mock=mockTransport({status,body:'provider secret '+settings.apiKey}),client=C.createClient({lookup:publicDNS,request:mock.request});
    await assert.rejects(client.send(settings,C.buildPayload(settings,input())),e=>!e.message.includes(settings.apiKey)&&!e.message.includes('provider secret'));
    assert.equal(mock.calls.length,1);
  }
});
test('DNS and HTTP phases have bounded timeout; explicit cancellation aborts only current request',async()=>{
  const dnsClient=C.createClient({lookup:()=>new Promise(()=>{}),request:()=>assert.fail('No transport before DNS'),timeoutMs:15});
  await assert.rejects(dnsClient.send(settings,C.buildPayload(settings,input())),e=>e.code==='TIMEOUT');
  const mock=mockTransport({silent:true}),client=C.createClient({lookup:publicDNS,request:mock.request,timeoutMs:15});
  await assert.rejects(client.send(settings,C.buildPayload(settings,input())),e=>e.code==='TIMEOUT');
  const cancelClient=C.createClient({lookup:publicDNS,request:mock.request,timeoutMs:1000});
  const pending=cancelClient.send(settings,C.buildPayload(settings,input()));await new Promise(resolve=>setImmediate(resolve));cancelClient.cancel();await assert.rejects(pending,e=>e.code==='CANCELLED');
});
test('response parsing rejects incompatible/oversized output and redacts echoed key',async()=>{
  for(const body of ['not-json',{choices:[]},'x'.repeat(C.MAX_RESPONSE_BYTES+1)]){
    const mock=mockTransport({body}),client=C.createClient({lookup:publicDNS,request:mock.request});await assert.rejects(client.send(settings,C.buildPayload(settings,input())));
  }
  const mock=mockTransport({body:{choices:[{message:{content:'<script>not executable</script> '+settings.apiKey}}]}}),client=C.createClient({lookup:publicDNS,request:mock.request});
  const result=await client.send(settings,C.buildPayload(settings,input()));assert(!result.text.includes(settings.apiKey));assert(result.text.includes('[redacted]'));
});
function fakeUI(api) {
  const nodes={};const container={querySelector:selector=>nodes[selector.slice(1)]};Object.defineProperty(container,'innerHTML',{set(html){container.markup=html;for(const match of html.matchAll(/id="([^"]+)"/g))nodes[match[1]]={value:'',disabled:false,textContent:'',innerHTML:''};},get(){return container.markup;}});
  const window={desktop:api,BrainAICore:C,I18n:{t:x=>x,language:'en'}};const sandbox={window,document:{getElementById:()=>container}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../app/ai-ui.js'),'utf8'),sandbox);return {window,container,nodes};
}
test('browser mount never requests keys; desktop mount has password field and no automatic transmission',()=>{
  const browser=fakeUI({});browser.window.BrainAI.mount(browser.container);assert(!browser.container.markup.includes('id="ai-key"'));assert(browser.container.markup.includes('desktop app only'));
  let sends=0;const desktop=fakeUI({aiConfigure:async()=>{},aiPreview:async()=>{},aiSend:async()=>{sends++;}});desktop.window.BrainAI.setContext(context,context);desktop.window.BrainAI.mount(desktop.container);assert.match(desktop.container.markup,/id="ai-key"[^>]*type="password"/);assert.equal(sends,0);
});
test('late preview response after question edit cannot re-enable an old send token',async()=>{
  let resolvePreview,sends=0;
  const ui=fakeUI({aiConfigure:async()=>({ok:true,value:{}}),aiPreview:()=>new Promise(resolve=>resolvePreview=resolve),aiSend:async()=>{sends++;return {ok:true,value:{text:'text'}};}});
  ui.window.BrainAI.setContext(context,context);ui.window.BrainAI.mount(ui.container);ui.nodes['ai-question'].value='first question';
  const pending=ui.nodes['ai-preview'].onclick();ui.nodes['ai-question'].value='changed question';ui.nodes['ai-question'].oninput();resolvePreview({ok:true,value:{token:'old-token',body:{},endpoint:settings.endpoint}});await pending;
  assert.equal(ui.nodes['ai-send'].disabled,true);await ui.nodes['ai-send'].onclick();assert.equal(sends,0);
});
test('AI output is inserted as text only and score context remains unmodified',async()=>{
  const before=JSON.stringify(context);let received;
  const ui=fakeUI({aiConfigure:async()=>({ok:true,value:{}}),aiPreview:async input=>({ok:true,value:{token:'mock-token',body:{model:'mock'},endpoint:settings.endpoint}}),aiSend:async input=>{received=input;return {ok:true,value:{text:'<img src=x onerror=alert(1)>'}};}});
  ui.window.BrainAI.setContext(context,context);ui.window.BrainAI.mount(ui.container);ui.nodes['ai-question'].value='Reflection';await ui.nodes['ai-preview'].onclick();await ui.nodes['ai-send'].onclick();
  assert.deepEqual(JSON.parse(JSON.stringify(received)),{token:'mock-token'});assert.equal(ui.nodes['ai-output'].textContent,'<img src=x onerror=alert(1)>');assert.equal(ui.nodes['ai-output'].innerHTML,'');assert.equal(JSON.stringify(context),before);assert(ui.nodes['ai-destination'].textContent.includes(settings.endpoint));
});
