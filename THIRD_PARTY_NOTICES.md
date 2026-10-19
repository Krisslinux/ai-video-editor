# Third-party dependencies

Original application code: MIT (LICENSE). Electron 44.9.0, React/React DOM 19.3.1, TypeScript 5.9.3, Vite 8.3.4, electron-builder 26.15.3 and their transitive packages are pinned in `package-lock.json`; inspect individual notices in a built distribution. Electron/React/TypeScript/Vite are MIT; electron-builder is MIT. Sentry Electron SDK, if enabled, is MIT. This is a development inventory, not a substitute for generated complete license notices.

FFmpeg/ffprobe are external system tools in source runs. The tested Ubuntu 6.1.1 and Windows Gyan 9.0.2 full builds report `--enable-gpl --enable-libx264`; neither is included in the repository or a release. H.264 encoding currently requires a build exposing libx264. A future Windows bundle must document its exact GPLv3 license/configuration, corresponding source (including external libraries) and redistribution obligations; the package command requires a local `LICENSE.txt` and `SOURCE.txt` for that bundle. Codec patent considerations differ by jurisdiction. No optional model weights are bundled.

The installed optional `@sentry/electron` 8.1.0 SDK is MIT. Reporting remains disabled unless a project DSN is provisioned and a user opts in; no project is configured in this checkout.
