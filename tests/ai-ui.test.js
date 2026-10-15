'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function ui(api){
  const nodes={},container={querySelector:selector=>nodes[selector.slice(1)]};
  Object.defineProperty(container,'innerHTML',{set(html){container.markup=html;for(const match of html.matchAll(/id="([^"]+)"/g))nodes[match[1]]={value:'',disabled:false,textContent:'',innerHTML:''};}});
  const window={desktop:api,BrainAICore:{sanitizeContext:x=>x},I18n:{t:x=>x,language:'en'}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../app/ai-ui.js'),'utf8'),{window,document:{getElementById:()=>container}});
  window.BrainAI.setContext({scales:[]},{});window.BrainAI.mount(container);return {nodes,window,container};
}
const ok=value=>({ok:true,value}),base=()=>({aiConfigure:async()=>ok({}),aiPreview:async()=>ok({token:'preview-token',body:{stream:true},endpoint:'https://provider.example'}),aiSend:async()=>ok({text:'answer'}),aiCancel:async()=>ok({})});
test('all provider choices, conditional local endpoint and optional Ollama key',async()=>{
  let received;const app=ui({...base(),aiConfigure:async input=>{received={...input};return ok({});}});
  for(const provider of ['openai','anthropic','gemini','openrouter','custom','ollama'])assert(app.container.markup.includes('value="'+provider+'"'));
  app.nodes['ai-provider'].value='ollama';app.nodes['ai-provider'].onchange();assert.equal(app.nodes['ai-key'].required,false);assert.equal(app.nodes['ai-endpoint-label'].hidden,false);assert.equal(app.nodes['ai-local-note'].hidden,false);assert(app.container.markup.includes('Cloud-backed models can forward data and incur provider charges')); 
  app.nodes['ai-model'].value='local-exact-model';await app.nodes['ai-configure'].onclick();assert.equal(received.stream,true);assert.equal(received.endpoint,'http://127.0.0.1:11434/v1/chat/completions');assert.equal(received.apiKey,'');
  app.nodes['ai-provider'].value='anthropic';app.nodes['ai-provider'].onchange();assert.equal(app.nodes['ai-key'].required,true);assert.equal(app.nodes['ai-endpoint-label'].hidden,true);
});
test('stream output binds request ID, escapes as text, ignores late cancelled deltas and unsubscribes',async()=>{
  let listener,finish,request,unsubscribed=0;
  const app=ui({...base(),aiOnStream:callback=>{listener=callback;return()=>{unsubscribed++;};},aiSend:input=>{request=input;return new Promise(resolve=>finish=resolve);}});
  await app.nodes['ai-preview'].onclick();const pending=app.nodes['ai-send'].onclick();
  listener({requestId:'other-request',delta:'wrong'});assert.equal(app.nodes['ai-output'].textContent,'');
  listener({requestId:request.requestId,delta:'<script>safe text</script>'});assert.equal(app.nodes['ai-output'].textContent,'<script>safe text</script>');assert.equal(app.nodes['ai-output'].innerHTML,'');
  await app.nodes['ai-cancel'].onclick();listener({requestId:request.requestId,delta:'late'});finish(ok({text:'stale completion'}));await pending;
  assert.equal(app.nodes['ai-output'].textContent,'<script>safe text</script>');assert.equal(unsubscribed,1);assert.equal(app.nodes['ai-send'].disabled,true);
});
test('saved settings use explicit secure IPC and never refill a key',async()=>{
  let saved,activated,deleted;const record={id:'saved-1',name:'My model',provider:'gemini',model:'exact-model',endpoint:''};
  const app=ui({...base(),aiProvidersList:async()=>ok({available:true,providers:[record]}),aiProvidersSave:async input=>{saved=JSON.parse(JSON.stringify(input));return ok(record);},aiProvidersActivate:async id=>{activated=id;return ok(record);},aiProvidersDelete:async id=>{deleted=id;return ok({});}});
  await new Promise(resolve=>setImmediate(resolve));app.nodes['ai-provider'].value='gemini';app.nodes['ai-model'].value='exact-model';app.nodes['ai-key'].value='secret-key';app.nodes['ai-save-name'].value='My model';await app.nodes['ai-save'].onclick();
  assert.equal(saved.settings.apiKey,'secret-key');assert.equal(app.nodes['ai-key'].value,'');app.nodes['ai-saved-list'].value='saved-1';await app.nodes['ai-activate'].onclick();assert.equal(activated,'saved-1');assert.equal(app.nodes['ai-model'].value,'exact-model');assert.equal(app.nodes['ai-key'].value,'');
  await app.nodes['ai-delete'].onclick();assert.equal(deleted,'saved-1');
});
test('secure storage unavailable disables save but preserves session configuration',async()=>{
  const app=ui({...base(),aiProvidersList:async()=>ok({available:false,providers:[]})});await new Promise(resolve=>setImmediate(resolve));assert.equal(app.nodes['ai-save'].disabled,true);assert.equal(app.nodes['ai-configure'].disabled,false);
});


test('route/context disposal cancels in-flight request and ignores old response',async()=>{
  let listener,finish,request,cancels=0,unsubscribed=0;
  const app=ui({...base(),aiCancel:async()=>{cancels++;return ok({});},aiOnStream:callback=>{listener=callback;return()=>{unsubscribed++;};},aiSend:input=>{request=input;return new Promise(resolve=>finish=resolve);}});
  await app.nodes['ai-preview'].onclick();const pending=app.nodes['ai-send'].onclick();
  app.window.BrainAI.setContext({scales:[]},{});app.window.BrainAI.mount(app.container);
  listener({requestId:request.requestId,delta:'old route'});finish(ok({text:'old completion'}));await pending;
  assert.equal(app.nodes['ai-output'].textContent,'');assert.equal(unsubscribed,1);assert.equal(cancels,1);
});
test('output token limit is disclosed without changing returned text',async()=>{
  const app=ui({...base(),aiSend:async()=>ok({text:'Partial reflection',truncated:true})});
  await app.nodes['ai-preview'].onclick();await app.nodes['ai-send'].onclick();
  assert.equal(app.nodes['ai-output'].textContent,'Partial reflection');assert.match(app.nodes['ai-status'].textContent,/token limit.*incomplete/);
});
