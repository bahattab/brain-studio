'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../app/core.js');
const answers = index => Object.fromEntries(core.questions.map(q => [q.id, index]));
test('20 original questions have ten items on each axis and three valid choices', () => {
  assert.equal(core.questions.length, 20);
  for (const dimension of ['thinking', 'perception']) assert.equal(core.questions.filter(q => q.dimension === dimension).length, 10);
  assert.equal(new Set(core.questions.map(q => q.id)).size, 20);
  for (const q of core.questions) assert.deepEqual(q.options.map(o => o.value), [-1, 0, 1]);
});
test('negative, positive, and neutral choices score both axes', () => {
  assert.deepEqual(core.score(answers(0)), { analytical: 100, intuitive: 0, visual: 100, auditory: 0, thinkingBand: 0, perceptionBand: 0 });
  assert.deepEqual(core.score(answers(2)), { analytical: 0, intuitive: 100, visual: 0, auditory: 100, thinkingBand: 4, perceptionBand: 4 });
  assert.deepEqual(core.score(answers(1)), { analytical: 50, intuitive: 50, visual: 50, auditory: 50, thinkingBand: 2, perceptionBand: 2 });
});
test('missing and malformed answers cannot produce a score', () => {
  for (const input of [null, undefined, [], {}, 'all']) assert.throws(() => core.score(input), TypeError);
  for (const invalid of [-1, 3, '1', 1.5, NaN, true, null]) {
    const input = answers(1); input.q01 = invalid;
    assert.throws(() => core.score(input), TypeError);
  }
});
test('classification respects every boundary on both axes', () => {
  for (const [percent, expected] of [[15,0],[20,1],[35,1],[40,2],[60,2],[65,3],[80,3],[85,4]]) {
    const input = answers(0);
    const units = percent / 5;
    for (const dimension of ['thinking', 'perception']) {
      let remaining = units;
      for (const q of core.questions.filter(q => q.dimension === dimension)) { input[q.id] = Math.min(2, remaining); remaining -= input[q.id]; }
    }
    const result = core.score(input);
    assert.equal(result.intuitive, percent); assert.equal(result.auditory, percent);
    assert.equal(result.thinkingBand, expected); assert.equal(result.perceptionBand, expected);
  }
});
test('validation filters unknown and inherited keys without executing accessors', () => {
  const input = Object.create(answers(1)); input.q01 = 2; input.unknown = 1;
  Object.defineProperty(input, 'q02', { get() { throw new Error('must not run'); } });
  const clean = core.validateAnswers(input);
  assert.equal(Object.getPrototypeOf(clean), null);
  assert.deepEqual(Object.keys(clean), ['q01']); assert.equal(clean.q01, 2);
  assert.throws(() => core.score(input), TypeError);
  const complete = Object.assign(Object.create(null), answers(1), { __proto__: 2, constructor: 1 });
  assert.equal(Object.keys(core.validateAnswers(complete)).length, 20);
  assert.equal(core.score(complete).intuitive, 50);
});
test('all 25 profiles have distinct titles and three actionable tips', () => {
  const titles = new Set();
  for (let t = 0; t < 5; t++) for (let p = 0; p < 5; p++) {
    const result = core.profile({ thinkingBand: t, perceptionBand: p });
    titles.add(result.title); assert.equal(result.tips.length, 3);
    for (const value of [result.title, result.thinkingText, result.perceptionText, ...result.tips]) assert.ok(typeof value === 'string' && value.length > 20);
  }
  assert.equal(titles.size, 25);
  assert.throws(() => core.profile({ thinkingBand: 5, perceptionBand: 1 }), TypeError);
});
