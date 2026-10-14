'use strict';
(() => {
  let context=null,approved=null,generation=0;
  const t=value=>window.I18n?.t(value)||value;
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const label=value=>escape(t(value));
  function setContext(profile,result){context=profile?window.BrainAICore.sanitizeContext(profile,result):null;approved=null;}
  function mount(container=document.getElementById('content')) {
    if(!container)return;
    const version=++generation,api=window.desktop;let revision=0;
    if(!api?.aiConfigure||!api?.aiPreview||!api?.aiSend){container.innerHTML=`<section class="result-summary"><h2>${label('AI reflection · bring your own provider')}</h2><p>${label('AI provider connections are available in the desktop app only. The browser edition does not request or store API keys.')}</p><p>${label('Deterministic assessment scores remain available offline.')}</p></section>`;return;}
    approved=null;
    container.innerHTML=`<section class="result-summary"><h2>${label('AI reflection · bring your own provider')}</h2><p>${label('Optional educational analysis. AI output is not a diagnosis, hiring recommendation, validated score, or neural assessment. Your deterministic results will not change.')}</p><p>${label('Only the exact preview is sent after you click Send. The selected provider receives that data under its own privacy and billing terms.')}</p><p>${label('Names, profile identifiers, answer-level responses, and private notes are excluded from the automatic summary. Review your own question for sensitive information.')}</p><div class="form-grid"><label>${label('Provider format')}<select id="ai-provider" class="field"><option value="openai">${label('OpenAI API')}</option><option value="custom">${label('Custom OpenAI-compatible API')}</option></select></label><label>${label('Full HTTPS chat-completions endpoint')}<input id="ai-endpoint" class="field" type="url" autocomplete="off" spellcheck="false" value="https://api.openai.com/v1/chat/completions"></label><label>${label('Model name')}<input id="ai-model" class="field" maxlength="160" autocomplete="off" spellcheck="false"></label><label>${label('API key · this session only')}<input id="ai-key" class="field" type="password" autocomplete="off" spellcheck="false" maxlength="4096" data-i18n-skip></label></div><p class="note">${label('The API key stays in memory only. It is not saved in settings, logs, exports, or local storage. Closing the app clears the session. Use Clear key to remove it now.')}</p><div class="result-actions"><button id="ai-configure" class="secondary">${label('Use provider for this session')}</button><button id="ai-clear" class="text-button">${label('Clear key and preview')}</button></div><p id="ai-status" role="status"></p><label class="form-label" for="ai-question">${label('Your reflection question')}</label><textarea id="ai-question" class="field" rows="4" maxlength="6000" data-i18n-skip></textarea><div class="result-actions"><button id="ai-preview" class="secondary">${label('Preview exact payload')}</button><button id="ai-send" class="primary" disabled>${label('Send preview to provider')}</button><button id="ai-cancel" class="secondary" disabled>${label('Cancel request')}</button></div><p class="note">${label('Preview contains the assessment summary and your question. The Authorization key is not included in the preview body.')}</p><p id="ai-destination" data-i18n-skip></p><label class="form-label" for="ai-payload">${label('Exact outbound JSON body')}</label><textarea id="ai-payload" class="field" readonly rows="10" data-i18n-skip></textarea><h3>${label('AI response · unverified educational commentary')}</h3><p>${label('AI can make mistakes. Check claims against the source instrument and real examples. This text does not modify any assessment record.')}</p><pre id="ai-output" role="status" data-i18n-skip></pre></section>`;
    const get=id=>container.querySelector('#'+id);
    const status=message=>{if(version===generation)get('ai-status').textContent=t(message);};
    const invalidate=()=>{revision++;approved=null;get('ai-send').disabled=true;get('ai-payload').value='';get('ai-destination').textContent='';};
    const checked=result=>{if(!result?.ok)throw new Error(result?.error?.message||'The provider operation could not be completed.');return result.value;};
    get('ai-provider').onchange=()=>{invalidate();get('ai-endpoint').value=get('ai-provider').value==='openai'?'https://api.openai.com/v1/chat/completions':'';};
    ['ai-endpoint','ai-model','ai-key','ai-question'].forEach(id=>get(id).oninput=invalidate);
    get('ai-configure').onclick=async()=>{
      invalidate();
      const settings={provider:get('ai-provider').value,endpoint:get('ai-endpoint').value,model:get('ai-model').value,apiKey:get('ai-key').value};
      get('ai-key').value='';
      try{checked(await api.aiConfigure(settings));status('Provider configured for this session. No assessment data has been sent.');}catch(error){status(error.message);}finally{settings.apiKey='';}
    };
    get('ai-clear').onclick=async()=>{invalidate();get('ai-key').value='';get('ai-output').textContent='';try{checked(await api.aiClear());status('API key and preview cleared from this session.');}catch(error){status(error.message);}};
    get('ai-preview').onclick=async()=>{
      invalidate();
      const requestRevision=revision;
      try{if(!context)throw new Error('Select a complete assessment report first.');
        const preview=checked(await api.aiPreview({context:context,prompt:get('ai-question').value,language:window.I18n?.language||'en'}));
        if(version!==generation||requestRevision!==revision)return;
        approved=preview.token;get('ai-payload').value=JSON.stringify(preview.body,null,2);get('ai-destination').textContent=t('Preview destination')+': '+preview.endpoint;get('ai-send').disabled=false;
        status('Preview ready. Nothing has been sent. Send uses the provider configuration that created this preview.');
      }catch(error){status(error.message);}
    };
    get('ai-send').onclick=async()=>{
      if(!approved)return;
      const token=approved;approved=null;get('ai-send').disabled=true;get('ai-cancel').disabled=false;get('ai-output').textContent='';status('Sending the approved preview. You can cancel this request.');
      try{const result=checked(await api.aiSend({token}));if(version===generation){get('ai-output').textContent=result.text;status('AI response received. Scores and saved assessment records are unchanged.');}}
      catch(error){status(error.message);}
      finally{if(version===generation)get('ai-cancel').disabled=true;}
    };
    get('ai-cancel').onclick=async()=>{try{checked(await api.aiCancel());status('The provider request was cancelled.');}catch(error){status(error.message);}};
    api.aiStatus?.().then(result=>{if(version!==generation)return;const settings=checked(result);get('ai-provider').value=settings.provider;get('ai-endpoint').value=settings.endpoint;get('ai-model').value=settings.model;status(settings.configured?'Provider configured for this session. No assessment data has been sent.':'Configure a provider and a memory-only API key first.');}).catch(()=>status('The provider operation could not be completed.'));
  }
  window.BrainAI=Object.freeze({setContext,mount});
})();
