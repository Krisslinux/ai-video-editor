const assert = require('node:assert/strict');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { mkdirSync } = require('node:fs');
const { join } = require('node:path');

const root = join(__dirname, '..');
const project = join(root, 'local', 'fixture', 'test-project.ave.json');
const profile = join(root, 'local', 'ai-loop-profile');
const port = 9226;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
mkdirSync(profile, { recursive: true });
let requestCount = 0;
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
    if (swapped) await delay(600);
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
      ...process.env, APPDATA: profile, XDG_CONFIG_HOME: profile,
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
        const stale = window.editor.propose('switch project during request');
        await new Promise(resolve => setTimeout(resolve, 150));
        await window.editor.newProject();
        let switchedProjectRejected = false;
        try { await stale; } catch (error) { switchedProjectRejected = String(error).includes('another project'); }
        return {
          invalidRejected,
          stagedGain: staged.project.audio[0].gain,
          beforeGain: before.audio[0].gain,
          proposalCount: proposal.operations.length,
          comparisonReady: comparison.before.startsWith('editor-media://') && comparison.after.startsWith('editor-media://'),
          acceptedGain: accepted.project.audio[0].gain,
          revisionDelta: repeated.project.revision - before.revision,
          switchedProjectRejected
        };
      })()`, 1);
      assert.deepEqual(result, { invalidRejected: true, stagedGain: 0.2, beforeGain: 0.2, proposalCount: 1, comparisonReady: true, acceptedGain: 0.35, revisionDelta: 1, switchedProjectRejected: true });
      assert.equal(requestCount, 3);
      console.log(JSON.stringify({ ...result, localRequests: requestCount }));
    } finally { ws.close(); }
  } finally { child.kill(); }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
