FROM node:24.19.0-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:24.19.0-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg fonts-dejavu-core ca-certificates python3 python3-venv libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2 libpango-1.0-0 libcairo2 libcups2 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build --chown=node:node /app /app
ENV PUPPETEER_CACHE_DIR=/opt/frameflow-chrome
ENV WHISPER_PYTHON=/opt/frameflow-whisper/bin/python
ENV WHISPER_MODEL_PATH=/app/data/models/small
ENV LYRIC_RENDERER=hyperframes
RUN python3 -m venv /opt/frameflow-whisper && /opt/frameflow-whisper/bin/pip install --no-cache-dir -r deploy/whisper-requirements.txt
RUN node node_modules/puppeteer/lib/puppeteer/node/cli.js browsers install chrome-headless-shell
RUN mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 3001
CMD ["npm", "run", "start"]
