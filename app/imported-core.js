(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.ImportedCore=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
function fail(message){throw new TypeError(message);}
function object(value,label){if(!value||typeof value!=='object'||Array.isArray(value))fail(label+' must be an object.');return value;}
function fields(value,required,optional,label){object(value,label);for(const key of required)if(!own(value,key))fail(label+' is missing '+key+'.');for(const key of Object.keys(value))if(!required.includes(key)&&!optional.includes(key))fail(label+' contains an unsupported field.');}
function text(value,label,max=10000){if(typeof value!=='string'||!value.trim()||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)||/<\/?[a-z][^>]*>/i.test(value))fail(label+' must be bounded plain text.');return value;}
function id(value,label){text(value,label,100);if(!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(value)||['__proto__','constructor','prototype'].includes(value))fail(label+' is not a supported identifier.');return value;}
function list(value,label,min,max){if(!Array.isArray(value)||value.length<min||value.length>max)fail(label+' has an unsupported length.');return value;}
function validatePackage(raw){
 fields(raw,['version','id','title','language','sourceHash','sections','scoring'],[],'Package');
 if(raw.version!==1)fail('Unsupported package version.');
 const result={version:1,id:id(raw.id,'Package id'),title:text(raw.title,'Package title',200),language:text(raw.language,'Language',50),sourceHash:text(raw.sourceHash,'Source hash',64)};
 if(!/^[a-z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/.test(result.language))fail('Unsupported language identifier.');
 if(!/^[a-fA-F0-9]{64}$/.test(result.sourceHash))fail('Source hash must be SHA-256 hexadecimal.');result.sourceHash=result.sourceHash.toLowerCase();
 object(raw.scoring,'Scoring');
 const groups=new Set(),ids=new Set([result.id]);
 const unique=value=>{if(ids.has(value))fail('Identifiers must be unique across the package.');ids.add(value);return value;};
 if(raw.scoring.type==='group-sum'){
  fields(raw.scoring,['type','groups','min','max'],[],'Scoring');if(raw.scoring.min!==1||raw.scoring.max!==10)fail('Group sums require the 1 to 10 response range.');
  result.scoring={type:'group-sum',min:1,max:10,groups:list(raw.scoring.groups,'Scoring groups',1,1000).map(g=>{fields(g,['id','title'],[],'Scoring group');const key=unique(id(g.id,'Group id'));groups.add(key);return {id:key,title:text(g.title,'Group title',200)};})};
 }else if(raw.scoring.type==='experimental'){
  fields(raw.scoring,['type','notice','scales','keys'],['excluded'],'Experimental scoring');
  result.scoring={type:'experimental',notice:text(raw.scoring.notice,'Experimental notice',10000),scales:list(raw.scoring.scales,'Experimental scales',1,1000).map(scale=>{
   fields(scale,['id','title','description','kind'],[],'Experimental scale');
   const key=unique(id(scale.id,'Scale id'));groups.add(key);
   if(!['reflection','ability','interest'].includes(scale.kind))fail('Unsupported experimental scale kind.');
   return {id:key,title:text(scale.title,'Scale title',200),description:text(scale.description,'Scale description'),kind:scale.kind};
  }),keys:[]};
 }else if(raw.scoring.type==='unscored'){fields(raw.scoring,['type'],[],'Scoring');result.scoring={type:'unscored'};}else fail('Unsupported scoring method.');
 let itemCount=0;const usedGroups=new Set();
 result.sections=list(raw.sections,'Sections',1,100).map(section=>{
  fields(section,['id','title','items'],['instructions'],'Section');
  const out={id:unique(id(section.id,'Section id')),title:text(section.title,'Section title',200)};
  if(own(section,'instructions'))out.instructions=text(section.instructions,'Section instructions',20000);
  out.items=list(section.items,'Section items',1,1000).map(item=>{
   if(++itemCount>1000)fail('A package may contain at most 1000 items.');
   fields(item,['id','prompt','options'],['scaleId','responseMode','minSelections','maxSelections'],'Item');
   const next={id:unique(id(item.id,'Item id')),prompt:text(item.prompt,'Item prompt')},values=new Set();
   next.options=list(item.options,'Response options',2,20).map(option=>{fields(option,['value','label'],[],'Response option');const value=text(option.value,'Option value',100);if(values.has(value))fail('Option values must be unique.');values.add(value);return {value,label:text(option.label,'Option label',2000)};});
   if(own(item,'responseMode')){
    if(item.responseMode!=='multiple'||result.scoring.type==='group-sum')fail('Unsupported item response mode.');
    if(!Number.isInteger(item.minSelections)||!Number.isInteger(item.maxSelections)||item.minSelections<1||item.minSelections>item.maxSelections||item.maxSelections>20||item.maxSelections>next.options.length)fail('Multiple selection limits are invalid.');
    next.responseMode='multiple';next.minSelections=item.minSelections;next.maxSelections=item.maxSelections;
   }else if(own(item,'minSelections')||own(item,'maxSelections'))fail('Selection limits require multiple response mode.');
   if(result.scoring.type==='group-sum'){
    if(!own(item,'scaleId')||!groups.has(item.scaleId))fail('Every scored item must reference a declared group.');
    if(values.size!==10||Array.from({length:10},(_,i)=>String(i+1)).some(value=>!values.has(value)))fail('Scored options must contain exactly integer strings 1 through 10.');
    next.scaleId=item.scaleId;usedGroups.add(item.scaleId);
   }else if(own(item,'scaleId'))fail('Only group-sum items may declare a direct scoring group.');
   return next;
  });return out;
 });
 if(result.scoring.type==='experimental'){
  const items=new Map(result.sections.flatMap(section=>section.items).map(item=>[item.id,item])),pairs=new Set();
  result.scoring.keys=list(raw.scoring.keys,'Experimental keys',1,5000).map(key=>{
   fields(key,['itemId','scaleId','values','rationale'],[],'Experimental key');
   const item=items.get(key.itemId);if(!item||!groups.has(key.scaleId))fail('Experimental keys must reference declared items and scales.');
   const pair=key.itemId+'|'+key.scaleId;if(pairs.has(pair))fail('Duplicate item and scale key.');pairs.add(pair);
   object(key.values,'Experimental option values');
   if(Object.keys(key.values).length!==item.options.length||item.options.some(option=>!own(key.values,option.value)))fail('Experimental key must map every declared option exactly.');
   const values=Object.fromEntries(item.options.map(option=>{const value=key.values[option.value];if(value!==0&&value!==1)fail('Experimental weights must be numeric zero or one.');return [option.value,value];}));
   if(item.responseMode==='multiple'&&Object.values(values).filter(value=>value===1).length>1)fail('A multiple-choice experimental key may have at most one positive option.');
   usedGroups.add(key.scaleId);return {itemId:key.itemId,scaleId:key.scaleId,values,rationale:text(key.rationale,'Key rationale')};
  });
 }
 if(result.scoring.type==='experimental'&&own(raw.scoring,'excluded')){
  const allItems=new Set(result.sections.flatMap(section=>section.items).map(item=>item.id)),keyedItems=new Set(result.scoring.keys.map(key=>key.itemId)),seen=new Set();
  result.scoring.excluded=list(raw.scoring.excluded,'Experimental exclusions',0,1000).map(entry=>{
   fields(entry,['itemId','reason'],[],'Experimental exclusion');
   if(!allItems.has(entry.itemId)||keyedItems.has(entry.itemId)||seen.has(entry.itemId))fail('Exclusions must uniquely identify unkeyed items.');
   seen.add(entry.itemId);return {itemId:entry.itemId,reason:text(entry.reason,'Exclusion reason')};
  });
  if(seen.size!==allItems.size-keyedItems.size)fail('Explicit exclusions must cover every unkeyed item.');
 }
 if([...groups].some(group=>!usedGroups.has(group)))fail('Every scoring group must contain an item.');
 return result;
}
function checkedAnswers(pkg,answers){
 object(answers,'Answers');const items=new Map(pkg.sections.flatMap(section=>section.items).map(item=>[item.id,item]));const result={};
 for(const key of Object.keys(answers)){const item=items.get(key);if(!item)fail('Answer contains an unknown item identifier.');const value=answers[key];if(item.responseMode==='multiple'){
  if(!Array.isArray(value)||value.length<1||value.length>item.maxSelections||new Set(value).size!==value.length||value.some(choice=>typeof choice!=='string'||!item.options.some(option=>option.value===choice)))fail('Multiple answer is not a valid selection.');result[key]=[...value];
 }else{if(typeof value!=='string'||!item.options.some(option=>option.value===value))fail('Answer is not a declared response option.');result[key]=value;}}
 return result;
}
function validateAnswers(raw,answers){return checkedAnswers(validatePackage(raw),answers);}
function completeAnswer(item,answers){return own(answers,item.id)&&(item.responseMode!=='multiple'||answers[item.id].length>=item.minSelections);}
function contribution(key,answer){return Array.isArray(answer)?Number(answer.some(value=>key.values[value]===1)):key.values[answer];}
function score(raw,answers){
 const pkg=validatePackage(raw),clean=checkedAnswers(pkg,answers),items=pkg.sections.flatMap(section=>section.items);
 const completeIds=new Set(items.filter(item=>completeAnswer(item,clean)).map(item=>item.id));
 const sections=pkg.sections.map(section=>({id:section.id,title:section.title,answered:section.items.filter(item=>completeIds.has(item.id)).length,total:section.items.length,complete:section.items.every(item=>completeIds.has(item.id))}));
 const result={packageId:pkg.id,version:pkg.version,sourceHash:pkg.sourceHash,language:pkg.language,scoringType:pkg.scoring.type,answered:completeIds.size,total:items.length,complete:completeIds.size===items.length,sections};
 if(pkg.scoring.type==='group-sum')result.groups=pkg.scoring.groups.map(group=>{const members=items.filter(item=>item.scaleId===group.id),observed=members.filter(item=>own(clean,item.id)),sum=observed.reduce((total,item)=>total+Number(clean[item.id]),0),complete=observed.length===members.length;return {id:group.id,title:group.title,sum,count:observed.length,total:members.length,complete,mean:complete?sum/members.length:null};});
 if(pkg.scoring.type==='experimental'){
  const keyed=new Set(pkg.scoring.keys.map(key=>key.itemId));
  result.experimental=true;result.notice=pkg.scoring.notice;result.keyedItemCount=keyed.size;result.unkeyedItems=items.filter(item=>!keyed.has(item.id)).map(item=>item.id);
  result.exclusions=pkg.scoring.excluded?pkg.scoring.excluded.map(entry=>({...entry})):result.unkeyedItems.map(itemId=>({itemId,reason:''}));
  result.reviews=pkg.scoring.keys.filter(key=>completeIds.has(key.itemId)).map(key=>({itemId:key.itemId,scaleId:key.scaleId,chosen:clean[key.itemId],value:contribution(key,clean[key.itemId]),rationale:key.rationale}));
  result.groups=pkg.scoring.scales.map(scale=>{
   const keys=pkg.scoring.keys.filter(key=>key.scaleId===scale.id),observed=keys.filter(key=>completeIds.has(key.itemId)),sum=observed.reduce((total,key)=>total+contribution(key,clean[key.itemId]),0),complete=observed.length===keys.length;
   return {...scale,sum,count:observed.length,total:keys.length,complete,mean:complete?sum/keys.length:null};
  });
 }
 return result;
}
return Object.freeze({validatePackage,validateAnswers,score});
});
