import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isDesktop: true,
  toggleFullscreen: () => ipcRenderer.send('app:toggle-fullscreen'),
  onProjectorMode: (callback) => ipcRenderer.on('app:projector-mode', (_event, value) => callback(value)),
});
