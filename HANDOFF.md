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
