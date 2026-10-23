import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Samvidhan',
    backgroundColor: '#F3ECDD',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(import.meta.dirname, 'preload.js'),
      devTools: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const devUrl = 'http://localhost:5173';
  const asarDist = path.join(app.getAppPath(), 'web/dist/index.html');
  const localDist = path.join(import.meta.dirname, '../web/dist/index.html');
  const siblingDist = path.join(import.meta.dirname, '../../web/dist/index.html');

  const prodPath = fs.existsSync(asarDist)
    ? asarDist
    : fs.existsSync(localDist)
      ? localDist
      : siblingDist;

  if (process.env.ELECTRON_DEV === '1' && !app.isPackaged) {
    mainWindow.loadURL(devUrl).catch(() => {
      mainWindow.loadFile(prodPath);
    });
  } else {
    mainWindow.loadFile(prodPath).catch((err) => {
      console.error('Failed to load local HTML bundle:', err);
      mainWindow.loadURL(devUrl);
    });
  }

  createMenu();
}

function createMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    ...(isMac
      ? [
          {
            label: 'Samvidhan',
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    {
      label: 'Game',
      submenu: [
        {
          label: 'Host Live Game',
          accelerator: 'CmdOrCtrl+H',
          click: () => mainWindow?.webContents.executeJavaScript("window.location.hash = 'host';"),
        },
        {
          label: 'Join Game',
          accelerator: 'CmdOrCtrl+J',
          click: () => mainWindow?.webContents.executeJavaScript("window.location.hash = 'join';"),
        },
        { type: 'separator' },
        {
          label: 'Solo: Learn',
          click: () => mainWindow?.webContents.executeJavaScript("window.location.hash = 'learn';"),
        },
        {
          label: 'Solo: Quiz',
          click: () => mainWindow?.webContents.executeJavaScript("window.location.hash = 'quiz';"),
        },
        {
          label: 'Solo: Spin the Wheel',
          click: () => mainWindow?.webContents.executeJavaScript("window.location.hash = 'wheel';"),
        },
        {
          label: 'Solo: Snakes & Ladders',
          click: () => mainWindow?.webContents.executeJavaScript("window.location.hash = 'snakes';"),
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Present Full Screen (Projector Mode)',
          accelerator: isMac ? 'Ctrl+Cmd+F' : 'F11',
          click: () => {
            if (mainWindow) {
              const isFull = mainWindow.isFullScreen();
              mainWindow.setFullScreen(!isFull);
            }
          },
        },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [{ type: 'separator' }, { role: 'front' }] : [{ role: 'close' }]),
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

ipcMain.on('app:toggle-fullscreen', () => {
  if (mainWindow) {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
