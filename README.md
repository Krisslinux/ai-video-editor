# Frameflow · AI video editor

A responsive web studio: **upload clips + audio → create → preview → revise → download**. No timeline is required. Original files are preserved, and every completed edit is a restorable version.

Private test studio: https://frameflow-video-studio.kriss626975.chatgpt.site

The Site hosts the interface, authenticated API, D1 database and private R2 media. Native FFmpeg runs in an independently connected worker. The development worker is temporary; permanent availability requires a worker host. This is an initial test release, not a claim of production readiness.

## Run locally

Install Node **24.19+ (24.x)**, FFmpeg 6.1+ with H.264/AAC/libass, and DejaVu fonts. No owner's accounts are required.

```sh
npm ci --ignore-scripts
cp .env.example .env
npm run dev
```

Open http://localhost:4173, create a local account, start a project, and upload clips. Automatic assembly works without an AI key. Choose the correct audio role, optionally select a screen shape, and click **Create my video**. The worker produces an actual MP4. Creative instructions require a configured model and **Connected AI** selected in the project's additional options.

On Windows, copy `.env.example` to `.env` in Explorer or PowerShell, install Node and FFmpeg, put FFmpeg/ffprobe on PATH, then use the same npm commands. Docker is optional. The listed remote Windows host was not used.

## What works

- React/TypeScript interface with desktop file drop and ordinary mobile file pickers.
- Streaming, resumable tus 1.0 core uploads with offset checks, private ownership, and bounded chunks.
- Server-side content probing, thumbnails, audio envelopes, saved analysis and durable queued jobs.
- Real native rendering: trims/order, Fit or centered Fill, aspect ratios and custom dimensions, original audio, narration, music fades/ducking/limiting, shared-signal correlation with confidence checks, H.264/AAC MP4.
- OpenAI-compatible and Anthropic Messages planning adapters; optional OpenAI-compatible timestamped transcription and derived burned-in captions. **Live provider credentials were unavailable, so live AI is unverified.** Local mock adapter tests are explicitly labeled.
- Protected sources, version selection/restore, first-source comparison, quality checks, authenticated playback/range downloads, cancellation, request budgets, storage/job quotas and deletion.

## Verify

```sh
npm run check
npm test
npm run fixtures
npm run test:integration
npm run build:sites
# On a machine with supported browser infrastructure:
npx playwright install --with-deps chromium webkit
npm run test:e2e
```

The synthetic integration test uploads two 3-second numbered clips plus music, resumes an upload across an API restart, creates a playable MP4, checks six flash/click markers, makes a portrait revision, restores a version and tests protection and ownership. See [actual validation and limits](docs/VALIDATION.md).

## Hosting

- **ChatGPT Sites test:** shared Fetch API, D1/R2, Sites sign-in and a separate native worker. Configure the worker through secure environment variables; never paste tokens into a conversation.
- **Your domain:** a Linux VPS can run API, worker and Caddy with the supplied Compose configuration. Domain/DNS changes and public release are separate steps after testing. No domain changes have been made.

Read [deployment](docs/DEPLOYMENT.md), [architecture](docs/ARCHITECTURE.md), [AI connections](docs/AI-CONNECTIONS.md), [security](SECURITY.md), and [handoff](HANDOFF.md). Preserve the existing MIT license; FFmpeg distributions and model services have separate terms.
