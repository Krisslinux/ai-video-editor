# Release work

## Delivered for private testing

- Responsive upload/processing/result studio, projects, provider settings, JPEG/PNG/WebP image sequences and mixed visual projects.
- Common Node/Sites API, private ownership and secure server credentials.
- Real chunk uploads, persistent media/job state and native worker rendering.
- Automatic/AI plan boundary, strict validation, two provider protocol adapters and optional transcription.
- Versioned MP4s, captions mapping, audio mixing, conservative sync heuristic, protection and restore.
- Media timing fixture, isolation/recovery tests, browser test definitions and CI.
- Private Sites deployment; domain-ready configuration with no domain changes.

## Next acceptance gates

1. Configure a provider securely and verify a real model changes a validated plan/output. Test a real timestamped transcription and vision-capable model; record capability and actual/unknown usage separately.
2. Run supplied Playwright tests in working browser infrastructure; inspect 375/768/1440 layouts and keyboard/focus behavior. Test an actual iPhone/Android device, upload suspension/reselection and download fallback.
3. Test real phone rotation/VFR/mixed-rate footage, noisy narration, a reliable separate-recorder shared signal, ambiguous-signal rejection and a longer project. Measure independent sync markers throughout.
4. Move the temporary worker to an always-on constrained host. Verify worker lease recovery, cancel-during-finalization and uncertain-provider behavior under forced interruptions.
5. Add lease-aware retention/orphan cleanup, atomic project tombstones for deletion races, multipart final-output upload, comprehensive disk reservations, backup/restore and observed memory benchmarks. Keep active sources safe.
6. Verify Docker/Caddy deployment and rollbacks on the selected server. Connect the domain only after the private test is accepted and public deployment is explicitly requested.
7. Implement provider discovery/testing, per-user external connection names, range-level protection, independent change review, smarter subject framing and optional monitored quality correction as follow-ups.
8. Enable Sentry only with scrubbing and sampling verified; request CodeRabbit review when available. Run a real 3–5 creator pilot when participants are available. Do not invent feedback.

Lyric workflow implemented and synthetic native tests passed. Before release, verify a user-supplied song with a real word-timestamp model and Auto palette model, inspect browser/mobile layouts with working managed preview, test non-Latin fonts and overlapping vocals, and run a long-song stress test. The ChatGPT Sites test worker is still temporary.
