const { contextBridge, ipcRenderer } = require('electron');

// Expose a restricted set of APIs to the renderer process
contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  nodeVersion: process.versions.node,
  chromeVersion: process.versions.chrome,
  electronVersion: process.versions.electron,
  onResetOnboarding: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('app:reset-onboarding', handler);
    return () => ipcRenderer.removeListener('app:reset-onboarding', handler);
  },
});
