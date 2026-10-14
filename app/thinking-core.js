/* OHBDS questionnaire content: CC BY-NC-SA 4.0.
 * Independent implementation code follows the project's software license;
 * it does not relicense the incorporated questionnaire content.
 * Eric Jorgenson, Open Hemispheric Brain Dominance Scale 1.0, 29 April 2015.
 * https://openpsychometrics.org/tests/OHBDS/development/OHBDS1.0.pdf
 * https://creativecommons.org/licenses/by-nc-sa/4.0/
 * Changes: original English content presented in software with stable IDs,
 * explicit input validation and a visible scientific limitation. No endorsement.
 * Noncommercial educational/self-reflection use only. Not a neural diagnosis. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ThinkingCore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function freeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  }
  const sourceA = [1,2,3,5,8,10,11,12,14,18,20];
  const prompts = [
    'I do not need others praise.',
    'I would prefer a class in mathematics to a class in pottery.',
    'I never show up late.',
    "I don't bother to the read instructions before I start putting something together.",
    'I could not live in a mess.',
    'I am totally random.',
    'I like working with words.',
    'I behave in a businesslike manner.',
    'I come up with something new.',
    'I am not easily disturbed by events.',
    'I rarely cry during sad movies.',
    'I plan my life logically.',
    'I need a creative outlet.',
    'I make decisions based on facts, not feelings.',
    'I make a mess of things.',
    'I get stressed out easily.',
    'I am romantic.',
    'I prize logic above all else.',
    'I often forget to put things back in their proper place.',
    'I am calm even in tense situations.'
  ];
  const metadata = freeze({
    version: 'ohbds-1.0-2015-english-20-software-1.0.0',
    sourceLanguage: 'en',
    sourceURLs: [
      'https://openpsychometrics.org/tests/OHBDS/',
      'https://openpsychometrics.org/tests/OHBDS/development/',
      'https://openpsychometrics.org/tests/OHBDS/development/OHBDS1.0.pdf'
    ],
    scienceURLs: ['https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0071275'],
    license: 'CC BY-NC-SA 4.0; noncommercial questionnaire content only; separate software license',
    licenseURL: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    commercialUseAllowed: false,
    attribution: 'Open Hemispheric Brain Dominance Scale 1.0 by Eric Jorgenson, 29 April 2015. Used under CC BY-NC-SA 4.0. Software presentation, stable item IDs, validation and scientific-context notices added; original English item wording and published scoring retained. No endorsement is implied.',
    sourceItemCount: 20,
    itemCountDiscrepancy: 'Landing-page procedure says 24 items; the explicit licensed OHBDS 1.0 PDF and current read-only questionnaire form both contain 20. This version implements those verified 20, not an invented 24-item form.',
    itemFidelity: 'Verbatim English OHBDS 1.0 statements in source order, including source typographical wording. Official A/B membership and X=66-A+B retained.',
    scoring: 'A=sum(Q1,Q2,Q3,Q5,Q8,Q10,Q11,Q12,Q14,Q18,Q20). B=sum(Q4,Q6,Q7,Q9,Q13,Q15,Q16,Q17,Q19). X=66-A+B, range20–100. The software mean X/20 is a keyed-score arithmetic index, not a neural measurement or an original-response average.',
    development: 'The manual describes 80 screened candidate statements and four items chosen per each of five comparator style tests, yielding20; those correlations do not establish hemisphere dominance.',
    validationStatus: 'Arithmetic/source fidelity verified. The source rejects literal hemisphere-dominance theory. This is educational descriptive style reflection, not a validated neural diagnosis, IQ test or hiring instrument.',
    translationStatus: 'Original English is the default. Optional interface-language adaptations are machine-assisted drafts under CC BY-NC-SA 4.0, not psychometrically validated translations; per-item administration language is retained.',
    limitations: [
      'No score diagnoses a dominant hemisphere or measures brain activity.',
      'The historical left/right style labels are descriptive source labels, not neuroscience classifications.',
      'No population percentile, intelligence score, clinical diagnosis, learning-style prescription or employment suitability is established.',
      'The source was constructed by correlations with other style quizzes; that does not validate the biological premise.',
      'Noncommercial use, attribution, license links and ShareAlike conditions apply to the questionnaire content. A separate software license does not make that content MIT or public domain.',
      'The verified source form has 20 items despite the introductory webpage stating 24.'
    ]
  });
  const instruments = freeze([{
    id: 'ohbds-20-v1',
    title: 'OHBDS 1.0 · Descriptive thinking style (20 items)',
    description: 'Original English 20-item OHBDS 1.0 for noncommercial educational reflection. Historical left/right-style vocabulary does not identify a dominant brain hemisphere.',
    instructions: 'For each question 1-20, in the blank provided rate the item on a scale from 1 to 5 on how much you agree with the statement. For example, if you agree completely with question one put down a five in the empty space, if you entirely disagree with it put down 1, if you are neutral or unsure put down a 3.',
    responseOptions: [
      { value: 1, label: '1 · Disagree' },
      { value: 2, label: '2' },
      { value: 3, label: '3 · Neutral' },
      { value: 4, label: '4' },
      { value: 5, label: '5 · Agree' }
    ],
    items: prompts.map(function (prompt,index) { return { id: 'ohbds' + String(index + 1).padStart(2,'0'), prompt: prompt, scaleId: 'ohbds-style', key: sourceA.includes(index + 1) ? 'negative' : 'positive' }; }),
    scales: [{ id: 'ohbds-style', title: 'OHBDS descriptive style score' }],
    metadata: metadata
  }]);
  const externalTools = freeze([
    {
      id: 'hbdi-official', title: 'HBDI® · Official Herrmann assessment',
      url: 'https://www.thinkherrmann.com/hbdi',
      description: 'Vendor-administered thinking-preference assessment; use the official service. No proprietary questions, scoring or profile code are reproduced here.',
      metadata: { sourceURLs: ['https://www.thinkherrmann.com/hbdi','https://herrmann.com.au/hbdi/','https://herrmann.com.au/faq/','https://herrmann.com.au/terms/'], license: 'Proprietary; no local redistribution or scoring permission established', sourceItemCount: 116, validationStatus: 'Vendor instrument; no local HBDI administration, scoring or equivalent validation is provided.', privacyBoundary: 'Opens an external provider; its access requirements and data handling apply.', limitations: ['Thinking preferences are not neural-activity measurements, competency or a medical diagnosis.','HBDI and Whole Brain are vendor trademarks; no affiliation or endorsement is claimed.'] }
    },
    {
      id: 'personalitytest-binary-official', title: 'Personality Test Center · External binary style quiz',
      url: 'https://www.personalitytest.net/questionnaires/braindominance/index.html',
      description: 'External 20-item binary quiz. Its redistribution license and official item-level scoring have not been established; no local clone is included.',
      metadata: { sourceURLs: ['https://www.personalitytest.net/questionnaires/braindominance/index.html'], license: 'Redistribution permission not established', sourceItemCount: 20, validationStatus: 'External entertainment/self-reflection quiz; no scientifically validated hemisphere classification established.', privacyBoundary: 'Provider receives any answers submitted on its website. Brain Studio does not submit answers or copy provider results.', limitations: ['Do not infer a neurological diagnosis from the provider’s left/right labels.','Public accessibility and aggregate statistics do not establish permission or validation.'] }
    },
    {
      id: 'freudly-binary-official', title: 'Freudly · External thinking-style quiz',
      url: 'https://freudly.ai/tests/is-your-brain-left-or-right/',
      description: 'External 20-item questionnaire attributed by the provider to Jonni Kincher. No local item reproduction, scoring or AI interpretation is included.',
      metadata: { sourceURLs: ['https://freudly.ai/tests/is-your-brain-left-or-right/','https://freudly.ai/terms-of-use/'], license: 'Provider reserves rights; no questionnaire redistribution permission established', sourceItemCount: 20, validationStatus: 'Provider claims are not independent proof of neuroscience validity or an equivalent local instrument.', privacyBoundary: 'Opens an external provider with its own terms and data handling; no automatic answer submission.', limitations: ['Historical left/right thinking-style scores are not a neural diagnosis.','Displayed examples/cutoffs do not supply a verified complete local scoring key.'] }
    }
  ]);
  function instrumentFor(id) {
    const instrument = instruments.find(function (entry) { return entry.id === id; });
    if (!instrument) throw new RangeError('Unknown locally supported thinking instrument.');
    return instrument;
  }
  function validate(instrumentId,answers) {
    const instrument = instrumentFor(instrumentId), clean = Object.create(null);
    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return clean;
    instrument.items.forEach(function (item) {
      const property = Object.getOwnPropertyDescriptor(answers,item.id);
      if (property && Object.prototype.hasOwnProperty.call(property,'value') && Number.isInteger(property.value) && property.value >= 1 && property.value <= 5) clean[item.id] = property.value;
    });
    return clean;
  }
  function score(instrumentId,answers) {
    const instrument = instrumentFor(instrumentId), clean = validate(instrumentId,answers);
    if (Object.keys(clean).length !== instrument.items.length) throw new TypeError('Complete all 20 OHBDS items with integer response values from 1 to 5.');
    let A = 0, B = 0;
    instrument.items.forEach(function (item) { if (item.key === 'negative') A += clean[item.id]; else B += clean[item.id]; });
    const X = 66 - A + B;
    const sourceBand = X <= 55 ? { id: 'historical-left-style', sourceLabel: 'Left-brained', min: 20, max: 55 } : X <= 64 ? { id: 'no-clear-preference', sourceLabel: 'No clear preference', min: 56, max: 64 } : { id: 'historical-right-style', sourceLabel: 'Right-brained', min: 65, max: 100 };
    return {
      instrumentId: instrument.id, answered: 20, itemCount: 20,
      scales: [{ id: 'ohbds-style', title: 'OHBDS descriptive style score', sum: X, mean: X / 20, min: 20, max: 100, itemCount: 20 }],
      components: { A: A, B: B }, sourceBand: sourceBand,
      interpretation: 'The source band is a historical descriptive style label, not a diagnosis of hemisphere dominance or a scientifically validated learning prescription.',
      metadata: metadata
    };
  }
  return freeze({ instruments: instruments, externalTools: externalTools, metadata: metadata, validate: validate, score: score });
});
