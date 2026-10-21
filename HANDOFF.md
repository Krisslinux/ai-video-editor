# Frameflow · personal video workspace

Private website: https://frameflow-video-studio.kriss626975.chatgpt.site
Repository: https://github.com/Krisslinux/ai-video-editor
Branch: build/ai-video-web · draft PR #7

## Connect the custom API

Open API settings. Enter the provider's exact base URL, token, API format, and editing model ID. The eleven IDs from the user's screenshot are offered as editable suggestions, not asserted to be official model names or verified audio models. Add an audio transcription model only if that same provider supports `/audio/transcriptions` with word timestamps. Select image input only when intended.

**Save & test** stores the token encrypted, then performs real small provider requests through the video processor. Editing must return a valid edit plan; image input must read a generated color sample; audio must recognize the supplied short speech sample and return ordered word times. Results are separate. Failed/unconfigured capabilities remain blocked. Changing the URL, token, model, or settings invalidates old checks. No uncertain provider call is automatically repeated. A passed sample confirms the endpoint contract, not perfect recognition of every song.

New projects default to API editing. Simple assembly remains explicitly selectable. Automatic lyrics use the selected audio model and the saved token. Theme analysis uses the selected chat API format/model, including Anthropic Messages. The original song stays at full length, speed, and volume; native FFmpeg/canvas render the MP4. Native rendering is separate from inference entitlement.

## Workflow

For clips/images: upload originals, provide edit instructions, choose a shape, create, preview, download. JPEG/PNG/WebP image holds are adjustable. Original files remain unchanged. Versions and restore are private.

For lyrics: upload a song (up to eight minutes), generate timed lyrics, review/correct cue text and start/end times, choose palette/motion, export. LRC/JSON imports and corrected cues can export without an API. LRC is line timed; no word timing is fabricated. Offsets outside song bounds are rejected.

## Processor hosting

The processor was started here at the user's request. The user subsequently requested installation on their own server; server address, OS and SSH access details have not yet been supplied. Keep the current processor running until that service is ready. `docs/PROCESSOR.md`, `deploy/processor.compose.yml`, and the systemd unit contain boot/crash-recovery configuration. No permanent external service installation is claimed. Do not force a false online status. No Remote Desktop or DNS/domain changes have been used.

## Verification

Typecheck, eight core tests, synthetic fixtures, media integration, lyric/API connection integration, and Sites builds pass. Integration verifies saved-token forwarding, OpenAI and Anthropic routes, capability failures blocking work, image checks, settings invalidation, real native MP4s, and synthetic timing markers. Local provider mocks are explicitly labeled and do not verify the user's actual provider. The user's base URL/token were not supplied here; they must run Save & test in the private website. Browser/device QA is blocked by missing managed preview infrastructure. Server Docker/systemd installation remains unverified until the chosen server is accessible.

SIL OFL Playfair Display and DM Mono are bundled. Botanical motion is an original implementation inspired by the user's incomplete Type Garden snippet; see THIRD-PARTY-NOTICES.md.
