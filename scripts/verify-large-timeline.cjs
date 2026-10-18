const assert = require('node:assert/strict');
const { join } = require('node:path');
const { newProject, validateProject } = require('../dist-main/src/shared/project.js');
const { probe, render, runTool } = require('../dist-main/electron/media.js');

(async () => {
  const file = join(__dirname, '..', 'local', 'fixture', 'one.mp4');
  const output = join(__dirname, '..', 'local', 'fixture', 'repeated-large.mp4');
  const project = newProject();
  const asset = { id: crypto.randomUUID(), path: file, name: 'one.mp4', ...await probe(file) };
  project.assets.push(asset);
  for (let i = 0; i < 120; i++) {
    project.video.push({
      id: crypto.randomUUID(), assetId: asset.id, sourceInUs: 0, sourceOutUs: 100_000,
      startUs: i * 100_000, gain: 1, fadeOutUs: 0, fit: 'fit', locks: {}
    });
  }
  validateProject(project);
  await render(project, { width: 320, height: 240, output });
  const info = JSON.parse(await runTool('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type', '-of', 'json', output]));
  assert.ok(Math.abs(Number(info.format.duration) - 12) <= 1 / 30);
  assert.ok(info.streams.some(stream => stream.codec_type === 'audio'));
  console.log(JSON.stringify({ repeatedClips: 120, uniqueInputs: 1, duration: Number(info.format.duration), audio: true }));
})().catch(error => { console.error(error); process.exitCode = 1; });
