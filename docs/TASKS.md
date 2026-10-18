# Ordered milestones

Statuses: done, partial, pending, blocked. Completion means the observable check actually ran.

| Stage | Task | Status | Check / dependency |
|---|---|---|---|
| 0 | Fresh branch, pinned Electron/React/TS stack, lockfile, shell and typed core | Done | Linux build and typecheck |
| 0 | Narrow IPC, FFmpeg discovery, project atomic save | Partial | Windows desktop launched; project saved/reopened; native dialogs still pending |
| 0 | CI and packaging command | Partial | Windows local unsigned NSIS built with third-party GPLv3 media tools; clean install, source distribution review, signing, and hosted CI still pending |
| 1 | Import two clips + audio; manual trim/split/order/gain; undo/redo | Partial | Windows UI trim/undo/redo checked; cover-art MP3 classification fixture passed; import dialog and real footage pending |
| 1 | Fit/Fill, ratio presets/custom even dimensions, preview/export | Partial | Linux/Windows H.264 export/preview, flash/click offsets, and synthetic VFR/rotation checked; real footage pending |
| 1 | Initial locks, whole-batch before/after, quality warnings | Partial | Validator tests; screenshot/UI and warning fixtures pending |
| 1 | Live AI edit with compatible provider | Blocked | Endpoint/model/credential or local server not configured in this environment |
| 1 | Windows installer with bundled tools and clean-install test | Partial | Local unsigned 243 MB NSIS built, packaged export used bundled FFmpeg with system PATH excluded; clean normal-user install and release review pending |
| 1 | Offline manual loop, real phone footage, creator pilot templates | Partial | Offline dispatch gate and pilot template; external-network test/footage pending |
| 1 | Opt-in diagnostic delivery and redaction | Partial | Windows loopback envelope/redaction/opt-out/offline check passes; external Sentry project and persisted UI toggle pending |
| 1B | Eligible ChatGPT account flow, MCP hosts, model discovery, local adapters and enforced budgets | Pending | Official route/client compatibility and credentials |
| 2 | Transcript/captions/cleanup/ducking; selective review, full locks, quality analysis, durable jobs/interchange | Pending | Core editor baseline |
| 3 | Storyboard, reference analysis, B-roll, graphics, TTS and description-to-video | Pending | Media/AI capability adapters |
| 4 | Auto alignment, beat/reframe, cleanup, dubbing, optional generation/lip-sync | Pending | Models, licenses, fixtures, hardware |
| 5 | Safe updates, long-project performance, macOS/Linux, signed releases | Pending | Installer and project migration baseline |

Next: publish and inspect the fixes for all six CodeRabbit findings, then install the updated unsigned Windows package and check first-run/offline export. Check real phone video and separate microphone audio through Windows import/export when supplied. Review the complete FFmpeg source distribution and signing before any release. Verify live provider and external Sentry delivery when those connections are configured.
