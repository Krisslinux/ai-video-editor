# Release and installer status

No versioned installer or release exists. `npm run pack:win` is a packaging command gated on a reviewed compatible `vendor/ffmpeg/win32/ffmpeg.exe`, `ffprobe.exe`, `LICENSE.txt`, and `SOURCE.txt`. This environment has neither a redistributable Windows build nor a Windows installation test. Do not advertise the result as a verified installer. User projects remain outside the app installation directory.

Before a release: record media tool version/configuration and licensing/source offer, produce and test a clean Windows NSIS install as a normal user (including uninstall preserving projects), verify first-run tool discovery and offline export, tag the source commit, attach checksums/notices/known limits, and record signing status. Safe updates, migration backups, rollback, macOS/Linux installation, and notarization remain planned. Publishing requires a separate deliberate action.

To prepare a local bundle, place the reviewed binaries and their actual license/source notice in `vendor/ffmpeg/<platform>/`. That directory is ignored by Git; packaging fails fast when the files are missing. CI currently builds unpackaged Windows assets only. No signing credentials or release publishing run in untrusted pull-request jobs.
