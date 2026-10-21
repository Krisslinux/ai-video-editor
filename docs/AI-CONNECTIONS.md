# AI connections

No inference credentials ship with the repository or private Site. Automatic assembly does not call an AI provider. It handles only conservative assembly and a few named revision commands. Unknown creative requests produce an explicit error instead of a fake AI edit.

In the site's AI connection page, choose a protocol, an HTTPS API base URL, your provider's exact model ID, and optionally a token. Save it there, never in chat. Then select Connected AI in a project's additional options. Manual IDs are supported; server model discovery is not yet implemented. A saved connection means configuration was stored, not that the endpoint/model was tested.

Supported wire protocols:

| Capability | Adapter | Input |
|---|---|---|
| Planning | OpenAI-compatible `/chat/completions` | Metadata, descriptions, actual transcripts; optional six JPEG samples |
| Planning | Anthropic `/messages` | Same inputs, Anthropic image blocks and version header |
| Transcription | OpenAI-compatible `/audio/transcriptions` | 16 kHz mono WAV; `verbose_json` segment timestamps |

Use a base URL that already includes the provider's required prefix, for example `/v1`; the adapter appends the endpoint. A custom Claude provider is not assumed to implement Anthropic protocol: select the actual compatible wire format. Model support for `max_tokens`, image blocks, verbose transcription and timestamps must be verified against that service. The app does not silently switch models, endpoints, tokens or billing sources.

Vision is explicit opt-in because capability varies. Up to six 480 px JPEG samples are sent. If vision is disabled, planning sees metadata and available transcripts only. A planner does not hear audio. Transcription, when configured, sends extracted speech to the same selected provider and caches timestamped segments by source/model fingerprint. Transcription audio is limited to 24 MiB per source; splitting longer speech requests is future work.

Tokens use AES-256-GCM server-side encryption with a key outside the database. GET settings returns only presence, not plaintext. The authenticated operator worker decrypts only to dispatch a request. Tokens never enter browser bundles, localStorage, URLs, exported compositions or logs. Changing connection configuration invalidates queued paid work before dispatch. Secret replacement must be coordinated with running work; cancel before changing credentials.

Every planning/transcription dispatch reserves a durable ledger entry before HTTP. Completed, failed and uncertain calls all count toward the project's allowance. Maximum output tokens and per-project request counts are bounded. Actual prices/charges may be unknown; no strict monetary spending cap is promised. The operator controls global maximums. A timeout or lost response is marked unknown; check the provider's usage before explicitly retrying. There is no automatic paid retry or fallback provider.

The worker validates DNS results, pins the chosen address for HTTPS, rejects private/reserved addresses, disallows redirects, URL credentials, queries and nonstandard remote ports, and bounds request/response sizes. `LOCAL_AI_ORIGIN` is an operator-only exact origin exception for a self-hosted endpoint. Visitors cannot configure arbitrary access to the worker's internal network. Hosted workers do not magically reach visitors' laptop localhost.

ChatGPT sign-in is website identity. Consumer ChatGPT/Claude/Gemini subscriptions are not offered as API inference in this release. No undocumented endpoints, cookies or account scraping are used. Eligibility for any future personal-account inference route must be verified for the actual deployment using current provider documentation.

Verification status: both protocol adapters passed **explicit local mock contract tests**. No real provider key or approved custom Claude endpoint was supplied in this session. No live inference, vision or transcription success is claimed.

Implementation references checked during build: https://tus.io/protocols/resumable-upload, https://ffmpeg.org/ffmpeg-filters.html, https://nodejs.org/api/sqlite.html, https://expressjs.com/en/5x/api/, https://vite.dev/guide/. Recheck provider documentation before enabling a model, rather than treating a saved setting as capability proof.
