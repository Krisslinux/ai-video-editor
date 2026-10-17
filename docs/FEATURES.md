# Feature checklist (2026-10-17)

D = implemented in code with a repeatable check; P = partial/needs GUI or real-world verification; N = planned; B = blocked externally. Each row's check describes observable completion; detailed scope follows the attached product brief.

| Group | Capability | Milestone | Status | Dependency / completion check |
|---|---|---:|---|---|
| A Projects/media | New/open/save/as, immutable media, multi-import, metadata | 1 | P | GUI import/save/reopen with two phone clips and separate audio |
| A Projects/media | Thumbnails, waveform, bins, proxies/cache, relink, collect assets, metadata fidelity | 1–2 | P | Thumbnail generated; remaining cache/relink/proxy and timebase checks |
| A Projects/media | Autosave, crash recovery, progress, cancellation, resumable processing | 2 | P | Render cancellation exists; durable checkpoints/restart fixture needed |
| B Manual/preview | Video/audio tracks, trim/split/reorder, gain/fade, Fit/Fill, undo/redo | 1 | P | Windows trim/undo/redo and Linux/Windows four-marker timing fixture pass; real media pending |
| B Manual/preview | Ripple/gaps, linked groups, zoom/snap/markers, keyframes, sequences, shortcuts | 2 | N | Interacting timeline and export agree |
| B Manual/preview | Clip/property locks and before/after batch review | 1–2 | P | Indirect position lock test; GUI compare and selective decisions pending |
| C Transcript/captions | Transcribe, text edit, cleanup, timed captions, styles, SRT/VTT | 2 | N | Timestamped speech fixture survives cuts/export |
| D Audio/sync | Source + separate music, gain/fade, mixing, manual offset | 1 | P | MP4 has audio; waveform/click alignment and UI adjustment pending |
| D Audio/sync | Ducking, normalization, correlation/drift, beat, recording, TTS, dubbing/lip-sync | 2–4 | N | Distinct measured fixtures and manual correction |
| E Canvas/visuals | Presets/custom dimensions, Fit/Fill, ratio change, saved output dimensions | 1 | P | 1280×720 measured; portrait/custom/caption safe-area tests pending |
| E Canvas/visuals | Titles, overlays, transitions, color, declarative graphics, references/generation | 2–4 | N | Shared preview/export visual fixture |
| F AI | Scoped natural-language edits, validated operations, cancellation, review | 1 | P | Adapter code built; live inference not configured/tested |
| F AI | Storyboards, highlights, references, target duration, constraint evaluation | 2–3 | N | Real asset/model capability and result report |
| G Connections | Local/custom OpenAI-compatible endpoint, secure token, offline gate | 1 | P | Endpoint config code; live local/remote checks pending |
| G Connections | Personal account, host/MCP, provider/model choice, budgets | 1B | N | Verify each documented route; enforced ledger and concurrency tests |
| H Export/reliability | MP4 temp/finalize, probe dimensions/duration, pre-export basics | 1 | P | Synthetic 4s MP4; audio sync, GUI, disk-space and failure tests pending |
| H Export/reliability | Selected range, audio/subtitles, broader quality report, diagnostics | 2 | N | Objective/heuristic/not-checked fixture |
| I Protection/review | Persistent locks, whole-batch review | 1 | P | Save/reopen and indirect lock core tests; UI exercise pending |
| I Protection/review | Full ranges/track locks, dependent groups, individual accept/reject | 2 | N | Atomic selection and stale-review tests |
| J Delivery/offline/update/exchange | Offline switch, packaging command, versioned project | 1 | P | Network-blocked GUI run, Windows bundle and clean install pending |
| J Delivery/offline/update/exchange | Signed updates, migrations/backups, OTIO subset | 2–5 | N | Round-trip/editor handoff and failed-update recovery |
| K Recovery | Reuse completed stages, remote status/idempotency, budget-aware resume | 2 | N | Interrupted job and unknown-completion fixtures |
