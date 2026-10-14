/* IPIP items and keys are public domain: https://ipip.ori.org/newPermission.htm
 * English item text/order: https://ipip.ori.org/new_ipip-50-item-scale.htm
 * Scoring: https://ipip.ori.org/newScoringInstructions.htm
 * O*NET® Interest Profiler Short Form content: CC BY-ND 4.0.
 * Source: https://www.onetcenter.org/dl_tools/ipsf/Interest_Profiler.pdf
 * This application includes information from the O*NET Career Exploration Tools by
 * the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA).
 * Used under the CC BY-ND 4.0 license: https://creativecommons.org/licenses/by-nd/4.0/
 * O*NET® is a trademark of USDOL/ETA.
 * Independent software implementation; not endorsed or psychometrically certified. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ResearchCore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function freeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  }
  const scaleDefinitions = [
    { id: 'extraversion', title: 'Extraversion' },
    { id: 'agreeableness', title: 'Agreeableness' },
    { id: 'conscientiousness', title: 'Conscientiousness' },
    { id: 'emotional-stability', title: 'Emotional Stability' },
    { id: 'intellect-imagination', title: 'Intellect / Imagination' }
  ];
  // Rows preserve the official sample's published order, wording and keyed direction.
  const publishedRows = [
    ['Am the life of the party.', 0, 'positive'],
    ['Feel little concern for others.', 1, 'negative'],
    ['Am always prepared.', 2, 'positive'],
    ['Get stressed out easily.', 3, 'negative'],
    ['Have a rich vocabulary.', 4, 'positive'],
    ["Don't talk a lot.", 0, 'negative'],
    ['Am interested in people.', 1, 'positive'],
    ['Leave my belongings around.', 2, 'negative'],
    ['Am relaxed most of the time.', 3, 'positive'],
    ['Have difficulty understanding abstract ideas.', 4, 'negative'],
    ['Feel comfortable around people.', 0, 'positive'],
    ['Insult people.', 1, 'negative'],
    ['Pay attention to details.', 2, 'positive'],
    ['Worry about things.', 3, 'negative'],
    ['Have a vivid imagination.', 4, 'positive'],
    ['Keep in the background.', 0, 'negative'],
    ["Sympathize with others' feelings.", 1, 'positive'],
    ['Make a mess of things.', 2, 'negative'],
    ['Seldom feel blue.', 3, 'positive'],
    ['Am not interested in abstract ideas.', 4, 'negative'],
    ['Start conversations.', 0, 'positive'],
    ["Am not interested in other people's problems.", 1, 'negative'],
    ['Get chores done right away.', 2, 'positive'],
    ['Am easily disturbed.', 3, 'negative'],
    ['Have excellent ideas.', 4, 'positive'],
    ['Have little to say.', 0, 'negative'],
    ['Have a soft heart.', 1, 'positive'],
    ['Often forget to put things back in their proper place.', 2, 'negative'],
    ['Get upset easily.', 3, 'negative'],
    ['Do not have a good imagination.', 4, 'negative'],
    ['Talk to a lot of different people at parties.', 0, 'positive'],
    ['Am not really interested in others.', 1, 'negative'],
    ['Like order.', 2, 'positive'],
    ['Change my mood a lot.', 3, 'negative'],
    ['Am quick to understand things.', 4, 'positive'],
    ["Don't like to draw attention to myself.", 0, 'negative'],
    ['Take time out for others.', 1, 'positive'],
    ['Shirk my duties.', 2, 'negative'],
    ['Have frequent mood swings.', 3, 'negative'],
    ['Use difficult words.', 4, 'positive'],
    ["Don't mind being the center of attention.", 0, 'positive'],
    ["Feel others' emotions.", 1, 'positive'],
    ['Follow a schedule.', 2, 'positive'],
    ['Get irritated easily.', 3, 'negative'],
    ['Spend time reflecting on things.', 4, 'positive'],
    ['Am quiet around strangers.', 0, 'negative'],
    ['Make people feel at ease.', 1, 'positive'],
    ['Am exacting in my work.', 2, 'positive'],
    ['Often feel blue.', 3, 'negative'],
    ['Am full of ideas.', 4, 'positive']
  ];
  const metadata = freeze({
    version: 'ipip-50-english-source-1.0.0',
    sourceURLs: [
      'https://ipip.ori.org/newBigFive5broadKey.htm',
      'https://ipip.ori.org/newScoringInstructions.htm',
      'https://ipip.ori.org/newPermission.htm',
      'https://ipip.ori.org/new_ipip-50-item-scale.htm'
    ],
    license: 'Public domain (IPIP items, scales and inventories)',
    attribution: 'International Personality Item Pool (IPIP). Big-Five factor markers; source identifies Goldberg (1992).',
    sourceLanguage: 'en',
    itemFidelity: 'Verbatim 50 English items, published sample order, five response anchors and official 10-item factor keys.',
    validationStatus: 'Published research instrument; scoring implementation verified. This application and translated adaptations have not undergone a psychometric validation study.',
    translationStatus: 'English source instrument only. Interface localization does not validate an instrument translation.',
    scoring: 'Positive key: response. Negative key: 6 minus response. Sum ten keyed responses per factor; mean equals sum divided by ten.',
    interpretation: 'Raw self-report factor scores only. Emotional Stability is oriented positively; Intellect / Imagination is not an IQ score.',
    limitations: [
      'No population norms, percentile ranks, diagnostic cutoffs or high/low classifications are provided.',
      'Self-report responses describe current perceptions and may vary with context or response bias.',
      'Not an intelligence test, mental-health diagnosis, brain-dominance test or assessment of employment suitability.',
      'Translated or culturally adapted items require linguistic review and empirical evidence before equivalent validity or cross-language comparability can be claimed.',
      'Passing software tests establishes computational fidelity, not reliability or validity in the intended population.'
    ]
  });
  const interestScales = [
    { id: 'realistic', title: 'Realistic' },
    { id: 'investigative', title: 'Investigative' },
    { id: 'artistic', title: 'Artistic' },
    { id: 'social', title: 'Social' },
    { id: 'enterprising', title: 'Enterprising' },
    { id: 'conventional', title: 'Conventional' }
  ];
  // Complete English paper Short Form, row-major within its two-column sections.
  // The paper source has no individual item numbers; stable software IDs are added.
  const interestPrompts = [
    'Build kitchen cabinets',
    'Drive a truck to deliver packages to offices and homes',
    'Lay brick or tile',
    'Test the quality of parts before shipment',
    'Repair household appliances',
    'Repair and install locks',
    'Raise fish in a fish hatchery',
    'Set up and operate machines to make products',
    'Assemble electronic parts',
    'Put out forest fires',
    'Develop a new medicine',
    'Investigate the cause of a fire',
    'Study ways to reduce water pollution',
    'Develop a way to better predict the weather',
    'Conduct chemical experiments',
    'Work in a biology lab',
    'Study the movement of planets',
    'Invent a replacement for sugar',
    'Examine blood samples using a microscope',
    'Do laboratory tests to identify diseases',
    'Write books or plays',
    'Paint sets for plays',
    'Play a musical instrument',
    'Write scripts for movies or television shows',
    'Compose or arrange music',
    'Perform jazz or tap dance',
    'Draw pictures',
    'Sing in a band',
    'Create special effects for movies',
    'Edit movies',
    'Teach an individual an exercise routine',
    'Teach children how to play sports',
    'Help people with personal or emotional problems',
    'Teach sign language to people who are deaf or hard of hearing',
    'Give career guidance to people',
    'Help conduct a group therapy session',
    'Perform rehabilitation therapy',
    'Take care of children at a day-care center',
    'Do volunteer work at a non-profit organization',
    'Teach a high-school class',
    'Buy and sell stocks and bonds',
    'Negotiate business contracts',
    'Manage a retail store',
    'Represent a client in a lawsuit',
    'Operate a beauty salon or barber shop',
    'Market a new line of clothing',
    'Manage a department within a large company',
    'Sell merchandise at a department store',
    'Start your own business',
    'Manage a clothing store',
    'Develop a spreadsheet using computer software',
    'Calculate the wages of employees',
    'Proofread records or forms',
    'Inventory supplies using a hand-held computer',
    'Install software across computers on a large network',
    'Record rent payments',
    'Operate a calculator',
    'Keep inventory records',
    'Keep shipping and receiving records',
    'Stamp, sort, and distribute mail for an organization'
  ];
  const interestMetadata = freeze({
    version: 'onet-short-form-60-english-v1-software-1.0.0',
    sourceURLs: [
      'https://www.onetcenter.org/IP.html',
      'https://www.onetcenter.org/dl_tools/ipsf/Interest_Profiler.pdf',
      'https://www.onetcenter.org/license_tools.html'
    ],
    license: 'CC BY-ND 4.0 (O*NET Career Exploration Tools original content)',
    licenseURL: 'https://creativecommons.org/licenses/by-nd/4.0/',
    attribution: 'This application includes information from the O*NET Career Exploration Tools by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). Used under the CC BY-ND 4.0 license. O*NET® is a trademark of USDOL/ETA.',
    sourceCredit: 'Sponsored by the U.S. Department of Labor, Employment & Training Administration. Developed by the National Center for O*NET Development (v1)',
    sourceLanguage: 'en',
    itemFidelity: 'All 60 original English paper Short Form activities, instructions, RIASEC sections and binary check-count scoring; row-major order within each original two-column section.',
    validationStatus: 'Official research-based original-content instrument. Computational fidelity verified; this software has no independent psychometric validation or official endorsement.',
    translationStatus: 'Original English content only. Items and source instructions must not be translated or modified under the selected no-derivatives content license.',
    scoring: 'Count selected activities in each ten-activity section: explicit unchecked=0, checked=1; raw sum 0–10. Preserve ties for respondent resolution.',
    interpretation: 'Occupational interests for career exploration, not abilities or employment suitability. Tied themes have no automatically assigned priority.',
    limitations: [
      'No percentile norms, hiring recommendation, aptitude or IQ score is provided.',
      'Scores describe interest in these activities, not competence or likelihood of career success.',
      'The English paper Short Form is not the distinct 30-item Mini-IP online instrument.',
      'Software presentation and explicit response tracking are technical integrations only; original content and purpose remain unchanged.',
      'Original O*NET content remains CC BY-ND 4.0 independently of the software source license; preserve attribution, source and license links.',
      'No official endorsement, approval or certification is claimed.'
    ]
  });
  const instruments = freeze([{
    id: 'ipip-50',
    title: 'IPIP-50 Big-Five Factor Markers',
    description: 'Rate how accurately each statement describes you as you generally are now. This English-source self-report questionnaire produces five raw factor scores.',
    instructions: 'Describe yourself as you generally are now, not as you wish to be in the future. Describe yourself as you honestly see yourself, in relation to other people you know of the same sex as you are, and roughly your same age. So that you can describe yourself in an honest manner, your responses will be kept in absolute confidence. Indicate for each statement whether it is 1. Very Inaccurate, 2. Moderately Inaccurate, 3. Neither Accurate Nor Inaccurate, 4. Moderately Accurate, or 5. Very Accurate as a description of you.',
    items: publishedRows.map(function (row, index) { return { id: 'ipip' + String(index + 1).padStart(2, '0'), prompt: row[0], scaleId: scaleDefinitions[row[1]].id, key: row[2] }; }),
    responseOptions: [
      { value: 1, label: 'Very Inaccurate' },
      { value: 2, label: 'Moderately Inaccurate' },
      { value: 3, label: 'Neither Accurate Nor Inaccurate' },
      { value: 4, label: 'Moderately Accurate' },
      { value: 5, label: 'Very Accurate' }
    ],
    scales: scaleDefinitions,
    metadata: metadata
  }, {
    id: 'onet-short-form-60',
    title: 'O*NET® Interest Profiler Short Form',
    description: 'The complete original English 60-activity paper Short Form for exploring six occupational interest areas. Software tracks explicit checked and unchecked responses.',
    instructions: 'Read the 60 work activities below. Place a check in the box by the activities you would like to do. Do not think about how much education/training is needed or how much money you will make! Count the number of checks for each shaded section and write that total in the box to the right of each section. These are your scores for each interest area.',
    interpretationInstructions: 'In the boxes below, write the names of the interest areas with the three highest scores. The first box is your highest or primary interest. If there are ties, choose the interest with activities that you think are the best fit for you.',
    responseOptions: [{ value: 0, label: 'Not selected' }, { value: 1, label: 'Selected' }],
    items: interestPrompts.map(function (prompt, index) { return { id: 'onet' + String(index + 1).padStart(2, '0'), prompt: prompt, scaleId: interestScales[Math.floor(index / 10)].id, key: 'positive' }; }),
    scales: interestScales,
    metadata: interestMetadata
  }]);
  function instrumentFor(id) {
    const descriptor = instruments.find(function (entry) { return entry.id === id; });
    if (!descriptor) throw new RangeError('Unknown instrument ID.');
    return descriptor;
  }
  function validate(instrumentId, answers) {
    const instrument = instrumentFor(instrumentId), clean = Object.create(null);
    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return clean;
    instrument.items.forEach(function (item) {
      const descriptor = Object.getOwnPropertyDescriptor(answers, item.id);
      if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) return;
      const value = descriptor.value;
      if (Number.isInteger(value) && instrument.responseOptions.some(function (option) { return option.value === value; })) clean[item.id] = value;
    });
    return clean;
  }
  function score(instrumentId, answers) {
    const instrument = instrumentFor(instrumentId), clean = validate(instrumentId, answers);
    const answered = Object.keys(clean).length;
    if (answered !== instrument.items.length) throw new TypeError('Complete every item with a valid response value before scoring.');
    const responseMin = Math.min.apply(null, instrument.responseOptions.map(function (option) { return option.value; }));
    const responseMax = Math.max.apply(null, instrument.responseOptions.map(function (option) { return option.value; }));
    const scales = instrument.scales.map(function (scale) {
      const items = instrument.items.filter(function (item) { return item.scaleId === scale.id; });
      const sum = items.reduce(function (total, item) { return total + (item.key === 'negative' ? responseMin + responseMax - clean[item.id] : clean[item.id]); }, 0);
      return { id: scale.id, title: scale.title, sum: sum, mean: sum / items.length, min: items.length * responseMin, max: items.length * responseMax, itemCount: items.length };
    });
    const result = { instrumentId: instrument.id, scales: scales, answered: answered, itemCount: instrument.items.length, metadata: instrument.metadata };
    if (instrument.id === 'onet-short-form-60') {
      // Group equal scores; never choose an arbitrary winner or three-letter code.
      const uniqueScores = Array.from(new Set(scales.map(function (scale) { return scale.sum; }))).sort(function (a, b) { return b - a; });
      let preceding = 0;
      result.rankedThemes = uniqueScores.map(function (sum) {
        const scaleIds = scales.filter(function (scale) { return scale.sum === sum; }).map(function (scale) { return scale.id; });
        const group = { sum: sum, rank: preceding + 1, scaleIds: scaleIds };
        preceding += scaleIds.length;
        return group;
      });
      result.topThemes = result.rankedThemes.filter(function (group) { return group.rank <= 3; }).flatMap(function (group) { return group.scaleIds; });
      result.tiesRequireChoice = result.rankedThemes.some(function (group) { return group.rank <= 3 && group.scaleIds.length > 1; });
    }
    return result;
  }
  return freeze({ instruments: instruments, validate: validate, score: score, metadata: metadata });
});
