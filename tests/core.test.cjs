const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, writeFileSync, existsSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { newProject, applyBatch, setUserLock, projectDurationUs, validateProject } = require('../dist-main/src/shared/project.js');
const { tokenForEndpoint } = require('../dist-main/src/shared/connection.js');
const { graphOptionForVersion, render } = require('../dist-main/electron/media.js');
const id = () => crypto.randomUUID();
function sample() { let p = newProject(); p.assets = [{ id: 'a', name: 'a.mp4', path: '/not-needed-for-core', kind: 'video', durationUs: 3_000_000, hasAudio: true }]; return p; }
test('a batch is atomic and stale revisions cannot commit', () => {
  const original = sample();
  assert.throws(() => applyBatch(original, { projectId: original.id, revision: 0, requestId: id(), operations: [{ type: 'addClip', assetId: 'a', track: 'video' }, { type: 'setGain', clipId: 'bad', gain: .5 }] }), /no longer exists/);
  assert.equal(original.video.length, 0);
  const edited = applyBatch(original, { projectId: original.id, revision: 0, requestId: id(), operations: [{ type: 'addClip', assetId: 'a', track: 'video' }] });
  assert.equal(projectDurationUs(edited), 3_000_000);
  assert.throws(() => applyBatch(edited, { projectId: edited.id, revision: 0, requestId: id(), operations: [{ type: 'addClip', assetId: 'a', track: 'video' }] }), /changed/);
});
test('unused imports can be removed without changing clips or the source file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'editor-asset-test-'));
  const path = join(dir, 'unused.mp4');
  writeFileSync(path, 'untouched source');
  try {
    const original = sample();
    original.assets.push({ ...original.assets[0], id: 'unused', path });
    const edited = applyBatch(original, { projectId: original.id, revision: original.revision, requestId: id(), operations: [{ type: 'removeAsset', assetId: 'unused' }] });
    assert.deepEqual(edited.assets.map(a => a.id), ['a']);
    assert.equal(original.assets.length, 2);
    assert.equal(edited.revision, original.revision + 1);
    assert.equal(existsSync(path), true);
    const withClip = applyBatch(edited, { projectId: edited.id, revision: edited.revision, requestId: id(), operations: [{ type: 'addClip', assetId: 'a', track: 'video' }] });
    assert.throws(() => applyBatch(withClip, { projectId: withClip.id, revision: withClip.revision, requestId: id(), operations: [{ type: 'removeAsset', assetId: 'a' }] }), /Remove clips using this media/);
    assert.equal(withClip.assets.length, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('indirect ripple cannot displace a protected clip', () => {
  let p = sample(); p = applyBatch(p, { projectId: p.id, revision: 0, requestId: id(), operations: [{ type: 'addClip', assetId: 'a', track: 'video' }, { type: 'addClip', assetId: 'a', track: 'video' }] });
  p = setUserLock(p, p.video[1].id, 'position', true);
  assert.throws(() => applyBatch(p, { projectId: p.id, revision: p.revision, requestId: id(), operations: [{ type: 'trimClip', clipId: p.video[0].id, sourceInUs: 1_000_000, sourceOutUs: 3_000_000 }] }), /Position/);
  assert.equal(p.video[1].startUs, 3_000_000);
});
test('removing a clip repacks video and respects content and position protection', () => {
  let p = sample();
  p = applyBatch(p, { projectId: p.id, revision: p.revision, requestId: id(), operations: [
    { type: 'addClip', assetId: 'a', track: 'video' }, { type: 'addClip', assetId: 'a', track: 'video' }
  ] });
  const [first, second] = p.video;
  const protectedClip = setUserLock(p, first.id, 'content', true);
  assert.throws(() => applyBatch(protectedClip, { projectId: protectedClip.id, revision: protectedClip.revision, requestId: id(), operations: [{ type: 'removeClip', clipId: first.id }] }), /Protected clip/);
  const protectedPosition = setUserLock(p, second.id, 'position', true);
  assert.throws(() => applyBatch(protectedPosition, { projectId: protectedPosition.id, revision: protectedPosition.revision, requestId: id(), operations: [{ type: 'removeClip', clipId: first.id }] }), /Position/);
  const removed = applyBatch(p, { projectId: p.id, revision: p.revision, requestId: id(), operations: [{ type: 'removeClip', clipId: first.id }] });
  assert.deepEqual(removed.video.map(c => [c.id, c.startUs]), [[second.id, 0]]);
  assert.equal(projectDurationUs(removed), 3_000_000);
  assert.equal(p.video.length, 2);
});
test('saved project preserves exact timing and locks', () => {
  let p = sample(); p = applyBatch(p, { projectId: p.id, revision: 0, requestId: id(), operations: [{ type: 'addClip', assetId: 'a', track: 'video' }] });
  p = setUserLock(p, p.video[0].id, 'content', true);
  assert.deepEqual(validateProject(JSON.parse(JSON.stringify(p))), p);
});
test('splitting a faded clip caps the right fade to its duration', () => {
  let p = sample();
  p = applyBatch(p, { projectId: p.id, revision: p.revision, requestId: id(), operations: [{ type: 'addClip', assetId: 'a', track: 'video' }] });
  p = applyBatch(p, { projectId: p.id, revision: p.revision, requestId: id(), operations: [
    { type: 'setFade', clipId: p.video[0].id, fadeOutUs: 2_000_000 },
    { type: 'splitClip', clipId: p.video[0].id, atUs: 2_000_000 }
  ] });
  assert.equal(p.video[1].fadeOutUs, 1_000_000);
  assert.deepEqual(validateProject(JSON.parse(JSON.stringify(p))), p);
});
test('saved project rejects malformed clip controls before rendering', () => {
  let p = sample(); p = applyBatch(p, { projectId: p.id, revision: 0, requestId: id(), operations: [{ type: 'addClip', assetId: 'a', track: 'video' }] });
  for (const [field, value, error] of [
    ['gain', undefined, /gain/], ['gain', Infinity, /gain/], ['fadeOutUs', 4_000_000, /fade/],
    ['fit', 'stretch', /framing/], ['locks', undefined, /protection/], ['locks', { gain: 'yes' }, /protection/]
  ]) {
    const corrupted = structuredClone(p);
    corrupted.video[0][field] = value;
    assert.throws(() => validateProject(corrupted), error);
  }
});
test('opened projects reject corrupt assets, track placement, gaps, and duplicate IDs', () => {
  let p = sample();
  p = applyBatch(p, { projectId: p.id, revision: p.revision, requestId: id(), operations: [
    { type: 'addClip', assetId: 'a', track: 'video' }, { type: 'addClip', assetId: 'a', track: 'video' }
  ] });
  for (const [mutate, error] of [
    [q => { q.assets[0].durationUs = -1; }, /Invalid project asset/],
    [q => { q.assets[0].kind = 'audio'; }, /wrong track/],
    [q => { q.video[1].startUs += 1000; }, /contiguous/],
    [q => { q.video[1].id = q.video[0].id; }, /Duplicate or invalid clip ID/],
    [q => { q.assets.push({ ...q.assets[0] }); }, /Duplicate asset ID/]
  ]) {
    const corrupted = structuredClone(p);
    mutate(corrupted);
    assert.throws(() => validateProject(corrupted), error);
  }
  assert.deepEqual(validateProject(JSON.parse(JSON.stringify(p))), p);
});
test('renderer rejects unsupported video gaps before touching media', async () => {
  let p = sample();
  p = applyBatch(p, { projectId: p.id, revision: p.revision, requestId: id(), operations: [{ type: 'addClip', assetId: 'a', track: 'video' }] });
  p.video[0].startUs = 1_000_000;
  await assert.rejects(render(p, { width: 1280, height: 720, output: '/unused-render.mp4' }), /contiguous/);
});
test('stored AI token is reused only for the same endpoint origin', () => {
  const previous = { endpoint: 'https://provider.example/v1', token: 'private-A' };
  assert.equal(tokenForEndpoint('https://provider.example/v2', '', previous), 'private-A');
  assert.equal(tokenForEndpoint('https://other.example/v1', '', previous), undefined);
  assert.equal(tokenForEndpoint('https://provider.example:8443/v1', '', previous), undefined);
  assert.equal(tokenForEndpoint('https://other.example/v1', 'private-B', previous), 'private-B');
  assert.equal(tokenForEndpoint('https://other.example/v1', '', { endpoint: 'not a URL', token: 'private-A' }), undefined);
});
test('filter graph file option matches release and nightly FFmpeg builds', () => {
  assert.equal(graphOptionForVersion('ffmpeg version 6.1.1 Copyright'), '-filter_complex_script');
  assert.equal(graphOptionForVersion('ffmpeg version n6.1 Copyright'), '-filter_complex_script');
  assert.equal(graphOptionForVersion('ffmpeg version 9.0.2-full_build Copyright'), '-/filter_complex');
  assert.equal(graphOptionForVersion('ffmpeg version N-118000-gabc123 Copyright'), '-/filter_complex');
  assert.throws(() => graphOptionForVersion('unexpected version output'), /identify/);
});
