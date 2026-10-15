# Architecture proposal

Status: proposal, not implemented.

## Components

1. Desktop shell and UI: media library, AI chat, preview, and editable timeline. A shared project document backs all views.
2. Project core: versioned media references, rational timebase, tracks, clips, captions, effects, and reversible operation history. Source media remains immutable.
3. Edit planner: accepts user intent and provider capabilities, returns a constrained, schema-validated plan. It cannot execute arbitrary file or process actions.
4. Media engine: probes imports, creates proxies when needed, and renders preview and export from the same timeline semantics. A CPU path is required; acceleration is optional.
5. Provider adapters: official APIs, custom endpoints/tokens, and compatible local models. Detect image input, tool use, structured output, and other capabilities per model. Credentials stay outside project files.
6. Restricted visuals runtime: generated JavaScript receives only allowed inputs and outputs, with time, memory, filesystem, and network limits.
7. Optional observability: report diagnostic errors only after scrubbing secrets, media, transcript text, prompts, and user identifiers.

## Suggested first vertical slice

Import two short clips plus one audio track; request one bounded edit (trim and arrange); inspect the resulting timeline and preview; manually correct it; export MP4. Validate output duration, frame order, audible content, and audio/video offset with a repeatable fixture.

Represent time using integer ticks or rational frame/sample positions, not cumulative floating-point seconds. Record original media timebases and define explicit rounding at frame/sample boundaries. Keep edit operations atomic so undo and redo can replay reliably.

## Stack candidates and licensing

- Tauri 2 with a React/TypeScript UI is a candidate shared desktop shell; Tauri is MIT/Apache-2.0 and React is MIT. Rust native commands could isolate privileged media actions from UI content.
- FFmpeg is a candidate CPU media engine. Its build can be LGPL or GPL depending on enabled components, so packaging, codecs, and notices need a specific review before adoption.
- No stack is selected by this document. Validate the candidate through a small import/preview/export prototype and cross-platform build before committing to it.

Sources: https://v2.tauri.app/concept/architecture/ ; https://github.com/facebook/react/blob/main/LICENSE ; https://ffmpeg.org/legal.html .

## AI decision and media execution boundary

The [Descript research record](research/descript.md) suggests a user-facing pattern, but Descript's internal protocol is unverified. For this project, the AI receives a scoped context manifest with stable media IDs, transcript spans, timeline revision, and optional visual descriptions. It proposes typed edit operations; the project core validates targets, timing, capabilities, and revision before committing one undoable transaction. The media engine alone performs cuts, audio mixing, captions, preview, and export from that transaction. Preserve original media and expose the plan/diff so users can revise by chat or manually. This is our design proposal, not a reconstruction of Descript internals.
