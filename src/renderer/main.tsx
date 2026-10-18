import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Asset, Clip, EditBatch, Operation, Project, durationUs, newProject, projectDurationUs, seconds } from '../shared/project';
import './style.css';

type State = { project: Project; projectPath?: string; previewUrl?: string; errors?: string[] };
type Settings = { offline: boolean; telemetry: boolean; telemetryAvailable: boolean; connection?: { endpoint: string; model: string; hasToken: boolean; allowUnbounded: boolean } };
type API = {
  state(): Promise<State>; health(): Promise<{ ready: boolean; message: string }>; newProject(): Promise<State>; importMedia(): Promise<State>; edit(batch: EditBatch): Promise<State>;
  lock(id: string, property: string, enabled: boolean): Promise<State>; undo(): Promise<State>; redo(): Promise<State>; save(as: boolean): Promise<State>; open(): Promise<State>;
  preview(): Promise<State>; exportVideo(): Promise<{ canceled?: boolean; output?: string; duration?: number; width?: number; height?: number }>; cancelRender(): Promise<void>; quality(): Promise<string[]>;
  reviewPreview(batch: EditBatch): Promise<{ before: string; after: string }>;
  settings(): Promise<Settings>; setOffline(value: boolean): Promise<Settings>; setTelemetry(value: boolean): Promise<Settings>; testTelemetry(): Promise<boolean>; setConnection(value: { endpoint: string; model: string; token?: string; allowUnbounded: boolean }): Promise<Settings>;
  propose(instruction: string): Promise<EditBatch>;
};
declare global { interface Window { editor: API } }

const presets: Record<string, [number, number]> = { '16:9': [1280, 720], '9:16': [720, 1280], '1:1': [1080, 1080], '4:5': [864, 1080], '4:3': [1024, 768], '21:9': [1680, 720] };
function isLoopbackEndpoint(endpoint: string) {
  try { return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(endpoint).hostname); }
  catch { return false; }
}
function App() {
  const [state, setState] = useState<State>({ project: newProject() });
  const [selected, setSelected] = useState<string>();
  const [status, setStatus] = useState('Ready');
  const [busy, setBusy] = useState(false);
  const [instruction, setInstruction] = useState('Put these two clips in order, trim one second from the start of the first, add the supplied music at a lower volume, and fade the music out at the end.');
  const [proposal, setProposal] = useState<EditBatch>();
  const [comparison, setComparison] = useState<{ before: string; after: string }>();
  const [showAfter, setShowAfter] = useState(false);
  const [settings, setSettings] = useState<Settings>({ offline: false, telemetry: false, telemetryAvailable: false });
  const [showSettings, setShowSettings] = useState(false);
  const [endpoint, setEndpoint] = useState('http://127.0.0.1:11434/v1');
  const [model, setModel] = useState('');
  const [token, setToken] = useState('');
  const [allowUnbounded, setAllowUnbounded] = useState(false);
  const [report, setReport] = useState<string[]>();
  const [gainDraft, setGainDraft] = useState(1);
  const [fadeDraft, setFadeDraft] = useState('0');
  const pendingDraft = useRef<string | undefined>(undefined);
  const [width, setWidth] = useState(1280), [height, setHeight] = useState(720);
  const project = state.project;
  const clip = [...project.video, ...project.audio].find(c => c.id === selected);
  const asset = clip && project.assets.find(a => a.id === clip.assetId);
  const length = projectDurationUs(project);
  useEffect(() => {
    setGainDraft(clip?.gain ?? 1);
    setFadeDraft(String((clip?.fadeOutUs ?? 0) / 1e6));
    pendingDraft.current = undefined;
  }, [clip?.id, clip?.gain, clip?.fadeOutUs]);
  useEffect(() => {
    void window.editor.state().then(s => { setState(s); setWidth(s.project.canvas.width); setHeight(s.project.canvas.height); });
    void window.editor.settings().then(s => { setSettings(s); if (s.connection) { setEndpoint(s.connection.endpoint); setModel(s.connection.model); setAllowUnbounded(s.connection.allowUnbounded); } });
    void window.editor.health().then(h => { if (!h.ready) setStatus(h.message); });
  }, []);
  async function execute<T>(label: string, fn: () => Promise<T>, after?: (result: T) => void) {
    setBusy(true); setStatus(`${label}…`);
    try { const result = await fn(); after?.(result); setStatus(`${label} complete`); return result; }
    catch (error) { setStatus(`${label}: ${error instanceof Error ? error.message : String(error)}`); }
    finally { setBusy(false); }
  }
  function receive(s: State) { setState(s); setProposal(undefined); setComparison(undefined); setReport(undefined); if (s.errors?.length) setStatus(s.errors.join(' | ')); }
  function edit(operations: Operation[]) { void execute('Edit', () => window.editor.edit({ projectId: project.id, revision: project.revision, requestId: crypto.randomUUID(), operations }), receive); }
  function commitDraft(kind: 'gain' | 'fade', value: number) {
    if (!clip || busy || !Number.isFinite(value)) return;
    const current = kind === 'gain' ? clip.gain : clip.fadeOutUs;
    const next = kind === 'gain' ? value : Math.round(value * 1e6);
    const key = `${clip.id}:${kind}:${next}`;
    if (current === next || pendingDraft.current === key) return;
    pendingDraft.current = key;
    const operations: Operation[] = kind === 'gain'
      ? [{ type: 'setGain', clipId: clip.id, gain: next }]
      : [{ type: 'setFade', clipId: clip.id, fadeOutUs: next }];
    void execute('Edit', () => window.editor.edit({ projectId: project.id, revision: project.revision, requestId: crypto.randomUUID(), operations }), receive)
      .then(result => { if (!result && pendingDraft.current === key) pendingDraft.current = undefined; });
  }
  function setCanvas(w: number, h: number) { setWidth(w); setHeight(h); edit([{ type: 'setCanvas', width: w, height: h }]); }
  function selectedClipCard(c: Clip, track: 'video' | 'audio') {
    const a = project.assets.find(item => item.id === c.assetId);
    return <button key={c.id} className={`timeline-clip ${track} ${selected === c.id ? 'selected' : ''}`} style={{ flexGrow: Math.max(1, durationUs(c) / 1_000_000) }} onClick={() => setSelected(c.id)} title={`${a?.name}: ${seconds(durationUs(c))}s`}>
      <span className="clip-label">{Object.values(c.locks).some(Boolean) ? '▣ ' : ''}{a?.name ?? 'Missing asset'}</span><small>{seconds(durationUs(c))}s</small>
    </button>;
  }
  return <div className="app">
    <header className="topbar">
      <div className="brand"><span className="brand-mark">◩</span><span>AI Video Editor</span><small>0.1</small></div>
      <div className="project-name" title={state.projectPath}>{project.name}<span>{state.projectPath ? 'Saved project' : 'Unsaved project'}</span></div>
      <nav aria-label="Project actions">
        <button disabled={busy} onClick={() => void execute('New project', window.editor.newProject, receive)}>New</button>
        <button disabled={busy} onClick={() => void execute('Open', window.editor.open, receive)}>Open</button>
        <button disabled={busy} onClick={() => void execute('Save', () => window.editor.save(false), setState)}>Save</button>
        <button disabled={busy} onClick={() => void execute('Save as', () => window.editor.save(true), setState)}>Save as</button>
        <button disabled={busy} onClick={() => void execute('Undo', window.editor.undo, receive)}>Undo</button>
        <button disabled={busy} onClick={() => void execute('Redo', window.editor.redo, receive)}>Redo</button>
        <button className="settings-button" onClick={() => setShowSettings(v => !v)}>Settings</button>
      </nav>
    </header>
    <main className="workspace">
      <aside className="library panel">
        <div className="panel-heading"><div><small>PROJECT</small><h2>Media library</h2></div><button className="accent" disabled={busy} onClick={() => void execute('Import', window.editor.importMedia, receive)}>Import media</button></div>
        <p className="hint">Video and audio stay on your computer unless you use an AI connection.</p>
        {project.assets.length === 0 && <div className="empty">Import video clips and a separate audio track to begin.</div>}
        <div className="assets">{project.assets.map(a => <div className="asset" key={a.id}>
          <div className="asset-icon">{a.kind === 'video' ? <img src={`editor-media://thumb/${a.id}`} alt=""/> : 'AUD'}</div><div className="asset-info"><strong title={a.path}>{a.name}</strong><small>{seconds(a.durationUs)}s · {a.kind === 'video' ? `${a.width} × ${a.height}` : `${a.sampleRate ?? '?'} Hz`}</small></div>
          <button disabled={busy} title={`Add ${a.name} to timeline`} aria-label={`Add ${a.name} to timeline`} onClick={() => edit([{ type: 'addClip', assetId: a.id, track: a.kind }])}>Add</button>
        </div>)}</div>
      </aside>
      <section className="center">
        <div className="preview panel">
          <div className="panel-heading"><div><small>CANVAS</small><h2>Preview</h2></div><div className="inline"><span>{project.canvas.width} × {project.canvas.height}</span><button disabled={busy || !project.video.length} onClick={() => void execute('Render preview', window.editor.preview, setState)}>Render preview</button></div></div>
          <div className="monitor" style={{ aspectRatio: `${project.canvas.width}/${project.canvas.height}` }}>
            {(comparison ? (showAfter ? comparison.after : comparison.before) : state.previewUrl) ? <video key={comparison ? (showAfter ? comparison.after : comparison.before) : state.previewUrl} controls src={comparison ? (showAfter ? comparison.after : comparison.before) : state.previewUrl} aria-label={comparison ? (showAfter ? 'Proposed edit preview' : 'Original edit preview') : 'Rendered timeline preview'} /> : <div className="monitor-placeholder"><strong>Canvas preview</strong><span>Render preview to see the exact timeline with audio.</span></div>}
          </div>
          <div className="transport"><span>{seconds(length)}s · 30 fps</span><div className="inline"><button disabled={!busy} onClick={() => void window.editor.cancelRender()}>Cancel render</button><button disabled={busy || !project.video.length} onClick={() => void execute('Pre-export check', window.editor.quality, setReport)}>Check quality</button><button className="accent" disabled={busy || !project.video.length} onClick={() => void execute('Export', window.editor.exportVideo, r => { if (r.output) setStatus(`Exported ${r.output} — ${r.duration}s, ${r.width} × ${r.height}`); })}>Export MP4</button></div></div>
          {report && <div className="report" role="status"><strong>Pre-export report</strong>{report.map((r, i) => <div key={i}>{r}</div>)}</div>}
        </div>
        <div className="timeline panel">
          <div className="panel-heading"><div><small>EDIT</small><h2>Timeline</h2></div><span className="hint">Select a clip for trim, split, protection, and framing</span></div>
          <div className="track"><label>Video</label><div className="track-clips">{project.video.map(c => selectedClipCard(c, 'video'))}</div></div>
          <div className="track"><label>Music / audio</label><div className="track-clips">{project.audio.map(c => selectedClipCard(c, 'audio'))}</div></div>
          <div className="ruler"><span>0:00</span><span>{seconds(length / 2)}s</span><span>{seconds(length)}s</span></div>
          {clip && <div className="clip-editor"><div className="clip-editor-title"><strong>{asset?.name}</strong><span>{seconds(clip.sourceInUs)}s – {seconds(clip.sourceOutUs)}s in source</span></div>
            <div className="controls">
              <button onClick={() => edit([{ type: 'trimClip', clipId: clip.id, sourceInUs: clip.sourceInUs + 1_000_000, sourceOutUs: clip.sourceOutUs }])}>Trim 1s start</button>
              <button onClick={() => edit([{ type: 'trimClip', clipId: clip.id, sourceInUs: clip.sourceInUs, sourceOutUs: clip.sourceOutUs - 1_000_000 }])}>Trim 1s end</button>
              <button onClick={() => edit([{ type: 'splitClip', clipId: clip.id, atUs: Math.floor(durationUs(clip) / 2) }])}>Split in half</button>
              {project.video.some(c => c.id === clip.id) && <><button onClick={() => edit([{ type: 'moveClip', clipId: clip.id, index: Math.max(0, project.video.findIndex(c => c.id === clip.id) - 1) }])}>Move left</button><button onClick={() => edit([{ type: 'moveClip', clipId: clip.id, index: Math.min(project.video.length - 1, project.video.findIndex(c => c.id === clip.id) + 1) }])}>Move right</button></>}
            </div><div className="controls"><label>Gain <input aria-label="Clip gain" type="range" min="0" max="2" step="0.05" disabled={busy} value={gainDraft} onChange={e => setGainDraft(Number(e.target.value))} onPointerUp={e => commitDraft('gain', Number(e.currentTarget.value))} onBlur={e => commitDraft('gain', Number(e.currentTarget.value))} onKeyDown={e => { if (e.key === 'Enter') { commitDraft('gain', Number(e.currentTarget.value)); e.currentTarget.blur(); } }}/>{Math.round(gainDraft * 100)}%</label>
              <label>Fade out (s) <input aria-label="Fade out seconds" type="number" min="0" step="0.25" max={seconds(durationUs(clip))} disabled={busy} value={fadeDraft} onChange={e => setFadeDraft(e.target.value)} onPointerUp={e => commitDraft('fade', Number(e.currentTarget.value))} onBlur={e => commitDraft('fade', Number(e.currentTarget.value))} onKeyDown={e => { if (e.key === 'Enter') { commitDraft('fade', Number(e.currentTarget.value)); e.currentTarget.blur(); } }}/></label>
              <label>Framing <select value={clip.fit} onChange={e => edit([{ type: 'setFit', clipId: clip.id, fit: e.target.value as 'fit' | 'fill' }])}><option value="fit">Fit · show all</option><option value="fill">Fill · crop to canvas</option></select></label>
              <label className="lock"><input type="checkbox" checked={Boolean(clip.locks.content)} onChange={e => void execute('Protect content', () => window.editor.lock(clip.id, 'content', e.target.checked), receive)}/> Protect source content</label>
              <label className="lock"><input type="checkbox" checked={Boolean(clip.locks.position)} onChange={e => void execute('Protect position', () => window.editor.lock(clip.id, 'position', e.target.checked), receive)}/> Protect position</label>
            </div>
          </div>}
        </div>
      </section>
      <aside className="right panel"><div className="panel-heading"><div><small>ASSIST</small><h2>AI editor</h2></div></div>
        <p className="hint">A configured model proposes validated edits. Review the batch before applying it.</p>
        <label htmlFor="instruction">Editing instruction</label><textarea id="instruction" value={instruction} onChange={e => setInstruction(e.target.value)} rows={6}/>
        <button className="accent full" disabled={busy || !settings.connection || settings.offline && !isLoopbackEndpoint(settings.connection.endpoint)} onClick={() => void execute('Request AI edit', () => window.editor.propose(instruction), setProposal)}>Propose edit</button>
        {!settings.connection && <div className="notice">Configure a compatible model endpoint in Settings. Manual editing and export work without AI.</div>}
        {proposal && <div className="proposal"><strong>Proposed batch · {proposal.operations.length} changes</strong><p>Project revision {proposal.revision}. This is not applied yet.</p><ol>{proposal.operations.map((op, i) => <li key={i}>{op.type}: {JSON.stringify(op)}</li>)}</ol><div className="inline"><button disabled={busy} onClick={() => void execute('Render comparison', () => window.editor.reviewPreview(proposal), c => { setComparison(c); setShowAfter(true); })}>Compare previews</button>{comparison && <button onClick={() => setShowAfter(v => !v)}>{showAfter ? 'Show original' : 'Show proposed'}</button>}<button onClick={() => { setProposal(undefined); setComparison(undefined); }}>Reject</button><button className="accent" onClick={() => void execute('Accept AI edit', () => window.editor.edit(proposal), receive)}>Accept batch</button></div></div>}
        <div className="divider"/><div className="panel-heading"><div><small>OUTPUT</small><h2>Canvas</h2></div></div>
        <label>Aspect ratio <select value={Object.entries(presets).find(([, dims]) => dims[0] === project.canvas.width && dims[1] === project.canvas.height)?.[0] ?? 'custom'} onChange={e => { const size = presets[e.target.value]; if (size) setCanvas(...size); }}><option value="custom">Custom</option>{Object.keys(presets).map(k => <option key={k}>{k}</option>)}</select></label>
        <div className="dimensions"><label>Width <input type="number" value={width} min={256} max={3840} step={2} onChange={e => setWidth(Number(e.target.value))}/></label><label>Height <input type="number" value={height} min={256} max={3840} step={2} onChange={e => setHeight(Number(e.target.value))}/></label></div><button disabled={busy} onClick={() => setCanvas(width, height)}>Apply dimensions</button>
        <p className="hint">Ratio and pixel dimensions are saved with the project. Source timing stays unchanged.</p>
      </aside>
    </main>
    <footer role="status"><span className={busy ? 'pulse' : ''}>{status}</span><span>{settings.offline ? 'Offline mode' : settings.connection ? `AI: ${settings.connection.model}` : 'Manual mode'}</span></footer>
    {showSettings && <div className="modal-backdrop" onClick={() => setShowSettings(false)}><section className="modal" role="dialog" aria-modal="true" aria-label="Settings" onClick={e => e.stopPropagation()}><div className="panel-heading"><h2>Settings</h2><button onClick={() => setShowSettings(false)}>Close</button></div>
      <label className="lock"><input type="checkbox" checked={settings.offline} onChange={e => void execute('Offline mode', () => window.editor.setOffline(e.target.checked), setSettings)}/> Offline mode · block external AI requests</label>
      <label className="lock"><input type="checkbox" disabled={!settings.telemetryAvailable} checked={settings.telemetry} onChange={e => void execute('Diagnostic reporting', () => window.editor.setTelemetry(e.target.checked), setSettings)}/> Opt-in minimal Sentry diagnostics {settings.telemetryAvailable ? '' : '· no project configured'}</label>
      {settings.telemetry && <button onClick={() => void execute('Send diagnostic test', window.editor.testTelemetry)}>Send test event</button>}
      <h3>OpenAI-compatible endpoint</h3><p className="hint">Use a local model server or a provider whose endpoint supports chat completions with JSON output. Tokens use OS credential encryption. Remote costs are unknown in this milestone.</p>
      <label>Base URL<input value={endpoint} onChange={e => setEndpoint(e.target.value)} placeholder="https://provider.example/v1"/></label>
      <label>Model ID<input value={model} onChange={e => setModel(e.target.value)} placeholder="Model ID"/></label>
      <label>API token (optional)<input value={token} type="password" onChange={e => setToken(e.target.value)} placeholder={settings.connection?.hasToken ? 'Stored securely; leave blank to keep' : 'Optional for local server'}/></label>
      <label className="lock"><input type="checkbox" checked={allowUnbounded} onChange={e => setAllowUnbounded(e.target.checked)}/> I authorize remote requests with unknown cost. App-wide spending limits are not implemented yet.</label>
      <div className="inline"><button onClick={() => void execute('Disconnect AI', () => window.editor.setConnection({ endpoint: '', model: '', allowUnbounded: false }), setSettings)}>Disconnect</button><button className="accent" onClick={() => void execute('Save connection', () => window.editor.setConnection({ endpoint, model, token, allowUnbounded }), s => { setSettings(s); setToken(''); })}>Save connection</button></div>
    </section></div>}
  </div>;
}
createRoot(document.getElementById('root')!).render(<App/>);
