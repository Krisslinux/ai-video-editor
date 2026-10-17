# Validation record

Environment: Linux x86_64 runner, Node 24.19.0, npm 11.9.0, FFmpeg/ffprobe 6.1.1 (Ubuntu build with GPL/libx264 enabled; invoked as an external tool, not bundled). Windows RDP hardware and real phone footage were not accessible here.

2026-10-17: `npm run build` and `npm run typecheck` passed. Three core tests passed: atomic invalid batch, stale revision, indirect protected-position ripple, and save/reopen locks/timing. `npm run verify:loop` generated two color/tone clips (2s red, 3s blue) and 5s separate audio. It trimmed 1s from the first, set music gain .2 and 1s fade, saved/reopened the project, rendered preview and export. Expected composition 4.00s; ffprobe preview 4.00s, export 4.00s, 1280×720, video and audio streams. Decoded sampled frame at 0.5s was red and at 2.5s blue. Output is ignored in `local/fixture/`.

Not measured: click/flash A/V marker offset and drift, audio levels/clipping, captions, speech cuts, phone/VFR rotation, GUI responsiveness, Windows installation, external-network-blocked offline behavior, live AI, Sentry event delivery, and real creator tasks. Do not infer synchronization or subjective edit quality from the duration/color check. The initial target is no unexplained drift and within one output frame on a synthetic marker fixture after encoder delay correction.

Sentry: the official Electron SDK is installed with an opt-in, main-process-only diagnostic path; no DSN/project is configured here, so event delivery was not tested. It sends a generic redacted event, with no automatic breadcrumbs, stack trace, media, paths, prompts, or credentials. Offline mode closes reporting. A configured DSN and explicit opt-in are required to test delivery.

A portrait 360×640 render with the first clip set to Fill also probed at 4.00s. This checks output geometry and unchanged composition duration, but not crop aesthetics or caption safe area.
