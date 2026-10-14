# Independent research integration review

Scope: `app/professional-ui.js`, the source-instrument engine and the current verification suites. This review uses only public research material and synthetic answer patterns. No participant or reference-report data is included. Findings describe the reviewed UI snapshot; implementation fixes remain the manager's responsibility.

## Verified

- Fresh downloads of the official [IPIP sample](https://ipip.ori.org/new_ipip-50-item-scale.htm) and [O*NET Short Form PDF](https://www.onetcenter.org/dl_tools/ipsf/Interest_Profiler.pdf) matched all 50 and 60 English prompts, respectively, plus order, factor/section membership and keyed direction. O*NET's administration and tie-choice instructions also matched exactly.
- Source hashes remained `489d66de7a643d13e620ad2907285639f12e0bc083fbb4e68dc54128373e6f5a` (IPIP HTML) and `843c7d9959de58dc177435e7e3af4dbc99a9f48f98d6b4fdcc2aee762a63e721` (O*NET PDF).
- `node --test tests/*.test.js`: **33 passed, 0 failed**, including all 15 instrument checks. Older totals of 25 are superseded by the current suite. These cover source fidelity, independent raw-score vectors, reverse keys, complete binary responses, ties, malformed inputs and custom-workspace arithmetic.
- Initial platform run: nine of ten passed, including both professional-interface browser scenarios. The sole failure occurred before PWA assertions because the bundled Playwright Chromium executable was absent. Re-running the affected `tests/platform/web.test.cjs` with `PLATFORM_BROWSER_CHANNEL=msedge` passed both tests, including offline service-worker operation and export feedback. Browser availability was the initial limitation; no PWA assertion failed in the installed-browser run. This does not test macOS/Linux execution or establish psychometric equivalence.
- The UI passes selected response values through `data-prof-value`, correctly distinguishing O*NET's explicit zero from an unanswered item. It rescored imported answers and did not trust supplied result claims.
- O*NET item and instruction spans are excluded from interface translation. IPIP's default original-English mode similarly preserves prompts and response anchors. Emotional Stability remains positively oriented and no IQ or normative percentile is introduced.
- Raw-range bars are expressly labelled as response-range positions rather than population percentiles. Role comparisons are attached to the custom work-style instrument and disclosed as scenarios, not published personality-based employment predictions.

## Findings requiring correction

### P1: mixed assessment languages are pooled without equivalence evidence

Location: `app/professional-ui.js:42`, team comparison; compare with `app/workspace-core.js:71`.

The UI feeds `selected.map(profileResult)` to the comparison engine. Profile-level language/adaptation provenance is lost, while results all carry the same English-source instrument/version metadata. Two `ipip-50` profiles administered in English and an unvalidated translated language therefore pass the same-instrument check and are pooled into means/ranges without a translation-equivalence limitation.

Reproduction: complete one original-English IPIP profile and another translated-adaptation profile; select both on Team; compare. The current path accepts them. [ITC adaptation guidance](https://www.intestcom.org/files/guideline_test_adaptation_2ed.pdf) calls for empirical equivalence evidence before such cross-language comparability can be established.

Required change: carry administration provenance into comparison gates; reject mixed-language/wording cohorts without supporting evidence. Even a same-language translated cohort must retain its unvalidated-adaptation limitation in the displayed/exported report. Do not imply that correct arithmetic supplies measurement equivalence.

### P2: final toggle can falsely label a mixed administration as original English

Location: `app/professional-ui.js:35`, original-English checkbox and profile creation.

Answers survive toggling original wording and changing interface language. A saved profile records only `language: preserve ? 'en' : T.language` at completion. Answering some translated items, then switching back to English before the last response produces an English-labelled profile and a report asserting that published English items were preserved, without documenting earlier presentation changes.

Required change: fix the assessment wording/language for an in-progress draft, or retain per-item presentation provenance and label mixed administrations accurately. If wording changes require a new administration, reset/re-answer with a clear prompt. Do not silently relabel existing answers. Imported provenance is supplied by the file and must not be presented as independently established administration fidelity.

### P2: IPIP factor membership is exposed during administration

Location: `app/professional-ui.js:35`, questionnaire eyebrow containing the item's scale title.

The official IPIP sample says the indications identifying scored factors/directions should not appear in the respondent questionnaire. Revealing `Extraversion`, `Agreeableness`, etc. above every statement exposes the same construct membership and can cue response strategies. The engine's items/keys are faithful, but this administration should not be represented as the unchanged published presentation.

Required change: replace source-IPIP factor titles with a neutral assessment heading during administration. Keeping O*NET section names is appropriate: its source deliberately groups activities into named interest sections.

### P2: translated-adaptation limitation is hidden while answering

Location: `app/professional-ui.js:35`, `instrumentBoundary` inside a closed `details` element.

When original-English wording is unchecked, the psychometric limitation appears only inside collapsed instructions. A respondent can complete the translated form without seeing it. Display a concise visible adaptation notice immediately with the checkbox/questionnaire, and retain the limitation in exported results.

### P2: source tie-choice workflow has no response control

Location: `app/professional-ui.js:38`, interest themes.

Correct equal-score groups and the original respondent-choice instruction are displayed, but there is no control to choose primary/secondary/tertiary interests or save the respondent's tie resolution. The source explicitly requests that choice. This is an incomplete source workflow rather than a scoring error.

Required change: add an optional respondent ordering control that preserves computed scores and tie groups. Store/export user choices separately from computed ranks, with validation against the eligible tied themes. An all-zero result should remain no differentiated interest preference until the respondent chooses; do not invent a default code. If choosing is deferred, mark the step incomplete instead of claiming complete reproduction of the source workflow.

### P2: source/license attribution URLs are text rather than links

Locations: `app/professional-ui.js:33` and `:38`.

The attribution paragraph is present but has no source/license hyperlink. The report writes escaped URL strings into a `dd`; they are not linked. The [official redistribution conditions](https://www.onetcenter.org/license_tools.html) require source credit and a license link. Render usable links to the original tool and CC BY-ND 4.0 in the assessment/report attribution, preserve them in exports and retain the content-license carve-out separately from software licensing. Any external opening mechanism must retain the application's navigation security.

## Practical limitation outside arithmetic

At `app/professional-ui.js:35`, profile generation rolls back a computed profile after storage failure and tells the user to export the workspace. The current workspace export at `:45` exports saved profiles, not the unsaved draft/calculated result. A storage-failed user therefore cannot preserve the newly calculated result through that suggested action. Retain a usable in-memory result or provide draft/direct-answer export before rollback. This is an independent persistence defect, not a psychometric finding.

## Interpretation boundary

Fidelity and arithmetic checks do not establish a psychometric validation study, target-population norms, measurement invariance, validated translations, predictive job performance or clinical usefulness. O*NET measures occupational interests, not aptitude. IPIP Intellect / Imagination is not measured intelligence. Preserve those distinctions in every downstream report, team summary and export.

## Addendum: manager corrections independently inspected

The corrected `professional-ui.js` now records each answer's presentation language, derives a profile-level language, preserves unknown imported provenance as `und` and mixed administration as `mul`, and blocks mixed/unknown language cohorts. Original source spans use English language and left-to-right direction attributes. IPIP's factor label is replaced with a neutral heading, the method/adaptation note is visible outside collapsed instructions, and completed results remain available in memory after local-save failure.

Source/license links are now actual anchors. The native `main.cjs` source opener accepts only exact published-source/license URLs taken from the research descriptors, requires the trusted main-window/frame sender and passes only those HTTPS URLs to the system browser. The preload exposes that narrow method. Inspection found no arbitrary external URL or command execution capability in this added handler.

O*NET's report now has three respondent-choice controls; validation requires distinct eligible themes whose score sequence matches the top three scores. The chosen order is a separate profile field and does not modify the computed sums/ranks. This addresses the original absent tie-response workflow.

### Remaining P2: immediately exported tie choice is stale

Location in the corrected snapshot: `app/professional-ui.js:42`.

The individual export closure is prepared during rendering from a spread copy of the profile. Saving the tie form later changes the live profile's `interestOrder` without rebuilding that closure. An immediate selected-report export therefore contains the old choice, even though local storage contains the new one.

**Independently reproduced in installed Edge:** a synthetic complete all-zero original-English O*NET profile was opened; the respondent saved `social`, `artistic`, `realistic` as three valid tied preferences. Local storage contained that exact order. Without navigating, Export selected report produced `interestOrder: []`. No participant data was used. This is an export snapshot bug, not a score or tie-validation error.

Required change: construct the report payload when the export button is clicked, or re-render/rebind after saving a valid choice. Add a regression assertion comparing the freshly saved preference order with the immediately exported profile. Keep the computed score result separate.

### Remaining P2: team JSON drops the new scientific provenance

Location in the corrected snapshot: `app/professional-ui.js:46`.

The comparison gate now checks profile language and the rendered report warns about unvalidated group equivalence. However, its JSON export includes participant identity/instrument/version but omits questionnaire language and per-answer provenance; its limitations mention privacy/predictive validity but omit adaptation/group-equivalence limits. That detached report therefore loses the method boundary just added to the UI. Include participant administration language and relevant provenance, and retain the visible group-equivalence limitation in the export.

### Minor wording edge

Profiles marked `mul` or `und` correctly avoid original-English claims, but the generic warning still describes them as a translated adaptation in “this language.” Mixed or unknown provenance should be described expressly as mixed/unknown, rather than as one known translation. Imported language records are supplied by the file; their presence is not independent proof of the actual administration language.

### Subsequent inspection: both additional P2 defects corrected

The manager updated the source after the stale-export reproduction. `reportExport` now evaluates a function payload when clicked, and the individual-report binding supplies a function that copies the then-current profile. A focused independent regression extracted the actual current `reportExport` function into an isolated VM with a synthetic export sink, bound it before changing the synthetic profile's preference order, then invoked it after that change. The exported order correctly matched the newly selected `social`, `artistic`, `realistic` order. **The stale-snapshot defect is resolved.** This focused check required no additional browser session.

The current team-export payload includes each participant's administration language and the same adaptation/group-equivalence limitation shown in the report. The comparison gate already excludes unknown/mixed administrations, so a homogeneous language label is sufficient for the admitted cohort's export summary. **The missing team-export method boundary is resolved by source inspection.**

The previously started professional-browser suite passed its custom-assessment multilingual workflow, original-English source/workspace rendering scenario, and mixed-wording provenance/reload/comparison-block scenario. That redundant concurrent run was stopped after the manager reported a full browser suite already running, to reduce browser load; no claim of completion for the stopped whole suite is made. Final comprehensive browser evidence is owned by the manager's run.

Remaining review note is the minor mixed/unknown warning wording above. No remaining scoring, source-content, automatic tie-breaking or comparison-provenance P1/P2 defect was identified in this inspected snapshot. This inspection does not replace validation studies or host-specific runtime verification.
