# AI connections (2026-10-17)

| Route | Identity / inference | Prompt and model selection | Editor transport | Status |
|---|---|---|---|---|
| Custom OpenAI-compatible API | User-supplied HTTPS endpoint, model ID, optional OS-encrypted token; chat-completions JSON only | In editor | Main-process HTTP request | Implemented, live unverified |
| Compatible local endpoint | Loopback HTTP allowed, same protocol; offline mode allows only loopback | In editor | Local HTTP | Implemented, live unverified; no bundled model |
| Sign in with ChatGPT | Official eligibility/PKCE and account model catalog need verification | Potentially in editor where supported | Documented OAuth/inference route | Planned, not available in this build |
| ChatGPT/Claude/Gemini supported host | Host authenticates/runs model; does not grant the editor a reusable subscription token | In host unless a client exposes selection | Scoped MCP/plugin interface and pairing required | Planned; no MCP server exposed |
| Claude/Gemini direct personal account | No equivalent route verified for this app | Not offered | None | Unavailable pending official support |

The current adapter sends the instruction, asset names/kinds/durations, canvas, clips, and locks. It sends no video frames, audio bytes, or source paths. A remote provider can still receive private asset names/instructions; choose deliberately. There is no fallback to another billable provider. Remote cost is unknown and the app requires explicit authorization to dispatch; there is no enforced budget ledger yet. Disconnect removes the stored connection. Offline blocks remote dispatch in main, not only in the UI.

To use a compatible provider: Settings → enter base URL ending in its API prefix (e.g. `/v1`), model ID, optional token; save; enter an instruction; inspect proposed operations; compare/accept or reject. The endpoint must support POST `{base}/chat/completions` and JSON-object response format. Capabilities, pricing, model discovery, and actual compatibility must be verified for each endpoint. Tokens are refused when OS secure storage is unavailable (including Linux `basic_text`).
