# Tasks

Statuses: done, in progress, pending, blocked. Completion checks are evidence, not intention.

## Foundation

- [x] Identify the repository and inspect main: initial README, .gitignore, and MIT LICENSE only (2026-10-15).
- [x] Commit shared records on setup/development-foundation and open [draft PR #1](https://github.com/Krisslinux/ai-video-editor/pull/1). Commit 4680d9af9083ad51fe11273d8c7f33b4fde3fc6b contains 11 intended changed files; branch diff was inspected.
- [x] Confirm existing MIT license with owner and record the decision in PROJECT.md (2026-10-15).
- [ ] Review dependency obligations before adopting a stack. Check: record license and packaging decisions for selected dependencies; no stack dependency has been adopted yet.
- [x] Research Descript's documented AI editing workflow and write an isolated disposable-project test protocol in docs/research/descript.md (2026-10-15); expand it with REA installed-package evidence and a feature matrix (2026-10-16). Vendor statements and static clues remain distinct from live behavior.
- [ ] Complete live Descript disposable-project tests A–E. Check: verified VersionInfo, exact prompts and before/after snapshots, undo/redo, baseline and edited exports, and numerical A/V/caption timing. On 2026-10-16 REA static package inspection succeeded (E1–E5 in research), but PowerShell/UI helper and Remote Desktop Commander device calls failed, and REA's controlled Electron launch exited before attachment. No behavioral test or measurement ran. Restore a working desktop/file/process route before this item can close.
- [x] Enable CodeRabbit for this repository's PRs. Its bot loaded .coderabbit.yaml and completed a review on draft PR #1 with two documentation findings; both are addressed on the setup branch.
- [ ] Create a runnable minimal scaffold and add Windows/macOS/Linux checks for actual commands. Check: commands run locally where possible and CI results are recorded by platform.
- [ ] Add Sentry to the runnable app with strict scrubbing. Check: a safe test event arrives without credentials, media, prompts, or transcript text.
- [x] Link the Git plan/tasks from the [private Notion project page](https://app.notion.com/p/3fa677d871be81f78d69e1cb4a9acca1). Page was fetched after update; Git remains authoritative.

## First product milestone

- [ ] Import two short clips and an audio track. Check: metadata and media references persist across reopen.
- [ ] Request one AI edit plan and validate a bounded timeline operation. Check: unsupported model capabilities and invalid edits fail clearly.
- [ ] Show timeline, preview, manual correction, and undo. Check: the same edit appears in preview and edit history.
- [ ] Export MP4 using a CPU path. Check: on a 30 fps flash/click fixture, decoded output has correct frame order and audio content, duration differs from the plan by no more than one output frame, and absolute audio-to-video marker offset is at most 20 ms near both start and end.

## Later milestones

- [ ] Expand transcript editing, captions, transitions, and effects.
- [ ] Add creation workflow, generated visuals sandbox, and optional speech/music models.
- [ ] Evaluate local models and hardware acceleration on supported hardware.
