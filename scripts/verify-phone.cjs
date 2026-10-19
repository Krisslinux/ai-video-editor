const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { mkdirSync } = require('node:fs');
const { join } = require('node:path');
const { newProject, applyBatch } = require('../dist-main/src/shared/project.js');
const { probe, render } = require('../dist-main/electron/media.js');

const dir = join(__dirname, '..', 'local', 'phone-fixture');
mkdirSync(dir, { recursive: true });
const base = join(dir, 'vfr-base.mp4');
const source = join(dir, 'vfr-rotated.mp4');
const output = join(dir, 'phone-export.mp4');
function tool(name, args) {
  const result = spawnSync(name, args, { maxBuffer: 16_000_000 });
  if (result.error || result.status !== 0) throw new Error(`${name}: ${result.error?.message ?? result.stderr.toString()}`);
  return result.stdout;
}
function ff(args) { return tool('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', ...args]); }
function info(path) { return JSON.parse(tool('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_streams', '-show_frames', '-show_entries', 'stream=width,height,avg_frame_rate,side_data_list:frame=best_effort_timestamp_time', '-of', 'json', path])); }
function whiteMarker(path, frame = 0) {
  const pixels = ff(['-i', path, '-map', '0:v:0', '-frames:v', '1', '-vf', `select=eq(n\\,${frame}),scale=90:160,format=gray`, '-f', 'rawvideo', '-']);
  assert.equal(pixels.length, 90 * 160, 'Decoded portrait frame must be 90 × 160');
  let count = 0, sumX = 0, sumY = 0;
  for (let y = 0; y < 160; y++) for (let x = 0; x < 90; x++) if (pixels[y * 90 + x] > 190) { count++; sumX += x; sumY += y; }
  assert.ok(count > 700 && count < 2500, `White orientation marker has unexpected area ${count}`);
  return { pixels: count, x: sumX / count, y: sumY / count };
}

(async () => {
  // Five unequal gaps in a short MP4 simulate phone capture with variable frame intervals.
  ff(['-f', 'lavfi', '-i', 'color=c=black:s=160x90:r=30:d=2', '-vf', 'drawbox=x=0:y=0:w=40:h=30:c=white:t=fill,drawbox=x=80:y=45:w=30:h=30:c=white:t=fill:enable=gte(t\\,0.5),select=eq(n\\,0)+eq(n\\,3)+eq(n\\,12)+eq(n\\,15)+eq(n\\,30)+eq(n\\,45),setpts=PTS-STARTPTS', '-fps_mode', 'vfr', '-c:v', 'mpeg4', '-q:v', '2', base]);
  // A display matrix is what many phone MOV/MP4 files use for portrait playback.
  ff(['-display_rotation', '90', '-i', base, '-c', 'copy', source]);
  const input = info(source);
  const times = input.frames.map(frame => Number(frame.best_effort_timestamp_time));
  assert.deepEqual(times.map(t => Number(t.toFixed(2))), [0, .1, .4, .5, 1, 1.5]);
  assert.equal(input.streams[0].side_data_list?.[0]?.rotation, 90);
  const asset = { id: crypto.randomUUID(), path: source, name: 'vfr-rotated.mp4', ...await probe(source) };
  assert.equal(asset.width, 90, 'Import width should describe the displayed portrait image');
  assert.equal(asset.height, 160, 'Import height should describe the displayed portrait image');
  let project = newProject();
  project.assets.push(asset);
  project = applyBatch(project, { projectId: project.id, revision: project.revision, requestId: crypto.randomUUID(), operations: [
    { type: 'addClip', assetId: asset.id, track: 'video' }
  ] });
  project = applyBatch(project, { projectId: project.id, revision: project.revision, requestId: crypto.randomUUID(), operations: [
    { type: 'trimClip', clipId: project.video[0].id, sourceInUs: 100_000, sourceOutUs: 1_500_000 },
    { type: 'setCanvas', width: 360, height: 640 }
  ] });
  await render(project, { width: 360, height: 640, output });
  const exported = info(output);
  assert.equal(exported.streams[0].width, 360);
  assert.equal(exported.streams[0].height, 640);
  assert.equal(exported.frames.length, 42, '1.4 seconds at 30 fps should produce 42 frames');
  const reference = whiteMarker(source), actual = whiteMarker(output);
  assert.ok(Math.abs(reference.x - actual.x) <= 2 && Math.abs(reference.y - actual.y) <= 2, `Rotation changed marker position: ${JSON.stringify({ reference, actual })}`);
  const beforeChange = whiteMarker(output, 10), afterChange = whiteMarker(output, 15);
  assert.equal(beforeChange.pixels, reference.pixels, 'The frame before the 0.5s source marker changed too early');
  assert.ok(afterChange.pixels > beforeChange.pixels + 700, 'The 0.5s source marker did not appear after trim');
  console.log(JSON.stringify({ sourceFrameTimes: times, rotation: 90, display: [asset.width, asset.height], export: [360, 640], frames: exported.frames.length, marker: { reference, actual, beforeChange, afterChange } }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
