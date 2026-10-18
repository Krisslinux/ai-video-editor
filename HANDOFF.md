# Handoff

Updated 2026-10-18 UTC. Branch: `build/editor-from-scratch`, based on `setup/development-foundation` (main still has only the initial repository). Draft PR #3 tracks this branch; GitHub issues #4–#6 track installer, timing/real footage, and AI connections. The older Descript research branch and PR remain untouched.

## Working code

Electron 44 desktop source; React timeline/library/preview/AI/Canvas/settings; typed schema v1 and shared command validator; initial content/position/gain/duration locks; in-memory undo/redo; atomic project save/open; FFmpeg import/probe/thumbnail/preview/export and pre-export basic report. Preview/export share a filter graph; source audio and separate music mix, including a composition-end music fade. Import reports display dimensions for rotated phone clips. Compatible endpoint AI proposals are dry-run validated and staged with before/after renders. Main-process offline gate and optional OS-encrypted tokens are present. Sentry SDK initializes before Electron ready and remains opt-in; a Windows loopback smoke test verifies redaction and offline/opt-out behavior.

## Checks

Linux Node 24/FFmpeg 6.1.1: typecheck, build, three core tests, and synthetic preview/export pass. Source clips 2s red + 3s blue, separate 5s audio, 1s trim → expected 4.00s; preview/export 4.00s, 1280×720, video/audio streams and red→blue order. Portrait Fill rendered 360×640 at 4.00s. A second trimmed two-clip fixture measured four flash/click pairs within 4.75–5.25 ms for both separate and source-embedded audio on Linux and Windows. A variable-frame-rate, 90°-rotated fixture passed import/trim/42-frame portrait export and timed orientation-marker checks on Linux and Windows. See docs/VALIDATION.md. The Windows Electron window loaded a saved project, rendered Chromium-playable H.264 preview, and completed UI trim/undo/redo/save/reopen; the app export path finalized a 3.00s MP4. Windows loopback Sentry envelope/redaction/opt-out/offline checks passed. Native file dialogs, installer, real footage, live AI, and external Sentry delivery remain unverified. CodeRabbit CLI 0.9.0 crashes in bundled Bun 1.4.2; PR full review triggered at stable head `1673e98`, result pending.

## Blockers and exact next action

Inspect CodeRabbit full review and resolve actionable findings, then publish the tested VFR/rotation fixture. Exercise native import/export dialogs with supplied real phone footage and separate microphone audio on Windows. Supply a reviewed Windows FFmpeg/ffprobe redistributable with license/source notices in the ignored vendor directory, then build and clean-install NSIS. Configure a real AI endpoint and Sentry project DSN locally without sharing credentials in chat; verify live edit and external diagnostic delivery. None of these external prerequisites should block core work.
