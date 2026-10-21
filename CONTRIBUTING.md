# Contributing

Use Node 24.x and FFmpeg with libx264/AAC/libass. Run the README setup and verification commands. Keep source media out of Git; synthetic fixtures are generated from scripts/fixtures.ts. Never use private user media in CI.

Keep UI details secondary to upload → create → preview → download. Do not introduce a required timeline. All edits must use the same versioned composition and code validation. Add a meaningful regression check for ownership, timing or recovery changes; avoid cosmetic implementation-mirroring tests.

Use feature branches and draft pull requests. Document actual validation, browser/device versions and remaining uncertainty. Changes to schema must append migrations and describe backup/compatibility. Do not auto-merge, publish publicly or alter domain records as part of a routine code change.

MIT covers this source. FFmpeg packages built with GPL components (including typical libx264 builds) carry their own redistribution obligations; review the exact binary build/license when distributing containers/bundles. Model weights, fonts, browser binaries and hosted provider services have independent terms. No model weights or FFmpeg binaries are committed here. System FFmpeg is used at runtime.
