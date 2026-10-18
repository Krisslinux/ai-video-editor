# AI Video Editor

An open-source, local-first desktop editor (early development). The current vertical slice imports video and separate audio, arranges clips on tracks, trims/splits/reorders video, adjusts gain/fades/framing, renders an accurate preview, saves/reopens projects, undoes/redoes edits, proposes validated edits through a configured OpenAI-compatible chat-completions endpoint, reviews a proposed batch, and exports MP4. It is not yet a full creator suite or a verified installer.

## Run from source

Requires Node.js 24, npm, FFmpeg and ffprobe on `PATH`, including libx264. This checkout was built/tested on Linux with FFmpeg 6.1.1 and launched on Windows Server 2025 with FFmpeg 9.0.2. macOS launch and installers are unverified.

```sh
npm ci
npm run build
npm start
```

Use **Import media**, add two videos and one audio file to the timeline, then **Render preview**. Choose an aspect ratio in Canvas, select clips for edits and protection, and **Export MP4**. Save/open uses `.ave.json` files. Editing and export work without an AI account. A compatible endpoint can be configured in Settings; live provider verification is pending. Remote calls require an explicit unknown-cost decision. Do not put an API key in the project file.

For scripted opening of a trusted project file, run `npm start -- --project=/absolute/path/project.ave.json` (quote the path when it has spaces). The same schema validation applies.
For a non-interactive render through the same export path, pass `--export=/absolute/path/output.mp4` alongside `--project`. It finalizes only after probing the output.

For checks: `npm run typecheck`, `npm test` (after `npm run build`), `npm run verify:loop`, `npm run verify:sync`, and `npm run verify:phone`. The render fixtures check output geometry, clip order, separate-track/source-audio flash/click timing after a trim and join, and a synthetic variable-frame-rate portrait clip with 90° display rotation. Fixtures are ignored by Git.

On Windows, `npm run verify:telemetry` launches Electron against a local receiver and verifies that opt-in diagnostics are redacted and offline/opt-out states send no event. `npm run verify:source-protection` checks that a command line export cannot overwrite an imported source, even with a differently cased path. These checks use no external Sentry project or personal media.

Export uses H.264 (libx264) video and AAC audio in MP4 through the selected FFmpeg build, required for Chromium preview playback. This initial codec choice needs a GPL-compatible FFmpeg redistribution review before packaging. Supported imports are MP4, MOV, MKV, WebM, MP3, WAV, M4A, and AAC when that FFmpeg build can decode them. Corrupt/unsupported inputs report an error. Source media remains at its original path and must remain accessible.

The Windows packaging command is `npm run pack:win` and requires FFmpeg/ffprobe plus license/source notices under `vendor/ffmpeg/win32/`. An unsigned local development installer was built on the connected Windows host; it has not passed a clean-machine install or distribution review. See [releases](docs/RELEASES.md).

See [features](docs/FEATURES.md), [architecture](docs/ARCHITECTURE.md), [AI connections](docs/AI-CONNECTIONS.md), [validation](docs/VALIDATION.md), and [handoff](HANDOFF.md). MIT license for original code; bundled dependencies retain their own terms.
