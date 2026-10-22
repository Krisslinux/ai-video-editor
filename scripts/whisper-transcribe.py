"""Local-only Whisper runner. Audio and model paths come from the processor."""
import json
import logging
import os
import sys
import wave

logging.basicConfig(level=logging.ERROR)


def main():
    from faster_whisper import WhisperModel
    import numpy as np

    model = WhisperModel(
        os.environ["WHISPER_MODEL_PATH"],
        device=os.environ.get("WHISPER_DEVICE", "cpu"),
        compute_type=os.environ.get("WHISPER_COMPUTE_TYPE", "int8"),
        cpu_threads=max(1, min(16, int(os.environ.get("WHISPER_THREADS", "2")))),
        local_files_only=True,
    )
    # Keep music pauses intact. VAD can discard quiet singing; word times come
    # from the model, never from splitting line durations evenly.
    # FFmpeg already decoded the input. Pass PCM directly so PyAV codec API
    # changes cannot affect the transcription path.
    with wave.open(sys.argv[1], "rb") as audio:
        if audio.getframerate() != 16000 or audio.getnchannels() != 1 or audio.getsampwidth() != 2:
            raise ValueError("Expected mono 16 kHz PCM")
        samples = np.frombuffer(audio.readframes(audio.getnframes()), dtype="<i2").astype(np.float32) / 32768.0
    segments, _ = model.transcribe(
        samples, word_timestamps=True, beam_size=5,
        vad_filter=False, condition_on_previous_text=False,
    )
    words = []
    for segment in segments:
        for word in segment.words or []:
            words.append({"word": word.word, "start": word.start, "end": word.end})
            if len(words) > 2000:
                raise ValueError("Too many lyric words")
    print(json.dumps({"words": words}, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception:
        # Avoid writing audio content, local paths, or model internals to logs.
        print("Local Whisper failed. Check the installed model and processor configuration.", file=sys.stderr)
        sys.exit(1)
