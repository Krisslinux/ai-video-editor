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


## Proposed project and operation contract (2026-10-16)

This is our independent design, not a recovered Descript schema. REA established only an Electron main/preload package boundary; it did not reveal an editing protocol. Public Descript documentation supports the need for transcript-linked cuts, layered media, revision and export, but our representation is chosen for deterministic behavior.

Persist a `Project` with `revision`, `timebase`, `assets`, `tracks`, `clips`, `transcript`, `captions`, `effects`, and `history`. Asset records have stable IDs, content hash, URI, stream metadata (codec, frame rate as rational, sample rate, rotation, duration), and proxy/cache references. A clip has asset ID, track ID, source in/out, timeline start, playback rate, and link group. Transcript words have source asset ID plus source-time sample spans, confidence, and corrected text; their timeline positions are derived through clips rather than stored as a second authority. Caption cues have timeline spans, text, style ID and placement. Effects/overlays have typed parameters and bounded resource needs. Use integer ticks at a declared rational timebase; convert frame and sample positions with explicit rounding at each boundary.

An edit request contains `project_revision`, `selection` (track/clip IDs and range), `intent`, and allowed operation names. Context selection supplies metadata and only the needed transcript words/visual descriptions; raw media is opt-in for cloud adapters. Provider adapters negotiate image input, tools, structured output, context limit and failure behavior. A model may propose, for example:
```json
{
  "baseRevision": 12,
  "scope": {"clipIds": ["clip-a"], "rangeTicks": [0, 90000]},
  "operations": [
    {"type": "split", "clipId": "clip-a", "atSourceTicks": 45000},
    {"type": "trim", "clipId": "clip-a-2", "sourceInTicks": 51000, "sourceOutTicks": 90000},
    {"type": "move", "clipId": "clip-b", "timelineStartTicks": 90000, "ripple": "linked"},
    {"type": "caption.add", "startTicks": 10000, "endTicks": 25000, "text": "Example", "styleId": "plain"},
    {"type": "audio.gain", "clipId": "music-1", "gainDb": -18},
    {"type": "audio.fade", "clipId": "music-1", "edge": "in", "durationTicks": 15000},
    {"type": "overlay.add", "visualId": "approved-script-1", "startTicks": 0, "endTicks": 30000, "parameters": {}}
  ]
}
```
The example is illustrative: operation IDs for newly split clips must be allocated by the validator and referred to through transaction-local handles in a final schema. Implement only trim/split/move/gain in the MVP; captions and restricted overlays follow once their rendering contracts are tested. Validate syntax, revision, existing asset/clip IDs, selected scope, source media bounds, nonnegative durations, linked A/V behavior, required handles, and overlay resource policy. Apply the batch in an isolated candidate state, show a before/after diff, and commit once. Record one undo unit for the AI turn plus smaller units for manual edits. A stale revision requires a new plan; retries must be idempotent and tied to a request ID.

A single normalized edit graph must drive low-resolution preview and CPU export, with identical cut points and track mixing. Cache keys include source hash, edit-graph revision and render settings. Abort/recovery must leave the last committed project readable; temporary renders are disposable. The synthetic fixture test records flash/click timing at start/middle/end and separates caption-word timing from A/V offset. First acceptance target remains at most one 30 fps frame of duration error and at most 20 ms absolute A/V offset, with measured uncertainty stated. Windows is the first runnable host; macOS/Linux build, FFmpeg packaging, licensing, and optional hardware paths require separate validation.


## Validation refinement from the resumed inspection

The 2026-10-16 run generated uncompressed 30-fps/48-kHz source fixtures with measured aligned markers. This validates the test inputs only. AVI acceptance in Descript and decoded MP4 output remain untested. Preserve source identity and maintain a cut map from source markers to expected output timestamps; compressed-export verification must independently decode frames/audio and respect stream PTS and encoder delay.

The available host reports 8 logical processors and about 31.5 GiB RAM. Do not use its unrestricted timings as evidence for the intended 4-core/16-GB baseline; record a separate constrained or baseline-machine benchmark before accepting CPU performance. The research scripts use existing Node/Windows speech APIs and add no product dependency. No new finding establishes Descript's internal AI operation schema; the design above remains ours.
