# Handoff · private test release

Site: https://frameflow-video-studio.kriss626975.chatgpt.site

Canonical repository: https://github.com/Krisslinux/ai-video-editor

Feature branch: `build/ai-video-web`. Initial main commit: `f033cb71ad3b4539187ec79ed146bf764a03b4fa`. The original repository had only README and MIT license. No unrelated history was overwritten.

Open the private Site, create a project, upload two short clips and optional audio, wait for worker analysis, then click Create my video. Preview and download the real MP4. Ask for a shorter cut, quieter music or portrait framing; restore a previous version. Automatic assembly works without inference. For creative requests, save a real API connection securely and select Connected AI in the project's additional options.

The Site hosts browser/API/database/private media, while the connected development FFmpeg worker is temporary. It is not an always-on production host and can become offline when the workspace ends. Uploads remain saved. A permanent Linux/Windows worker can connect over outbound HTTPS without Remote Desktop. User asked to test on ChatGPT Sites first; no domain/DNS changes or public access expansion have been made.

Actual output verified: six seconds, 180 frames, H.264/AAC, 1280 × 720; portrait output 720 × 1280. Six flash markers matched exactly, measured click peaks were 0.90–16.75 ms from markers, inside one 33.33 ms output frame. Isolation, upload resume across API restart, protection and restore passed. See docs/VALIDATION.md for uncertainty and all untested environments.

Live AI is the immediate external blocker: no real provider credential/endpoint was supplied. The Settings form stores encrypted secrets and the adapters passed labeled local mock tests; neither is evidence of live inference. Browser QA was blocked by missing managed preview infrastructure. Docker, real phones/footage and long-form tests remain unverified.

Run locally: `npm ci --ignore-scripts`, copy `.env.example` to `.env`, install FFmpeg/ffprobe, `npm run dev`, then http://localhost:4173. Verification: `npm run check`, `npm test`, `npm run fixtures`, `npm run test:integration`, `npm run build:sites`. Supplied Playwright tests require a normal supported test host.

Before public release: install retention/orphan cleanup, verify deployed worker persistence, real AI and end-to-end browser/device behavior, and test backup restoration. Source/committed-output quotas and request limits exist, but actual costs may be unknown and are not hard monetary caps. Monitoring and CodeRabbit are not claimed connected.

## Image-to-video update

Use **Add images** (JPEG, PNG, WebP), or drop images and clips together. An image-only project can create a video with no AI credentials. Set each image's **Show for** duration (0.5–30 seconds, default 3), optionally add music/narration, then create, preview and download. The same native worker handles stills and video clips. Existing sources, ownership, image protection, versions, Fit/Fill and ratios apply. The temporary worker must run the updated code. Animated images and HEIC/AVIF/SVG/GIF are outside the supported image formats.

## Lyric videos

Choose **Lyric video**, upload a song (8 minutes maximum), then **Generate timed lyrics**. An OpenAI-compatible connection needs a transcription model with real word timestamps (`whisper-1` on OpenAI) and a chat model for Auto palette analysis. Initial generation uses up to two provider calls. Generated cues and palette results are cached; ordinary export/style revisions reuse them. No live provider or user song has been verified yet.

Review and edit the cue text/start/end times, save timing, and export an MP4. Saved corrections and LRC/JSON/seconds-table imports work without a provider. Imported LRC is line timed; word timing is never fabricated. A global ±10-second offset is explicit and rejected if it places a cue outside the song. Songs remain full length at original speed and volume. Only one lyric line/word stream is supported; overlapping duet cues need manual arrangement.

Seven restrained botanical motion variants and ten palettes draw inspiration from the user's partial Type Garden reference. The attached snippet cuts off before its drawing/export implementation; this is a new deterministic canvas renderer, not an exact reproduction. Browser preview and native rendering share audio-time drawing logic and bundled OFL Playfair Display/DM Mono fonts. Native canvas is worker-only. Auto palette combines transcript meaning and measured opening audio energy; it is a suggestion, with manual override, and does not claim the model heard the music.

The workspace copy is shorter, with compact controls, mobile navigation, responsive grids and cue editing, touch-sized fields, and reduced-motion preview support. Managed browser QA is still blocked by the unavailable `sites-previewd` mailbox; supplied desktop/mobile Playwright scenarios have not run here.

Validation: 8 core tests; full existing native integration; `npm run test:lyrics`; typecheck; Sites build. Lyric fixture: 3 s / 90 frames; first visible text frame 12; subsequent highlights frames 42 and 72; audio onset errors 0.021 ms. These are synthetic cues/local provider mocks, not evidence of real singing recognition or perfect creative matching.
