'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {reviewCandidate}=require('../scripts/localization/audit-review.cjs');
const french=require('../app/locales/fr.json');
const candidate=(text,language='fr',kind='unregistered Latin text')=>({text,language,kind,state:'instrument/ipip-50/question/1'});
test('review consumes a complete localized sentence before shared template words',()=>{
 for(const language of ['fr','it','sw']){
  const map=require('../app/locales/'+language+'.json');
  for(const count of [50,60,36,20,16,18]){
   const text=count+' '+map.items+' · '+map['Your answers can be reviewed before or after saving.'];
   const review=reviewCandidate(candidate(text,language),map);
   assert(review.reason,language+': '+text+' unexpectedly unresolved: '+review.remainder);
   assert.equal(review.remainder,'');
  }
 }
});
test('localized composition cannot hide an appended untranslated clause',()=>{
 const text='50 '+french.items+' · '+french['Your answers can be reviewed before or after saving.']+' Untranslated interface warning';
 const review=reviewCandidate(candidate(text),french);
 assert.equal(review.reason,null);assert.match(review.remainder,/Untranslatedinterfacewarning/);
});
test('English source wording remains unresolved without its structural DOM exception',()=>{
 const text='Your answers can be reviewed before or after saving.';
 assert.equal(reviewCandidate(candidate(text,'fr','untranslated catalog text'),french).reason,null);
 assert.equal(reviewCandidate(candidate('I never show up late.'),french).reason,null);
});
test('identical English catalog captions are not broadly allowed',()=>{
 assert.equal(reviewCandidate(candidate('Visual','fr','same-as-English catalog'),french).reason,null);
 assert(reviewCandidate(candidate('Question','fr','same-as-English catalog'),french).reason);
});
