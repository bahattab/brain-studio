'use strict';
// Reads public application source only. Original source instruments are separate
// from interface localization and are deliberately excluded from translation.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const W=require('../app/workspace-core.js'),R=require('../app/research-core.js');
function literals(source) {
  return [...source.matchAll(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g)].map(match=>{
    try{return vm.runInNewContext(match[0],Object.create(null),{timeout:10});}catch{return '';}
  }).filter(value=>typeof value==='string');
}
function extract(){
  const keys=new Set();const sourceEnglish=new Set();const sourceOnly=new Set();
  const add=text=>{if(typeof text==='string'&&text.trim()&&/[A-Za-z]/.test(text))keys.add(text);};
  const professional=fs.readFileSync(path.join(root,'app/professional-ui.js'),'utf8');
  // Includes both arms of conditional captions and validation errors shown in toasts.
  for(const value of literals(professional))if(/^[A-Z]/.test(value)&&(/\s/.test(value)||value.length>7)&&!/[<>]/.test(value)&&!['TEXTAREA','ProfessionalUI'].includes(value))add(value);
  for(const match of professional.matchAll(/(?:h|tr|toast|confirm)\(\s*('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")/g))add(literals(match[1])[0]);
  for(const text of ['self','manager','peer','direct-report','observer','customer','Self','Manager','Peer','Direct report','Observer','Customer','items','minutes','responses','tasks','within range','points earned','practice answers correct','selected profiles','dimensions within the selected ranges'])add(text);
  const html=fs.readFileSync(path.join(root,'app/index.html'),'utf8');
  for(const match of html.matchAll(/>([^<>]+)</g)){
    const text=match[1].trim().replace(/^[◉▥◇◌✓⋈◐▧▤◈◎]\s*/, '');
    if(text&&!['brain','studio','b.','brainstudio'].includes(text))add(text);
  }
  for(const instrument of [...R.instruments,...W.instruments]){
    add(instrument.title);add(instrument.description);add(instrument.metadata.validationStatus);
    for(const scale of instrument.scales)add(scale.title);
    for(const item of instrument.items)if(item.difficulty)add(item.difficulty);
    if(['work-style','emotional-reflection','communication-style'].includes(instrument.id)){
      for(const item of instrument.items)add(item.prompt);
      for(const option of instrument.responseOptions)add(option.label);
    } else if(instrument.id==='ipip-50') {
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
  for(const role of W.roles)add(role.title);
  for(const themes of Object.values(W.feedbackSets))for(const theme of themes)add(theme);
  for(const value of literals(fs.readFileSync(path.join(root,'app/workspace-core.js'),'utf8')))if(/^[A-Z]/.test(value)&&/\s/.test(value)&&!sourceEnglish.has(value)&&!/[<>]/.test(value))add(value);
  for(const value of sourceOnly)keys.delete(value);
  // The instrument's proper name is preserved, while surrounding interface is localized.
  const preserve=['O*NET® Interest Profiler Short Form','Brain Studio','Brain Studio · 2.0'];
  const ipipFirstPerson=Object.fromEntries(R.instruments.find(instrument=>instrument.id==='ipip-50').items.map(item=>[item.prompt,'I '+item.prompt[0].toLowerCase()+item.prompt.slice(1)]));
  Object.assign(ipipFirstPerson,{
    'Am the life of the party.':'I liven up social gatherings.',
    'Seldom feel blue.':'I rarely feel sad.',
    'Often feel blue.':'I often feel sad.'
  });
  return {keys:[...keys].sort(),sourceEnglish:[...sourceEnglish].sort(),sourceOnly:[...sourceOnly].sort(),preserve,ipipFirstPerson};
}
if(require.main===module){const out=path.join(root,'scripts/localization');fs.mkdirSync(out,{recursive:true});const data=extract();fs.writeFileSync(path.join(out,'v2-keys.json'),JSON.stringify(data,null,2)+'\n');console.log(`Extracted ${data.keys.length} public UI/custom strings; ${data.sourceEnglish.length} source-English strings preserved.`);}
module.exports={extract};
