# Architecture

`src/shared/project.ts` defines versioned project/asset/clip types, integer microsecond source and timeline times, exact operation shapes, atomic batch validation, lock checks, and project validation. Video clips are contiguous in array order; imported music/audio has independent `startUs`. Rounding occurs at media import (seconds to microseconds), filter boundaries (six decimal places), and output frames (30 fps). `projectDurationUs` measures the video composition. The current native file holds absolute media references; portable collection and migrations are pending.

`electron/main.ts` owns the active project, undo/redo history, file dialogs, atomic save, encrypted connection settings, revision/idempotency checks, preview/export jobs, and constrained IPC. The renderer is sandboxed with context isolation, navigation/window creation disabled, a CSP, and a preload that exposes named methods only. Main checks sender/main frame on every IPC request. Imported assets and render outputs are served to the renderer by an ID-scoped local protocol, not arbitrary paths.

`electron/media.ts` probes via ffprobe and renders through FFmpeg argument arrays. The same filter graph produces H.264/AAC preview and export at different resolutions; the chosen build must expose libx264. Each asset opens once per render, with split/asplit branches for repeated clips. The graph is written to a temporary file and passed using the option supported by the detected FFmpeg major version (tested with 6.1.1 and 9.0.2); it is removed after completion or failure. Windows renders reject an excessive list of distinct input paths before reaching the process command-line limit. Video source audio follows trims/reorder; a separate audio track is mixed with its own gain, offset, and fade. Current supported effects are Fit/Fill, gain, and fade. Export writes a temporary file, probes its duration/dimensions, and renames only after success; canonical source/output paths are compared first. Interrupted encoding restarts; it is not resumable. Cancellation aborts the subprocess. Preview outputs are removed on replacement/invalidation and the render is settled before preview cache removal during graceful quit. Processing results and job state are not yet durable across app restart.

The provider adapter currently supports explicitly configured OpenAI-compatible chat completions with JSON response, HTTPS (or local HTTP), no redirects, optional OS-encrypted token, and a 60-second timeout. It supplies scoped asset metadata and project operations, not raw media bytes. The response is parsed and dry-run through the shared validator, then staged. The review renders before/after candidates, and acceptance calls the same `edit` IPC path. No automatic provider fallback exists. App dispatch budgets, model discovery, transcription/TTS, account sign-in, and MCP transport are pending. Unknown paid cost requires an explicit user opt-in per configured remote connection.

| Job | Current persistence | Restart behavior |
|---|---|---|
| Import/probe | Asset metadata after project save | Reprobe on new import; no resume |
| Thumbnail | Local user-data cache | Reuse when available; regeneration UI pending |
| Preview | Temporary MP4 | Restart render |
| Final export | Temporary output | Restart entire encode; incomplete temp removed |
| AI request | In-memory proposal | Unknown completion after interruption; no automatic retry |
| Transcription/generation | Not implemented | Not applicable |

A durable job journal, input fingerprints, completed-stage checksums, provider IDs, recovery UI, and exactly-once insertion across crashes are scheduled next. Current request IDs prevent repeated application only during one process lifetime; persistence is pending.
