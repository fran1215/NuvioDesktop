const { contextBridge } = require('electron');

// Expose a restricted set of APIs to the renderer process
contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  nodeVersion: process.versions.node,
  chromeVersion: process.versions.chrome,
  electronVersion: process.versions.electron,
});
