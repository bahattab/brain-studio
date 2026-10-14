const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'app/locales');
const catalog=JSON.parse(fs.readFileSync(path.join(dir,'catalog.json'),'utf8'));
const extracted=require('./extract-v2-locales.cjs').extract();
for(const key of extracted.keys)if(!Object.hasOwn(catalog,key))throw new Error('Unregistered professional interface string: '+key);
const translations={en:catalog};
for(const file of fs.readdirSync(dir)){if(file==='catalog.json'||!file.endsWith('.json'))continue;const locale=JSON.parse(fs.readFileSync(path.join(dir,file),'utf8'));if(JSON.stringify(Object.keys(locale).sort())!==JSON.stringify(Object.keys(catalog).sort()))throw new Error('Incomplete locale: '+file);for(const [key,value] of Object.entries(locale)){if(typeof value!=='string'||!value.trim())throw new Error('Empty translation: '+file+' '+key);const placeholders=text=>[...text.matchAll(/\{(\w+)\}/g)].map(x=>x[1]).sort();if(JSON.stringify(placeholders(key))!==JSON.stringify(placeholders(value)))throw new Error('Placeholder mismatch: '+file+' '+key);}translations[file.slice(0,-5)]=locale;}
fs.writeFileSync(path.join(root,'app/translations.js'),'window.BRAIN_TRANSLATIONS='+JSON.stringify(translations)+';\n');
console.log('Bundled languages: '+Object.keys(translations).join(', '));
