# Project

## Goal

Build an open-source desktop application for Windows, macOS, and Linux that creates videos from instructions and assets and edits existing footage. Users should be able to revise an AI result through chat and manual timeline corrections.

Create: turn a description, references, clips, images, and audio into scenes, animation, captions, and an audio arrangement. Edit: import footage and audio, then select, trim, arrange, caption, apply transitions/effects, and synchronize. The eventual workspace includes a media library, chat, preview, editable timeline, undo, and MP4 export.

## Confirmed repository state (2026-10-15)

- Repository: https://github.com/Krisslinux/ai-video-editor. It is public and has main with an initial README, Node-oriented .gitignore, and MIT LICENSE. No application code or build command exists.
- The owner confirmed the existing MIT LICENSE as the project's license on 2026-10-15. Dependency-specific distribution terms still require review before adoption.
- Product name, desktop framework, rendering library, and provider matrix remain open.
- Target baseline: CPU rendering and cloud AI calls. Available Windows RDP hardware is stated as 4 cores, 16 GB RAM, about 200 GB storage, with no baseline GPU. This execution environment has not been verified as that RDP.
- Development accounts: two separate ChatGPT Plus sign-ins. Application testing has a custom-provider Claude token, which must enter only through secure local settings.
- Services mentioned: GitHub, CodeRabbit Pro, Sentry Business, Notion Business, and REA. GitHub App branch creation now works for this repository. See HANDOFF.md for the other verified states.

## Product boundaries

The AI should submit a structured plan of editing operations. Deterministic operations update a timeline; the media engine renders the same edit for preview and export. Generated JavaScript visuals may provide motion graphics only inside a restricted runtime. Speech recognition, voice, and music generation are optional capabilities with separate provider checks. Account-based application sign-in needs evaluation against current official provider support.

Synchronization must be evaluated with measurements and a correction path. Aligning recordings, cutting to music, and lip movement have different methods and acceptance tests.

- A private Notion navigation page exists at https://app.notion.com/p/3fa677d871be81f78d69e1cb4a9acca1 ; Git remains the source of truth.

## Open questions

1. Select the desktop shell, media engine packaging, and export codec/distribution approach after dependency license review and a CPU prototype.
2. Define first edit-plan schema and operation set, preview strategy, and timing tolerance.
3. Identify provider name, endpoint, and model ID when integration work begins; use secure secret entry for tokens.
4. Decide whether any cloud data or telemetry leaves the device, and define consent and retention behavior.
