# Professional-workspace localization

Verified catalog snapshot: **858 entries in each of 30 languages**, including **642 extracted public captions/custom statements**, optional **50-item IPIP** and **20-item OHBDS** adaptations, and AI privacy/validation wording. All keys and placeholders are covered; 169 O*NET/skills source-only strings remain outside translation. The creator credit is identical in every language. Locale, thinking-core and AI tests passed (22 tests) on 2026-10-14; this is software coverage and source/scoring verification, not psychometric or translation certification.

`extract-v2-locales.cjs` reads only public application sources and instrument descriptors. It enumerates interface captions, public validation messages, custom reflection items, role and feedback labels, optional public-domain IPIP adaptations, and optional licensed OHBDS adaptations. It does not read participant records, private reports, reference attachments or credentials. AI localization is limited to static public interface wording; protocol keys, model request fields, secrets and actual user payloads are excluded.

The 29 non-English catalogs retain the earlier manually authored translations. New professional-workspace translations are machine-assisted linguistic drafts produced by a public translation endpoint through the developer-only Python tool. These are actual translated strings, not English fallback. Complete catalog coverage and exact placeholders are mechanically verified; that does not establish professional linguistic review, scientific equivalence, psychometric validity or cultural comparability. Critical boundaries are reviewed separately. Native-speaker review across all 29 languages remains an external quality gate.

The default IPIP presentation preserves the published English text and keys. Users can explicitly choose an unvalidated localized adaptation; all 50 items and the source instructions are represented in the catalog for that mode. O*NET activities, source instructions and response content remain original English. Skills practice items, choices and explanations also remain English. Localizing interface metadata does not change source instrument content or scoring.

OHBDS 1.0 is the 20-item **Open Hemispheric Brain Dominance Scale** by **Eric Jorgenson**, 29 April 2015, licensed under **CC BY-NC-SA 4.0**. The default presentation preserves the original English statements, including source typographical wording, instructions and published scoring. The optional translations of all 20 statements and instructions are machine-assisted adaptations with Arabic wording review. They have no asserted psychometric validation. Historical “left-brained”/“right-brained” labels are source style labels, not established hemisphere dominance, neural activity, intelligence, diagnosis or learning prescriptions.

The original questionnaire content and its translated adaptations remain subject to attribution, noncommercial use and ShareAlike conditions. The project's separate software license does not relicense that content. Preserve source attribution, a license link and the adaptation notice when redistributing these portions. Sources: [OHBDS 1.0 questionnaire](https://openpsychometrics.org/tests/OHBDS/development/OHBDS1.0.pdf), [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). OHBDS/HBDI names remain intact, and the application creator-credit string remains exact in every language.

Commands:

```sh
node scripts/extract-v2-locales.cjs
python scripts/translate-public-locales.py --apply
node scripts/build-locales.cjs
node scripts/check-v2-locales.cjs
node --test tests/locales.test.js
```

The Python tool sends only new strings in the explicit public manifest. Translation checkpoints are stored in the operating-system temporary directory. Running it is a developer operation requiring network access; bundled locale resources work offline. Optional user-approved AI provider requests are separate and do not use this translation service. Product names, protected abbreviations and placeholders are preserved. Running the normal JavaScript locale builder never contacts the translation service. The extractor decodes escaped source literals without executing source code.

The checker recognizes two reviewed native spellings shared with English: German `(optional)` and French `Question`. Source instrument names and Brain Studio labels are also intentionally preserved. Optional IPIP adaptations use first-person phrasing and explicit emotional wording for English idioms such as “feel blue”; these are adaptations with no asserted cross-language equivalence.
