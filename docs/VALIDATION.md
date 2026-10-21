# Observed validation · 2026-10-21

Environment: Linux workspace, Node v24.19.0, FFmpeg/ffprobe 6.1.1, React 19.3.1, Vite 8.3.5, Express 5.3.0, TypeScript 5.9.3. Existing MIT license preserved. The canonical main branch initially held only README/LICENSE. A separate feature branch was created. No Windows or Remote Desktop work was performed after the user's instruction.

Passed locally:

- Type checking and production browser/Worker builds.
- Plan ownership, ranges, protected clips, speech/caption mapping, ratios, rejected unknown automatic instructions, public/private DNS classification and known-lag waveform correlation.
- Explicit local mock contract tests exercise both OpenAI-compatible and Anthropic Messages planning adapters. This is not a live model test.
- Real HTTP integration: account/session, multi-clip/audio uploads, durable offsets, wrong-offset rejection, upload/session recovery across an API restart, worker probing, queued encode, full decode, byte-range playback/download, portrait revision, restore, protected-reframing rejection, cross-user isolation, unauthorized worker rejection.

Synthetic media measurement:

| Measure | Observed |
|---|---|
| Output | H.264/AAC MP4, 1280 × 720, 30 fps |
| Duration / frame count | 6000 ms / 180 frames |
| Expected and detected flash frames | 12, 42, 72, 102, 132, 162 |
| Audio peak offset relative to flash | +9.25, +16.75, +10.75, +0.90, +6.60, +3.40 ms |
| One-frame bound | 33.33 ms; all measured peaks within bound |
| Portrait revision | 720 × 1280, playable |

The click has a 20 ms envelope and AAC ringing/priming can shift the measured peak; this peak method is not a sample-exact onset measurement. There was no observed accumulating drift in this six-second CFR fixture. This does not prove sync for arbitrary phone/VFR/long-form media. Transcription/caption timing tests are mapping tests; live recognition and rendered caption appearance remain unverified.

The environment occasionally reset a reused local HTTP GET connection. GET/HEAD test reads can recover once; one such retry was recorded in a run. Mutation requests are not blindly retried. The same fixture's rendered metrics were unchanged across successful runs. Recovery of network errors must still be exercised in real browsers.

The private Site deployment succeeded, including D1 schema application and R2 binding. An authenticated worker claim against the deployed API returned HTTP 200 and connected the development worker. That is an API/deployment check; a creator's complete hosted-browser workflow has not been observed here.

Unverified or pending:

- Managed browser supervisor was unavailable (`sites-previewd` mailbox missing). The Sites skill prohibits replacing that infrastructure. Therefore browser visual QA and Playwright execution were not claimed. Chromium desktop/mobile and WebKit mobile workflow tests are supplied for CI/normal development hosts.
- No real Android/iOS device, Safari/Firefox/Edge run, dynamic text testing or actual browser-version matrix.
- No real phone files, orientation-metadata/VFR/mixed-rate/noisy-speech fixtures or long-duration render yet. Synthetic music uses 44.1 kHz and source sound 48 kHz, exercising sample-rate mixing.
- No live AI key or custom Claude service; no real paid calls, transcription/vision quality, pricing or provider account eligibility verification.
- Shared-signal correlation passed a deterministic numerical lag test; a real separate-recorder synchronization render is pending.
- No Docker installation, production Linux/Windows deployment, domain/DNS operation, disaster restore or pilot with real creators.
- No CodeRabbit service result or configured Sentry account/DSN. Diagnostics are off, with no claim that monitoring is connected.

The build is suitable for a private test, with honest worker-offline/provider errors. It is not labeled fully complete or production-perfect. See TASKS.md for the next supported work.

## Image-to-video verification

Seven core/adapter tests and the extended real HTTP/media integration passed after adding still images. Three actual JPEG/PNG/WebP fixtures were uploaded, probed by content, given display durations of 1.5, 2.0 and 2.5 seconds, and rendered without any source video or AI connection. The downloaded image-only MP4 was 1280 × 960, 6000 ms and 180 frames. Sampled output colors confirmed the correct red → green → blue sequence at its expected times.

A second version combined those images, a three-second source clip and music. The downloaded portrait MP4 was 720 × 1280, 9000 ms and 270 frames. Duration bounds, protected-image duration rejection, original PNG MIME/range playback and rejection of SVG text disguised as JPEG passed. The original flash/click fixture still passed unchanged. Two transient GET/HEAD transport retries were recorded in the extended run; mutation requests were not automatically retried. API responses and polling now explicitly disable caching.

The production browser/Worker builds and type checks passed. A Playwright image upload → duration → render → original-image comparison → download case is supplied. Browser execution remains unverified because the managed preview supervisor was unavailable. Live model planning from photos remains unverified without a configured provider.

## Lyric video and compact workspace — 2026-10-21

Passed `npm run check`, 8 core tests, regenerated media fixtures, existing native integration, and new `npm run test:lyrics`. Synthetic lyric report: `test-data/lyrics-1792586454179/report.json`. Native 640 × 360 MP4 has 90 frames / 3 seconds; text first appears at frame 12, word highlights at 12/42/72, audio onset errors about 0.021 ms. Tests cover audio-only uploads, the exact word timestamp request, strict missing-word rejection, palette schema, durable caching (two initial calls; no repeat on export), corrected/manual cues without provider, offset validation, and cross-user access.

Existing image/video report: `test-data/integration-1792586459254/report.json`; clip/image/mixed rendering, ownership, resume/restart, restore and protection still passed. Two read-only localhost transport retries were recorded. No mutation or paid provider request was automatically replayed.

A native exported frame was visually inspected for font, safe margins, color, and botanical stems. This does not substitute for browser/device review. `sites-preview start` remains unavailable: missing `/tmp/sites-previewd/requests` mailbox. Playwright scenarios were updated for compact UI and a manual lyric-video flow, but not executed here. Responsive layout is implemented, not visually verified on actual devices. Live transcription, real songs, multilingual font coverage, semantic theme fit, and long 8-minute renders remain unverified. Lyrics are not guaranteed perfectly transcribed or aligned; cue review and corrections are required.

## Personal API configuration and connection preflight

The current update adds durable capability checks before API work, with a new append-only connection_tests migration. Synthetic integration confirms the exact saved bearer/x-api-key token is forwarded, OpenAI and Anthropic planning both work through the selected protocol, image input is checked independently, and a segment-only audio response fails the check and blocks automatic lyrics before a job starts. Settings revisions invalidate results. The full native clip/image workflow still passes; lyric fixture remains 90 frames with highlights at 12/42/72 and audio onset errors about 0.021 ms.

The connection sample is synthetic speech (Amber river opens), stored as a bundled WAV. No real provider credential or actual user song was supplied to validate live behavior. The screenshot establishes aliases and compatible protocol claims only. The processor can run here while this environment is alive; it is not permanent server hosting. Boot/crash restart service definitions are prepared, but external installation awaits the user's server details. Managed browser preview remains unavailable; responsive browser scenarios are supplied but not claimed run.


## Lyrics-only studio and native toolchain — 2026-10-21

Passed typecheck, nine core/adapter tests, regenerated fixtures, native media regression, lyric/provider integration, and the production Sites build. Current native reports: `test-data/integration-1792620962741/report.json` and `test-data/lyrics-1792621192959/report.json`.

The lyric integration now creates a lyrics project atomically and rejects video upload metadata before storage reservation. OpenAI/Anthropic theme preflight checks a real supported lyric-palette response. The existing provider audio sample, missing-timestamp rejection, encryption/token forwarding, settings invalidation, caching, ownership, offset/correction, and real MP4 checks passed. The 90-frame synthetic lyric export retained expected text/highlight frames and approximately 0.021 ms synthetic audio-onset errors.

Local faster-whisper 1.2.1 was actually installed with the small multilingual model. It recognized the built-in phrase “Amber River opens.” and produced ordered word timestamps: 0–480, 480–740, 740–1120 ms. An end-to-end API/worker test selected local transcription, passed its real sample preflight, uploaded the spoken fixture, generated lyrics without any provider transcription request, and recorded zero provider calls for that song with a manual palette. `localWhisperVerified: true` is recorded in the lyric report. This verifies speech plumbing and timing contracts, not singing accuracy.

HyperFrames 0.8.185 and Puppeteer were installed and integrated. Chrome for Testing 155.0.8059.84 downloaded and reported its version, but browser processes exited before launch in both the real render and an isolated launch diagnostic. No HyperFrames export passed here. The temporary processor explicitly uses native canvas/FFmpeg. HyperFrames remains an explicit Ubuntu renderer option requiring its own successful fixture render; there is no silent fallback.

Frontend preview was attempted through the supported supervisor; `sites-preview start/status` both reported the missing `/tmp/sites-previewd/requests` mailbox. Desktop/mobile browser QA therefore remains unverified. The rewritten lyrics-only Playwright workflow covers audio upload, capability gating, timed import/correction, portrait export, LRC/MP4 download, and narrow-screen overflow for a normal browser-enabled host. No live Claude/custom-provider request, actual song, permanent Ubuntu installation, or ChatGPT plan linking was verified.


## Remove connection preflight and unblock manual work — 2026-10-21

At the user's request, Save & test and the Connection checks panel were replaced with Save settings. Saving no longer sends provider/sample requests or depends on processor availability. Capability gates and queued test processing were removed from the API and native worker; the retired test endpoint returns 410 and historical applied schema remains unchanged. Direct manual lyric entry can start from an empty song.

Passed typecheck, nine core tests, regenerated fixtures, native media regression (`test-data/integration-1792622397668/report.json`), full lyric/provider/native integration (`test-data/lyrics-1792622350972/report.json`), and production Sites build. The lyric run verified direct generation without tests, zero audio sample requests, actual local Whisper without a provider connection, preserved cue/range privacy, cached exports with an unusable transcription source, and theme-503 recovery. A theme failure retained the transcription, produced a real MP4 with a local starting palette, and was not automatically retried on export. The original 90-frame word/highlight and audio-onset assertions still passed. Provider errors in this run were explicitly labeled mocks, not the user's live provider.

The Impeccable detector returned no findings for changed UI files. The browser scenario now uses direct manual entry and verifies that generation is available without preflight. Managed browser preview remains unavailable as recorded above; that scenario and responsive device behavior are not claimed visually tested. HyperFrames/Ubuntu/live-provider limitations remain unchanged.
