# Brain Studio 2.0.0

An offline assessment, reflection, and development workspace with a modern multilingual interface. This independent application does not reproduce proprietary questions, commercial scoring, or personal reference reports.

## Features

- Published English IPIP-50 items and keyed raw sums, with optional explicitly unvalidated translations.
- Original English O*NET® 60-activity Interest Profiler: explicit binary responses, six interest counts, and separate respondent choices for tied themes.
- Independently authored working-preference, emotional-reflection, communication-style, and explained skills-practice tools.
- Individual reports, editable role scenarios, coaching/interview notes, development plans, compatible individual/team comparisons, and leadership/sales/service observer feedback.
- Explicit not-observed responses, valid counts, descriptive dispersion, small-group suppression, saved feedback, and weighted partial-credit grading.
- Selected PDF/JSON reports, deliberate answer-file exports/imports with recalculation, individual deletion, and workspace clearing.
- The original 20-question preference reflection and its 25 descriptive profiles remain available. Its newly authored scoring is unvalidated.

## Languages and RTL/LTR

Thirty interface languages: English, Arabic, simplified Chinese, Spanish, Hindi, French, Portuguese, Russian, Bengali, Japanese, German, Urdu, Indonesian, Korean, Turkish, Italian, Persian, Hebrew, Swahili, Vietnamese, Punjabi, Marathi, Telugu, Tamil, Thai, Gujarati, Polish, Ukrainian, Malay, and Hausa.

Arabic, Persian, Urdu, and Hebrew use RTL; other interfaces use LTR. The header selector persists the preference while preserving answers and scoring. Names and personal notes retain their own text. Source-English passages use an explicit LTR context inside RTL interfaces. Dates and numbers follow the selected locale.

Translations are machine-assisted linguistic drafts checked for coverage, placeholders, encoding, and runtime behavior. They have not received professional native-speaker or psychometric validation. Each answered item records its presentation language. Mixed or unknown administrations are explicitly retained and excluded from pooled comparisons; identical translated-language profiles remain descriptive and do not establish equivalence.

IPIP defaults to published English wording; translated mode displays a visible adaptation limitation. O*NET source activities/instructions remain English under their content license. Verbal skills practice also retains authored English. A translated interface does not imply that every instrument has a validated translation.

## Scoring and limits

IPIP positive items contribute their response and negative items contribute `6 - response`; ten items per factor yield 10–50. O*NET counts ten binary checks per theme, yielding 0–10. Missing responses block completion. No norms, diagnoses, IQ, population percentiles, predictive job suitability, or certification are invented. Larger scores are not automatically better.

Custom tools, role target ranges, observer prompts, practice task categories, and development suggestions are authored tools with transparent formulas. Correct arithmetic and source fidelity are separate from psychometric validity. See `docs/research/README.md`, `docs/research/v2-integration-review.md`, and `docs/reference-feature-map.md`.

## Install and run

Delivery targets are Windows x64 NSIS, macOS Intel/Apple Silicon DMG and ZIP, Linux x64/ARM64 AppImage and DEB, and a portable browser/PWA package. Native packages require supported operating-system runtimes. Other browser-capable systems can use the web edition. Host builds, runtime, and installer acceptance are separately recorded in `docs/platform-delivery.md`; configuration alone does not establish installation on every OS. Development packages do not claim publisher signing or notarization.

The Windows installer permits a chosen destination and creates desktop/Start Menu shortcuts. Uninstall preserves application data. For web use, serve the extracted files through HTTPS or localhost so the offline service worker can install. After the initial cache completes, the application operates offline. Browser JSON exports request a download and PDF exports open the print dialog; the app cannot confirm browser saves.

## Privacy

Data remains in local application/browser storage and is not encrypted by the app. Native storage belongs to the current user's Electron application-data directory; browser storage belongs to its origin. Clearing local records leaves previously exported files untouched. The legacy reflection history and professional workspace have separate deliberate clearing controls.

The native renderer is sandboxed, isolated from Node.js, and denies network requests, navigation, popups, and permissions. Explicit fixed-allowlist research links can open the system browser. Assessment answers and private reference data are not transmitted by the application. Public delivery excludes private documents, extracted text, identities, private paths, local audits, and credentials. Small-group suppression does not guarantee anonymity.

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

This application includes information from the O*NET Career Exploration Tools by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). Used under the [CC BY-ND 4.0 license](https://creativecommons.org/licenses/by-nd/4.0/). O*NET® is a trademark of USDOL/ETA. The unchanged original PDF and source fixtures are in `docs/research/`. This application is not endorsed by USDOL/ETA. [Source/content license](https://www.onetcenter.org/license_tools.html).

## تشغيل البرنامج

Brain Studio برنامج مستقل للتأمل الشخصي والتطوير، بواجهة عربية واتجاه من اليمين إلى اليسار، ويدعم 30 لغة. اختر اللغة من أعلى الشاشة ثم افتح مكتبة التقييمات أو التقارير أو خطة التطوير. تبقى بياناتك على جهازك؛ ويمكنك تصدير التقرير المختار أو حذف البيانات المحلية.

الترجمة لا تعني اعتماد المقياس علميًا بالعربية. يحتفظ O*NET بالنص الإنجليزي الأصلي، ويتيح IPIP النص الإنجليزي افتراضيًا وترجمة غير معتمدة اختياريًا. النتائج الخام ليست تشخيصًا أو قياسًا للذكاء أو نسبة ملاءمة وظيفية معتمدة. أدوات التطوير مؤلفة لهذا البرنامج وليست نسخة من المقاييس التجارية.

