const test = require('node:test');
const assert = require('node:assert/strict');
const { newProject, applyBatch, setUserLock, projectDurationUs, validateProject } = require('../dist-main/src/shared/project.js');
const { tokenForEndpoint } = require('../dist-main/src/shared/connection.js');
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
test('indirect ripple cannot displace a protected clip', () => {
  let p = sample(); p = applyBatch(p, { projectId: p.id, revision: 0, requestId: id(), operations: [{ type: 'addClip', assetId: 'a', track: 'video' }, { type: 'addClip', assetId: 'a', track: 'video' }] });
  p = setUserLock(p, p.video[1].id, 'position', true);
  assert.throws(() => applyBatch(p, { projectId: p.id, revision: p.revision, requestId: id(), operations: [{ type: 'trimClip', clipId: p.video[0].id, sourceInUs: 1_000_000, sourceOutUs: 3_000_000 }] }), /Position/);
  assert.equal(p.video[1].startUs, 3_000_000);
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
test('stored AI token is reused only for the same endpoint origin', () => {
  const previous = { endpoint: 'https://provider.example/v1', token: 'private-A' };
  assert.equal(tokenForEndpoint('https://provider.example/v2', '', previous), 'private-A');
  assert.equal(tokenForEndpoint('https://other.example/v1', '', previous), undefined);
  assert.equal(tokenForEndpoint('https://provider.example:8443/v1', '', previous), undefined);
  assert.equal(tokenForEndpoint('https://other.example/v1', 'private-B', previous), 'private-B');
  assert.equal(tokenForEndpoint('https://other.example/v1', '', { endpoint: 'not a URL', token: 'private-A' }), undefined);
});
