# Independent v2 feature acceptance review

This review compares the professional interface and workspace calculation module with RF01–RF20. It is a code and behavior-contract review, not certification of an assessment, a native application test, or a complete multilingual usability result. Custom reflection and feedback tools remain unvalidated. Correct arithmetic does not establish clinical validity, population norms, employment prediction, or cross-language equivalence.

## Latest source recheck addendum

The earlier release-sensitive findings below have been corrected in the inspected source: dedicated print scoping and global raw-form/selector print exclusions; immediate privacy-toggle clearing/recalculation; successful-clear resetting of in-memory observer drafts/results; lazy coaching and interest-order export payloads; saved feedback/rubric reopening; individual pair scores and differences; subgroup-count suppression; descriptive dispersion with an insufficient-count guard; and an actual task-category breakdown explicitly labeled uncalibrated. These are source checks, not a substitute for the manager's native/PDF acceptance tests.

Remaining concrete corrections in this snapshot:

- **P2: normalized ID collisions.** Import checks incoming IDs before `cleanProfile` truncates them. Two different IDs sharing the first 100 characters can still become duplicate stored IDs. Check uniqueness after normalization and deduplicate or reject duplicated restored records.
- **P2: incorrect professional question-count badge.** Professional titles still use the legacy heading helper's fixed twenty-question/five-minute badge, including instruments with different item counts and non-questionnaire pages. Derive the badge from the selected instrument or omit it for professional routes.
- **P2: report identity after print scoping.** Role printing hides the profile/role selectors, but the chosen report region does not contain the selected role title or profile identity/version. Feedback printing similarly needs an explicit framework identity/version. Include a static report identity/method block inside the printed region.
- **P2: practice coaching terminology.** Practice correct-answer scores still receive generic preference prompts. Use task/error/reasoning prompts for practice results instead of treating a correct-answer count as a preference.

Product extensions still partial are plain-language dimension explanations, a dimension-by-scenario comparison table, explicit assessment-to-development-plan association, richer motivation/stress/change reflection, and a general authorized framework-resource guide. These gaps must be completed or retained as explicit scope limits; they are not evidence of psychometric validation.

## Coverage matrix

| Requirement | Current implementation | Acceptance status and remaining work |
|---|---|---|
| RF01 — individual report identity and domains | Instrument title/version, date, administration language, raw sums, means, possible ranges, source/license, and interpretation boundary are displayed. | Implemented in code. Verify displayed/exported metadata with source-faithful, translated, mixed-language, and unknown-language fixtures. |
| RF02 — readable behavioral/personality summaries | Published-key scoring is distinguished from custom reflection; scale tables and generic coaching prompts exist. | Partial. Add brief, nonpredictive dimension explanations so users can understand a score without interpreting it as a percentile or fixed identity. |
| RF03 — interests and career reflection | Interest domains, tied groups, participant-selected theme order, and source instructions are available. | Substantially implemented. Immediate exports now build their profile payload lazily; verify the actual file. Career-environment exploration prompts remain limited. |
| RF04 — explained reasoning/skills practice | Independent practice tasks use explicit keys and provide correct-answer explanations. | Implemented in code. Retain the practice-only boundary; do not label the results IQ or normed aptitude. |
| RF05 — editable role scenario comparisons | Target intervals and per-dimension distances are transparent, and custom scenarios can be saved. | Implemented with a usability gap: editing creates another scenario rather than modifying the selected custom scenario. Rename this action as creating a copy or support actual editing. |
| RF06 — multiple scenario comparison | Scenario summaries show within-range counts and total distances without producing a hiring recommendation. | Partial. A dimension-by-scenario comparison table is absent; the present list requires opening scenarios separately. |
| RF07 — coaching and experiments | Original prompts and per-profile notes are available; export reads saved notes at click time. | Partial. Skills-practice scores are still discussed as preferences. Use practice-specific prompts; verify immediate note export in the runtime gate. |
| RF08 — structured discussion/interview guide | Original open-ended prompts and example notes are provided with a nonvalidated-interview boundary. | Implemented at a basic level. The prompts are generic rather than theme-specific; do not imply predictive selection validity. |
| RF09 — development actions | Action, intended outcome, owner, target date, follow-up date, completion flag, and progress notes are stored and exported separately from assessment scores. | Substantially implemented. Explicit association between a development action and its originating report is absent. |
| RF10 — person-to-person comparison | Compatible profiles show combined summaries plus labeled individual means and signed differences for a two-person selection. | Implemented in the interface. Verify JSON export preserves the pair-specific displayed information, not only combined group rows. |
| RF11 — team summaries and privacy | Same-instrument/version and language checks exist; counts and observed ranges are displayed; print scoping excludes the profile selector. | Substantially implemented. Distribution views are limited. Verify actual PDF output contains only selected report information. |
| RF12 — role-separated multi-rater feedback | Self/observer means, valid observer counts, not-observed responses, and role subgroup details exist with per-subgroup suppression. | Implemented in source. Verify individual role cells in browser, JSON, and PDF with sparse and sufficient subgroup fixtures. |
| RF13 — disagreement and dispersion | Self-minus-observer differences, valid counts, and descriptive observer SD are available. | Implemented in source. SD is suppressed below two observations and below the privacy threshold when enabled. Verify the actual report and avoid interpreting it as reliability. |
| RF14 — priority overlap | Shared/union priority counts and a stated overlap formula are available when privacy mode is disabled. | Implemented in code. Verify privacy changes immediately alter the visible/exported report. Overlap is not a competence score. |
| RF15 — sales and service development | Separate custom sales and service feedback themes are available. | Implemented as custom observation checklists. No commercial aptitude, favorable-zone, or performance-prediction equivalence is established. |
| RF16 — emotion, work behavior, stress, and change reflection | Independently authored emotional, working-preference, and communication tools are labeled unvalidated. | Partial. Contextual motivation/stress/change reflection sections are limited to items and generic coaching. Avoid diagnosing vulnerability or prescribing behavior from a raw score. |
| RF17 — topics, difficulty, partial credit, and time | Practice keys, explanations, category breakdowns, category labels, elapsed wall time, and weighted topic rubrics exist. Rubrics support additional tasks and saved records. | Implemented as practice/rubric reporting. Authored task categories are explicitly not calibrated difficulty levels; retain that distinction. |
| RF18 — selected exports, summaries, metadata, and revisit | Individual JSON exports, PDF/print, saved assessments, saved feedback reopening, and saved rubric reopening exist. | Partial and release-sensitive. Whole-page PDF scope, live export values, deletion/clear behavior, export scope, and feedback framework-version metadata need verification or correction. |
| RF19 — framework resources and proprietary boundaries | Source instruments and custom alternatives are separated; commercial certification and proprietary norm claims are avoided. | Boundary is implemented. A general educational framework/resource guide is not yet present. It must use authorized material and distinguish research support from familiar branding. |
| RF20 — language, stable identifiers, and RTL/LTR | Stable response IDs, localized numeric/date presentation, explicit original-English modes, per-answer administration languages, and mixed/unknown-language flags exist. | Source design is substantially implemented. Verify all professional routes across the complete locale set, keyboard operation, RTL/LTR layouts, PDF/print, and generated-translation limitations. |

## Earlier release-sensitive defects — corrected in source

The following describes the defects that prompted the corrections. The latest-source addendum above supersedes their original unresolved status; native acceptance evidence remains required.

### P1 — PDF export can bypass selection and suppression

`app/professional-ui.js` binds PDF export to the current whole page. The feedback page contains the raw rater editing cards above the suppressed summary, and the team page contains a selector listing every stored profile. Print styles currently retain those editing/selection sections. Consequently, a feedback PDF can reveal individual raw ratings while the summary is suppressed, and a selected-team PDF can disclose unselected profile names.

Safe correction: print a dedicated report region with its method/identity header, or hide all raw editing, selection, and saved-record controls in report printing. Validate the actual PDF text and appearance, not only the masked browser summary.

### P1 — privacy changes do not immediately affect an existing report

The feedback calculation captures the privacy checkbox value when the report is generated. Changing the checkbox afterward does not rebuild the report or its export handler. A user can enable suppression while a previously generated unsuppressed export remains bound.

Safe correction: apply the live privacy choice at export and update or clear the visible report when privacy changes. If ratings are incomplete, do not leave an exportable unsuppressed result under an enabled suppression control.

### P1 — workspace clearing leaves feedback drafts in memory

The confirmed clear operation resets the stored workspace object, but the independent in-memory observer draft and feedback result are not reset. Returning to the feedback page can expose the previous ratings and permit regenerating or saving them after the workspace was cleared.

Safe correction: clear all related in-memory report/draft state after a successful clear. Verify that a failed persistent clear restores prior data, while a successful clear followed by feedback navigation contains only empty initial controls.

### P2 — immediate exports can contain previously saved values

Coaching JSON export is created with the notes string present when the page renders. Saving a new notes string does not refresh that captured value. Individual export similarly creates a shallow profile copy before the interest-order form assigns a new choice array. An immediate export can therefore omit the newly saved notes or preference order.

Safe correction: construct report payloads at export click, or rerender after saving while preserving the appropriate focus. Verify the exported file's exact new values without navigating away first.

### P2 — duplicate incoming profile IDs remain duplicated

Import removes matching IDs from existing records but does not require unique IDs within the incoming batch. Multiple records with the same ID can produce duplicate selectors. Team selection resolves each selected ID with the first matching profile and can count the same profile repeatedly.

Safe correction: reject duplicate IDs in a batch, or deterministically deduplicate before import and state that behavior. Enforce unique stored IDs and unique selected IDs before group calculation.

## Corrections observed in the latest source

- Feedback JSON privacy handling now suppresses each subgroup with fewer than three valid observers, even when the total observer count is sufficient. Per-observer priority overlap is omitted in privacy mode.
- A newly calculated assessment remains available in memory and opens its report when persistence fails, enabling export before closing.
- Professional reports have deletion controls, and the workspace has a confirmed clear operation with rollback on persistence failure.
- Saved feedback sessions can be reopened, and grading records support adding tasks and reopening saved rows.
- Per-answer administration languages are recorded. Mixed and unknown administration are distinguished from source-English administration; mixed/unknown-language group comparisons are rejected.
- Interest preference ordering is kept separate from calculated scores and checked against the computed rank order.

These corrections are source observations. Native failure, reload, export, and user-session evidence still belongs to the runtime acceptance gate.

## Focused acceptance checks

1. Create self plus three observers in three different one-person roles. With suppression enabled, inspect browser output, JSON, and PDF: no subgroup mean or raw rater form may leak into the exported report.
2. Generate an unsuppressed report, enable suppression, and export without generating again. Output must reflect the current privacy choice.
3. Fill feedback, successfully clear the workspace, and return to feedback. All old ratings and priorities must be absent. Repeat with simulated persistence failure to verify rollback.
4. Simulate failed storage after completing an assessment. Open and export the unsaved report, then confirm the exported complete answers rescore identically.
5. Save new coaching notes and a new allowed interest-order choice. Immediately export both reports and inspect the JSON values.
6. Import a batch with duplicate IDs. The application must reject it or apply a documented deduplication rule; a group report must not count the same profile twice.
7. Reopen saved feedback and grading records after restarting. Verify framework identity, stored values, missing observations, recalculated results, and applicable interpretation limits.
8. Inspect practice reports for actual topic and difficulty counts, correct-answer totals, and explicit time units. Keep partial-credit rubric totals separate from the practice task key.
9. Verify a selected-team PDF contains only the chosen participants and their compatible report metadata.
10. Exercise each professional route in LTR and RTL locales, including source-English questionnaires. Scores must remain unchanged; text, numbers, selection controls, warnings, and print output must remain readable.

No completion claim should convert these partial features or pending runtime checks into psychometric validation. Remaining product gaps should be completed or explicitly retained as scope limits before the implementation gate is closed.


## Manager verification after the final corrections

The normalized-ID collision check now runs after profile cleaning; restored records are deduplicated. Professional headings no longer inherit the legacy20-question badge. Scoped role reports include the selected participant, scenario and instrument version; feedback reports include their framework and version. Practice coaching now discusses explained tasks and errors. Pair exports retain individual means and signed differences. Numeric ranges and fractions are isolated LTR within RTL report layouts.

Current-source verification:33 unit tests and15 platform/browser tests pass. The30locale browser sweep exercises every professional route, all original custom items, optional IPIP wording, source-language preservation and report creation. The native smoke exercises30 locales, source IPIP50 midpoint scores and custom36 midpoint scores, persistence, PDFs and renderer isolation. Actual selected-team PDF text excludes unselected participant identities; current privacy state suppresses small observer groups in JSON. A final hands-on Windows capture session remains pending because the capture helper times out; automated native results do not claim that manual session completed.
