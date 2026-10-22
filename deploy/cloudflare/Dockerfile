# Build from the repository root:
# docker build --platform linux/amd64 -f deploy/cloudflare/Dockerfile -t frameflow-processor .
FROM node:24.19.0-bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg ca-certificates python3 python3-venv libgomp1 tini \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund

COPY deploy/whisper-requirements.txt /tmp/whisper-requirements.txt
RUN python3 -m venv /opt/frameflow-whisper \
 && /opt/frameflow-whisper/bin/pip install --no-cache-dir -r /tmp/whisper-requirements.txt \
 && rm /tmp/whisper-requirements.txt

# Model weights are part of the immutable image: Cloudflare's scratch disk is
# ephemeral, and normal inference must not download a model on each cold start.
COPY scripts/download-whisper-model.py /tmp/download-whisper-model.py
RUN /opt/frameflow-whisper/bin/python /tmp/download-whisper-model.py --model small --output /opt/frameflow-model/small \
 && rm /tmp/download-whisper-model.py

COPY --chown=node:node server ./server
COPY --chown=node:node shared ./shared
COPY --chown=node:node scripts/whisper-transcribe.py ./scripts/whisper-transcribe.py
COPY --chown=node:node public/fonts ./public/fonts
COPY --chown=node:node web/lyric-frame.ts ./web/lyric-frame.ts
COPY LICENSE THIRD-PARTY-NOTICES.md ./

ENV NODE_ENV=production \
    WORKER_DATA_DIR=/tmp/frameflow \
    WHISPER_PYTHON=/opt/frameflow-whisper/bin/python \
    WHISPER_MODEL_PATH=/opt/frameflow-model/small \
    WHISPER_MODEL_REVISION=cloudflare-small-image-1 \
    WHISPER_DEVICE=cpu \
    WHISPER_COMPUTE_TYPE=int8 \
    WHISPER_THREADS=1 \
    FFMPEG_THREADS=1 \
    LYRIC_RENDERER=canvas

# Headless processor: outbound authenticated HTTPS only, no public HTTP port.
# Inject WORKER_API_URL, WORKER_TOKEN and SITES_SERVICE_TOKEN at deployment.
USER node
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "--import", "tsx", "server/worker.ts"]
