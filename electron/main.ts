import { app, BrowserWindow, dialog, ipcMain, net, protocol, safeStorage, IpcMainInvokeEvent } from 'electron';
import { readFile, rename, writeFile, mkdtemp, rm, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { Asset, EditBatch, Operation, Project, applyBatch, newProject, projectDurationUs, setUserLock, validateProject } from '../src/shared/project';
import { discoverMediaTools, probe, qualityReport, render, runTool } from './media';
import * as Sentry from '@sentry/electron/main';

protocol.registerSchemesAsPrivileged([{ scheme: 'editor-media', privileges: { secure: true, standard: true, stream: true, supportFetchAPI: true } }]);
let window: BrowserWindow;
let project = newProject(), projectPath: string | undefined;
let undoStack: Project[] = [], redoStack: Project[] = [];
let previewFile: string | undefined, previewRevision = -1;
let proposalFile: string | undefined, proposalId: string | undefined;
let activeRender: AbortController | undefined;
let activeAi: AbortController | undefined;
let previewDir: string;
const processed = new Set<string>();
type Connection = { endpoint: string; model: string; token?: string; allowUnbounded: boolean };
type Settings = { offline: boolean; telemetry: boolean; connection?: Connection };
let settings: Settings = { offline: false, telemetry: false };
let telemetryActive = false;
const settingsPath = () => join(app.getPath('userData'), 'settings.json');
const secureTokenStorage = () => safeStorage.isEncryptionAvailable() && (process.platform !== 'linux' || safeStorage.getSelectedStorageBackend() !== 'basic_text');

// The Electron SDK registers its IPC scheme before app ready. Read only the two
// reporting switches here; credentials and the rest of settings load later.
if (!process.argv.includes('--verify-telemetry')) {
  try {
    const stored = JSON.parse(readFileSync(settingsPath(), 'utf8')) as Partial<Settings>;
    settings.offline = Boolean(stored.offline);
    settings.telemetry = Boolean(stored.telemetry);
  } catch { /* First run or unreadable settings. */ }
}
if (process.env.AI_VIDEO_EDITOR_SENTRY_DSN) {
  telemetryActive = settings.telemetry && !settings.offline;
  Sentry.init({
    dsn: process.env.AI_VIDEO_EDITOR_SENTRY_DSN,
    enabled: telemetryActive,
    defaultIntegrations: false,
    sendClientReports: false,
    tracesSampleRate: 0,
    beforeSend(event) {
      return { type: event.type, event_id: event.event_id, timestamp: event.timestamp, level: event.level, message: 'Editor diagnostic', tags: { category: 'opt-in-diagnostic' } };
    }
  });
}

function change(next: Project, requestId?: string) {
  next.revision = project.revision + 1;
  undoStack.push(project); if (undoStack.length > 100) undoStack.shift();
  redoStack = []; project = next; previewRevision = -1; proposalFile = undefined; proposalId = undefined;
  if (requestId) processed.add(requestId);
  return project;
}
function commit(batch: EditBatch) {
  if (processed.has(batch.requestId)) return project;
  return change(applyBatch(project, batch), batch.requestId);
}
function payload() { return { project, projectPath, previewUrl: previewRevision === project.revision ? `editor-media://preview/current?r=${project.revision}` : undefined }; }
function previewDimensions(canvas: Project['canvas']) {
  const scale = Math.min(1, 720 / Math.max(canvas.width, canvas.height));
  return { width: Math.max(2, Math.round(canvas.width * scale / 2) * 2), height: Math.max(2, Math.round(canvas.height * scale / 2) * 2) };
}
async function writeAtomic(path: string, value: string) {
  const temp = `${path}.${crypto.randomUUID()}.tmp`;
  await writeFile(temp, value, { mode: 0o600 }); await rename(temp, path);
}
async function saveSettings() {
  const connection = settings.connection;
  if (connection?.token && !secureTokenStorage()) throw new Error('Secure OS credential storage unavailable; token was not saved');
  const stored = { offline: settings.offline, telemetry: settings.telemetry, connection: connection && { ...connection, token: connection.token ? safeStorage.encryptString(connection.token).toString('base64') : undefined } };
  await writeAtomic(settingsPath(), JSON.stringify(stored));
}
async function loadSettings() {
  try {
    const stored = JSON.parse(await readFile(settingsPath(), 'utf8')) as Settings;
    settings.offline = Boolean(stored.offline);
    settings.telemetry = Boolean(stored.telemetry);
    if (stored.connection) {
      let token: string | undefined;
      try { if (stored.connection.token && secureTokenStorage()) token = safeStorage.decryptString(Buffer.from(stored.connection.token, 'base64')); } catch { /* Keep offline setting even if OS key changed. */ }
      settings.connection = { ...stored.connection, token };
    }
  } catch { /* First run or unreadable settings; defaults remain disabled. */ }
}
async function syncTelemetry() {
  const enabled = Boolean(settings.telemetry && !settings.offline && process.env.AI_VIDEO_EDITOR_SENTRY_DSN);
  if (enabled === telemetryActive) return;
  const client = Sentry.getClient();
  if (!client) throw new Error('Restart the editor with a configured Sentry DSN');
  if (!enabled) { telemetryActive = false; await Sentry.close(1000); return; }
  client.getOptions().enabled = true;
  telemetryActive = true;
}
function isLocal(endpoint: string) { const u = new URL(endpoint); return ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname); }
function checkConnection(endpoint: string) {
  const u = new URL(endpoint);
  if (!['http:', 'https:'].includes(u.protocol) || (u.protocol !== 'https:' && !isLocal(endpoint)) || u.username || u.password || u.search || u.hash) throw new Error('Use HTTPS, or HTTP on this computer, with no credentials in the URL');
  if (settings.offline && !isLocal(endpoint)) throw new Error('Offline mode blocks external AI connections');
}
function publicSettings() { return { offline: settings.offline, telemetry: settings.telemetry, telemetryAvailable: Boolean(process.env.AI_VIDEO_EDITOR_SENTRY_DSN), connection: settings.connection && { endpoint: settings.connection.endpoint, model: settings.connection.model, hasToken: Boolean(settings.connection.token), allowUnbounded: settings.connection.allowUnbounded } }; }
async function askModel(instruction: string): Promise<EditBatch> {
  if (activeAi) throw new Error('An AI request is already running');
  const c = settings.connection;
  if (!c) throw new Error('Configure a compatible AI endpoint in Settings');
  checkConnection(c.endpoint);
  if (!isLocal(c.endpoint) && !c.allowUnbounded) throw new Error('Remote request cost is unknown. Allow this unbounded request in Settings before dispatch.');
  if (instruction.length < 3 || instruction.length > 3000) throw new Error('Instruction must be 3–3000 characters');
  const revision = project.revision, requestId = crypto.randomUUID();
  const manifest = { revision, canvas: project.canvas, assets: project.assets.map(({ id, name, kind, durationUs }) => ({ id, name, kind, durationUs })), video: project.video, audio: project.audio };
  const controller = new AbortController(); activeAi = controller; const timeout = setTimeout(() => controller.abort(), 60000);
  try {
    const response = await fetch(c.endpoint.replace(/\/+$/, '') + '/chat/completions', {
      method: 'POST', redirect: 'error', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(c.token ? { Authorization: `Bearer ${c.token}` } : {}) },
      body: JSON.stringify({ model: c.model, temperature: 0, response_format: { type: 'json_object' }, messages: [
        { role: 'system', content: 'You edit a video project. Return ONLY a JSON object {"operations": [...]} using addClip, trimClip, splitClip, moveClip, setGain, setFade, setFit, setCanvas. Times are integer microseconds. Use only IDs in the project. Never set locks or invent assets. Preserve user-protected clips. Do not claim completion of unsupported requests.' },
        { role: 'user', content: JSON.stringify({ instruction, project: manifest }) }
      ] })
    });
    if (!response.ok) throw new Error(`AI endpoint returned HTTP ${response.status}`);
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    if (settings.connection !== c || settings.offline && !isLocal(c.endpoint)) throw new Error('AI connection changed before the proposal returned');
    const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? '') as { operations?: Operation[] };
    const batch = { projectId: project.id, revision, requestId, operations: parsed.operations ?? [] };
    applyBatch(project, batch); // Dry-run the same validator used by manual edits and commit.
    return batch;
  } finally { clearTimeout(timeout); if (activeAi === controller) activeAi = undefined; }
}
async function exportTo(output: string) {
  if (activeRender) throw new Error('A render is already running');
  if (qualityReport(project).some(issue => issue.startsWith('No video') || issue.startsWith('Missing media'))) throw new Error('Resolve missing video/media before export');
  const temp = join(dirname(output), `.${basename(output)}.${crypto.randomUUID()}.mp4`);
  activeRender = new AbortController(); const revision = project.revision;
  try {
    await render(project, { width: project.canvas.width, height: project.canvas.height, output: temp, signal: activeRender.signal });
    const meta = JSON.parse(await runTool('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=width,height,codec_type', '-of', 'json', temp]));
    const video = meta.streams?.find((s: { codec_type: string }) => s.codec_type === 'video');
    if (!video || video.width !== project.canvas.width || video.height !== project.canvas.height || Math.abs(Number(meta.format.duration) * 1e6 - projectDurationUs(project)) > 150_000) throw new Error('Rendered output did not pass dimension/duration verification');
    if (project.revision !== revision) throw new Error('Project changed while exporting; review and export again');
    await rename(temp, output); return { output, duration: Number(meta.format.duration), width: video.width, height: video.height };
  } finally { activeRender = undefined; await rm(temp, { force: true }); }
}

function handle(channel: string, fn: (event: IpcMainInvokeEvent, ...args: any[]) => unknown) {
  ipcMain.handle(channel, (event, ...args) => {
    if (!window || event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) throw new Error('Unauthorized renderer');
    return fn(event, ...args);
  });
}

app.whenReady().then(async () => {
  if (process.argv.includes('--verify-telemetry')) {
    try {
      const dsn = process.env.AI_VIDEO_EDITOR_SENTRY_DSN;
      if (!dsn || new URL(dsn).hostname !== '127.0.0.1') throw new Error('Telemetry smoke test requires a loopback DSN');
      Sentry.captureMessage('OPT_OUT_SENTINEL');
      settings.telemetry = true;
      await syncTelemetry();
      Sentry.setUser({ email: 'PRIVATE_USER_SENTINEL@example.test' });
      Sentry.captureMessage('PRIVATE_MEDIA_PATH_SENTINEL PRIVATE_TOKEN_SENTINEL');
      if (!await Sentry.flush(5000)) throw new Error('Diagnostic event did not flush');
      settings.offline = true;
      await syncTelemetry();
      Sentry.captureMessage('OFFLINE_SENTINEL');
      console.log(JSON.stringify({ diagnosticFlushed: true, offlineReportingStopped: !telemetryActive }));
    } catch (error) {
      console.error(`Telemetry smoke test failed: ${error instanceof Error ? error.message : 'unknown error'}`);
      process.exitCode = 1;
    }
    app.exit(process.exitCode || 0); return;
  }
  previewDir = await mkdtemp(join(tmpdir(), 'ai-video-editor-'));
  await loadSettings();
  await syncTelemetry();
  const initialPath = process.argv.find(arg => arg.startsWith('--project='))?.slice('--project='.length);
  if (initialPath) {
    try { project = validateProject(JSON.parse(await readFile(initialPath, 'utf8'))); projectPath = initialPath; }
    catch (error) { console.error(`Could not open startup project: ${error instanceof Error ? error.message : 'invalid file'}`); }
  }
  const exportPath = process.argv.find(arg => arg.startsWith('--export='))?.slice('--export='.length);
  if (exportPath) {
    try {
      if (!projectPath) throw new Error('Supply a valid --project path with --export');
      console.log(JSON.stringify(await exportTo(exportPath)));
    } catch (error) { console.error(`Export failed: ${error instanceof Error ? error.message : 'unknown error'}`); process.exitCode = 1; }
    app.quit(); return;
  }
  protocol.handle('editor-media', request => {
    const url = new URL(request.url);
    let file: string | undefined;
    if (url.hostname === 'asset') file = project.assets.find(a => a.id === url.pathname.slice(1))?.path;
    if (url.hostname === 'thumb' && project.assets.some(a => a.id === url.pathname.slice(1))) file = join(app.getPath('userData'), 'thumbnails', `${url.pathname.slice(1)}.jpg`);
    if (url.hostname === 'preview' && url.pathname === '/current' && previewRevision === project.revision) file = previewFile;
    if (url.hostname === 'proposal' && url.pathname.slice(1) === proposalId) file = proposalFile;
    return file && existsSync(file) ? net.fetch(pathToFileURL(file).toString(), { headers: request.headers }) : new Response('Not found', { status: 404 });
  });
  window = new BrowserWindow({ width: 1500, height: 940, minWidth: 980, minHeight: 680, backgroundColor: '#0f172a', webPreferences: { preload: join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, nodeIntegration: false } });
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  await window.loadFile(join(__dirname, '../../dist/index.html'));
});
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => { activeRender?.abort(); activeAi?.abort(); if (previewDir) void rm(previewDir, { recursive: true, force: true }); });

handle('state', () => payload());
handle('health', () => discoverMediaTools());
handle('new-project', () => { projectPath = undefined; undoStack = []; redoStack = []; project = newProject(); previewRevision = -1; processed.clear(); return payload(); });
handle('import-media', async () => {
  const result = await dialog.showOpenDialog(window, { properties: ['openFile', 'multiSelections'], filters: [{ name: 'Media', extensions: ['mp4', 'mov', 'mkv', 'webm', 'mp3', 'wav', 'm4a', 'aac'] }] });
  if (result.canceled) return payload();
  const next = structuredClone(project);
  const errors: string[] = [];
  await mkdir(join(app.getPath('userData'), 'thumbnails'), { recursive: true });
  for (const path of result.filePaths) {
    try {
      const metadata = await probe(path), id = crypto.randomUUID();
      next.assets.push({ id, path, name: basename(path), ...metadata });
      if (metadata.kind === 'video') await runTool('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', '0.5', '-i', path, '-frames:v', '1', '-vf', 'scale=160:-2', join(app.getPath('userData'), 'thumbnails', `${id}.jpg`)]).catch(() => '');
    }
    catch (error) { errors.push(`${basename(path)}: ${String(error)}`); }
  }
  if (next.assets.length !== project.assets.length) { next.revision++; change(next); }
  return { ...payload(), errors };
});
handle('edit', (_event, batch: EditBatch) => { commit(batch); return payload(); });
handle('lock', (_event, id: string, property: 'content' | 'timing' | 'position' | 'gain', value: boolean) => { change(setUserLock(project, id, property, value)); return payload(); });
handle('undo', () => { const p = undoStack.pop(); if (p) { redoStack.push(project); p.revision = project.revision + 1; project = p; previewRevision = -1; } return payload(); });
handle('redo', () => { const p = redoStack.pop(); if (p) { undoStack.push(project); p.revision = project.revision + 1; project = p; previewRevision = -1; } return payload(); });
handle('save', async (_event, as: boolean) => {
  if (!projectPath || as) { const result = await dialog.showSaveDialog(window, { defaultPath: `${project.name}.ave.json`, filters: [{ name: 'Editor project', extensions: ['json'] }] }); if (result.canceled || !result.filePath) return payload(); projectPath = result.filePath; }
  await writeAtomic(projectPath, JSON.stringify(project, null, 2)); return payload();
});
handle('open', async () => {
  const result = await dialog.showOpenDialog(window, { properties: ['openFile'], filters: [{ name: 'Editor project', extensions: ['json'] }] });
  if (result.canceled) return payload();
  const loaded = validateProject(JSON.parse(await readFile(result.filePaths[0], 'utf8')));
  project = loaded; projectPath = result.filePaths[0]; undoStack = []; redoStack = []; previewRevision = -1; processed.clear(); return payload();
});
handle('preview', async () => {
  if (activeRender) throw new Error('A render is already running');
  const revision = project.revision, output = join(previewDir, `preview-${revision}-${crypto.randomUUID()}.mp4`);
  activeRender = new AbortController();
  try {
    await render(project, { ...previewDimensions(project.canvas), output, signal: activeRender.signal });
    if (project.revision !== revision) throw new Error('Project changed during preview; render again');
    previewFile = output; previewRevision = revision; return payload();
  } finally { activeRender = undefined; }
});
handle('review-preview', async (_event, batch: EditBatch) => {
  if (activeRender) throw new Error('A render is already running');
  const candidate = applyBatch(project, batch), revision = project.revision;
  activeRender = new AbortController();
  const size = previewDimensions(project.canvas);
  try {
    if (previewRevision !== revision) {
      const before = join(previewDir, `before-${crypto.randomUUID()}.mp4`);
      await render(project, { ...size, output: before, signal: activeRender.signal });
      previewFile = before; previewRevision = revision;
    }
    const after = join(previewDir, `after-${crypto.randomUUID()}.mp4`);
    await render(candidate, { ...size, output: after, signal: activeRender.signal });
    if (project.revision !== revision) throw new Error('Project changed during review');
    proposalFile = after; proposalId = batch.requestId;
    return { before: `editor-media://preview/current?r=${revision}`, after: `editor-media://proposal/${batch.requestId}` };
  } finally { activeRender = undefined; }
});
handle('export', async () => {
  const result = await dialog.showSaveDialog(window, { defaultPath: `${project.name}.mp4`, filters: [{ name: 'MP4 video', extensions: ['mp4'] }] });
  if (result.canceled || !result.filePath) return { canceled: true };
  return exportTo(result.filePath);
});
handle('cancel-render', () => { activeRender?.abort(); });
handle('quality', () => qualityReport(project));
handle('settings', () => publicSettings());
handle('set-offline', async (_event, offline: boolean) => { settings.offline = Boolean(offline); if (settings.offline) activeAi?.abort(); await saveSettings(); await syncTelemetry(); return publicSettings(); });
handle('set-telemetry', async (_event, enabled: boolean) => {
  if (enabled && !process.env.AI_VIDEO_EDITOR_SENTRY_DSN) throw new Error('No Sentry project DSN is configured in this build');
  settings.telemetry = Boolean(enabled); await saveSettings(); await syncTelemetry(); return publicSettings();
});
handle('test-telemetry', () => { if (!telemetryActive) throw new Error('Diagnostic reporting is off'); Sentry.captureMessage('Opt-in diagnostic test'); return true; });
handle('set-connection', async (_event, input: { endpoint: string; model: string; token?: string; allowUnbounded: boolean }) => {
  activeAi?.abort();
  if (!input.endpoint && !input.model) { const previous = settings.connection; settings.connection = undefined; try { await saveSettings(); } catch (error) { settings.connection = previous; throw error; } return publicSettings(); }
  checkConnection(input.endpoint);
  if (!/^[a-zA-Z0-9._:/-]{1,120}$/.test(input.model)) throw new Error('Enter a valid model ID');
  const previous = settings.connection;
  settings.connection = { endpoint: input.endpoint, model: input.model, token: input.token || settings.connection?.token, allowUnbounded: Boolean(input.allowUnbounded) };
  try { await saveSettings(); } catch (error) { settings.connection = previous; throw error; }
  return publicSettings();
});
handle('ai-propose', (_event, instruction: string) => askModel(instruction));
