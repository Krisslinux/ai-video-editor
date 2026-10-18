const http = require('node:http');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const { join } = require('node:path');

const root = join(__dirname, '..');
const received = [];
const server = http.createServer((request, response) => {
  const chunks = [];
  let size = 0;
  request.on('data', chunk => {
    size += chunk.length;
    if (size > 1_000_000) request.destroy();
    else chunks.push(chunk);
  });
  request.on('end', () => {
    received.push({ path: request.url, body: Buffer.concat(chunks).toString('utf8') });
    response.writeHead(200); response.end('{}');
  });
});

(async () => {
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  const executable = require('electron');
  const child = spawn(executable, ['.', '--verify-telemetry'], {
    cwd: root, windowsHide: true,
    env: { ...process.env, AI_VIDEO_EDITOR_SENTRY_DSN: `http://public@127.0.0.1:${port}/1` }
  });
  const output = [], errors = [];
  child.stdout.on('data', chunk => output.push(chunk.toString()));
  child.stderr.on('data', chunk => errors.push(chunk.toString()));
  const timer = setTimeout(() => child.kill(), 15000);
  const exitCode = await new Promise((resolve, reject) => { child.once('error', reject); child.once('close', resolve); });
  clearTimeout(timer);
  assert.equal(exitCode, 0, `Electron diagnostic failed: ${errors.join('').slice(-1000)}`);
  assert.match(output.join(''), /"diagnosticFlushed":true,"offlineReportingStopped":true/);
  assert.equal(received.length, 1, `Expected one Sentry envelope, received ${received.length}`);
  assert.match(received[0].path, /^\/api\/1\/envelope\//);
  assert.match(received[0].body, /Editor diagnostic/);
  for (const secret of ['PRIVATE_MEDIA_PATH_SENTINEL', 'PRIVATE_TOKEN_SENTINEL', 'PRIVATE_USER_SENTINEL', 'OPT_OUT_SENTINEL', 'OFFLINE_SENTINEL']) {
    assert.ok(!received[0].body.includes(secret), `Diagnostic envelope included ${secret}`);
  }
  console.log(JSON.stringify({ envelopes: received.length, redacted: true, optOutAndOfflineBlocked: true }));
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
