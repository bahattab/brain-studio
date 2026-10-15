# Localization audit for 2.1.1

The corrected interface was opened in an isolated Chromium renderer in all 30 supported languages. The audit visited **325 states per language, 9,750 states total**. It used synthetic profiles and mocked desktop AI methods; no personal workspace or external AI provider was accessed.

## Coverage

- All 14 navigation pages and both derived questionnaire/result routes, including empty and populated workspaces.
- All 20 legacy reflection questions and all 220 questions across seven professional instruments. The 160 translatable professional questions include the authored skills practice prompts, choices, and explanations. The 60 O*NET source activities remain explicitly English.
- IPIP/OHBDS localized wording and explicit published-English opt-in; portfolio and coaching reports for every instrument; expanded instructions, metadata, and review details.
- All nine role scenarios and the scenario editor; saved development actions; pair and group comparisons; all three feedback frameworks with privacy enabled/disabled and observer details; saved grading rubrics and added rows.
- All six AI provider forms, saved-provider controls, preview/send/clear states, a provider error, unavailable secure storage, and the browser-only availability message. Provider transport was mocked.

Each of these languages completed the same 325-state matrix:

`en ar zh es hi fr pt ru bn ja de ur id ko tr it fa he sw vi pa mr te ta th gu pl uk ms ha`

Arabic, Urdu, Persian, and Hebrew were checked as RTL; the other 26 languages were checked as LTR.

## Results and reviewed English exceptions

The complete matrix recorded **zero missing translation diagnostics, zero page errors, zero language/direction mismatches, and zero horizontal page overflow** at the 1440 × 1000 audit viewport. SHA-256 values for the application HTML, JavaScript, and CSS were identical before and after collection. Every language completed its expected state count.

An independent rendered-text scan also examined text nodes, options, placeholders, titles, and accessibility labels rather than relying only on the application's missing-key tracker. Its 125,341 repeated observations reduced to 2,001 language/text pairs. All were reviewed and resolved, with **zero unresolved candidates**. Most were localized text composed with numbers, dates, or catalog templates; a Latin alphabet alone does not make a phrase English.

The bounded retained-English cases are:

- The exact user-required creator credit.
- Product/provider names and identifiers such as Brain Studio, IPIP-50, O*NET, OHBDS, model/version identifiers, source URLs, and the Enter keyboard label.
- Original source attributions, the cited paper title “Learning Styles,” the 60 O*NET activities/instructions, and published IPIP/OHBDS wording only when explicitly selected.
- User-entered names, notes, and provider metadata, which must not be machine-translated.
- Words whose correct target-language spelling equals English: `Visual` in Spanish/Portuguese/Malay, `Question` and `20 questions · ~5 minutes` in French, and `(optional)` in German.

Arabic screenshots cover 14 main pages plus the localized skills, IPIP, and OHBDS questionnaire screens. These three questionnaire screenshots were visually inspected for translated text and RTL layout. Native-language editorial review of every sentence in all 30 languages was not performed; this is software localization coverage, not linguistic or psychometric certification.

## Reproduction and local evidence

Run `node scripts/localization/audit-all-pages.cjs`. It fails on missing keys, empty-state English fallbacks, runtime errors, overflow, incorrect language/direction, incomplete coverage, source changes during collection, or unresolved text candidates. `AUDIT_LANGUAGES` can select a comma-separated subset for a focused rerun. `AUDIT_OUTPUT` selects the evidence directory.

Local evidence is retained under `evidence/locale-audit-all30-verified/`: `audit.json`, `summary.json`, `candidate-review.json`, `unresolved-candidates.json`, and `ar-*.png`. These generated files are excluded from the published source. The later source-link direction-only adjustment is checked separately in the four RTL languages; it does not change questionnaire text or scoring.
