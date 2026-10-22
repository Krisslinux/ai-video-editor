# Cloudflare processor deployment

## Current account blocker

On 2026-10-22 the connected Cloudflare account was reachable, but GET /accounts/{account_id}/containers/applications returned:

> Unauthorized: You do not have access to Cloudflare Containers. Deploying containers requires the Workers Paid plan.

No Cloudflare application, billing subscription, container image, DNS record or secret was created or changed. The existing private ChatGPT Site remains the website. Reading billing subscriptions also requires a Billing API-token permission not available through the current OAuth connection; the Containers response itself confirms the missing entitlement. Reconnecting is not established as the remedy for this plan restriction.

Enable Workers Paid in Cloudflare's Workers & Pages plans screen for the connected account, then recheck Containers access. Workers Paid starts at USD 5/month plus metered usage. A Cloudflare domain/zone plan or ChatGPT subscription does not establish Containers access.

## Prepared image

`deploy/cloudflare/Dockerfile` packages the existing native processor for linux/amd64 with Node 24, FFmpeg, canvas rendering, CPU faster-whisper and the small multilingual model. The model is baked into the image so that a new container does not depend on a model download. It uses the already verified native canvas renderer and does not require a browser or Remote Desktop. This is the real processor entrypoint, not a model or simulated processor.

Build on a Docker-enabled host or build service from the repository root:

```sh
docker build --platform linux/amd64 -f deploy/cloudflare/Dockerfile -t frameflow-processor .
```

The image contains source code, runtime dependencies, fonts and model weights. It does not copy environment files, private media, uploaded songs or runtime data. The model is read-only under /opt; job scratch data lives under /tmp/frameflow. Original media, job state, usage reservations and exported videos remain in the existing website's private storage.

Docker is unavailable in the current workspace, so this Dockerfile has not been built or run here. Source typecheck and native regression checks are separate from validating the final container image.

## Account deployment shape

The current Cloudflare Containers API supports a scheduler-backed application using `scheduling_policy: default`, a verified registry image, instance count and maximum instance count. `deploy/cloudflare/application.example.json` reflects the retrieved API schema and deliberately starts at zero instances. Its image placeholder is not deployable. No resource was provisioned from it.

After access is enabled:

1. Build and inspect the image; run its FFmpeg, Python/model-load and native synthetic lyric-export smoke checks.
2. Publish the image to a supported registry and retain its immutable digest. Supply that digest in the application configuration.
3. Securely inject the existing WORKER_TOKEN and the private Site service token. Do not put their values in Git, image layers, command arguments, logs or public configuration files. Do not rotate the Site's existing encryption/processor secrets as part of this deployment.
4. Create the stopped application and perform one controlled startup. Confirm a real processor lease in the private Site, upload/probe a synthetic audio file, generate or import cues, export/download and fully decode the MP4. Verify shutdown and recovery without repeating an uncertain AI call.
5. Choose an operating schedule before leaving it running. A scheduler-backed singleton configured to one instance runs continuously. Zero instances means stopped. This example is not an on-demand wake-up integration; that would require a protected wake path and idle lifecycle handling before deployment.

The existing worker handles SIGTERM, leases and persisted jobs. Cloudflare may restart instances and resets their scratch disks. The worker downloads originals again when needed and never treats scratch files as durable state. Keep the website's actual lease status; do not force an online indicator.

## Costs to review before starting

Cloudflare bills provisioned memory/disk while a container runs, CPU while actively used, and applicable egress, logging, Workers and Durable Object usage. USD 5 is the Workers plan fee, not an all-inclusive rendering price.

The example standard-2 instance has 1 vCPU, 6 GiB RAM and 12 GB disk. At the rates retrieved on 2026-10-22, leaving that allocation running for 30 days (720 hours) is approximately USD 45.78 for the Workers base fee plus memory and disk after their included amounts, **before CPU and other usage**. This is an estimate, not a spending cap or quoted bill. Shorter operating hours or a verified smaller instance reduce running-resource charges. Do not start a permanent instance on the assumption that it costs only USD 5/month.

## Primary references

- https://developers.cloudflare.com/containers/
- https://developers.cloudflare.com/containers/platform/pricing/
- https://developers.cloudflare.com/containers/guides/image-management/
- Cloudflare OpenAPI: POST /accounts/{account_id}/containers/applications

No successful Cloudflare deployment, image build, model load inside Cloudflare or real Cloudflare export is claimed until those checks pass.
