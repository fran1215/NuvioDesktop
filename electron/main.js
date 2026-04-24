const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const express = require('express');
const http = require('http');

let mainWindow;
let server;

// Create and start the Express server
function startServer() {
  return new Promise((resolve) => {
    const expressApp = express();
    const webBuildPath = path.join(__dirname, '../web-build');

    // Serve static files from web-build
    expressApp.use(express.static(webBuildPath));

    // Fallback to index.html for SPA routing
    expressApp.get('/', (req, res) => {
      res.sendFile(path.join(webBuildPath, 'index.html'));
    });

    server = http.createServer(expressApp);
    server.listen(3000, 'localhost', () => {
      console.log('Electron server running at http://localhost:3000');
      resolve();
    });
  });
}

function createWindow() {
  const FIXED_WINDOW_TITLE = 'Nuvio Desktop';

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '../assets/AppIcons/icon.png'),
    title: FIXED_WINDOW_TITLE,
  });

  // Prevent web document.title changes from altering the native window title.
  mainWindow.on('page-title-updated', (event) => {
    event.preventDefault();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setTitle(FIXED_WINDOW_TITLE);
    }
  });

  // Load from local server
  mainWindow.loadURL('http://localhost:3000');

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App event listeners
app.on('ready', async () => {
  await startServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (server) {
    server.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Menu template
const template = [
  {
    label: 'File',
    submenu: [
      {
        label: 'Exit',
        accelerator: 'CmdOrCtrl+Q',
        click: () => {
          app.quit();
        },
      },
    ],
  },
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
    ],
  },
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' },
    ],
  },
];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);
