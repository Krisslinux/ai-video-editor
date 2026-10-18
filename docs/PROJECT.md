# Product direction

Build standalone, installable open-source desktop software for creating and editing short and long videos. The editor is local-first and works without a hosted service for manual editing and export. AI and MCP hosts propose changes to the same validated project operations used by manual controls. The user can inspect, protect, correct, compare, undo, and export the result.

The initial shared stack is Electron 44, React 19, TypeScript 5.9, Vite 8, and an FFmpeg subprocess. Project files are versioned JSON, with integer microsecond timing and 30 fps output in the current narrow slice. Media jobs do not block the renderer. MIT remains the repository license. Windows is the first packaging target; this Linux environment cannot establish Windows behavior.

Descript research remains historical context, not a prerequisite. Personal-account inference, MCP hosts, custom APIs, local models, budgets, transcription, captions, graphics, sync, recovery, interchange, and installer/update work remain in scope per FEATURES and TASKS. Provider identity, inference, editor control, and billing are separate capabilities. Do not imply parity across them.
