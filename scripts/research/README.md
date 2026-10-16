# Synthetic Descript research sources

These scripts create test inputs; they do not control Descript or prove its import/export behavior. Requires existing Windows PowerShell with System.Speech, the Microsoft David Desktop voice, and Node.js (tested with 24.20.0). No npm dependency is installed. Source scripts follow the repository MIT license; no Windows speech binaries, generated voice files, codecs or Descript code are distributed here. These research choices do not select the product's media engine or redistribution terms.

Choose a new output directory **outside the repository**:

```powershell
.\scripts\research\make-speech.ps1 -OutputDirectory 'C:\path\outside-repo\fixtures'
node .\scripts\research\make-fixtures.cjs 'C:\path\outside-repo\fixtures'
node .\scripts\research\verify-fixtures.cjs 'C:\path\outside-repo\fixtures'
```

Generation refuses to overwrite media. If generation is interrupted, preserve that directory and use a new directory for another run.

Outputs: clip-A.avi (12 s), clip-B.avi (8 s), matching audio WAVs, music.wav (20 s), six speech-word WAVs, manifest.json and verification.json. Video is 320×180 RGB24 at 30 fps. Audio is PCM16 stereo at 48 kHz: isolated marker clicks left, speech right. Speech says one through six; the manifest records scheduled and threshold-detected spans and gaps. AVI is intentionally dependency-free; compatibility with Descript is **not tested**. Keep all media outside Git.

The verifier parses the generated AVI file independently of the generator, checks headers/index offsets, detects flash pixels and PCM click onset, validates frame/sample counts and media SHA-256, and reports source offsets. It supports these uncompressed fixtures only. For a compressed Descript export, use an independently verified decoder and compare PTS-aware frames/audio against the retained-marker cut map, accounting for encoder delay and frame/sample uncertainty. Do not feed MP4 files to this verifier or treat source offsets as Descript results.

The committed 20261016 manifests are a record of the tested local run. Speech rendering can vary with voice/runtime versions; compare content hashes before reusing timing.
