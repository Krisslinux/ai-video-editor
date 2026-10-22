# Personal lyrics studio

The primary workflow is upload a song, generate or import timed lyrics, review/correct words and times, choose palette/motion, preview and export. The general clip/image editor has been removed from navigation and upload controls. Existing project data is preserved, and legacy backend media contracts remain covered by regression tests.

New lyric projects accept audio only, up to eight minutes. Original song speed, full duration and volume are preserved. The provider picker includes all 16 screenshot sources: 12 fetch adapters (some require separate access) and four external lookup/import routes. Auto compares available results by title, artist, recording version, album, duration and actual timing. A duration match is not an audio alignment guarantee. Timed lyrics can also be downloaded as JSON or LRC. LRC remains line timed; word alignment is never fabricated.

The custom provider token is encrypted. Save settings stores it immediately without test requests, capability badges, or preflight gates. Local faster-whisper can transcribe without a provider account; an explicitly selected provider audio model is also supported. Automatic theme selection is optional: a failed request preserves timed lyrics, uses the local starting palette and does not prevent manual styling or export. Saved cues can export independently of the current provider connection. No uncertain paid request is replayed automatically.

FFmpeg handles audio/encoding. HyperFrames with Puppeteer is integrated for deterministic browser capture; the verified native canvas route remains available explicitly. See LYRICS-TOOLS.md for configuration and observed runtime limits.

The private ChatGPT Site is the current publication. The native processor must run separately. Server installation is pending SSH reachability; a ChatGPT sign-in does not itself configure model inference or local media processing.

See LYRICS-PROVIDERS.md for source contracts, credentials, current availability and timing import behavior.
