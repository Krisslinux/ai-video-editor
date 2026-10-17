# Ordered milestones

Statuses: done, partial, pending, blocked. Completion means the observable check actually ran.

| Stage | Task | Status | Check / dependency |
|---|---|---|---|
| 0 | Fresh branch, pinned Electron/React/TS stack, lockfile, shell and typed core | Done | Linux build and typecheck |
| 0 | Narrow IPC, FFmpeg discovery, project atomic save | Partial | Windows desktop launched; project saved/reopened; native dialogs still pending |
| 0 | CI and packaging command | Partial | CI workflow; Windows bundle/license and runner still needed |
| 1 | Import two clips + audio; manual trim/split/order/gain; undo/redo | Partial | Windows UI trim/undo/redo checked; import dialog and real footage pending |
| 1 | Fit/Fill, ratio presets/custom even dimensions, preview/export | Partial | Linux/Windows 4.00s H.264 export/preview; Windows Chromium playback checked |
| 1 | Initial locks, whole-batch before/after, quality warnings | Partial | Validator tests; screenshot/UI and warning fixtures pending |
| 1 | Live AI edit with compatible provider | Blocked | Endpoint/model/credential or local server not configured in this environment |
| 1 | Windows installer with bundled tools and clean-install test | Blocked | Reviewed redistributable FFmpeg build; accessible Windows host is not a clean install target yet |
| 1 | Offline manual loop, real phone footage, creator pilot templates | Partial | Offline dispatch gate and pilot template; external-network test/footage pending |
| 1B | Eligible ChatGPT account flow, MCP hosts, model discovery, local adapters and enforced budgets | Pending | Official route/client compatibility and credentials |
| 2 | Transcript/captions/cleanup/ducking; selective review, full locks, quality analysis, durable jobs/interchange | Pending | Core editor baseline |
| 3 | Storyboard, reference analysis, B-roll, graphics, TTS and description-to-video | Pending | Media/AI capability adapters |
| 4 | Auto alignment, beat/reframe, cleanup, dubbing, optional generation/lip-sync | Pending | Models, licenses, fixtures, hardware |
| 5 | Safe updates, long-project performance, macOS/Linux, signed releases | Pending | Installer and project migration baseline |

Next: run the new flash/click fixture on the Windows host, then check a supplied real phone video and separate microphone track through import and export. Bundle a reviewed FFmpeg redistributable and clean-install the Windows package. Verify a live provider edit and opt-in Sentry event only when those connections are configured.
