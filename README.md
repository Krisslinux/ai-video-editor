# Frameflow · lyrics studio

A private personal studio: **upload a song → generate or import timed lyrics → review → style → preview and export**.

Studio: https://frameflow-video-studio.kriss626975.chatgpt.site

The general clip/image editor has been removed from the interface. Original media and older project records are preserved. Lyrics support word timing, LRC/JSON import, editable cues, timing offsets, ten palettes, seven motion styles, lyric MP4 versions and timed-lyric downloads.

The Site hosts the authenticated interface, API and private storage. A separate native processor runs FFmpeg, local faster-whisper and the selected renderer. Custom Claude/OpenAI-compatible/Anthropic requests use your encrypted API token when you request an AI action. Local transcription needs no audio API subscription. See [lyrics tools and setup](docs/LYRICS-TOOLS.md).

## Run locally

Install Node 24.19.x and FFmpeg/ffprobe. Then:

```sh
npm ci --ignore-scripts
cp .env.example .env
npm run dev
```

Open http://localhost:4173 and add a song. Configure your transcription source in API settings, or import timed lyrics. Review spelling and timing, choose style/shape, and export. For local Whisper or HyperFrames/Puppeteer, follow [the tool setup](docs/LYRICS-TOOLS.md). The temporary processor here uses the verified canvas/FFmpeg renderer because Chromium cannot launch in this environment. A permanent Ubuntu deployment remains blocked by SSH reachability.

## Verify

```sh
npm run check
npm test
npm run fixtures
npm run test:integration
npm run test:lyrics
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

### Lyric videos

Song-only projects support word-timestamp transcription, a reviewable cue editor, LRC/JSON/timestamp-table imports, ten color palettes, seven botanical motion variants, and deterministic native H.264/AAC export. Songs are limited to eight minutes. Native workers now require `@napi-rs/canvas` and the bundled `public/fonts` directory. Run `npm run test:lyrics` for the synthetic timing/adapter integration test. Live singing transcription and real-device UI QA are not yet verified; review and correct lyrics before exporting. See `HANDOFF.md` for the workflow and limits.

### Personal custom-provider configuration

Use **API settings → Save settings** to store your encrypted provider token. Saving makes no test requests and does not depend on the processor being online. Generate lyrics directly, use local Whisper without a provider account, or enter/import lyrics manually. Theme-service failures preserve lyrics and allow manual styling/export. See `docs/PROCESSOR.md` for a continuously running server service.
