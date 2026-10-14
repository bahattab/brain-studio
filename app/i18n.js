'use strict';
(() => {
  const languages=[['en','English','ltr'],['ar','العربية','rtl'],['zh','简体中文','ltr'],['es','Español','ltr'],['hi','हिन्दी','ltr'],['fr','Français','ltr'],['pt','Português','ltr'],['ru','Русский','ltr'],['bn','বাংলা','ltr'],['ja','日本語','ltr'],['de','Deutsch','ltr'],['ur','اردو','rtl'],['id','Bahasa Indonesia','ltr'],['ko','한국어','ltr'],['tr','Türkçe','ltr'],['it','Italiano','ltr'],['fa','فارسی','rtl'],['he','עברית','rtl'],['sw','Kiswahili','ltr'],['vi','Tiếng Việt','ltr'],['pa','ਪੰਜਾਬੀ','ltr'],['mr','मराठी','ltr'],['te','తెలుగు','ltr'],['ta','தமிழ்','ltr'],['th','ไทย','ltr'],['gu','ગુજરાતી','ltr'],['pl','Polski','ltr'],['uk','Українська','ltr'],['ms','Bahasa Melayu','ltr'],['ha','Hausa','ltr']].map(([code,name,dir])=>({code,name,dir}));
  const data=window.BRAIN_TRANSLATIONS;
  let language='en';try{const saved=localStorage.getItem('brain-studio-language');if(data[saved])language=saved;}catch{}
  const missing=new Set(),canonical=new WeakMap();let localizedValues=new Set();
  const mirrored=text=>['ar','ur','fa','he'].includes(language)?text.replace(/[←→↗]/g,char=>({'←':'→','→':'←','↗':'↖'}[char])):text;
  const number=value=>new Intl.NumberFormat(language,{useGrouping:false}).format(Number(value));
  function t(key,params={}){const map=data[language]||data.en;let result=map[key];if(result===undefined){if(data.en[key]!==undefined)missing.add(language+':'+key);result=key;}if(['ar','ur','fa','he'].includes(language))result=result.replace(/[←→↗]/g,char=>({'←':'→','→':'←','↗':'↖'}[char]));return result.replace(/\{(\w+)\}/g,(match,name)=>Object.hasOwn(params,name)?String(params[name]):match);}
  function translate(raw){
    const key=raw.trim();if(!key||localizedValues.has(key))return raw;
    let result;
    if(Object.hasOwn(data.en,key))result=t(key);
    else if(/^(?:QUESTION|Question) (\d+), answered$/.test(key)){result=t('Question {number}, answered',{number:number(key.match(/\d+/)[0])});}
    else if(/^(?:QUESTION|Question) (\d+)$/.test(key)){result=t('Question {number}',{number:number(key.match(/\d+/)[0])});}
    else if(/^\d+ answered$/.test(key))result=t('{count} answered',{count:number(key.match(/\d+/)[0])});
    else if(/^\d+ of 20 answers saved on this device\.$/.test(key))result=t('{count} of 20 answers saved on this device.',{count:number(key.match(/\d+/)[0])});
    else if(/^\d+% of preference score$/.test(key))result=t('{percent}% of preference score',{percent:number(key.match(/\d+/)[0])});
    else if(/^Delete profile \d+$/.test(key))result=t('Delete profile {number}',{number:number(key.match(/\d+/)[0])});
    else if(key.startsWith('Your profile position: thinking band ')){const n=key.match(/\d+/g);result=t('Your profile position: thinking band {thinking} of 5, perception band {perception} of 5',{thinking:number(n[0]),perception:number(n[2])});}
    else if(/^(Analytical|Visual) \d+ percent, (Intuitive|Auditory) \d+ percent$/.test(key)){const parts=key.match(/^(\w+) (\d+) percent, (\w+) (\d+) percent$/);result=t('{left} {l} percent, {right} {r} percent',{left:t(parts[1]),l:number(parts[2]),right:t(parts[3]),r:number(parts[4])});}
    else if(key.startsWith('/ '))result='/ '+translate(key.slice(2));
    else if(key.startsWith('· '))result='· '+translate(key.slice(2));
    else if(key.endsWith(', your perspective, mapped.'))result=t('{name}, your perspective, mapped.',{name:'\u2068'+key.slice(0,-', your perspective, mapped.'.length)+'\u2069'});
    else if(key.includes(' · '))result=key.split(' · ').map(part=>translate(part)).join(' · ');
    else if(/^[◎●◷←] /.test(key))result=key.slice(0,2)+translate(key.slice(2));
    else if(/^\d+$/.test(key))result=number(key);
    else {result=key;if(language!=='en'&&/[a-zA-Z]{3}/.test(key)&&!/[0-9۰-۹٠-٩]/.test(key)&&!['brain','studio','b.'].includes(key)&&!localizedValues.has(key))missing.add(language+':unregistered:'+key);}
    return raw.slice(0,raw.indexOf(key))+result+raw.slice(raw.indexOf(key)+key.length);
  }
  function translateDOM(root){
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
    while((node=walker.nextNode())){if(['SCRIPT','STYLE','OPTION'].includes(node.parentElement?.tagName)||node.parentElement?.closest('[data-i18n-skip]'))continue;const previous=canonical.get(node);const source=previous&&node.textContent===previous.translated?previous.source:node.textContent;const translated=translate(source);canonical.set(node,{source,translated});node.textContent=translated;}
    const elements=[...(root.querySelectorAll?.('[placeholder],[aria-label],[title]')||[])];
    for(const element of elements)for(const attr of ['placeholder','aria-label','title'])if(element.hasAttribute(attr)){const name='data-i18n-'+attr;if(!element.hasAttribute(name))element.setAttribute(name,element.getAttribute(attr));element.setAttribute(attr,translate(element.getAttribute(name)));}
  }
  function setLanguage(code){if(!data[code])code='en';language=code;localizedValues=new Set(Object.values(data[code]).map(mirrored));const meta=languages.find(x=>x.code===code);document.documentElement.lang=code;document.documentElement.dir=meta?.dir||'ltr';try{localStorage.setItem('brain-studio-language',code);}catch{}missing.clear();}
  const core=window.BrainCore;
  window.BrainCoreLocalized={get questions(){return core.questions.map(q=>({...q,prompt:t(q.prompt),options:q.options.map(o=>({...o,label:t(o.label)}))}));},score:core.score,validateAnswers:core.validateAnswers,profile(result){const p=core.profile(result);return {...p,title:p.title.split(' · ').map(t).join(' · '),thinkingText:t(p.thinkingText),perceptionText:t(p.perceptionText),tips:p.tips.map(text=>t(text))};}};
  window.I18n={languages,t,translate,translateDOM,setLanguage,number,missing,get language(){return language;},get direction(){return document.documentElement.dir;}};
  setLanguage(language);
})();
