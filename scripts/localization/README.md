# Professional-workspace localization

`extract-v2-locales.cjs` reads only public application sources and instrument descriptors. It enumerates interface captions, public validation messages, custom reflection items, role and feedback labels, and optional public-domain IPIP adaptations. It does not read participant records, private reports, reference attachments or credentials.

The 29 non-English catalogs retain the earlier manually authored translations. New professional-workspace translations are machine-assisted linguistic drafts produced by a public translation endpoint through the developer-only Python tool. These are actual translated strings, not English fallback. Complete catalog coverage and exact placeholders are mechanically verified; that does not establish professional linguistic review, scientific equivalence, psychometric validity or cultural comparability. Critical boundaries are reviewed separately. Native-speaker review across all 29 languages remains an external quality gate.

The default IPIP presentation preserves the published English text and keys. Users can explicitly choose an unvalidated localized adaptation; all 50 items and the source instructions are represented in the catalog for that mode. O*NET activities, source instructions and response content remain original English. Skills practice items, choices and explanations also remain English. Localizing interface metadata does not change source instrument content or scoring.

Commands:

```sh
node scripts/extract-v2-locales.cjs
python scripts/translate-public-locales.py --apply
node scripts/build-locales.cjs
node scripts/check-v2-locales.cjs
node --test tests/locales.test.js
```

The Python tool sends only new strings in the explicit public manifest. Translation checkpoints are stored in the operating-system temporary directory. Running it is a developer operation requiring network access; the distributed application contains no translation-service client and remains offline. Product names, protected abbreviations and placeholders are preserved. Running the normal JavaScript locale builder never contacts the translation service.

The checker recognizes two reviewed native spellings shared with English: German `(optional)` and French `Question`. Source instrument names and Brain Studio labels are also intentionally preserved. Optional IPIP adaptations use first-person phrasing and explicit emotional wording for English idioms such as “feel blue”; these are adaptations with no asserted cross-language equivalence.
