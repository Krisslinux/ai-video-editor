import { contextBridge, ipcRenderer } from 'electron';
const invoke = (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args);
contextBridge.exposeInMainWorld('editor', {
  state: () => invoke('state'), health: () => invoke('health'), newProject: () => invoke('new-project'), importMedia: () => invoke('import-media'),
  edit: (batch: unknown) => invoke('edit', batch), lock: (id: string, property: string, value: boolean) => invoke('lock', id, property, value),
  undo: () => invoke('undo'), redo: () => invoke('redo'), save: (as: boolean) => invoke('save', as), open: () => invoke('open'),
  preview: () => invoke('preview'), exportVideo: () => invoke('export'), cancelRender: () => invoke('cancel-render'), quality: () => invoke('quality'),
  reviewPreview: (batch: unknown) => invoke('review-preview', batch),
  settings: () => invoke('settings'), setOffline: (value: boolean) => invoke('set-offline', value), setConnection: (value: unknown) => invoke('set-connection', value),
  setTelemetry: (value: boolean) => invoke('set-telemetry', value), testTelemetry: () => invoke('test-telemetry'),
  propose: (instruction: string) => invoke('ai-propose', instruction)
});
