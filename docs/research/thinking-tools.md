# Thinking-style tool provenance and integration contract

## Implemented: OHBDS 1.0, verified 20-item version

The [OHBDS landing page](https://openpsychometrics.org/tests/OHBDS/) describes a 24-item procedure. That conflicts with the explicit [OHBDS 1.0 source PDF](https://openpsychometrics.org/tests/OHBDS/development/OHBDS1.0.pdf), dated 29 April 2015, which contains 20 numbered statements and complete scoring equations. An independent read-only GET of the current questionnaire form also returned those same 20 statements. The implemented descriptor therefore names the verified **20-item version**; no extra four statements or scoring weights are invented. The [development manual](https://openpsychometrics.org/tests/OHBDS/development/) describes an 80-statement screening pool and four selected statements per each of five comparator quizzes, yielding 20.

### Content rights

The source PDF explicitly licenses both the OHBDS and that document under **CC BY-NC-SA 4.0**. This permits noncommercial sharing/adaptation with attribution, a license link, change notices and applicable ShareAlike conditions. It does not permit commercial use or conversion of this material to MIT/public domain. [License](https://creativecommons.org/licenses/by-nc-sa/4.0/).

Independent application code may have its separate software license; that license cannot remove the questionnaire's conditions. This bundled module is intended for the manager-authorized educational/noncommercial edition. Commercially used editions must remove the restricted content or obtain appropriate permission separately. Merely distributing an executable for free does not automatically establish that every possible commercial deployment meets the NonCommercial condition.

The original licensed document is retained intact as `ohbds-1.0-original.pdf`. `thinking-tools.json` retains attribution, source links, source hash, exact English item/instruction fixture, declared version and restricted-use metadata. Keep the following content credit and license/source links visible in the module and exported reports:

> Open Hemispheric Brain Dominance Scale 1.0 by Eric Jorgenson, 29 April 2015. Used under CC BY-NC-SA 4.0. Software presentation, stable item IDs, validation and scientific-context notices added; original English item wording and published scoring retained. No endorsement is implied.

Any later translated item set is an adaptation: retain the license/change notice, applicable ShareAlike conditions and an explicit lack-of-psychometric-validation notice. This delivery contains original English only. A translation being legally permitted does not establish scientific equivalence.

### Source arithmetic and interpretation

| Component | Original item numbers |
|---|---|
| A | 1, 2, 3, 5, 8, 10, 11, 12, 14, 18, 20 |
| B | 4, 6, 7, 9, 13, 15, 16, 17, 19 |

Responses are integers 1–5. Add the raw responses within A and within B, then compute **X = 66 − A + B**. This is equivalent to reversing the 11 A items with `6-response` and adding the nine B responses. X ranges 20–100. The optional software mean is `X/20`, the average of keyed contributions, **not** the average of the original response values and not a brain-function index. It is not a population percentile or a percentage of hemisphere usage.

Historical source bands are preserved for provenance: 20–55 has the source label “Left-brained”; 56–64 is “No clear preference”; 65–100 has “Right-brained”. Always qualify these as historical descriptive-style labels. They must not be rendered as an established neurological diagnosis, a validated learning prescription, intelligence or suitability for employment.

Independent reference vectors: all responses 1 yield 64, all 3 yield 60, all 5 yield 56; keyed minimum yields 20 and keyed maximum 100. The repeating sequence 1, 2, 3, 4, 5 produces A 34, B 26 and X 58. Boundary tests exercise 55, 56, 64, 65 independently. The fixture comparison preserves source typos rather than silently rewriting the original items.

### Scientific limit

The OHBDS source itself rejects the biological left/right personality premise. Correlation with other quizzes claiming the same distinction does not validate that premise. A [primary neuroimaging study](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0071275) analyzed 1,011 people and found no global whole-brain phenotype supporting the popular distinction, while recognizing local functional lateralization. Those findings do not turn a style questionnaire into a neural measurement. The app must treat this as educational/entertainment self-description with a visible non-neural limitation.

## External only: HBDI®

The [Herrmann vendor FAQ](https://herrmann.com.au/faq/) describes the familiar 116-question assessment and explicitly frames its model as a metaphor for thinking preferences, not current synaptic activity. [Vendor terms](https://herrmann.com.au/terms/) reserve intellectual-property rights and require written authorization for copying or redistribution. No such grant, official item set or scoring specification was established. Accordingly no HBDI questions, formulas, score codes, branded quadrant graphic or local “equivalent” are copied or fabricated. Use an external official-information/service card; the vendor's own administration/access process applies. Vendor validation claims do not validate a separately invented local substitute.

## External only: quick binary quizzes

The [Personality Test Center form](https://www.personalitytest.net/questionnaires/braindominance/index.html) contains 20 yes/no statements; public access does not establish redistribution permission or an authoritative local scoring specification. Its participants/statistics are not scientific norms for a new clone. The [Freudly page](https://freudly.ai/tests/is-your-brain-left-or-right/) describes 20 items attributed to Jonni Kincher, but examples and advertised cutoffs do not supply a verified complete local key. [Freudly terms](https://freudly.ai/terms-of-use/) reserve platform rights; no questionnaire redistribution license was established. Both remain clearly labelled external cards. No answers were submitted and no vendor was contacted.

Do not reproduce either provider's items or claim its server/AI interpretation as a local validated score. Opening these cards leaves the offline app; the provider's terms/privacy apply to any subsequent activity the user chooses on that site. Never automatically transmit local assessment answers or private reports.

## UI integration contract

`ThinkingCore` is UMD: `window.ThinkingCore` or `module.exports`. Exported fields are `instruments`, `externalTools`, `metadata`, `validate` and `score`.

- Add descriptor `ohbds-20-v1` to the local library only in the noncommercial educational edition. Items are `ohbds01`–`ohbds20`, response **values** 1–5, metadata version `ohbds-1.0-2015-english-20-software-1.0.0`, source language `en`.
- Route this descriptor to `ThinkingCore.validate/score`; preserve complete-response gates and English source instructions/anchors. Unknown or external-card IDs throw `RangeError`; invalid/incomplete responses throw `TypeError`.
- Results have the existing scale-table shape, plus `components:{A,B}`, `sourceBand` and a non-neural `interpretation`. Use raw X/mean/range, not a hemisphere percentage. Keep metadata/source/license/science limits attached to reports and JSON exports. Never replace the biological disclaimer with a generic published-scoring badge alone.
- Add `externalTools` as separate external cards, **not** local instrument descriptors. Their IDs are `hbdi-official`, `personalitytest-binary-official`, and `freudly-binary-official`; each carries an HTTPS URL, permission/science status and external privacy boundary. Extend only the app's exact-URL source opener allowlist for these approved destinations, not arbitrary URLs.
- Retain user-authorized creator credit separately from source attribution. No participant identities, report content, private file paths or credentials are included in this module or evidence.

The source check used independent GET/PDF parsing only. `tests/thinking-core.test.js` verifies the retained fixture, A/B memberships, manual reference vectors, boundaries, complete own-property inputs, external-only rejection and browser UMD loading. Computational correctness is not psychometric validation.

Verification outcome: all **7 thinking-core tests passed**, with zero failures. This verifies source fidelity and arithmetic only.
