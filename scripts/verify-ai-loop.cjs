const assert = require('node:assert/strict');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { mkdirSync, readdirSync, rmSync, statSync } = require('node:fs');
const { join } = require('node:path');

const root = join(__dirname, '..');
const project = join(root, 'local', 'fixture', 'test-project.ave.json');
const profile = join(root, 'local', 'ai-loop-profile');
const previewRoot = join(profile, 'temp');
const port = 9226;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
mkdirSync(profile, { recursive: true });
rmSync(previewRoot, { recursive: true, force: true });
mkdirSync(previewRoot, { recursive: true });
function previewFiles() {
  return readdirSync(previewRoot).filter(name => name.startsWith('ai-video-editor-'))
    .flatMap(name => {
      try {
        return readdirSync(join(previewRoot, name), { recursive: true }).filter(file => {
          try { return statSync(join(previewRoot, name, file)).isFile(); }
          catch (error) { if (error.code === 'ENOENT') return false; throw error; }
        });
      } catch (error) { if (error.code === 'ENOENT') return []; throw error; }
    });
}
let requestCount = 0;
let signalSwappedRequest, releaseSwappedResponse;
const swappedRequest = new Promise(resolve => { signalSwappedRequest = resolve; });
const swappedResponse = new Promise(resolve => { releaseSwappedResponse = resolve; });
const server = http.createServer(async (request, response) => {
  if (request.method !== 'POST' || request.url !== '/v1/chat/completions') {
    response.writeHead(404); response.end(); return;
  }
  try {
    let body = '';
    for await (const chunk of request) {
      body += chunk;
      if (body.length > 100_000) throw new Error('Request too large');
    }
    const input = JSON.parse(body);
    const prompt = JSON.parse(input.messages[1].content);
    assert.equal(input.model, 'smoke-model');
    assert.equal(request.headers.authorization, undefined);
    assert.ok(!body.includes(project), 'AI request included a local project path');
    const swapped = prompt.instruction.includes('switch project');
    const clip = prompt.project.audio[0];
    assert.ok(swapped || clip, 'Fixture has no audio clip');
    const invalid = prompt.instruction.includes('invalid');
    requestCount++;
    if (swapped) { signalSwappedRequest(); await swappedResponse; }
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify({
      operations: [swapped ? { type: 'setCanvas', width: 720, height: 1280 } : { type: 'setGain', clipId: clip.id, gain: invalid ? 99 : 0.35 }]
    }) } }] }));
  } catch (error) {
    response.writeHead(500); response.end(String(error));
  }
});

async function evaluate(ws, expression, id) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Electron AI loop timed out')), 30000);
    const onMessage = event => {
      const message = JSON.parse(event.data);
      if (message.id !== id) return;
      clearTimeout(timeout); ws.removeEventListener('message', onMessage);
      if (message.result?.exceptionDetails) reject(new Error(message.result.exceptionDetails.text));
      else resolve(message.result?.result?.value);
    };
    ws.addEventListener('message', onMessage);
    ws.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } }));
  });
}

(async () => {
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const modelPort = server.address().port;
  const executable = require('electron');
  const child = spawn(executable, ['.', `--remote-debugging-port=${port}`, `--project=${project}`], {
    cwd: root, windowsHide: true, stdio: 'ignore',
    env: {
      ...process.env, APPDATA: profile, XDG_CONFIG_HOME: profile, TMP: previewRoot, TEMP: previewRoot, TMPDIR: previewRoot,
      PATH: process.platform === 'win32' ? `${join(root, 'vendor', 'ffmpeg', 'win32')};${process.env.PATH}` : process.env.PATH
    }
  });
  try {
    let target;
    for (let i = 0; i < 60; i++) {
      try {
        const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
        target = pages.find(page => page.type === 'page' && page.webSocketDebuggerUrl);
        if (target) break;
      } catch { /* Electron has not opened the window yet. */ }
      await delay(200);
    }
    assert.ok(target, 'Electron window did not open');
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
    try {
      const result = await evaluate(ws, `(async () => {
        for (let i = 0; i < 100 && !window.editor; i++) await new Promise(resolve => setTimeout(resolve, 100));
        if (!window.editor) throw new Error('Editor preload did not initialize');
        const initial = await window.editor.state();
        const before = initial.project;
        await window.editor.setConnection({ endpoint: 'http://127.0.0.1:${modelPort}/v1', model: 'smoke-model', allowUnbounded: false });
        await window.editor.setOffline(true);
        let invalidRejected = false;
        try { await window.editor.propose('Return an invalid gain'); } catch { invalidRejected = true; }
        const proposal = await window.editor.propose('Lower the supplied music');
        const staged = await window.editor.state();
        const comparison = await window.editor.reviewPreview(proposal);
        const accepted = await window.editor.edit(proposal);
        const repeated = await window.editor.edit(proposal);
        await window.editor.newProject();
        window.__staleProposal = window.editor.propose('switch project during request');
        return {
          invalidRejected,
          stagedGain: staged.project.audio[0].gain,
          beforeGain: before.audio[0].gain,
          proposalCount: proposal.operations.length,
          comparisonReady: comparison.before.startsWith('editor-media://') && comparison.after.startsWith('editor-media://'),
          acceptedGain: accepted.project.audio[0].gain,
          revisionDelta: repeated.project.revision - before.revision
        };
      })()`, 1);
      let barrierTimeout;
      try {
        await Promise.race([
          swappedRequest,
          new Promise((_, reject) => { barrierTimeout = setTimeout(() => reject(new Error('Project-switch request never reached the model stub')), 10000); })
        ]);
      } finally { clearTimeout(barrierTimeout); }
      for (let i = 0; i < 30 && previewFiles().length; i++) await delay(50);
      assert.deepEqual(previewFiles(), [], 'Superseded before/after preview files were not removed');
      await evaluate(ws, 'window.editor.newProject()', 2);
      releaseSwappedResponse();
      const switched = await evaluate(ws, `window.__staleProposal.then(
        () => ({ rejected: false }),
        error => ({ rejected: String(error).includes('another project'), message: String(error) })
      )`, 3);
      assert.equal(switched.rejected, true, JSON.stringify(switched));
      assert.deepEqual(result, { invalidRejected: true, stagedGain: 0.2, beforeGain: 0.2, proposalCount: 1, comparisonReady: true, acceptedGain: 0.35, revisionDelta: 1 });
      assert.equal(requestCount, 3);
      const stopped = new Promise(resolve => child.once('close', resolve));
      await evaluate(ws, "window.close(); 'closing'", 4);
      let closeTimeout;
      try {
        await Promise.race([stopped, new Promise((_, reject) => { closeTimeout = setTimeout(() => reject(new Error('Editor did not close after window.close()')), 5000); })]);
      } finally { clearTimeout(closeTimeout); }
      assert.deepEqual(readdirSync(previewRoot).filter(name => name.startsWith('ai-video-editor-')), [], 'Preview directory survived graceful quit');
      console.log(JSON.stringify({ ...result, switchedProjectRejected: true, previewFilesAfterEdit: 0, previewDirectoryRemoved: true, localRequests: requestCount }));
    } finally { ws.close(); }
  } finally { releaseSwappedResponse(); child.kill(); }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
