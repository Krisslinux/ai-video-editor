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
