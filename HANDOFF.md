# Frameflow lyrics studio

Private site: https://frameflow-video-studio.kriss626975.chatgpt.site
Repository: https://github.com/Krisslinux/ai-video-editor
Branch: build/ai-video-web · draft PR #7

The interface is lyrics only: Lyrics studio, My songs, API settings. New song projects are created atomically with lyric settings; clip/image upload controls, editing modes, generic preview and editing instructions were removed. Older project data was preserved and is hidden from the songs list. Lyrics include song upload, automatic word timing or LRC/JSON import, editable cues, global offset, palette/motion, preview, MP4 history and JSON/LRC downloads.

API settings retain encrypted custom-provider credentials and Save & test. Theme preflight now tests an actual lyric palette. Transcription can use the same provider token or local faster-whisper, configured by the operator. The latter must recognize the built-in sample before generation is enabled. Local inference uses preinstalled files and FFmpeg-decoded PCM; no audio is uploaded to a model provider on that route. See docs/LYRICS-TOOLS.md.

HyperFrames/Puppeteer is integrated as an explicit renderer with a temporary private local composition server and exact 30 fps seeks. Chromium exits during startup in this workspace, so the temporary hosted worker uses LYRIC_RENDERER=canvas. Do not claim a HyperFrames render passed here. Docker includes browser/Whisper dependencies and selects HyperFrames for verification on a normal host; model download is a separate explicit setup step. yt-dlp/OpenCV tracking are outside the audio-only scope.

The user supplied an Ubuntu server and authorized publishing. SSH failed with Network is unreachable before authentication. No server changes, domain changes, Remote Desktop use, or ChatGPT plan linking were completed. Never repeat or commit the supplied password. ChatGPT plan linking remains a separate official OAuth integration and does not cover transcription.

The temporary processor must be restarted with local Whisper environment settings after publication. It is not a permanent hosting service. Keep actual processor lease status; never force an online badge. Browser QA is blocked by the missing managed preview supervisor. Run the regression checks and record current results in docs/VALIDATION.md.
