import { app, BrowserWindow } from 'electron';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { setupIpcHandlers } from './filesystem/ipc';
import { fsManager } from './filesystem/manager';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const createWindow = () => {
    const win = new BrowserWindow({
        width: 1024,
        height: 768,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: join(__dirname, '../preload/index.js')
        }
    });

    if (process.env['ELECTRON_RENDERER_URL']) {
        win.loadURL(process.env['ELECTRON_RENDERER_URL']);
    } else {
        win.loadFile(join(__dirname, '../renderer/index.html'));
    }
};

app.whenReady().then(() => {
    fsManager.initialize();
    setupIpcHandlers();
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
