# Deployment and operations

## Current test Site

https://frameflow-video-studio.kriss626975.chatgpt.site is owner-private. Sites sign-in protects the browser; every record additionally checks that signed-in user's ownership. Hosted storage is D1 (`DB`) and R2 (`BUCKET`). Runtime `ENCRYPTION_KEY` and `WORKER_TOKEN` are Sites secrets, not source manifest fields. The first schema is in drizzle/0000_web_foundation.sql. Published migrations are immutable.

Sites cannot execute native FFmpeg. Connect a separately running Node 24/FFmpeg worker over outbound HTTPS:

```sh
# Keep the real values in a protected, ignored .env.worker file.
node --env-file=.env.worker --import tsx server/worker.ts
```

Required worker variables: `WORKER_API_URL` is the Site origin, `WORKER_TOKEN` is its operator secret, `SITES_SERVICE_TOKEN` is its existing private service credential, and `WORKER_DATA_DIR` is a private writable cache directory. The current development connection is temporary and must not be represented as an always-on hosted renderer. Run a permanent worker under a service manager/container for reliable testing. Offline status is visible in the studio; completed uploads wait safely.

Source uploads use 4 MiB chunks, up to 512 MiB/file. Hosted **single output upload is capped at 96 MiB** to stay below typical Worker ingress request limits; use shorter output or a self-hosted API for larger exports. Large final-output multipart upload is future work. D1/R2/CPU/provider costs depend on usage and are not assumed free or unlimited.

## Self-host on a domain

No domain changes or public deployment have been made. This path is prepared for later testing on a Linux VPS with persistent disk. Docker was unavailable here; the supplied Compose setup has not been executed.

1. Install Docker Engine/Compose on the selected server. A small 4-core/16 GB host should begin with one worker and two FFmpeg threads; measure before increasing concurrency. Allow storage for sources, outputs and temporary transcodes, not just uploaded bytes.
2. Clone the repository/feature branch. Copy `.env.example` to `.env` with permissions 0600. Set `NODE_ENV=production`, `DOMAIN=video.example.com`, `APP_ORIGIN=https://video.example.com`, a long `INVITE_CODE`, `ENCRYPTION_KEY` (32 random bytes as 64 hex characters), and a separate long random `WORKER_TOKEN`. Leave `SITES_SERVICE_TOKEN` blank for the self-hosted API. Never put real values into Git.
3. Point the domain's A record at the server. Add AAAA only if the server actually serves IPv6. Ensure TCP 80/443 are reachable and no conflicting web server occupies them.
4. From the repository root run:

```sh
docker compose --env-file .env -f deploy/compose.yml up -d --build
docker compose --env-file .env -f deploy/compose.yml logs --tail=40 api worker caddy
```

5. Caddy obtains HTTPS. Create an invited account, upload synthetic clips, create/download an MP4, then test actual footage. Keep the API's internal port off the public firewall. Production refuses missing encryption, invitation, worker secret or HTTPS origin configuration.

API/worker containers run as an unprivileged user with read-only roots, dropped capabilities, no-new-privileges, memory/CPU limits and separate volumes. No Docker socket is exposed. The worker can access its own media cache and selected external provider, not the API database or encryption-key file. Restrict egress/firewall policy further for your environment. The images are version-tagged, not digest-verified in this session; pin verified digests before a production release.

For Windows without Docker, install Node 24 and FFmpeg/ffprobe, run `npm ci --ignore-scripts` and `npm run build`, configure `.env`, and start `npm run start` plus `npm run worker` in separate supervised processes. Put HTTPS in front of the API. No claim is made that Docker/virtualization is available on the former Windows server; Remote Desktop was not used for this build.

## Backups, migration and rollback

Stop API and worker before a consistent offline snapshot of the SQLite database and private object directory. Back up the named `frameflow-data` volume, and retain the encryption key separately in protected operator storage. Restoring the DB without media or the encryption key is insufficient. Worker caches are disposable and can be rebuilt. Test restore into a separate host before relying on a backup.

For Sites, export D1 plus the corresponding R2 prefix using operator-authorized platform tooling and preserve runtime secrets separately. A backup/export was not performed here. Never save sensitive exports as public CI artifacts.

Schema changes require a new append-only D1 migration and corresponding native migration. Back up first and verify on a copied database. Never run ad-hoc table creation in hosted request handlers. Roll back code to a known saved Site version/container image; database migration rollback requires a compatible schema or tested restoration. An older UI is not proof that a newer schema can be reversed.

Workers renew a 90-second lease every ten seconds. After a crash, allow lease expiry. Completed analysis and saved plans are reusable; partial final encodes restart. Unknown provider requests stop for operator review. Cancel jobs before changing providers, protection or credentials. The browser can close only after uploads complete.

## Retention and limits

The current build preserves projects until explicit deletion; 30 days is the intended operator retention window, **not an installed automatic deletion schedule**. Implement and test lease-aware cleanup before a public release. Delete stale projects through the authenticated interface; queued jobs are canceled and private objects deleted. Unknown/orphaned chunk/output cleanup and local cache expiry still need an operational sweeper. Monitor disk, D1/R2 volume, request counts and worker CPU. Source and committed export bytes, daily renders, active jobs and provider requests are quota-checked; unknown orphaned storage is not billed as zero.

Default settings: 24 assets/project, 30 minutes combined video/image holds per project, 512 MiB/source file, 2 GiB combined source/committed-output storage/user, 2 active render jobs/user, 20 renders/user/24h, 8 provider calls/project. API/worker set one job at a time. Public release requires retention cleanup, real-device/browser verification, live provider testing and a secure permanent worker.

Supported image inputs: still JPEG, PNG and WebP, up to 16 megapixels and 8192 px per side. Display duration is editable from 0.5 to 30 seconds. Image records use the existing JSON storage, so no D1/SQLite schema migration is needed for this feature. Upgrade the native worker and hosted application together before testing images.

For a personal processor connecting to the hosted private Site, use the processor-only Compose service or systemd unit in `docs/PROCESSOR.md`. They restart on crashes and boot; the chosen computer/server must remain powered on and connected. The website reports the real lease. Host installation is separate from publishing the Site and is not completed merely by adding service files.
