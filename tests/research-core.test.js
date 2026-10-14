'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Core = require('../app/research-core.js');
const descriptor = Core.instruments[0];
// Independently transcribed from the official key, not computed from production keys.
const reference = [
  { id: 'extraversion', positive: [1,11,21,31,41], negative: [6,16,26,36,46] },
  { id: 'agreeableness', positive: [7,17,27,37,42,47], negative: [2,12,22,32] },
  { id: 'conscientiousness', positive: [3,13,23,33,43,48], negative: [8,18,28,38] },
  { id: 'emotional-stability', positive: [9,19], negative: [4,14,24,29,34,39,44,49] },
  { id: 'intellect-imagination', positive: [5,15,25,35,40,45,50], negative: [10,20,30] }
];
const id = n => 'ipip' + String(n).padStart(2, '0');
const constant = value => Object.fromEntries(Array.from({ length: 50 }, (_, i) => [id(i + 1), value]));
const sums = answers => Core.score('ipip-50', answers).scales.map(scale => scale.sum);
test('all English prompts, order, membership and keys match retained official-source fixture', () => {
  const fixture = JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/research/ipip-50-source-fixture.json'),'utf8'));
  assert.equal(fixture.sourceURL,'https://ipip.ori.org/new_ipip-50-item-scale.htm');
  assert.match(fixture.sourceSha256,/^[a-f0-9]{64}$/);
  assert.deepEqual(descriptor.items,fixture.items);
});
test('published inventory has exact factor memberships and reverse keys', () => {
  assert.equal(descriptor.id, 'ipip-50');
  assert.equal(descriptor.items.length, 50);
  assert.equal(new Set(descriptor.items.map(item => item.id)).size, 50);
  assert.deepEqual(descriptor.scales.map(scale => scale.id), reference.map(scale => scale.id));
  for (const factor of reference) {
    for (const n of factor.positive) assert.deepEqual(descriptor.items[n - 1], { id: id(n), prompt: descriptor.items[n - 1].prompt, scaleId: factor.id, key: 'positive' });
    for (const n of factor.negative) assert.equal(descriptor.items[n - 1].key, 'negative');
    assert.deepEqual(descriptor.items.filter(item => item.scaleId === factor.id && item.key === 'negative').map(item => Number(item.id.slice(4))), factor.negative);
  }
  assert.deepEqual(descriptor.responseOptions.map(o => o.value), [1,2,3,4,5]);
  assert.equal(descriptor.items[0].prompt, 'Am the life of the party.');
  assert.equal(descriptor.items[49].prompt, 'Am full of ideas.');
});
test('all responses 1, 3 and 5 agree with hand-calculated sums', () => {
  // 1: P*1 + N*5; 5: P*5 + N*1; source factor counts are 5/5,6/4,6/4,2/8,7/3.
  assert.deepEqual(sums(constant(1)), [30,26,26,42,22]);
  assert.deepEqual(sums(constant(3)), [30,30,30,30,30]);
  assert.deepEqual(sums(constant(5)), [30,34,34,18,38]);
});
test('reference-keyed maxima and minima score 50 and 10 for every scale', () => {
  const high = {}, low = {};
  for (const factor of reference) {
    for (const n of factor.positive) { high[id(n)] = 5; low[id(n)] = 1; }
    for (const n of factor.negative) { high[id(n)] = 1; low[id(n)] = 5; }
  }
  assert.deepEqual(sums(high), [50,50,50,50,50]);
  assert.deepEqual(sums(low), [10,10,10,10,10]);
});
test('mixed non-endpoint pattern checks hand-enumerated intermediate sums', () => {
  // Response repeats 1,2,3,4,5: E positive=1 negative=1 =>30;
  // A positives=2 negatives=2 =>12+16=28; C=18+12=30;
  // ES positive=4 negative=4 =>8+16=24; I positive=5 negative=5 =>35+3=38.
  const input = Object.fromEntries(Array.from({ length: 50 }, (_, i) => [id(i + 1), (i % 5) + 1]));
  assert.deepEqual(sums(input), [30,28,30,24,38]);
  const result = Core.score('ipip-50', input);
  assert.deepEqual(result.scales.map(scale => scale.mean), [3,2.8,3,2.4,3.8]);
  assert.equal(result.answered, 50); assert.equal(result.itemCount, 50);
  for (const scale of result.scales) { assert.equal(scale.min,10); assert.equal(scale.max,50); assert.equal(scale.itemCount,10); }
  assert.equal(result.metadata, Core.metadata);
  assert.ok(!Object.hasOwn(result, 'percentile'));
});
test('every individual reverse item transforms all five legal responses correctly', () => {
  for (const factor of reference) for (const n of factor.negative) for (let value = 1; value <= 5; value++) {
    const input = constant(3); input[id(n)] = value;
    assert.equal(Core.score('ipip-50',input).scales.find(scale => scale.id === factor.id).sum, 33 - value);
  }
});
test('incomplete and invalid responses fail closed; no type coercion', () => {
  for (const input of [null,undefined,[],{},'5']) assert.throws(() => Core.score('ipip-50', input), TypeError);
  for (const value of [0,6,1.5,'3',true,NaN,Infinity,null,undefined]) {
    const input = constant(3); input.ipip01 = value;
    assert.throws(() => Core.score('ipip-50',input), TypeError);
  }
  const missing = constant(3); delete missing.ipip50;
  assert.throws(() => Core.score('ipip-50',missing),TypeError);
  assert.throws(() => Core.validate('unknown',{}),RangeError);
  assert.throws(() => Core.score('__proto__',constant(3)),RangeError);
});
test('only own data properties accepted; accessors never run; unknown keys excluded', () => {
  const inherited = Object.create(constant(3)); inherited.ipip01 = 4; inherited.unknown = 5;
  Object.defineProperty(inherited,'ipip02',{get(){ throw new Error('getter must not execute'); }});
  const clean = Core.validate('ipip-50',inherited);
  assert.equal(Object.getPrototypeOf(clean),null);
  assert.deepEqual(Object.keys(clean),['ipip01']); assert.equal(clean.ipip01,4);
  assert.throws(() => Core.score('ipip-50',inherited),TypeError);
  const complete = Object.assign(Object.create(null),constant(3)); complete.constructor = 5; complete.__proto__ = 5;
  assert.equal(Object.keys(Core.validate('ipip-50',complete)).length,50);
  assert.deepEqual(sums(complete),[30,30,30,30,30]);
});
test('descriptors are immutable and same API loads in isolated browser context', () => {
  assert.ok(Object.isFrozen(descriptor.items[0])); assert.ok(Object.isFrozen(Core.metadata.limitations));
  assert.throws(() => { descriptor.items[0].key = 'negative'; },TypeError);
  const context = {}; vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../app/research-core.js'),'utf8'),context);
  assert.equal(context.ResearchCore.instruments[0].id,'ipip-50');
  assert.deepEqual(Array.from(context.ResearchCore.score('ipip-50',constant(3)).scales,s => s.sum),[30,30,30,30,30]);
});

const interestDescriptor = Core.instruments.find(instrument => instrument.id === 'onet-short-form-60');
const interestId = n => 'onet' + String(n).padStart(2, '0');
const interestConstant = value => Object.fromEntries(Array.from({ length: 60 }, (_, i) => [interestId(i + 1), value]));
const interestScore = answers => Core.score('onet-short-form-60',answers);
const interestSums = answers => interestScore(answers).scales.map(scale => scale.sum);
test('O*NET complete original English source items and instructions match independent PDF fixture', () => {
  const fixture = JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/research/onet-60-source-fixture.json'),'utf8'));
  assert.deepEqual(interestDescriptor.items,fixture.items);
  assert.equal(interestDescriptor.instructions,fixture.instructions);
  assert.equal(interestDescriptor.interpretationInstructions,fixture.interpretationInstructions);
  assert.equal(interestDescriptor.metadata.licenseURL,'https://creativecommons.org/licenses/by-nd/4.0/');
  assert.match(interestDescriptor.metadata.attribution,/U\.S\. Department of Labor/);
  assert.equal(interestDescriptor.items.length,60);
  assert.deepEqual(interestDescriptor.scales.map(scale => scale.id),['realistic','investigative','artistic','social','enterprising','conventional']);
  assert.deepEqual(interestDescriptor.responseOptions.map(option => option.value),[0,1]);
});
test('O*NET explicit unchecked and checked endpoints produce 0 and 10 with correct ranges', () => {
  assert.deepEqual(interestSums(interestConstant(0)),[0,0,0,0,0,0]);
  assert.deepEqual(interestSums(interestConstant(1)),[10,10,10,10,10,10]);
  const result = interestScore(interestConstant(1));
  assert.equal(result.answered,60); assert.equal(result.itemCount,60);
  assert.equal(result.metadata,interestDescriptor.metadata);
  for (const scale of result.scales) { assert.equal(scale.min,0); assert.equal(scale.max,10); assert.equal(scale.mean,1); assert.equal(scale.itemCount,10); }
  assert.notEqual(result.metadata,Core.metadata);
});
test('each official ten-activity section counts only its own checked activities', () => {
  // Independently enumerate section boundaries from the official paper PDF.
  const sections = [[1,10],[11,20],[21,30],[31,40],[41,50],[51,60]];
  sections.forEach(([start,end],theme) => {
    const answers = interestConstant(0);
    for (let n = start; n <= end; n++) answers[interestId(n)] = 1;
    const expected = [0,0,0,0,0,0]; expected[theme] = 10;
    assert.deepEqual(interestSums(answers),expected);
  });
});
test('manually listed mixed checks produce reference vector and raw mean', () => {
  const answers = interestConstant(0);
  // Nine realistic, eight investigative, seven artistic, six social, five enterprising, four conventional.
  const checked = [1,2,3,4,5,6,7,8,9,11,12,13,14,15,16,17,18,21,22,23,24,25,26,27,31,32,33,34,35,36,41,42,43,44,45,51,52,53,54];
  for (const n of checked) answers[interestId(n)] = 1;
  const result = interestScore(answers);
  assert.deepEqual(result.scales.map(scale => scale.sum),[9,8,7,6,5,4]);
  assert.deepEqual(result.scales.map(scale => scale.mean),[0.9,0.8,0.7,0.6,0.5,0.4]);
  assert.deepEqual(result.topThemes,['realistic','investigative','artistic']);
  assert.equal(result.tiesRequireChoice,false);
});
test('ties at primary and third-place cutoff remain unresolved, all-zero retains all themes', () => {
  const answers = interestConstant(0);
  for (const n of [1,2,3,4,5,6,7,8,9,11,12,13,14,15,16,17,18,21,22,23,24,25,26,27,31,32,33,34,35,36,37,41,42,43,51]) answers[interestId(n)] = 1;
  const result = interestScore(answers);
  assert.deepEqual(result.scales.map(scale => scale.sum),[9,8,7,7,3,1]);
  assert.deepEqual(result.topThemes,['realistic','investigative','artistic','social']);
  assert.deepEqual(result.rankedThemes[2],{sum:7,rank:3,scaleIds:['artistic','social']});
  assert.equal(result.tiesRequireChoice,true);
  answers.onet19 = 1;
  const primaryTie = interestScore(answers);
  assert.deepEqual(primaryTie.rankedThemes[0],{sum:9,rank:1,scaleIds:['realistic','investigative']});
  assert.equal(primaryTie.tiesRequireChoice,true);
  const zeros = interestScore(interestConstant(0));
  assert.deepEqual(zeros.rankedThemes,[{sum:0,rank:1,scaleIds:['realistic','investigative','artistic','social','enterprising','conventional']}]);
  assert.equal(zeros.topThemes.length,6);
  assert.ok(!Object.hasOwn(zeros,'hollandCode'));
});
test('O*NET completion requires explicit zero; malformed and inherited entries do not count', () => {
  const missing = interestConstant(0); delete missing.onet60;
  assert.throws(() => interestScore(missing),TypeError);
  for (const value of [-1,2,5,'0','1',true,false,0.5,NaN,null,undefined]) {
    const answers = interestConstant(0); answers.onet01 = value;
    assert.throws(() => interestScore(answers),TypeError);
  }
  const inherited = Object.create(interestConstant(0)); inherited.onet01 = 1;
  assert.equal(Object.keys(Core.validate('onet-short-form-60',inherited)).length,1);
  assert.throws(() => interestScore(inherited),TypeError);
  const accessor = interestConstant(0); Object.defineProperty(accessor,'onet01',{get(){throw new Error('getter must not run');}});
  assert.equal(Object.keys(Core.validate('onet-short-form-60',accessor)).length,59);
  const answers = interestConstant(0); answers.ipip01 = 5; answers.unknown = 1;
  const clean = Core.validate('onet-short-form-60',answers);
  assert.equal(Object.keys(clean).length,60); assert.equal(clean.onet01,0);
  assert.equal(Object.getPrototypeOf(clean),null);
});
