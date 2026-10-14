'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const C=require('../app/thinking-core.js');
const id=n=>'ohbds'+String(n).padStart(2,'0');
const constant=value=>Object.fromEntries(Array.from({length:20},(_,i)=>[id(i+1),value]));
const score=answers=>C.score('ohbds-20-v1',answers);
// Official PDF A and B equations transcribed independently of production item keys.
const A=[1,2,3,5,8,10,11,12,14,18,20],B=[4,6,7,9,13,15,16,17,19];
test('OHBDS retains exact20 source items and official A/B directions, not claimed24',()=>{
  const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/research/thinking-tools.json'),'utf8')).ohbds.sourceFixture;
  assert.deepEqual(C.instruments[0].items,fixture.items);
  assert.equal(C.instruments[0].instructions,fixture.instructions);
  assert.equal(C.instruments[0].items.length,20);
  assert.equal(C.metadata.commercialUseAllowed,false);
  assert.equal(C.metadata.licenseURL,'https://creativecommons.org/licenses/by-nc-sa/4.0/');
  for(const n of A)assert.equal(C.instruments[0].items[n-1].key,'negative');
  for(const n of B)assert.equal(C.instruments[0].items[n-1].key,'positive');
});
test('constant patterns match manual unequal A/B arithmetic',()=>{
  assert.equal(score(constant(1)).scales[0].sum,64); //66-11+9
  assert.equal(score(constant(3)).scales[0].sum,60); //66-33+27
  assert.equal(score(constant(5)).scales[0].sum,56); //66-55+45
  assert.deepEqual(score(constant(3)).components,{A:33,B:27});
});
test('manually keyed endpoints and intermediate vector reproduce source equation',()=>{
  const low={},high={};for(const n of A){low[id(n)]=5;high[id(n)]=1;}for(const n of B){low[id(n)]=1;high[id(n)]=5;}
  assert.equal(score(low).scales[0].sum,20);assert.equal(score(high).scales[0].sum,100);
  const pattern=Object.fromEntries(Array.from({length:20},(_,i)=>[id(i+1),(i%5)+1]));
  assert.deepEqual(score(pattern).components,{A:34,B:26});assert.equal(score(pattern).scales[0].sum,58);
  assert.equal(score(pattern).scales[0].mean,2.9);
});
test('source category boundaries55/56/64/65 preserved as non-neural historical labels',()=>{
  for(const [a,b,c,expected,band] of [[5,5,4,55,'historical-left-style'],[5,5,3,56,'no-clear-preference'],[1,1,3,64,'no-clear-preference'],[1,1,2,65,'historical-right-style']]){
    const answers=constant(3);answers.ohbds01=a;answers.ohbds02=b;answers.ohbds03=c;
    const result=score(answers);assert.equal(result.scales[0].sum,expected);assert.equal(result.sourceBand.id,band);assert.match(result.interpretation,/not a diagnosis/);
  }
});
test('complete own integer responses only; no getters or inherited entries',()=>{
  for(const value of [0,6,'3',3.5,true,NaN,null,undefined]){const answers=constant(3);answers.ohbds01=value;assert.throws(()=>score(answers),TypeError);}
  const missing=constant(3);delete missing.ohbds20;assert.throws(()=>score(missing),TypeError);
  const inherited=Object.create(constant(3));inherited.ohbds01=3;assert.throws(()=>score(inherited),TypeError);
  Object.defineProperty(inherited,'ohbds02',{get(){throw Error('must not run');}});const clean=C.validate('ohbds-20-v1',inherited);assert.deepEqual(Object.keys(clean),['ohbds01']);assert.equal(Object.getPrototypeOf(clean),null);
  const complete=constant(3);complete.extra=5;assert.equal(Object.keys(C.validate('ohbds-20-v1',complete)).length,20);
});
test('external quizzes cannot be scored locally and metadata preserves external boundary',()=>{
  assert.equal(C.externalTools.length,3);
  for(const card of C.externalTools){assert.match(card.url,/^https:/);assert.throws(()=>C.score(card.id,constant(3)),RangeError);assert.ok(card.metadata.privacyBoundary);}
  assert.equal(C.externalTools[0].metadata.sourceItemCount,116);
  assert.ok(Object.isFrozen(C.instruments[0].items[0]));assert.ok(Object.isFrozen(C.externalTools[0].metadata));
});
test('browser UMD provides same source equation without network requests',()=>{
  const context={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../app/thinking-core.js'),'utf8'),context);
  assert.equal(context.ThinkingCore.score('ohbds-20-v1',constant(3)).scales[0].sum,60);
});
