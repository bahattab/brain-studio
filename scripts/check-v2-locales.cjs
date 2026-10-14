'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {extract}=require('./extract-v2-locales.cjs');
const R=require('../app/research-core.js');
const H=require('../app/thinking-core.js');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'app/locales');
const catalog=JSON.parse(fs.readFileSync(path.join(folder,'catalog.json'),'utf8'));
const extracted=extract();
const preserve=new Set([...extracted.preserve,'Brain Studio · 1.0']);
// Correct native words can share their English spelling; these were reviewed.
const nativeShared={de:new Set(['(optional)']),fr:new Set(['Question'])};
const placeholders=text=>[...text.matchAll(/\{\w+\}/g)].map(x=>x[0]).sort();
for(const key of extracted.keys)assert(Object.hasOwn(catalog,key),'Unregistered public text: '+key);
for(const source of extracted.sourceOnly)assert(!Object.hasOwn(catalog,source),'Protected O*NET/skills source added to translation catalog: '+source);
for(const protocolKey of ['Authorization','max_completion_tokens','max_tokens','temperature','model','messages','role','content','apiKey','token'])assert(!extracted.keys.includes(protocolKey),'AI protocol field extracted as public caption: '+protocolKey);
const languages=[];
for(const file of fs.readdirSync(folder).filter(file=>file.endsWith('.json')&&file!=='catalog.json')){
  const language=file.slice(0,-5),map=JSON.parse(fs.readFileSync(path.join(folder,file),'utf8'));
  assert.deepEqual(Object.keys(map).sort(),Object.keys(catalog).sort(),language+': incomplete keys');
  for(const [key,value] of Object.entries(map)){
    assert(typeof value==='string'&&value.trim(),language+': empty translation');
    assert.deepEqual(placeholders(value),placeholders(key),language+': placeholders '+key);
    assert(!/\uFFFD|BSTOKEN\d+X/.test(value),language+': encoding/token residue');
    if(extracted.keys.includes(key)&&!preserve.has(key)&&!nativeShared[language]?.has(key))assert.notEqual(value,key,language+': untranslated professional string '+key);
  }
  for(const item of R.instruments[0].items)assert(map[item.prompt]&&map[item.prompt]!==item.prompt,language+': missing optional IPIP adaptation');
  for(const item of H.instruments[0].items)assert(map[item.prompt]&&map[item.prompt]!==item.prompt,language+': missing optional OHBDS adaptation');
  assert.equal(map['Created by Brain Studio, Emad Bahattab, Email: bahattab@yahoo.com'],'Created by Brain Studio, Emad Bahattab, Email: bahattab@yahoo.com',language+': creator credit must stay exact');
  for(const key of extracted.keys)for(const brand of ['OHBDS','HBDI'])if(key.includes(brand))assert(map[key].includes(brand),language+': protected brand '+brand);
  languages.push(language);
}
assert.equal(languages.length,29);
console.log(JSON.stringify({languages:languages.length+1,catalogKeys:Object.keys(catalog).length,professionalKeys:extracted.keys.length,sourceOnlyStrings:extracted.sourceOnly.length,optionalIPIPItems:R.instruments[0].items.length,optionalOHBDSItems:H.instruments[0].items.length,placeholderFailures:0,untranslatedProfessionalFailures:0},null,2));
