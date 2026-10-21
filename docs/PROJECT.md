# Personal lyrics studio

The primary workflow is upload a song, generate or import timed lyrics, review/correct words and times, choose palette/motion, preview and export. The general clip/image editor has been removed from navigation and upload controls. Existing project data is preserved, and legacy backend media contracts remain covered by regression tests.

New lyric projects accept audio only, up to eight minutes. Original song speed, full duration and volume are preserved. Timed lyrics can also be downloaded as JSON or LRC. LRC remains line timed; word alignment is never fabricated.

The custom provider token is encrypted. Save & test checks a real lyric-palette response plus a short word-timed speech sample through the selected source. Local faster-whisper is supported on the native processor, alongside provider audio transcription. Unsupported or failed capabilities remain disabled. No uncertain paid request is replayed automatically.

FFmpeg handles audio/encoding. HyperFrames with Puppeteer is integrated for deterministic browser capture; the verified native canvas route remains available explicitly. See LYRICS-TOOLS.md for configuration and observed runtime limits.

The private ChatGPT Site is the current publication. The native processor must run separately. Server installation is pending SSH reachability; a ChatGPT sign-in does not itself configure model inference or local media processing.
