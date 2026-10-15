# Shared coding-session instructions

This repository is the common source of truth for the owner's two Codex accounts. Do not rely on another account's chat or memory.

## Start every session

1. Read this file, docs/PROJECT.md, docs/TASKS.md, and HANDOFF.md.
2. Check the current branch, Git status, remotes, and relevant recent commits. Inspect the actual code before trusting task status.
3. If the working tree is safe, fetch and synchronize with the intended remote branch. Preserve unrelated or uncommitted work.
4. Continue the next unfinished task in docs/TASKS.md. Work sequentially unless separate branches or worktrees are explicitly arranged.

## End every session

1. Update docs/TASKS.md and HANDOFF.md with completed work, unfinished work, checks and results, blockers, active branch, last relevant commit, and one exact next action.
2. Commit intended changes and push the branch. Open or update a draft pull request for review.
3. If pushing fails, say exactly what remains local and how the other account can recover it.

## Engineering boundaries

- Keep confirmed decisions separate from proposals. Do not claim a platform, provider, model, or Descript feature was tested without evidence.
- AI produces a validated edit plan and invokes bounded timeline operations. The media engine owns preview and export. Keep operations reversible and preserve source media.
- Measure audio/video timing. Aligning recordings, cutting to music, and lip movement are separate capabilities.
- Detect provider capabilities. Treat ChatGPT Plus sign-ins as development accounts, never pooled application credentials.
- Keep API tokens in supported secret storage or ignored local configuration. Commit placeholders only. Exclude credentials, private media, and sensitive prompt content from logs and telemetry.
- Run generated visual code with restricted capabilities and resource limits. Keep REA target binaries, extracted application files, and research captures outside this public repository.
- Before adding a dependency, record its license and distribution implications. The owner confirmed the existing MIT LICENSE on 2026-10-15; check each adopted dependency's license and distribution obligations.
