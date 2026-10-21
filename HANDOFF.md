# Frameflow lyrics studio

Private site: https://frameflow-video-studio.kriss626975.chatgpt.site
Repository: https://github.com/Krisslinux/ai-video-editor
Branch: build/ai-video-web · draft PR #7

The interface is lyrics only: Lyrics studio, My songs, API settings. New song projects are created atomically with lyric settings; clip/image upload controls, editing modes, generic preview and editing instructions were removed. Older project data was preserved and is hidden from the songs list. Lyrics include song upload, automatic word timing or LRC/JSON import, editable cues, global offset, palette/motion, preview, MP4 history and JSON/LRC downloads.

API settings use Save settings only; connection preflight/check UI and all capability gates were removed at the user's request. Saving works while the processor is offline and performs no provider/sample requests. Retired check endpoints return 410, no new checks are queued/claimed, and the old applied connection_tests table remains unused. Transcription uses the selected provider or local faster-whisper; with no provider configured, native local Whisper is used. Manual entry starts directly from an empty song via Write lyrics manually. Timed imports remain supported. Actual invalid/unsupported transcription results still report a recoverable job error instead of inventing words or timing.

Automatic theme requests are optional. Failure is caught after transcription, the cues are retained and an energy-based starting palette is used. The failure is fingerprinted so export does not automatically repeat the request. The user can choose any palette manually. Cached transcription can export with an unavailable/disconnected provider. Strict ownership, secret encryption, valid cue/media ranges and playable-file validation remain in place.

HyperFrames/Puppeteer is integrated as an explicit renderer with a temporary private local composition server and exact 30 fps seeks. Chromium exits during startup in this workspace, so the temporary hosted worker uses LYRIC_RENDERER=canvas. Do not claim a HyperFrames render passed here. Docker includes browser/Whisper dependencies and selects HyperFrames for verification on a normal host; model download is a separate explicit setup step. yt-dlp/OpenCV tracking are outside the audio-only scope.

The user supplied an Ubuntu server and authorized publishing. SSH failed with Network is unreachable before authentication. No server changes, domain changes, Remote Desktop use, or ChatGPT plan linking were completed. Never repeat or commit the supplied password. ChatGPT plan linking remains a separate official OAuth integration and does not cover transcription.

The temporary processor must be restarted with local Whisper environment settings after publication. It is not a permanent hosting service. Keep actual processor lease status; never force an online badge. Browser QA is blocked by the missing managed preview supervisor. Run the regression checks and record current results in docs/VALIDATION.md.
