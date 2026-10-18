const test = require('node:test');
const assert = require('node:assert/strict');
const { newProject, applyBatch, setUserLock, projectDurationUs, validateProject } = require('../dist-main/src/shared/project.js');
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
