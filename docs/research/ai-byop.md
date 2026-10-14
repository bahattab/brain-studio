# Optional AI reflection with a user-supplied provider

## What is implemented

The desktop app supports bearer-authenticated OpenAI-compatible **Chat Completions** requests, including the OpenAI endpoint and a user-entered public HTTPS endpoint. The user supplies the exact model name and API key. The [official OpenAI Chat Completions reference](https://developers.openai.com/api/reference/resources/chat) documents the `model`, role-based `messages`, non-streaming request and text response shape used here. This compatibility layer is not a general adapter for every provider protocol, OAuth service, model or API.

The optional AI text is educational commentary. It is not a new validated score, diagnostic service, hiring recommendation, intelligence assessment or neural measurement. It cannot modify deterministic scores or stored assessment records. Source-instrument versions, administration language and scientific limitations accompany the summary sent for analysis. Model claims may be wrong; the app displays a visible unverified-commentary label and preserves the deterministic source result.

## Explicit preview and consent flow

1. Select a completed report. The root UI passes its result to `BrainAI.setContext(profile,result)`; this is a local operation, not an API request.
2. Enter provider format, endpoint, model and password-field API key, then choose **Use provider for this session**. Configuration is memory-only and sends no assessment data or authentication request.
3. Enter a reflection question, then choose **Preview exact payload**. The main process generates a size-limited JSON request snapshot, effective endpoint/model and one-use preview token. No provider request or DNS lookup occurs at this stage. The exact JSON body and destination are shown; the authorization key is not included in the preview body.
4. Only **Send preview to provider** submits that approved snapshot. Preview tokens expire after ten minutes, are invalidated by reconfiguration/clear/cancel, and cannot be replayed. Editing the form invalidates the displayed approval; a late preview response cannot re-enable a superseded send token.
5. **Cancel request** aborts the current request. **Clear key and preview** removes session configuration and preview references and cancels an active request. Closing the app clears that process's session state.

The summary allowlist includes only instrument ID/version, administration language, raw scale IDs/titles/sums/means/ranges, validation status, interpretation and limitations. Participant name, profile ID, timestamps, raw answers, private notes, observer records and credentials are excluded. The user's own question is sent verbatim and may contain whatever the user types; the preview makes that disclosure reviewable. Do not claim that user-entered free text is automatically anonymized.

## Credentials, networking and rendering

- API keys are accepted through the password field, then cleared from that field on configuration and retained only in the main-process service's memory. They are not written to local storage, configuration files, application logs or exports. No key is read from the user's environment or existing credential files. Clear/close removes references; this is not a claim of cryptographic RAM wiping or protection from an operating-system memory inspector.
- Provider requests run in Electron's **main process**, not the renderer. Narrow IPC handlers require the trusted main-window sender and exact local frame URL. Status responses expose public configuration and a configured flag, never the key. Authentication is placed only in the HTTPS `Authorization: Bearer` header. Provider errors are converted to fixed messages; response bodies and underlying transport exception text are not exposed as errors. Directly echoed keys in successful text are redacted.
- Endpoint URLs must be HTTPS and cannot contain URL credentials, queries or fragments. Local names, localhost, private/link-local/reserved addresses and unsupported special-purpose IPv6 are blocked. Every DNS address is checked; even one private result rejects the request. The selected vetted address is pinned into the HTTPS connection lookup, retaining the original hostname for TLS verification. Certificate verification remains enabled. Redirects are rejected rather than followed, so authentication is never redirected to another endpoint. A fresh request checks DNS again.
- Input is capped at 6,000 question characters and a 24,000-byte full request. Output is requested with a 1,200-token limit and capped at 256,000 received bytes/40,000 displayed characters. OpenAI uses `max_completion_tokens`; custom compatible endpoints use `max_tokens`. Provider support can vary. Timeout is 45 seconds across DNS and response phases; there is no automatic retry, background polling or automatic profile transmission.
- AI output is inserted with `textContent`, not HTML, Markdown evaluation, scripts or model-controlled links/actions. The provider cannot request a tool action through this interface. The outbound JSON preview uses a read-only textarea. No AI response is automatically saved into the assessment workspace.
- The browser/PWA edition displays an explicit **desktop-only connection** notice. It neither asks for API keys nor connects directly to provider APIs. No insecure CORS workaround or browser-stored secret is added.

The chosen provider receives the approved summary/question and authentication key, and controls its own processing, retention, billing and availability. The app does not promise zero provider retention or compatibility with every model. A real account/credential call was not performed during implementation; those live-provider conditions remain external verification gates.

## Integration contract

Load `ai-core.js` and `ai-ui.js` after the basic UI and before professional routes. `BrainAICore` is a UMD helper namespace; its network/service functions are Node-only and used by the main process. `BrainAI` exposes:

- `setContext(profile,result)`: make a sanitized copy of the explicit selected assessment. `setContext(null)` clears context. No network call.
- `mount(container)`: render into a supplied panel such as `#ai-panel`, preserving the root's profile selector. Defaults to `#content`. It accesses translation/desktop facilities at call time and displays a desktop-only notice when narrow AI IPC is absent.

Desktop bridge methods are `aiStatus()`, `aiConfigure(settings)`, `aiPreview({context,prompt,language})`, `aiSend({token})`, `aiCancel()` and `aiClear()`. Replies have `{ok:true,value}` or `{ok:false,error:{code,message}}`. The core service holds the actual preview snapshot; the renderer supplies only its one-use token when sending. The public configuration shape is `{configured,provider,endpoint,model}`, never an API key.

The AI feature's independent implementation is application software, not a relicensing of source questionnaires. Existing IPIP public-domain, O*NET CC BY-ND and OHBDS CC BY-NC-SA restrictions remain attached to their content; bundling OHBDS still limits the educational edition to its licensed noncommercial scope. AI commentary does not create a validated translated instrument or an HBDI replacement.

## Verification performed

`tests/ai-core.test.js`: **13 passed, 0 failed**. All credentials, profiles and transports are synthetic; no external questionnaire/API submission or vendor contact occurred. The tests independently cover endpoint/private-address rejection (including alternate literal localhost representations), DNS mixture rejection and pinning, TLS/authentication/request structure, preview-only/one-use/configuration boundaries, idempotent scientific-context sanitization, payload/secret limits, redirect refusal, sanitized provider errors, DNS/HTTP timeouts and cancellation, incompatible/oversized responses, key echo redaction, desktop password/no-auto-send behavior, late-preview invalidation, plain-text output and unchanged deterministic context.

The native smoke harness additionally contains OHBDS-20 all-neutral source checks (A33/B27/X60), original English after an Arabic interface switch, an OHBDS report PDF, and thirty-language AI-route checks for a blank password field and disabled Send before a preview. Those native checks are **implemented but not claimed executed here**; the manager runs them after localization is complete. The app never configures an actual provider key in that smoke procedure.
