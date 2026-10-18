# Development instructions

Build the original desktop editor in this repository. Read README.md, docs/TASKS.md, docs/ARCHITECTURE.md, and HANDOFF.md before resuming. Inspect Git status and actual code; preserve other branches, research, and user media. Work on a dedicated branch, commit focused changes, push, and open/update a draft PR. Git remains the source of truth.

Use one versioned project model and validated command engine for manual UI, AI, and future MCP calls. Keep file/process/provider access in the Electron main process; sandbox and isolate the renderer. Source media is immutable. Record measured outcomes and unsupported capabilities honestly. Never commit credentials, personal media, caches, or generated outputs. Do not resume the old Descript research task unless the user requests it; the build is the priority.

Before ending, update TASKS and HANDOFF with current checks, blockers, branch, commit, and the next exact task. Do not publish a release or merge a PR automatically.
