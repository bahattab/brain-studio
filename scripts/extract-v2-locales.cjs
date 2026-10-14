'use strict';
// Reads public application source only. Original source instruments are separate
// from interface localization and are deliberately excluded from translation.
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const W=require('../app/workspace-core.js'),R=require('../app/research-core.js'),H=require('../app/thinking-core.js');
function literals(source) {
  return [...source.matchAll(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g)].map(match=>{
    const body=match[0].slice(1,-1);
    if(/[\r\n]/.test(body.replace(/\\\r?\n/g,'')))return '';
    return body.replace(/\\(?:u\{[a-fA-F0-9]+\}|u[a-fA-F0-9]{4}|x[a-fA-F0-9]{2}|\r?\n|[\s\S])/g,escaped=>{
      const value=escaped.slice(1);
      if(value.startsWith('u{'))return String.fromCodePoint(parseInt(value.slice(2,-1),16));
      if(value.startsWith('u'))return String.fromCharCode(parseInt(value.slice(1),16));
      if(value.startsWith('x'))return String.fromCharCode(parseInt(value.slice(1),16));
      return ({n:'\n',r:'\r',t:'\t',b:'\b',f:'\f',v:'\v','0':'\0'})[value]??(/^[\r\n]/.test(value)?'':value);
    });
  }).filter(value=>typeof value==='string');
}
function namedCallBodies(source,name){
  const bodies=[];const pattern=new RegExp('\\b'+name+'\\s*\\(','g');let match;
  while((match=pattern.exec(source))){
    const start=pattern.lastIndex;let depth=1,quote=null,escaped=false,index=start;
    for(;index<source.length&&depth;index++){
      const char=source[index];
      if(quote){if(escaped)escaped=false;else if(char==='\\')escaped=true;else if(char===quote)quote=null;continue;}
      if(char==="'"||char==='"'||char==='`')quote=char;
      else if(char==='(')depth++;else if(char===')')depth--;
    }
    if(!depth)bodies.push(source.slice(start,index-1));
  }
  return bodies;
}
function extract(){
  const keys=new Set();const sourceEnglish=new Set();const sourceOnly=new Set();
  const add=text=>{if(typeof text==='string'&&text.trim()&&/[A-Za-z]/.test(text))keys.add(text);};
  const professional=fs.readFileSync(path.join(root,'app/professional-ui.js'),'utf8');
  // Includes both arms of conditional captions and validation errors shown in toasts.
  for(const value of literals(professional))if(/^[A-Z]/.test(value)&&(/\s/.test(value)||value.length>7)&&!/[<>]/.test(value)&&!['TEXTAREA','ProfessionalUI'].includes(value))add(value);
  for(const match of professional.matchAll(/(?:h|tr|toast|confirm)\(\s*('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")/g))add(literals(match[1])[0]);
  add('Assessments run offline and answers stay on this device. Optional AI analysis sends only the data you preview and approve to your chosen API provider. Provider privacy and billing terms apply. API keys stay in memory for the current session.');
  add('Offline assessments. Optional AI, your choice.');
  const aiFile=path.join(root,'app/ai-ui.js');
  if(fs.existsSync(aiFile)){
    const aiUI=fs.readFileSync(aiFile,'utf8');
    // This UI module contains captions, not system prompts or protocol message bodies.
    for(const value of literals(aiUI))if(/^[A-Z]/.test(value)&&/\s/.test(value)&&!/[<>]/.test(value))add(value);
    for(const functionName of ['label','t','status'])for(const body of namedCallBodies(aiUI,functionName))for(const value of literals(body))if(/^[A-Z]/.test(value)&&/\s/.test(value))add(value);
    const aiCore=fs.readFileSync(path.join(root,'app/ai-core.js'),'utf8');
    // Only user-facing error messages inside fail(...); never scan system prompts,
    // provider IDs, protocol properties, API settings or actual runtime values.
    for(const body of namedCallBodies(aiCore,'fail'))for(const value of literals(body))if(/^[A-Z]/.test(value)&&/\s/.test(value)&&/[.!?]$/.test(value))add(value);
  }
  for(const text of ['self','manager','peer','direct-report','observer','customer','Self','Manager','Peer','Direct report','Observer','Customer','items','minutes','responses','tasks','within range','points earned','practice answers correct','selected profiles','dimensions within the selected ranges'])add(text);
  const html=fs.readFileSync(path.join(root,'app/index.html'),'utf8');
  for(const match of html.matchAll(/>([^<>]+)</g)){
    const text=match[1].trim().replace(/^[◉▥◇◌✓⋈◐▧▤◈◎]\s*/, '');
    if(text&&!['brain','studio','b.','brainstudio'].includes(text))add(text);
  }
  for(const instrument of [...R.instruments,...W.instruments,...H.instruments]){
    add(instrument.title);add(instrument.description);add(instrument.metadata.validationStatus);
    for(const scale of instrument.scales)add(scale.title);
    for(const item of instrument.items)if(item.difficulty)add(item.difficulty);
    if(['work-style','emotional-reflection','communication-style'].includes(instrument.id)){
      for(const item of instrument.items)add(item.prompt);
      for(const option of instrument.responseOptions)add(option.label);
    } else if(['ipip-50','ohbds-20-v1'].includes(instrument.id)) {
      for(const item of instrument.items){sourceEnglish.add(item.prompt);add(item.prompt);}
      if(instrument.instructions){sourceEnglish.add(instrument.instructions);add(instrument.instructions);}
      for(const option of instrument.responseOptions){sourceEnglish.add(option.label);add(option.label);}
    } else {
      for(const item of instrument.items){sourceEnglish.add(item.prompt);for(const choice of item.choices||[])sourceEnglish.add(choice);if(item.explanation)sourceEnglish.add(item.explanation);}
      if(instrument.instructions)sourceEnglish.add(instrument.instructions);
      if(instrument.interpretationInstructions)sourceEnglish.add(instrument.interpretationInstructions);
      for(const option of instrument.responseOptions)sourceEnglish.add(option.label);
      for(const item of instrument.items){sourceOnly.add(item.prompt);for(const choice of item.choices||[])sourceOnly.add(choice);if(item.explanation)sourceOnly.add(item.explanation);}
      if(instrument.instructions)sourceOnly.add(instrument.instructions);
      if(instrument.interpretationInstructions)sourceOnly.add(instrument.interpretationInstructions);
      for(const option of instrument.responseOptions)sourceOnly.add(option.label);
    }
  }
  for(const tool of H.externalTools){add(tool.title);add(tool.description);add(tool.metadata.validationStatus);add(tool.metadata.privacyBoundary);}
  for(const text of ['Left-brained','Right-brained','No clear preference',H.score('ohbds-20-v1',Object.fromEntries(H.instruments[0].items.map(item=>[item.id,3]))).interpretation])add(text);
  for(const role of W.roles)add(role.title);
  for(const themes of Object.values(W.feedbackSets))for(const theme of themes)add(theme);
  for(const value of literals(fs.readFileSync(path.join(root,'app/workspace-core.js'),'utf8')))if(/^[A-Z]/.test(value)&&/\s/.test(value)&&!sourceEnglish.has(value)&&!/[<>]/.test(value))add(value);
  for(const value of sourceOnly)keys.delete(value);
  // The instrument's proper name is preserved, while surrounding interface is localized.
  const preserve=['O*NET® Interest Profiler Short Form','Brain Studio','Brain Studio · 2.0','Created by Brain Studio, Emad Bahattab, Email: bahattab@yahoo.com'];
  const ipipFirstPerson=Object.fromEntries(R.instruments.find(instrument=>instrument.id==='ipip-50').items.map(item=>[item.prompt,'I '+item.prompt[0].toLowerCase()+item.prompt.slice(1)]));
  Object.assign(ipipFirstPerson,{
    'Am the life of the party.':'I liven up social gatherings.',
    'Seldom feel blue.':'I rarely feel sad.',
    'Often feel blue.':'I often feel sad.'
  });
  return {keys:[...keys].sort(),sourceEnglish:[...sourceEnglish].sort(),sourceOnly:[...sourceOnly].sort(),preserve,ipipFirstPerson};
}
if(require.main===module){const out=path.join(root,'scripts/localization');fs.mkdirSync(out,{recursive:true});const data=extract();fs.writeFileSync(path.join(out,'v2-keys.json'),JSON.stringify(data,null,2)+'\n');console.log(`Extracted ${data.keys.length} public UI/custom strings; ${data.sourceEnglish.length} source-English strings preserved.`);}
module.exports={extract,namedCallBodies};
