const { mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const { newProject, applyBatch } = require('../dist-main/src/shared/project.js');
const { probe, render } = require('../dist-main/electron/media.js');

const dir = join(__dirname, '..', 'local', 'sync-fixture');
mkdirSync(dir, { recursive: true });
const expected = [0.3, 1, 2, 3];
function ff(args) {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', ...args], { maxBuffer: 16_000_000 });
  if (result.error || result.status !== 0) throw new Error(result.error?.message ?? result.stderr.toString());
  return result.stdout;
}
function video(name, flashes) {
  const output = join(dir, `${name}.mp4`);
  const enable = flashes.map(t => `between(t\\,${t}\\,${(t + .015).toFixed(3)})`).join('+');
  ff(['-f', 'lavfi', '-i', 'color=c=black:s=320x180:r=30:d=2', '-i', clickWav(name, flashes, 2), '-vf', `drawbox=c=white:t=fill:enable=${enable}`, '-c:v', 'mpeg4', '-q:v', '2', '-c:a', 'aac', output]);
  return output;
}
function clickWav(name, clicks, duration) {
  const sampleRate = 48000, samples = sampleRate * duration;
  const wav = Buffer.alloc(44 + samples * 2);
  wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24); wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write('data', 36); wav.writeUInt32LE(samples * 2, 40);
  for (const t of clicks) for (let i = 0; i < 480; i++) {
    const sample = Math.round(25000 * Math.sin(2 * Math.PI * 1000 * i / sampleRate) * Math.sin(Math.PI * i / 480));
    wav.writeInt16LE(sample, 44 + (Math.round(t * sampleRate) + i) * 2);
  }
  const output = join(dir, `${name}.wav`); writeFileSync(output, wav); return output;
}
function measure(output) {
  const frames = ff(['-i', output, '-map', '0:v:0', '-vf', 'scale=1:1:flags=area,format=gray', '-f', 'rawvideo', '-pix_fmt', 'gray', '-']);
  const pcm = ff(['-i', output, '-map', '0:a:0', '-f', 's16le', '-ac', '1', '-ar', '48000', '-']);
  const markers = expected.map(t => {
    const lo = Math.max(0, Math.round((t - .05) * 30)), hi = Math.min(frames.length, Math.round((t + .05) * 30) + 1);
    let frame = -1;
    for (let i = lo; i < hi; i++) if (frames[i] > 180) { frame = i; break; }
    assert.ok(frame >= 0, `Missing flash near ${t}s`);
    const start = Math.max(0, Math.round((t - .025) * 48000)), end = Math.min(pcm.length / 2, Math.round((t + .025) * 48000));
    let peak = 0, sample = -1;
    for (let i = start; i < end; i++) {
      const amplitude = Math.abs(pcm.readInt16LE(i * 2));
      if (amplitude > peak) { peak = amplitude; sample = i; }
    }
    assert.ok(peak > 3000, `Missing click near ${t}s`);
    const offsetMs = Number(((sample / 48000 - frame / 30) * 1000).toFixed(2));
    assert.ok(Math.abs(offsetMs) <= 1000 / 30, `A/V marker at ${t}s offset ${offsetMs}ms exceeds one frame`);
    return { expectedSeconds: t, flashFrame: frame, clickSample: sample, offsetMs };
  });
  return { output, markers };
}

(async () => {
  const paths = [video('first', [.8, 1.5]), video('second', [.5, 1.5]), clickWav('separate', expected, 4)];
  let project = newProject();
  for (const path of paths) project.assets.push({ id: crypto.randomUUID(), path, name: path.split(/[\\/]/).at(-1), ...await probe(path) });
  project = applyBatch(project, { projectId: project.id, revision: project.revision, requestId: crypto.randomUUID(), operations: project.assets.map(asset => ({ type: 'addClip', assetId: asset.id, track: asset.kind })) });
  project = applyBatch(project, { projectId: project.id, revision: project.revision, requestId: crypto.randomUUID(), operations: [
    { type: 'trimClip', clipId: project.video[0].id, sourceInUs: 500_000, sourceOutUs: 2_000_000 },
    { type: 'setGain', clipId: project.video[0].id, gain: 0 },
    { type: 'setGain', clipId: project.video[1].id, gain: 0 },
    { type: 'setGain', clipId: project.audio[0].id, gain: 1 }
  ] });
  const separate = join(dir, 'sync-separate.mp4');
  await render(project, { width: 320, height: 180, output: separate });
  const sourceProject = structuredClone(project);
  sourceProject.audio = [];
  sourceProject.video.forEach(clip => { clip.gain = 1; });
  const source = join(dir, 'sync-source.mp4');
  await render(sourceProject, { width: 320, height: 180, output: source });
  console.log(JSON.stringify({ durationSeconds: 3.5, frameRate: 30, separateTrack: measure(separate), sourceAudio: measure(source) }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
