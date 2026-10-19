# Ordered milestones

Statuses: done, partial, pending, blocked. Completion means the observable check actually ran.

| Stage | Task | Status | Check / dependency |
|---|---|---|---|
| 0 | Fresh branch, pinned Electron/React/TS stack, lockfile, shell and typed core | Done | Linux build and typecheck |
| 0 | Narrow IPC, FFmpeg discovery, project atomic save | Partial | Windows desktop launched; project saved/reopened; native dialogs still pending |
| 0 | CI and packaging command | Partial | Windows local unsigned NSIS rebuilt from `bd9e966` and upgraded with third-party GPLv3 media tools; clean machine, source distribution review, signing, and hosted CI still pending |
| 1 | Import two clips + audio; manual trim/split/order/gain; undo/redo | Partial | Windows UI trim/undo/redo checked; cover-art MP3 classification fixture passed; import dialog and real footage pending |
| 1 | Fit/Fill, ratio presets/custom even dimensions, preview/export | Partial | Linux/Windows H.264 export/preview, flash/click offsets, and synthetic VFR/rotation checked; real footage pending |
| 1 | Initial locks, whole-batch before/after, quality warnings | Partial | Six validator tests, before/after AI stub, preview cleanup; screenshot/UI and warning fixtures pending |
| 1 | Live AI edit with compatible provider | Partial | Windows loopback compatible-response stub exercised reject/stage/compare/apply/idempotency in offline mode; no installed Ollama model or live provider configured |
| 1 | Windows installer with bundled tools and clean-install test | Partial | Unsigned 243 MB NSIS from `bd9e966` upgraded on connected account; installed GUI opened project, exported with bundled FFmpeg, and passed canvas/Sentry checks; clean normal-user machine and release review pending |
| 1 | Offline manual loop, real phone footage, creator pilot templates | Partial | Offline dispatch gate and pilot template; external-network test/footage pending |
| 1 | Opt-in diagnostic delivery and redaction | Partial | Windows loopback redaction/opt-out/offline/re-enable cycle passes; saved UI preference exists; restart behavior and external Sentry delivery pending |
| 1B | Eligible ChatGPT account flow, MCP hosts, model discovery, local adapters and enforced budgets | Pending | Official route/client compatibility and credentials |
| 2 | Transcript/captions/cleanup/ducking; selective review, full locks, quality analysis, durable jobs/interchange | Pending | Core editor baseline |
| 3 | Storyboard, reference analysis, B-roll, graphics, TTS and description-to-video | Pending | Media/AI capability adapters |
| 4 | Auto alignment, beat/reframe, cleanup, dubbing, optional generation/lip-sync | Pending | Models, licenses, fixtures, hardware |
| 5 | Safe updates, long-project performance, macOS/Linux, signed releases | Pending | Installer and project migration baseline |

Next: inspect CodeRabbit on the head containing the four fourth-review follow-ups and address any valid findings. Rebuild/reinstall the Windows development installer because `bd9e966` predates these runtime fixes. Check real phone video and separate microphone audio through Windows import/export when supplied, and test installation/uninstallation on a clean normal-user machine. Review complete FFmpeg source distribution and signing before any release. Verify a live model and external Sentry delivery when configured.
