'use strict';
// Pure candidate review; source-English DOM exceptions remain in the browser audit.
function reviewCandidate(finding,map){
 const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const fragments=Object.entries(map).filter(([key,value])=>key!==value&&value.length>=2&&!value.includes('{')).map(([,value])=>value).sort((a,b)=>b.length-a.length);
  let remainder=finding.text;
  const templates=Object.values(map).filter(v=>v.includes('{')).sort((a,b)=>b.length-a.length).map(v=>new RegExp(escape(v).replace(/\\\{(?:number|count|percent|thinking|perception|l|r)\\\}/g,'[\\p{N}.,]+').replace(/\\\{(?:left|right|name)\\\}/g,'.*'),'u'));
  for(const template of templates)remainder=remainder.replace(template,'');
  // Consume complete localized values before partial template fragments. Otherwise
  // a shared word can destroy an exact longer match and create a false residue.
  for(const value of fragments)remainder=remainder.split(value).join('');
  for(const part of Object.values(map).filter(v=>v.includes('{')).flatMap(v=>v.split(/\{\w+\}/)).filter(p=>p.trim().length>=3).sort((a,b)=>b.length-a.length))remainder=remainder.split(part).join('');
  for(const month of Array.from({length:12},(_,i)=>new Intl.DateTimeFormat(finding.language,{month:'long'}).format(new Date(2026,i,15))))remainder=remainder.split(month).join('');
  remainder=remainder.replace(/https?:\/\/\S+/g,'').replace(/Brain Studio|IPIP-?50|O\*NET®?|OHBDS|Enter|Learning Styles/g,'').replace(/[\p{N}\p{P}\p{S}\s\u200e\u200f\u2068\u2069]/gu,'');
  let reason=!/[A-Za-z]{3}/.test(remainder)?'localized catalog fragments, numbers, brand identifiers, keyboard key or citation title':null;
  if(Object.entries(map).some(([key,value])=>key!==value&&value===finding.text.replace(/^[\s·/]+/,'')))reason='exact localized catalog value with layout separator';
  if(finding.kind==='same-as-English catalog'&&((['es','pt','ms'].includes(finding.language)&&finding.text==='Visual')||(finding.language==='fr'&&['Question','20 questions · ~5 minutes'].includes(finding.text))||(finding.language==='de'&&finding.text==='(optional)')))reason='legitimate identical spelling in target language';
  return {language:finding.language,text:finding.text,remainder,reason,state:finding.state};
}
module.exports={reviewCandidate};
