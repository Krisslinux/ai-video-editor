# Descript AI editing workflow research

Status (2026-10-15): public-source analysis complete; no REA evidence or disposable Descript project has been captured. The owner now reports Descript 2.21.1 installed under the user's LocalAppData Programs directory, but this executable and version have not been independently verified. Local commands and UI control still fail before startup in this Codex environment, and no REA MCP tools are connected. OS host identity, project state, REA version, and artifact hash are unknown. Do not describe vendor statements below as direct observations.

## Evidence ledger

The IDs below refer to public documents, not REA Evidence IDs. Recheck page dates and the tested build during live inspection.

| ID | Source and scope | Vendor statement relevant to this study | Limit |
| --- | --- | --- | --- |
| D1 | [Underlord primer](https://www.descript.com/blog/article/underlord-ai-video-editor-primer), public blog | Underlord accepts natural-language goals and can perform multi-step editing; the article describes transcript-centered editing. | Marketing/product guidance; no prompt payload or current build observed. |
| D2 | [Media understanding article](https://www.descript.com/blog/article/underlord-ai-can-watch-videos), public engineering blog | Descript says video frames are described by multimodal models and combined into a searchable visual account for clip finding. | Does not establish which frames or descriptions a particular edit request receives. |
| D3 | [Edit like a doc](https://help.descript.com/getting-started/edit-like-a-doc) and [layer/clip overview](https://help.descript.com/visuals/working-with-layers-and-clips-overview), help pages | Transcript words link to underlying media; deleting or moving text changes composition media while source media remains recoverable. Audio/visual layers have their own timing beside the script track. | User-facing semantics, not the internal project schema or render engine. |
| D4 | [Underlord v2 announcement](https://descript.canny.io/changelog/announcingunderlord-v2), release note | Descript describes an initial plan, progress updates, self-correction, time/duration edits, and a sample request for captions over the first 30 seconds plus a fade. | Not verified in an installed build; action/tool protocol is not disclosed. |
| D5 | [Shorten Word Gaps](https://help.descript.com/script-editing/shorten-word-gaps), help page | A user can set a gap threshold and target duration, shorten one/all matches, and preview surrounding audio. | Documents a specific tool, not whether a free-form AI prompt invokes the same operation. |
| D6 | [Quick Design](https://help.descript.com/ai-assistant/quick-design) and [transitions](https://help.descript.com/effects-animations-transitions/transitions), help pages | AI-assisted rough cuts can add scenes/layouts/B-roll; scene and clip transitions are editable, and clip crossfades require source handles. | No proof of Underlord's internal transition action or exact render path. |
| D7 | [Descript API](https://help.descript.com/api-and-mcp/api) and [security page](https://www.descript.com/security), vendor documentation | Imports, Underlord edits, and publishing can be background jobs. Descript says project media/transcripts are stored on its servers; its hosted Whisper and some third parties process data. | Does not identify every local/cloud step, the AI request body, or desktop preview/render placement. |
| D8 | [REA installation/diagnostics](https://github.com/morluto/rea/blob/main/docs/installation.md) and [REA workflow](https://github.com/morluto/rea/blob/main/.agents/skills/reverse-engineer-anything/SKILL.md), public upstream instructions | REA doctor is read-only; a skill installation alone does not prove MCP registration. | Installed skill and REA diagnostics could not be read/run in this environment. |

## Answers supported so far

1. **AI context.** Descript publicly describes a transcript linked to media (D3), an assistant that works with natural-language project instructions (D1), and visual indexing based on sampled frames and descriptions (D2). The exact context sent for any specific request—selected transcript span, clip IDs, timestamps, waveforms, raw audio, frames, frame descriptions, prior chat, or account data—is **unknown**. The transcript-centered description in D1 does not rule out the visual context described in D2.
2. **Instruction to action.** The v2 release note says the assistant can show a plan and progress (D4). The editor exposes bounded user-facing operations for word-gap shortening (D5), script/media deletion and movement (D3), scene creation (D6), and transitions (D6). Whether Underlord calls those same operations, emits an internal edit plan, or writes a different project representation is **unknown**.
3. **Execution and synchronization.** The vendor says text edits propagate to linked media and source media is recoverable (D3). Layers have independent timing, and transition handles constrain crossfades (D3, D6). No before/after project or decoded export has been measured; actual A/V offset, frame/sample rounding, preview/export consistency, and the executing process are **unknown**.
4. **Preview, revision, undo.** The gap tool offers local preview around a candidate (D5), and the editor permits manual timeline corrections (D3, D6). A separate [AI-speech conversion article](https://help.descript.com/hc/en-us/articles/10165979298189-Convert-an-AI-voice-clip-into-an-audio-layer) documents immediate undo/version-history recovery for that conversion; it does not prove that each Underlord turn is one undo unit. Underlord edit undo/redo and revision behavior remain **untested**.
5. **Local versus cloud.** The vendor documents server-side project storage and API background jobs (D7); those establish cloud dependencies. They do not show where a desktop edit is applied, decoded, previewed, or rendered, nor what a particular AI provider receives. An offline comparison and sanitized runtime trace are still needed.

## Disposable-project experiment

Use only self-created synthetic media and a new disposable Descript project in an account already authorized for testing. Do not purchase credits or change a subscription. Keep target files, REA output, raw captures, project exports, and any local database outside this public repository; commit only sanitized observations and evidence references. Before testing, record Descript build/version, OS, REA version and doctor output, acquisition source and artifact hash, account plan/feature availability without identity, and capture method. Do not bypass authentication or inspect another user's data.

Create a short baseline composition with two distinct 30 fps clips and a 48 kHz audio track. Clip A contains a known spoken phrase and a measured long pause; clip B has a visible numbered timecard. Put short visual flashes and audio clicks near the start and end so exported A/V offset can be measured. Record source durations/timebases, transcript word timing, scene/layer/clip positions, audio gain, caption state, preview duration, and a sanitized screenshot or structured snapshot. Duplicate the baseline into three independent compositions, or restore and verify the exact baseline before each run.

| Isolated request | Before/after comparison to capture | Current result |
| --- | --- | --- |
| “Shorten silent gaps longer than 700 ms in clip A to about 200 ms; keep all spoken words.” | Which gaps were selected; transcript/clip boundaries, downstream offsets, audio waveform, preview duration, decoded export, undo/redo. Compare with the dedicated gap tool. | Not run. |
| “Add captions for the first 8 seconds using the existing transcript; change nothing else.” | Caption layer/span/text/style and timing; any scene or audio changes; preview/export visibility; manual correction; undo/redo. | Not run. |
| “Trim clip B to 2 seconds from its start; leave the separate audio track fixed.” | Clip source in/out, composition duration, whether the independent audio moves, preview/export end, undo/redo. | Not run. |

For each run, capture the exact innocuous request, selected UI context, assistant plan/progress (if visible), all project changes, resulting preview, one manual correction, undo and redo. Compare the project before/after and export with frame/sample-aware timing; report numeric offsets rather than “looks synchronized.” A response message alone is not proof of a timeline change. If a request is rejected, record the error and whether credits were consumed, without logging account identifiers.

REA sequence when the runtime works: run rea doctor --client codex --json; inspect actual tool availability; identify the lawful installed Descript target or user-owned browser session; capture a bounded UI scenario and, where supported, a sanitized passive browser/Electron trace. Inventory relevant local packaged JavaScript or project metadata only if the selected target and tool support it. Preserve REA Evidence IDs, target hash, timestamps, tool limitations, and before/after project identities. Filter credentials, auth headers, private paths, and media payloads before any public note. A request to a remote service supports a cloud-dependency finding but cannot reveal inaccessible server logic. Do not infer an internal edit API solely from filenames, strings, or UI labels.

## Our implementation proposal (not a Descript finding)

Give the AI a deliberately scoped context manifest: stable clip/track IDs, media metadata, transcript tokens with source-time spans, current timeline positions, and opt-in visual descriptions or sampled frames when the provider supports images. Keep raw media local unless the user enables a cloud feature. Have the AI return a schema-validated edit plan with bounded operations such as trim range, remove gap, add caption span, set transition, and set gain. Resolve references against the current project revision; reject ambiguous or stale targets.

Apply a plan as one atomic, reversible timeline transaction over immutable source media. Represent video in rational frame positions and audio in sample positions, and let one deterministic media engine serve preview and MP4 export. Show the proposed diff and affected ranges before applying or immediately after, allow manual correction, and make one AI turn undoable. Test with synthetic flash/click fixtures for frame order, duration, and A/V offset near both ends. Cloud AI planning, transcription, and generation are separate optional services; local CPU editing/export is the baseline. This boundary gives the AI editing decisions while the engine owns execution and timing.

## Remaining evidence needed

No Descript app or project was opened, no request was sent, no REA Evidence ID exists, and no before/after or export measurement exists. The exact model context, tool calls, project mutation protocol, local/cloud execution split, and server logic remain unresolved.

## Host and target checks: 2026-10-15 22:13–22:16 UTC

The owner supplied a path ending in Desktop/Descript.lnk. The .lnk extension indicates a Windows shortcut, but the file's existence and its target are unverified. It could point to an installed application, an installer, or another location. The executable path, file type, product version, build, hash, and host identity remain unverified.

| Check | Result | Consequence |
| --- | --- | --- |
| User-supplied Desktop/Descript.lnk path | Path was not resolved or read. | Shortcut destination and installed-versus-installer status remain unknown. |
| Harmless PowerShell command: Write-Output 'runtime-ok' in C:\Windows\System32 (retried at 22:16 UTC) | Process creation failed before PowerShell started: helper_unknown_error: setup refresh had errors. | Files, installed programs, and the shortcut target could not be enumerated. |
| Computer-use inventory: cua.getState() | The controller kernel exited before UI state was returned with the same Windows sandbox setup error. | No Descript window, installer, login, or project was observed. |
| Current REA tool inventory | No REA MCP tool is exposed in this session. | No REA diagnostic, package inspection, runtime trace, or Evidence ID was produced. |

The reported shortcut, its possible target, and any existing Descript projects were left untouched. No installation, execution, test project, network capture, or export was attempted. A functioning local runtime is required to identify the target first. On that host, verify the supplied shortcut exists, resolve its target without launching it, then check the target and installed-app locations without modifying them; record the exact full path, whether it is an installer or application, file version/build, SHA-256, and OS. Then read the installed REA skill, run rea doctor --client codex --json, and choose package/JavaScript inspection for an installer or bounded runtime inspection for an installed app. Only after target identity is confirmed should the disposable-project tests above run. If only an installer is available, behavioral claims remain untested.


## Host recheck: 2026-10-15 22:42 UTC

The owner reports an installed Descript.exe under %LOCALAPPDATA%/Programs/Descript and version 2.21.1. That is a user report, not a file inspection. The reported shortcut and executable have not been opened, hashed, or version-checked by this agent.

| Check | Actual result | Evidence limit |
| --- | --- | --- |
| Harmless PowerShell Write-Output 'runtime-ok' | Process creation failed before command startup: helper_unknown_error: setup refresh had errors. | No filesystem or version check ran. |
| Alternate cmd.exe ver with login disabled | The same process-creation failure occurred. | The blocker is not specific to PowerShell syntax. |
| Computer-use cua.getState() | Controller kernel exited with windows sandbox failed: helper_unknown_error: setup refresh had errors. | No desktop application or project was observed. |
| REA tool inventory | No REA MCP tool is exposed. | No REA doctor, package analysis, runtime trace, or Evidence ID exists. |

The reported Descript installation and all existing projects remain untouched. Pause removal, captions, clip shortening, preview, undo, export, and A/V offset were not tested. The exact AI context and action protocol, local execution boundary, and server logic are still unknown.

Once the host executor works, first verify the reported executable's existence, VersionInfo, SHA-256, and OS; read the installed REA skill; run rea doctor --client codex --json and inspect the connected tool list. For this installed desktop target, use the advertised Electron/JavaScript package and bounded runtime workflows, recording the artifact identity and REA Evidence IDs. Create only the synthetic disposable project described above, run the three requests separately, and compare before/after timeline and decoded export. Never copy target binaries, credentials, raw captures, or media into this public repository.
