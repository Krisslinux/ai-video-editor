const assert = require('node:assert/strict');
const { createHash, randomUUID } = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');
const { mkdirSync, readFileSync, writeFileSync, rmSync, symlinkSync } = require('node:fs');
const { join } = require('node:path');
const { newProject, applyBatch } = require('../dist-main/src/shared/project.js');
const { probe } = require('../dist-main/electron/media.js');

const root = join(__dirname, '..'), dir = join(root, 'local', 'source-protection');
mkdirSync(dir, { recursive: true });
const source = join(dir, 'source.mp4'), projectPath = join(dir, 'project.ave.json');
const hash = () => createHash('sha256').update(readFileSync(source)).digest('hex');

(async () => {
  const fixture = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-f', 'lavfi', '-i', 'color=c=blue:s=160x90:r=30:d=1', '-c:v', 'mpeg4', source]);
  assert.equal(fixture.status, 0, fixture.stderr?.toString());
  let project = newProject();
  const asset = { id: randomUUID(), path: source, name: 'source.mp4', ...await probe(source) };
  project.assets.push(asset);
  project = applyBatch(project, { projectId: project.id, revision: project.revision, requestId: randomUUID(), operations: [{ type: 'addClip', assetId: asset.id, track: 'video' }] });
  writeFileSync(projectPath, JSON.stringify(project));
  async function expectRejected(target) {
    const before = hash();
    const child = spawn(require('electron'), ['.', `--project=${projectPath}`, `--export=${target}`], { cwd: root, windowsHide: true });
    let stderr = '';
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });
    const timer = setTimeout(() => child.kill(), 20000);
    const exitCode = await new Promise((resolve, reject) => { child.once('error', reject); child.once('close', resolve); });
    clearTimeout(timer);
    assert.equal(exitCode, 1, `Expected rejected export, got exit ${exitCode}: ${stderr.slice(-1000)}`);
    assert.match(stderr, /export path.*imported source file/i);
    assert.equal(hash(), before, 'Export changed the imported source');
  }
  await expectRejected(process.platform === 'win32' ? source.toUpperCase() : source);
  const alias = join(dir, 'imported-alias.mp4');
  rmSync(alias, { force: true });
  let symlinkChecked = false;
  try { symlinkSync(source, alias, 'file'); symlinkChecked = true; }
  catch (error) { if (!['EPERM', 'EACCES'].includes(error.code)) throw error; }
  if (symlinkChecked) {
    project.assets[0].path = alias;
    writeFileSync(projectPath, JSON.stringify(project));
    await expectRejected(source);
  }
  console.log(JSON.stringify({ sourceIntact: true, caseInsensitivePathRejected: process.platform === 'win32', symlinkAliasRejected: symlinkChecked }));
})().catch(error => { console.error(error); process.exitCode = 1; });
