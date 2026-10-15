# Bring-your-own-provider AI (2.1.0)

The desktop integration normalizes provider-specific requests and text/SSE responses behind a common configure, preview, send and cancel interface. Users supply an exact model ID. Supported protocols are OpenAI Chat Completions, Anthropic native Messages, Gemini native generateContent/streamGenerateContent, OpenRouter Chat Completions, custom public HTTPS OpenAI-compatible endpoints and local Ollama Chat Completions.

Official references: [OpenAI](https://developers.openai.com/api/reference/resources/chat), [Anthropic](https://platform.claude.com/docs/en/api/overview), [Anthropic SSE](https://platform.claude.com/docs/en/build-with-claude/streaming), [Gemini](https://ai.google.dev/api/generate-content), [OpenRouter SSE](https://openrouter.ai/docs/api/reference/streaming), [Ollama](https://docs.ollama.com/api/openai-compatibility).

## Data and consent

Only an explicit selected assessment summary and the user's question enter the request. The summary allowlist contains instrument ID/version, administration language, raw scale IDs/titles/sums/means/ranges, validation status, interpretation and limitations. Names, profile IDs, timestamps, answers, notes and observer records are excluded. The question is sent verbatim; user-entered free text is not automatically anonymized.

Configuration and preview do not call the provider. The exact JSON body, destination and model are reviewable before explicit Send consumes a one-use, ten-minute token. Reconfiguration, clear and cancel invalidate the preview. There are no automatic retries, background requests or model downloads. Hosted provider billing applies; output limits do not guarantee cost. Local model performance and availability depend on the user's installation.

AI output is unverified educational commentary, never a diagnosis, IQ measure, hiring recommendation or validated score. It cannot change deterministic scores or assessment records. Provider processing and retention policies remain the user's responsibility.

## Credentials

Session-only keys are the default. The masked input clears after configuration. Optional named configurations encrypt full records with Electron safeStorage, supporting up to20 saved configurations per desktop user. Decryption occurs in the main process; the renderer receives metadata only. Saved entries can be activated or deleted. Clear session and delete saved configuration are separate actions. No key is placed in localStorage, report exports, logs or an environment variable.

[Electron safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage) uses Windows DPAPI, macOS Keychain and Linux secret stores. Storage refuses unavailable protection and basic_text fallback. This is OS-backed encryption, not a claim that every OS uses AES-256. Windows protection does not isolate secrets from other processes running as the same user. Unsigned macOS builds may prompt again after updates. Clear removes references, not guaranteed RAM wiping or external backups. This local desktop application has no hosted account database or embedded master key.

## Transport and streaming

Hosted/custom endpoints require public HTTPS, verified certificates, vetted DNS addresses pinned to the connection and no redirects. No URL credentials/fragments or user-supplied query parameters are allowed. Gemini's fixed SSE endpoint uses its documented alt=sse parameter. Authentication uses Bearer, x-api-key plus anthropic-version, or x-goog-api-key as appropriate.

Only the explicitly selected Ollama provider allows loopback HTTP/HTTPS (localhost,127.0.0.1,::1); its key is optional. A loopback connection does not guarantee local inference: Ollama cloud-backed models can forward data and incur provider charges. Other LAN, private, link-local and metadata service endpoints remain blocked. DNS resolution is checked on each request.

Question input is limited to6000 characters, serialized request24KB, response256KB and displayed text40000 characters. Output-token budget1200 uses each provider's corresponding field. Ordinary requests time out after45seconds, streams after120seconds including DNS. Cancel aborts the transport. SSE decoding handles split UTF-8/events, provider errors and terminal events; interrupted streams are not reported as successful complete results. Literal echoed credentials are redacted across chunk boundaries.

The sandboxed renderer receives request-bound text deltas through narrow trusted-window IPC. Output uses textContent, never executable HTML, scripts, tools or model-controlled actions. Browser/PWA neither requests keys nor connects to providers; AI connections are desktop-only.

## Verification and licensing

Tests use synthetic credentials, controlled transports and local test servers. They do not verify paid account access, model availability, provider retention or every OS keychain. Current executed checks are in VERIFICATION.md. No real provider credentials ship with the project.

AI does not change assessment rights or validity. IPIP remains public domain, O*NET CC BY-ND and OHBDS CC BY-NC-SA. The full bundled edition remains noncommercial.
