export const SCHEMA_VERSION = 1;
export const TICKS_PER_SECOND = 1_000_000;
export type AssetKind = 'video' | 'audio';
export type Asset = { id: string; path: string; name: string; kind: AssetKind; durationUs: number; width?: number; height?: number; frameRate?: string; sampleRate?: number; channels?: number; hasAudio: boolean };
export type Clip = { id: string; assetId: string; sourceInUs: number; sourceOutUs: number; startUs: number; gain: number; fadeOutUs: number; fit: 'fit' | 'fill'; locks: { content?: boolean; timing?: boolean; position?: boolean; gain?: boolean } };
export type Project = { schemaVersion: 1; id: string; revision: number; name: string; canvas: { width: number; height: number; frameRate: 30 }; assets: Asset[]; video: Clip[]; audio: Clip[] };
export type Operation =
  | { type: 'addClip'; assetId: string; track: 'video' | 'audio'; startUs?: number }
  | { type: 'trimClip'; clipId: string; sourceInUs: number; sourceOutUs: number }
  | { type: 'splitClip'; clipId: string; atUs: number }
  | { type: 'moveClip'; clipId: string; index: number }
  | { type: 'setGain'; clipId: string; gain: number }
  | { type: 'setFade'; clipId: string; fadeOutUs: number }
  | { type: 'setFit'; clipId: string; fit: 'fit' | 'fill' }
  | { type: 'setCanvas'; width: number; height: number };
export type EditBatch = { projectId: string; revision: number; operations: Operation[]; requestId: string };

export function newProject(): Project {
  return { schemaVersion: 1, id: crypto.randomUUID(), revision: 0, name: 'Untitled project', canvas: { width: 1280, height: 720, frameRate: 30 }, assets: [], video: [], audio: [] };
}
export const durationUs = (clip: Clip) => clip.sourceOutUs - clip.sourceInUs;
export const projectDurationUs = (project: Project) => project.video.reduce((end, clip) => Math.max(end, clip.startUs + durationUs(clip)), 0);
export const seconds = (us: number) => (us / TICKS_PER_SECOND).toFixed(2);
function validTime(us: unknown): us is number { return typeof us === 'number' && Number.isSafeInteger(us) && us >= 0; }
function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
function findClip(project: Project, id: string): { track: 'video' | 'audio'; clip: Clip; index: number } {
  for (const track of ['video', 'audio'] as const) {
    const index = project[track].findIndex(c => c.id === id);
    if (index >= 0) return { track, clip: project[track][index], index };
  }
  throw new Error(`Clip ${id} no longer exists`);
}
function repackVideo(project: Project) {
  let at = 0;
  for (const clip of project.video) { clip.startUs = at; at += durationUs(clip); }
}
function verifyLocks(before: Project, after: Project) {
  for (const original of [...before.video, ...before.audio]) {
    const updated = [...after.video, ...after.audio].find(c => c.id === original.id);
    const lock = original.locks;
    if (!updated) assert(!Object.values(lock).some(Boolean), `Protected clip ${original.id} cannot be removed`);
    if (!updated) continue;
    assert(JSON.stringify(lock) === JSON.stringify(updated.locks), `Protection on ${original.id} cannot change in an edit batch`);
    if (lock.content) assert(updated.assetId === original.assetId && updated.sourceInUs === original.sourceInUs && updated.sourceOutUs === original.sourceOutUs, `Source content of ${original.id} is protected`);
    if (lock.timing) assert(durationUs(updated) === durationUs(original), `Duration of ${original.id} is protected`);
    if (lock.position) assert(updated.startUs === original.startUs, `Position of ${original.id} is protected`);
    if (lock.gain) assert(updated.gain === original.gain, `Gain of ${original.id} is protected`);
  }
}
export function applyBatch(project: Project, batch: EditBatch): Project {
  assert(project.schemaVersion === SCHEMA_VERSION, 'Unsupported project version');
  assert(batch.projectId === project.id, 'Proposal belongs to another project');
  assert(batch.revision === project.revision, 'Project changed while this edit was prepared');
  assert(Array.isArray(batch.operations) && batch.operations.length > 0 && batch.operations.length <= 30, 'Edit batch must contain 1–30 operations');
  assert(typeof batch.requestId === 'string' && batch.requestId.length > 0, 'Missing request ID');
  const next = structuredClone(project);
  for (const op of batch.operations) {
    assert(op && typeof op === 'object' && typeof op.type === 'string', 'Invalid operation');
    switch (op.type) {
      case 'addClip': {
        const asset = next.assets.find(a => a.id === op.assetId);
        assert(asset, 'Unknown asset');
        assert(op.track === asset.kind, 'Asset is on the wrong track');
        const startUs = op.track === 'video' ? projectDurationUs(next) : (op.startUs ?? 0);
        assert(validTime(startUs), 'Invalid clip placement');
        next[op.track].push({ id: crypto.randomUUID(), assetId: asset.id, sourceInUs: 0, sourceOutUs: asset.durationUs, startUs, gain: op.track === 'audio' ? 0.35 : 1, fadeOutUs: 0, fit: 'fit', locks: {} });
        break;
      }
      case 'trimClip': {
        const { clip, track } = findClip(next, op.clipId);
        const asset = next.assets.find(a => a.id === clip.assetId)!;
        assert(validTime(op.sourceInUs) && validTime(op.sourceOutUs) && op.sourceOutUs > op.sourceInUs && op.sourceOutUs <= asset.durationUs, 'Trim is outside the source');
        clip.sourceInUs = op.sourceInUs; clip.sourceOutUs = op.sourceOutUs; clip.fadeOutUs = Math.min(clip.fadeOutUs, durationUs(clip));
        if (track === 'video') repackVideo(next);
        break;
      }
      case 'splitClip': {
        const { track, clip, index } = findClip(next, op.clipId);
        assert(validTime(op.atUs) && op.atUs > 0 && op.atUs < durationUs(clip), 'Split must be inside the clip');
        const right = { ...structuredClone(clip), id: crypto.randomUUID(), sourceInUs: clip.sourceInUs + op.atUs, startUs: clip.startUs + op.atUs, fadeOutUs: Math.min(clip.fadeOutUs, durationUs(clip) - op.atUs) };
        clip.sourceOutUs = right.sourceInUs; clip.fadeOutUs = 0;
        next[track].splice(index + 1, 0, right);
        break;
      }
      case 'moveClip': {
        const { track, index } = findClip(next, op.clipId);
        assert(track === 'video' && Number.isSafeInteger(op.index) && op.index >= 0 && op.index < next.video.length, 'Invalid video position');
        const [clip] = next.video.splice(index, 1); next.video.splice(op.index, 0, clip); repackVideo(next);
        break;
      }
      case 'setGain': {
        assert(typeof op.gain === 'number' && Number.isFinite(op.gain) && op.gain >= 0 && op.gain <= 2, 'Gain must be 0–2');
        findClip(next, op.clipId).clip.gain = op.gain; break;
      }
      case 'setFade': {
        const clip = findClip(next, op.clipId).clip;
        assert(validTime(op.fadeOutUs) && op.fadeOutUs <= durationUs(clip), 'Fade exceeds clip duration'); clip.fadeOutUs = op.fadeOutUs; break;
      }
      case 'setFit': {
        assert(op.fit === 'fit' || op.fit === 'fill', 'Invalid framing'); findClip(next, op.clipId).clip.fit = op.fit; break;
      }
      case 'setCanvas': {
        assert(Number.isSafeInteger(op.width) && Number.isSafeInteger(op.height) && op.width >= 256 && op.height >= 256 && op.width <= 3840 && op.height <= 3840 && op.width % 2 === 0 && op.height % 2 === 0, 'Canvas dimensions must be even, between 256 and 3840');
        next.canvas.width = op.width; next.canvas.height = op.height; break;
      }
      default: throw new Error(`Unsupported operation: ${(op as { type: string }).type}`);
    }
  }
  verifyLocks(project, next);
  next.revision++;
  return next;
}
export function setUserLock(project: Project, clipId: string, property: keyof Clip['locks'], enabled: boolean): Project {
  assert(['content', 'timing', 'position', 'gain'].includes(property), 'Invalid protection');
  const next = structuredClone(project); findClip(next, clipId).clip.locks[property] = enabled; next.revision++; return next;
}
export function validateProject(input: unknown): Project {
  assert(input && typeof input === 'object', 'Invalid project file');
  const p = input as Project;
  assert(p.schemaVersion === 1, 'Unsupported project version; this file was not changed');
  assert(Array.isArray(p.assets) && Array.isArray(p.video) && Array.isArray(p.audio), 'Invalid project tracks');
  assert(p.assets.length < 10000 && p.video.length < 10000 && p.audio.length < 10000, 'Project too large');
  assert(Number.isSafeInteger(p.revision) && p.revision >= 0, 'Invalid project revision');
  assert(Number.isSafeInteger(p.canvas.width) && Number.isSafeInteger(p.canvas.height), 'Invalid canvas');
  for (const clip of [...p.video, ...p.audio]) {
    assert(p.assets.some(a => a.id === clip.assetId), 'Project has an unknown asset');
    assert(validTime(clip.startUs) && validTime(clip.sourceInUs) && validTime(clip.sourceOutUs) && clip.sourceOutUs > clip.sourceInUs, 'Invalid clip time');
    assert(clip.sourceOutUs <= p.assets.find(a => a.id === clip.assetId)!.durationUs, 'Clip exceeds source duration');
    assert(typeof clip.gain === 'number' && Number.isFinite(clip.gain) && clip.gain >= 0 && clip.gain <= 2, 'Invalid clip gain');
    assert(validTime(clip.fadeOutUs) && clip.fadeOutUs <= durationUs(clip), 'Invalid clip fade');
    assert(clip.fit === 'fit' || clip.fit === 'fill', 'Invalid clip framing');
    assert(clip.locks !== null && typeof clip.locks === 'object' && !Array.isArray(clip.locks) && Object.entries(clip.locks).every(([key, value]) => ['content', 'timing', 'position', 'gain'].includes(key) && typeof value === 'boolean'), 'Invalid clip protection');
  }
  applyBatch(p, { projectId: p.id, revision: p.revision, operations: [{ type: 'setCanvas', width: p.canvas.width, height: p.canvas.height }], requestId: 'validate' });
  return p;
}
