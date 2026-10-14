# Brain Studio 2.0 platform delivery

Brain Studio assessments run locally by default without accounts or telemetry. Optional AI analysis sends a user-approved score summary and prompt to the chosen public HTTPS provider using a user-supplied API key; it is not required for assessment scoring or offline use. Desktop distributions contain only the application and its package metadata. The browser distribution contains portable application scripts, styles, language data and local assets. Build tools may download dependencies; the delivered app does not need them online.

## Desktop targets and installer behavior

| System | Architecture | Distribution | Required release gate |
|---|---|---|---|
| Windows | x64 | Assisted NSIS setup | Custom folder, shortcuts, installed smoke, uninstall and user data retention |
| macOS | Intel x64, Apple arm64 | DMG and ZIP | Matching host build and runtime from both distributions |
| Linux | x64, arm64 | AppImage and DEB | Matching host build, AppImage extracted runtime and DEB payload runtime |

Windows setup runs per user without elevation, offers an installation-folder page and creates Desktop and Start Menu shortcuts. Custom installer hooks enforce current-user mode for both assisted and silent operation and reject the machine-wide `/allusers` flag. Uninstall removes application files and shortcuts but retains application data. The CI check uses a chosen folder containing spaces and synthetic data sentinels. An interactive installer-page walkthrough remains a separate manual acceptance check.

macOS artifacts are currently unsigned and unnotarized. Gatekeeper trust and signing/notarization are unresolved distribution gates; building and running on CI does not establish a trusted macOS release. Linux tests extract and launch DEB content rather than installing a system package. Package-manager install/remove and FUSE AppImage mounting remain manual host gates. CI uses `--no-sandbox` only inside isolated Linux runner smoke tests to accommodate runner sandbox restrictions; production launches do not add that argument.

Build prerequisites are the locked Node dependencies, Electron 44.7.2 and electron-builder 26.15.3. From the repository root:

```sh
npm ci
node scripts/build-locales.cjs
node scripts/platform/build-icons.cjs
npx electron-builder --config electron-builder.yml --win --x64 --publish never
# On a matching macOS/Linux host use --mac or --linux and --x64 or --arm64.
node scripts/platform/audit-package.cjs
node scripts/platform/native-smoke.cjs
```

The native package audit rejects payload entries outside `app/` and `package.json`, development maps/logs, private folders and evidence. This is a packaging boundary, not a substitute for reviewing app source for private text before publishing.

## Offline browser/PWA distribution

```sh
node scripts/platform/build-web.cjs
```

The default output is `dist/web`. The builder requires an empty output directory and refuses to overwrite application sources. To rebuild, choose a fresh output directory or manually remove the previous generated output after checking its path. All portable files below `app/` are included automatically, including future research/UI modules. Electron main/preload CommonJS files and private/evidence folders are excluded.

Serve the generated directory over HTTPS or localhost using any static server. Subdirectory hosting is supported: manifest, scripts, cache URLs and service-worker scope are relative. Opening `index.html` via `file://` may show the app but cannot provide PWA installation or service-worker offline support. No server account or server-side data store is required. First loading needs access to the static files; after the service worker has installed and controls the page, the app and 30 languages are cached. Browser storage and operating-system cache eviction can remove local data, so export important results.

Supported browsers may offer installation from their own menu. Actual installation prompts vary by browser and OS and require a manual device check. The manifest provides standalone mode and deterministic 192/512-pixel icons. The vector and raster icons share one geometric source with no online rendering or host-font dependency.

The generated page inserts `web-adapter.js` before application scripts. Its `window.desktop` interface exposes `platform: 'web'`, `canPrint: true` and `canConfirmSave: false`. `exportPDF(language)` opens the browser print dialog and returns `{saved:false, printRequested:true}`; choose the browser's PDF destination if available. A browser cannot confirm whether the user saved or canceled. `exportJSON(report)` requests a Blob download and returns `{saved:false, downloadRequested:true}`; downloaded-file completion is likewise not asserted. The application should show request/print messaging for these fields, never a verified-save message.

Only generated web HTML changes the CSP to permit same-origin worker and cache requests. Electron assessment pages retain their restrictive CSP. Optional AI transport runs through the isolated desktop bridge; the browser/PWA displays a desktop-only AI notice and does not provide provider transport.

## Verification and release controls

```sh
node --test tests/platform/config.test.cjs tests/platform/web.test.cjs
```

Browser checks run Chromium against the generated app under a subdirectory, wait for an active service worker, switch the network offline, reload, verify all 30 language choices, check persisted local storage and inspect a real JSON download. Print semantics are tested with a stub: a browser PDF save and actual PWA installation are not claimed by this test.

For a development host with Edge already installed, set `PLATFORM_BROWSER_CHANNEL=msedge` to run the same browser checks there without downloading another browser. CI explicitly installs and uses Chromium.

`.github/workflows/platform-delivery.yml` defines five matching native host jobs and a browser job. A release cannot stage until every job passes. Build jobs have read-only repository permission and never auto-publish through electron-builder. Only the exact `v2.0.0` tag enables the release job. Actions are pinned to commits. The release job has write permission only in the `release` environment and creates a draft for review. Repository maintainers should protect that environment and the release tag before enabling publication.

Staging permits exactly 10 named version-2.0.0 assets: Windows setup, four macOS files, four Linux files and the offline web ZIP. Evidence, private files, blockmaps, dependency archives and unrelated files are rejected. `SHA256SUMS.txt` is generated over the staged files. Review the draft and unresolved native gates before publishing. No workflow run or release creation is implied merely by adding this configuration.

Evidence status on 2026-10-14: all eight structural/browser tests passed locally using Edge, including offline reload and a real downloaded JSON file; JavaScript and PowerShell syntax checks also passed. Windows installed runtime/uninstall needs the isolated CI host; macOS and Linux build/runtime checks need their matching CI hosts. At initial implementation those host gates are **not run**. Preserve that state until real jobs or recorded manual sessions pass.

Configuration references: [electron-builder NSIS](https://www.electron.build/nsis/), [electron-builder configuration](https://www.electron.build/configuration/), [GitHub runner choices](https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job).

## Content licenses and printing

The application code is MIT licensed. The complete bundled edition includes OHBDS content and machine-assisted adaptations under CC BY-NC-SA 4.0 and is noncommercial; MIT permission does not override that content license. The installer displays the composite notice before installation. Installed and browser payloads include LICENSE.txt and THIRD-PARTY-NOTICES.txt. O*NET retains its unchanged-English CC BY-ND conditions; IPIP is public domain. See content-licenses.md.

Selected-report PDFs use a reserved creator margin in Chromium 131 and later. Independent LTR/RTL short and multipage geometry checks verify exactly one creator line per page, no overlapping content, and no creator-only pages. Other engines use a repeating table-footer fallback whose physical margin geometry is not verified. Physical Windows desktop capture remains unverified; native automated user journeys are recorded separately.

## 2.0.0 build evidence

The application source294be8ac02a368fb78905815bb940367817d6b1e passed all six Platform delivery jobs in run38557145358 on2026-10-14. Verification covers the30-language offline UI, OHBDS/IPIP/O*NET arithmetic,21 platform/browser groups, source/privacy/content-license audits, native runtime and Windows setup lifecycle. Optional AI is covered by13 mocked security/transport checks and explicit UI preview/send tests; no live provider credentials or private records were used. Source code is MIT; the full OHBDS-containing bundle includes noncommercial CC BY-NC-SA content. See the README and content-license notices before commercial reuse.
