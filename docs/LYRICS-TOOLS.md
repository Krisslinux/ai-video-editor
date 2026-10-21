# Lyrics pipeline

Frameflow now opens directly into a private lyrics studio. New songs accept audio only. The general clip/image editor is removed from the interface; existing source files and older project records are preserved.

## Tools from the reference

- **FFmpeg / ffprobe:** decode and inspect the uploaded song, extract 16 kHz mono PCM for transcription, encode H.264/AAC exports, and fully decode-check the result.
- **Whisper via faster-whisper 1.2.1:** optional local recognition with real word timestamps. Runs on the processor, without an audio API token or remote audio upload. An installed Whisper model is required. Quiet singing is not discarded by VAD. The result must pass strict word/range validation; no evenly divided word timing is invented.
- **HyperFrames 0.8.185 / Puppeteer:** an integrated browser renderer seeks the same trusted lyric composition at exact 1/30-second times, captures PNG frames and pipes them to FFmpeg. Fonts and composition data are served on a temporary private loopback origin. No model-generated HTML, scripts, shell commands or filters are executed.
- **Claude or the selected chat model:** chooses a validated lyric palette through the saved custom-provider API. The connection check now tests this actual palette contract. It sees lyric text and measured opening audio energy, not the raw song; it cannot establish genre or perfect musical interpretation from those inputs.

The reference's **yt-dlp** downloads online videos, and **OpenCV/contrib** tracks subjects for cropping. Those operations do not belong to this audio-upload lyrics workflow and are not installed. Whisper is the model used by faster-whisper; a second openai/whisper runtime is unnecessary.

## Local transcription setup

Install Python 3.10+ in addition to Node 24.19.x and FFmpeg. From the repository root:

```sh
python3 -m venv .venv-whisper
.venv-whisper/bin/python -m pip install -r deploy/whisper-requirements.txt
.venv-whisper/bin/python scripts/download-whisper-model.py --model small --output /var/lib/frameflow/models/small
```

Configure the processor service environment:

```dotenv
WHISPER_PYTHON=/opt/frameflow/.venv-whisper/bin/python
WHISPER_MODEL_PATH=/var/lib/frameflow/models/small
WHISPER_MODEL_REVISION=1
WHISPER_DEVICE=cpu
WHISPER_COMPUTE_TYPE=int8
WHISPER_THREADS=2
LYRIC_RENDERER=canvas
```

Choose **Local faster-whisper** in API settings and run **Save & test**. The test must recognize the built-in phrase and produce ordered word times before automatic lyrics are enabled. The theme request still uses your saved API token. With a manually selected palette, local transcription makes no provider call for a song. Imported LRC/JSON can be corrected and exported without a provider connection.

Downloads happen only in the explicit setup command. Normal transcription uses local files exclusively. Increase `WHISPER_MODEL_REVISION` and test again after replacing model files. A larger multilingual model may improve recognition but requires more RAM and time; singing and harmonies still need review.

## HyperFrames rendering

The deployment image includes HyperFrames, its Puppeteer Chrome installation, Python and faster-whisper. Download model files into the processor volume explicitly:

```sh
docker compose -f deploy/processor.compose.yml run --rm processor /opt/frameflow-whisper/bin/python scripts/download-whisper-model.py --model small --output /app/data/models/small
```

`LYRIC_RENDERER=hyperframes` selects browser capture; `LYRIC_RENDERER=canvas` explicitly selects the native renderer. There is no silent renderer substitution. Both use the same lyric drawing function, bundled fonts, millisecond cues and 30 fps clock. Docker defaults to HyperFrames; non-Docker processors default to canvas until configured.

This workspace downloaded Chrome successfully, but Chromium rendering processes exit before startup. HyperFrames therefore remains unverified here, and the temporary hosted processor explicitly uses the verified canvas/FFmpeg route. A normal Ubuntu host must pass a synthetic lyric render with `LYRIC_RENDERER=hyperframes` before switching its live exports. Installing the renderer does not itself verify it.

The existing Ubuntu deployment is still blocked by outbound SSH reachability from this workspace. No remote desktop is used and no permanent server installation is claimed.
