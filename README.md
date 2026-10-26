# Brain Studio 2.2.1

An assessment, reflection, and development workspace that works offline by default, with a modern multilingual interface. This independent application does not reproduce proprietary questions, commercial scoring, or personal reference reports. Optional desktop bring-your-own-provider AI is implemented; its current verification status is recorded below and in `VERIFICATION.md`.

**License boundary:** application code is MIT-licensed, but this full edition includes OHBDS questionnaire content under CC BY-NC-SA 4.0. The full bundled edition is for noncommercial use. The MIT code grant does not relicense included assessment content. See `docs/content-licenses.md` and the packaged `THIRD-PARTY-NOTICES.txt`.

## 2.2.1 remediation

Imported questionnaires now keep reusable packages separate from respondent sessions, allow a fresh session without overwriting earlier answers, and identify saved administrations explicitly. Legacy sessions whose respondent attribution is unverified are marked `legacy-unverified` and require explicit confirmation before continuing. Imported answer exports can be restored as sessions; results are recomputed from the validated package and answers rather than trusted from an exported score.

The workspace clear action covers the professional workspace and imported packages/sessions and labels that scope explicitly. Legacy v1 reflection history and saved AI provider credentials have their own controls. Deleting local records does not delete previously exported files. See [imported questionnaires](docs/imported-questionnaires.md) and [verification status](VERIFICATION.md).

## Features

- Import private questionnaire JSON packages, preserve their source language, save answers, inspect transparent experimental keys and exclusion reasons, and export the resulting PDF/JSON report. Private source documents and keys are supplied separately and never bundled. See [imported questionnaires](docs/imported-questionnaires.md).
- Published English IPIP-50 items and keyed raw sums, with optional explicitly unvalidated translations.
- Original English O*NET® 60-activity Interest Profiler: explicit binary responses, six interest counts, and separate respondent choices for tied themes.
- OHBDS 1.0's verified 20-item source form, published `X = 66 - A + B` arithmetic, source attribution, noncommercial content license, and an explicit boundary against literal hemisphere diagnosis. Optional translated wording is an unvalidated CC BY-NC-SA adaptation.
- Official HBDI and other binary-style assessment links remain external-only; no proprietary local clone, vendor scoring key, or automatic answer submission is included.
- Independently authored working-preference, emotional-reflection, communication-style, and explained skills-practice tools.
- Individual reports, editable role scenarios, coaching/interview notes, development plans, compatible individual/team comparisons, and leadership/sales/service observer feedback.
- Explicit not-observed responses, valid counts, descriptive dispersion, small-group suppression, saved feedback, and weighted partial-credit grading.
- Selected PDF/JSON reports, deliberate answer-file exports/imports with recalculation, individual deletion, and workspace clearing.
- The original 20-question preference reflection and its 25 descriptive profiles remain available. Its newly authored scoring is unvalidated.

## Languages and RTL/LTR

Thirty interface languages: English, Arabic, simplified Chinese, Spanish, Hindi, French, Portuguese, Russian, Bengali, Japanese, German, Urdu, Indonesian, Korean, Turkish, Italian, Persian, Hebrew, Swahili, Vietnamese, Punjabi, Marathi, Telugu, Tamil, Thai, Gujarati, Polish, Ukrainian, Malay, and Hausa.

Arabic, Persian, Urdu, and Hebrew use RTL; other interfaces use LTR. The header selector persists the preference while preserving answers and scoring. Names and personal notes retain their own text. Source-English passages use an explicit LTR context inside RTL interfaces. Dates and numbers follow the selected locale.

Translations are machine-assisted linguistic drafts checked for coverage, placeholders, encoding, and runtime behavior. They have not received professional native-speaker or psychometric validation. Each answered item records its presentation language. Mixed or unknown administrations are explicitly retained and excluded from pooled comparisons; identical translated-language profiles remain descriptive and do not establish equivalence.

New IPIP and OHBDS sessions use the interface language, with an explicit original-English option; existing saved language choices remain intact. Translated modes display adaptation limitations. Translated OHBDS passages retain CC BY-NC-SA conditions. O*NET source activities/instructions remain English under their content license. Authored skills practice questions, choices and explanations follow the interface language. A translated interface does not imply that every instrument has a validated translation.

## Scoring and limits

IPIP positive items contribute their response and negative items contribute `6 - response`; ten items per factor yield 10–50. O*NET counts ten binary checks per theme, yielding 0–10. Missing responses block completion. No norms, diagnoses, IQ, population percentiles, predictive job suitability, or certification are invented. Larger scores are not automatically better.

OHBDS uses the source's 20 statements and A/B membership, with score `X = 66 - A + B` in 20–100. Its optional `X / 20` display is a keyed arithmetic index, not an average of the original responses. The source's historical left/right-style vocabulary does not establish neurological dominance, measured intelligence, or validated learning-style prescriptions. The source PDF and current source form contain 20 items despite an introductory webpage describing 24; the app follows the verified 20-item form.

Custom tools, role target ranges, observer prompts, practice task categories, and development suggestions are authored tools with transparent formulas. Correct arithmetic and source fidelity are separate from psychometric validity. See `docs/research/README.md`, `docs/research/v2-integration-review.md`, and `docs/reference-feature-map.md`.

## Install and run

Delivery targets are Windows x64 NSIS, macOS Intel/Apple Silicon DMG and ZIP, Linux x64/ARM64 AppImage and DEB, and a portable browser/PWA package. Native packages require supported operating-system runtimes. Other browser-capable systems can use the web edition. Host builds, runtime, and installer acceptance are separately recorded in `docs/platform-delivery.md`; configuration alone does not establish installation on every OS. Development packages do not claim publisher signing or notarization.

The Windows installer permits a chosen destination and creates desktop/Start Menu shortcuts. Uninstall preserves application data. For web use, serve the extracted files through HTTPS or localhost so the offline service worker can install. After the initial cache completes, the application operates offline. Browser JSON exports request a download and PDF exports open the print dialog; the app cannot confirm browser saves.

## Privacy

Assessment storage is local and is not encrypted by the app. Native storage belongs to the current user's Electron application-data directory; browser storage belongs to its origin. Clearing local records leaves previously exported files untouched. The legacy reflection history and professional workspace have separate deliberate clearing controls.

The native renderer is sandboxed and isolated from Node.js; ordinary assessment pages do not send data automatically. Fixed-allowlist research links can deliberately open the system browser. Optional desktop AI sends only an approved score summary and the user's prompt to their selected provider, after an explicit action; participant names, record IDs, and raw answers are excluded by the summary allowlist. Provider handling and any text the user deliberately types into a prompt remain the user's responsibility. Keys remain in session memory by default. Optional saved configurations use OS-backed encryption; saved keys never return to the renderer or enter assessment exports. Real-provider account access remains unverified.

Public delivery excludes private documents, extracted text, participant identities, private paths, local audits, and credentials. Small-group suppression does not guarantee anonymity. The deliberately requested creator credit is the sole explicit public identity exception.

## Optional AI — integration status

Bring your own supported provider, model, and API key. Assessment and reporting functions remain usable without AI or a network connection. No default credentials, embedded provider account, automatic background analysis, or inference of a clinical diagnosis is supplied. Provider billing and network availability apply to deliberately requested analysis.

Desktop supports OpenAI, native Anthropic Messages, native Google Gemini, OpenRouter, custom public HTTPS OpenAI-compatible endpoints and local Ollama on loopback HTTP/HTTPS. Users supply an exact model ID and their own hosted-provider key; local Ollama may omit a key. Streamed plain-text output supports cancellation. An exact request/destination preview and explicit Send are required. Provider billing applies, with bounded output and no automatic retry.

Session-only use is the default. Optional named configurations use OS-backed encryption and can be activated or deleted without exposing saved keys. Saving is disabled when secure storage is unavailable. This local desktop application has no hosted database or embedded master encryption key. Browser/PWA displays a desktop-only notice. See [AI architecture and verification](docs/research/ai-byop.md).

## Development and checks

Use Node.js 22.12+ and the committed dependency lockfile.

```text
npm ci
npm run locales
npm test
npm run test:platform
npm start
npm run smoke
npm run build:web
npm run build:win
```

Browser tests use Playwright Chromium by default; set `PLATFORM_BROWSER_CHANNEL=msedge` for installed Edge. Professional journeys use Edge when no channel is supplied. Build native packages on matching CI hosts. Tests use synthetic participants and separate data. See `VERIFICATION.md` for completed and pending acceptance.

## Attribution

Application code uses the MIT license in `LICENSE`. IPIP items/scales are public domain under the [IPIP permission statement](https://ipip.ori.org/newPermission.htm).

Open Hemispheric Brain Dominance Scale 1.0 by Eric Jorgenson, 29 April 2015, is included under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). [Original source PDF](https://openpsychometrics.org/tests/OHBDS/development/OHBDS1.0.pdf). Software presentation, stable IDs, validation, scientific notices, and optional unvalidated translations were added; no author endorsement is implied. Noncommercial and ShareAlike conditions remain attached to that questionnaire content and its adaptations. Approved source PDF SHA-256: `a9058e1c4e89fe176c72c553dee55be8f9e134687a49242428217d5e4bc1fe98`.

This application includes information from the O*NET Career Exploration Tools by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). Used under the [CC BY-ND 4.0 license](https://creativecommons.org/licenses/by-nd/4.0/). O*NET® is a trademark of USDOL/ETA. The unchanged original PDF and source fixtures are in `docs/research/`. This application is not endorsed by USDOL/ETA. [Source/content license](https://www.onetcenter.org/license_tools.html).

## تشغيل البرنامج

Brain Studio برنامج مستقل للتأمل الشخصي والتطوير، بواجهة عربية واتجاه من اليمين إلى اليسار، ويدعم 30 لغة. اختر اللغة من أعلى الشاشة ثم افتح مكتبة التقييمات أو التقارير أو خطة التطوير. تبقى بياناتك على جهازك؛ ويمكنك تصدير التقرير المختار أو حذف البيانات المحلية.

الترجمة لا تعني اعتماد المقياس علميًا بالعربية. يحتفظ O*NET بالنص الإنجليزي الأصلي، ويتيح IPIP وOHBDS النص الإنجليزي افتراضيًا وترجمة غير معتمدة اختياريًا. النتائج الخام ليست تشخيصًا أو قياسًا للذكاء أو نسبة ملاءمة وظيفية معتمدة. أدوات التطوير مؤلفة لهذا البرنامج وليست نسخة من المقاييس التجارية.

كود التطبيق مرخص بـMIT، لكن النسخة الكاملة تحتوي على أسئلة OHBDS بترخيص CC BY-NC-SA، ولذلك لا تمنح رخصة الكود إذنًا للاستخدام التجاري لهذا المحتوى. التحليل الاختياري بالذكاء الاصطناعي يتطلب مزودًا ومفتاحًا من المستخدم، وإرسالًا صريحًا لملخص محدد؛ وهو لا يعمل تلقائيًا. التحقق من مزود فعلي ما زال غير منجز.



## Creator credit

Created by Brain Studio, Emad Bahattab, Email: bahattab@yahoo.com

This explicitly requested credit appears in the app footer and the printable PDF footer. The creator contact is intentionally public; private reference reports and participant records remain excluded.
