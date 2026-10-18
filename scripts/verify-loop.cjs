const { readFileSync, writeFileSync, mkdirSync } = require('node:fs');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const { newProject, applyBatch, validateProject, projectDurationUs, setUserLock } = require('../dist-main/src/shared/project.js');
const { probe, render, runTool } = require('../dist-main/electron/media.js');
const dir = join(__dirname, '..', 'local', 'fixture');
const id = () => crypto.randomUUID();
(async () => {
  let p = newProject();
  for (const [name, kind] of [['one.mp4', 'video'], ['two.mp4', 'video'], ['music.wav', 'audio']]) {
    const path = join(dir, name); p.assets.push({ id: id(), path, name, ...await probe(path) });
    assert.equal(p.assets.at(-1).kind, kind);
  }
  const coverAudio = join(dir, 'music-cover.mp3');
  const cover = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1', '-f', 'lavfi', '-i', 'color=c=blue:s=32x32:d=1', '-map', '0:a', '-map', '1:v', '-frames:v', '1', '-c:a', 'libmp3lame', '-c:v', 'mjpeg', '-disposition:v', 'attached_pic', coverAudio]);
  assert.equal(cover.status, 0, cover.stderr?.toString());
  const coverAsset = await probe(coverAudio);
  assert.equal(coverAsset.kind, 'audio', 'Embedded cover art must not turn an MP3 into a video asset');
  assert.equal(coverAsset.hasAudio, true);
  p = applyBatch(p, { projectId: p.id, revision: p.revision, requestId: id(), operations: p.assets.map(a => ({ type: 'addClip', assetId: a.id, track: a.kind })) });
  const before = structuredClone(p);
  const proposed = [{ type: 'trimClip', clipId: p.video[0].id, sourceInUs: 1_000_000, sourceOutUs: p.video[0].sourceOutUs }, { type: 'setGain', clipId: p.audio[0].id, gain: 0.2 }, { type: 'setFade', clipId: p.audio[0].id, fadeOutUs: 1_000_000 }];
  p = applyBatch(p, { projectId: p.id, revision: p.revision, requestId: id(), operations: proposed });
  assert.equal(projectDurationUs(p), 4_000_000); assert.equal(projectDurationUs(before), 5_000_000);
  const file = join(dir, 'test-project.ave.json'); writeFileSync(file, JSON.stringify(p));
  assert.deepEqual(validateProject(JSON.parse(readFileSync(file))), JSON.parse(JSON.stringify(p)));
  const locked = setUserLock(p, p.video[0].id, 'content', true);
  assert.throws(() => applyBatch(locked, { projectId: locked.id, revision: locked.revision, requestId: id(), operations: [{ type: 'trimClip', clipId: p.video[0].id, sourceInUs: 0, sourceOutUs: p.video[0].sourceOutUs }] }), /protected/);
  assert.throws(() => applyBatch(p, { projectId: p.id, revision: p.revision - 1, requestId: id(), operations: proposed }), /changed/);
  const out = join(dir, 'edited.mp4'), preview = join(dir, 'preview.mp4'), portrait = join(dir, 'portrait.mp4');
  await render(p, { width: 640, height: 360, output: preview });
  await render(p, { width: 1280, height: 720, output: out });
  const portraitProject = applyBatch(p, { projectId: p.id, revision: p.revision, requestId: id(), operations: [{ type: 'setCanvas', width: 360, height: 640 }, { type: 'setFit', clipId: p.video[0].id, fit: 'fill' }] });
  assert.equal(projectDurationUs(portraitProject), projectDurationUs(p));
  await render(portraitProject, { width: 360, height: 640, output: portrait });
  const raw = await runTool('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,codec_name,width,height', '-of', 'json', out]);
  const info = JSON.parse(raw), duration = Number(info.format.duration);
  assert.ok(Math.abs(duration - 4) <= 1 / 30, `duration ${duration}`);
  assert.ok(info.streams.some(s => s.codec_type === 'video' && s.codec_name === 'h264' && s.width === 1280 && s.height === 720));
  assert.ok(info.streams.some(s => s.codec_type === 'audio'));
  const prev = JSON.parse(await runTool('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'json', preview]));
  assert.ok(Math.abs(Number(prev.format.duration) - duration) <= 1 / 30);
  const portraitInfo = JSON.parse(await runTool('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=width,height,codec_type', '-of', 'json', portrait]));
  assert.equal(Number(portraitInfo.format.duration), duration);
  assert.ok(portraitInfo.streams.some(s => s.codec_type === 'video' && s.width === 360 && s.height === 640));
  const frame = t => spawnSync('ffmpeg', ['-v', 'error', '-ss', String(t), '-i', out, '-frames:v', '1', '-vf', 'scale=1:1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1024 * 1024 }).stdout;
  const first = frame(.5), last = frame(2.5);
  assert.ok(first[0] > first[2] * 2, `first clip is not red: ${first}`);
  assert.ok(last[2] > last[0] * 2, `second clip is not blue: ${last}`);
  const repeated = applyBatch(p, { projectId: p.id, revision: p.revision, requestId: id(), operations: [
    { type: 'addClip', assetId: p.assets[0].id, track: 'video' },
    { type: 'addClip', assetId: p.assets[2].id, track: 'audio', startUs: 1_000_000 }
  ] });
  const repeatedOut = join(dir, 'repeated.mp4');
  await render(repeated, { width: 640, height: 360, output: repeatedOut });
  const repeatedInfo = JSON.parse(await runTool('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type', '-of', 'json', repeatedOut]));
  assert.ok(Math.abs(Number(repeatedInfo.format.duration) - 6) <= 1 / 30);
  assert.ok(repeatedInfo.streams.some(s => s.codec_type === 'audio'));
  console.log(JSON.stringify({ expectedDuration: 4, outputDuration: duration, previewDuration: Number(prev.format.duration), dimensions: '1280x720', portraitDimensions: '360x640', firstClip: 'red', secondClip: 'blue', audioStream: true, coverArtMp3Kind: coverAsset.kind, repeatedSourceDuration: Number(repeatedInfo.format.duration), output: out }, null, 2));
})().catch(e => { console.error(e); process.exitCode = 1; });
