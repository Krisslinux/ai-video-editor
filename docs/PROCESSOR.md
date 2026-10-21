# Personal lyrics processor

The website is a private personal tool. The API token authorizes inference; native Whisper, FFmpeg, and the selected renderer still need a computer to render files. Chat model access does not host that computer.

Use a permanent Linux server or a computer that stays powered on. A service manager starts the processor at boot and restarts it after a crash. The processor reconnects over outbound HTTPS. It never automatically repeats an uncertain provider call. No Remote Desktop is needed.

## Docker host

Install Docker Engine/Compose on the host and enable the Docker service at boot. Check out this repository. Copy `deploy/processor.env.example` to `.env.processor`, populate the existing private Site secrets securely, and restrict it to the owner (`chmod 600 .env.processor`). From the repository root:

```
docker compose -f deploy/processor.compose.yml up -d --build
docker compose -f deploy/processor.compose.yml logs --tail=40 processor
```

`restart: always` restarts a stopped/crashed container when the Docker daemon restarts. To intentionally stop processing, use `docker compose -f deploy/processor.compose.yml down`. The server must stay on and have internet access; software cannot guarantee uninterrupted service during outages.

## Linux systemd

Install Node 24.19.x and FFmpeg/ffprobe, create a dedicated `frameflow` user, put source/dependencies in `/opt/frameflow`, and give that user `/var/lib/frameflow`. Install the existing processor secrets in `/etc/frameflow/processor.env` (root-owned, mode 0600). Install `deploy/systemd/frameflow-processor.service` in `/etc/systemd/system/`, adjusting the Node executable path for the host. Enable it with `sudo systemctl enable --now frameflow-processor`. Inspect `systemctl status frameflow-processor` and `journalctl -u frameflow-processor`.

## Current deployment boundary

The ChatGPT Site is deployed. This workspace's processor remains temporary, even when supervised. The user supplied an Ubuntu server, but outbound SSH failed with Network is unreachable before authentication; these service definitions have not been installed there. Docker and systemd deployment require verification on the chosen host. The website reports the actual processor lease, never a forced “online” badge.

Local Whisper and HyperFrames/Puppeteer setup: see `LYRICS-TOOLS.md`.
