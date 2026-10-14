# Research instruments and scoring evidence

## Implemented: English-source IPIP-50

The engine reproduces the public-domain IPIP 50-item Big-Five factor markers. All English prompts, presentation order, factor assignments and directions match the [official sample questionnaire](https://ipip.ori.org/new_ipip-50-item-scale.htm). The source is associated with Goldberg's Big-Five factor markers; this app is an independent implementation, not an official or certified test service. [Official factor key](https://ipip.ori.org/newBigFive5broadKey.htm).

The [IPIP permission page](https://ipip.ori.org/newPermission.htm) expressly places its items, inventories and scales in the public domain and permits commercial and non-commercial use without seeking separate permission. Software source licensing is separate from the public-domain questionnaire content.

### Scoring contract

Answers are the selected response **values 1–5**, not zero-based option indexes. Positive items contribute their response. Negative items contribute `6 - response`. Add the ten contributions for each factor. The displayed item mean is the sum divided by ten. This follows the [official scoring instructions](https://ipip.ori.org/newScoringInstructions.htm). No missing-response imputation, weighting, normative conversion, cutoffs or percentiles are added.

| Factor | Positive item numbers | Negative item numbers | Raw sum | Mean |
|---|---|---|---|---|
| Extraversion | 1, 11, 21, 31, 41 | 6, 16, 26, 36, 46 | 10–50 | 1–5 |
| Agreeableness | 7, 17, 27, 37, 42, 47 | 2, 12, 22, 32 | 10–50 | 1–5 |
| Conscientiousness | 3, 13, 23, 33, 43, 48 | 8, 18, 28, 38 | 10–50 | 1–5 |
| Emotional Stability | 9, 19 | 4, 14, 24, 29, 34, 39, 44, 49 | 10–50 | 1–5 |
| Intellect / Imagination | 5, 15, 25, 35, 40, 45, 50 | 10, 20, 30 | 10–50 | 1–5 |

Emotional Stability stays positively oriented: stressful/emotionally reactive statements are reversed. The eight negative items must not accidentally be reported as a positively keyed neuroticism scale. Intellect / Imagination is a personality self-report factor, **not measured intelligence or an IQ score**.

### API

`window.ResearchCore` in a browser; `require('./app/research-core.js')` in Node. Exported properties are `instruments` (an immutable descriptor array), `metadata`, `validate(instrumentId, answers)`, and `score(instrumentId, answers)`.

The implemented ID is `ipip-50`; item IDs are `ipip01` through `ipip50`. Each descriptor includes items `{id,prompt,scaleId,key}`, response anchors, scale titles, source links, license, version and validity limitations. `validate` retains only own data properties holding integer response values 1–5; unknown keys, inherited properties and accessors are ignored. Its result has a null prototype. Unknown instrument IDs throw `RangeError`. `score` throws `TypeError` if any required item is absent or invalid.

Complete scores return `{instrumentId, scales, answered, itemCount, metadata}`. Each scale contains `{id,title,sum,mean,min,max,itemCount}`. Here `min` and `max` are **the theoretical raw-sum range**, not observed response extrema. `answered` and `itemCount` are both 50. The result deliberately contains no overall personality score, percentile, medical interpretation, employment suitability or fixed career recommendation.

### Fidelity and test evidence

`ipip-50-source-fixture.json` records an independent download of the official questionnaire, the raw source SHA-256 and 50 parsed rows. HTML entities and whitespace are normalized; the English text and punctuation are preserved. A live comparison passed for all 50 prompts, order, scale IDs and scoring directions. The fixture test checks future changes against that source capture.

`tests/research-core.test.js` separately enumerates the official positive and negative memberships and hand-calculated expected sums. Its nine IPIP checks cover source fidelity, all-minimum/neutral/maximum response patterns, keyed endpoints, a mixed intermediate pattern, every reverse-keyed response value, missing/malformed inputs, inherited/accessor properties, descriptor immutability and browser UMD loading. Six additional O*NET checks cover its source content, binary endpoints, six independent section vectors, mixed counts, ties and strict complete binary responses. All 15 pass. Passing those tests demonstrates computational correctness; it does not validate this app psychometrically.

## Translation and international applicability

The [International Test Commission's second-edition adaptation guidelines](https://www.intestcom.org/page/14) and [full guidelines](https://www.intestcom.org/files/guideline_test_adaptation_2ed.pdf) require attention to cultural constructs, appropriate adaptation procedures, piloting, empirical equivalence, reliability/validity, administration, interpretation and documentation. Expert linguistic review and target-population evidence are needed. Automatic translation, back-translation alone, or matching software answer patterns cannot establish equivalent measurement. Interface language availability is distinct from validated assessment-language availability.

This release verifies the English source and arithmetic only. It supplies no validated multilingual IPIP adaptation, target-population reliability study, measurement-invariance evidence or norms. Translations must be labelled adaptations lacking such evidence. Scores from different language/cultural versions must not be claimed interchangeable. The ITC guidelines are guidance, not a certification automatically earned by implementing a scoring function.

## Implemented: original English O*NET® Interest Profiler Short Form

See `onet-integration.json` and `onet-integration.md`. The complete official downloadable 60-item paper form is implemented with **binary check-count scoring**, separate from the 1–5 IPIP responses. Its unchanged English content and instructions are retained under CC BY-ND 4.0, with source attribution and a license link. The original PDF is included intact. Only the software presentation and response bookkeeping are new; no content translation or shortened form is included.

The descriptor ID is `onet-short-form-60`; item IDs are `onet01` through `onet60`. Answer values are 0 for unchecked and 1 for checked, **not** 1–5 or option indexes shared with IPIP. An unanswered item has no property; an explicit unchecked choice has a property with value 0. All 60 responses are required before scoring. Each of the six RIASEC groups contains ten items; its sum is 0–10 and mean is 0–1. `min` and `max` are theoretical sum limits. Always display the selected descriptor's metadata; the top-level `ResearchCore.metadata` remains the IPIP metadata for backwards compatibility.

Interest results also return `rankedThemes`, equal-score groups `{sum,rank,scaleIds}` using competition ranks; `topThemes`, all themes occupying the first three positions including cutoff ties; and `tiesRequireChoice`. Array order inside a tied group is source order, not a priority. All-zero responses retain all six tied themes; no interest preference is invented. The original instruction asks the respondent to choose among tied themes. The engine does not fabricate a three-letter Holland code, break ties alphabetically or assign a guaranteed career.
