import { ipcMain, dialog, BrowserWindow } from 'electron';
import { fsManager } from './manager';
import { downloadFile } from './downloader';

export function setupIpcHandlers() {
    ipcMain.handle('fs:getFiles', () => {
        return fsManager.getFiles();
    });

    ipcMain.handle('fs:addFile', async (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (!win) return null;

        const result = await dialog.showOpenDialog(win, {
            properties: ['openFile']
        });

        if (!result.canceled && result.filePaths.length > 0) {
            const sourcePath = result.filePaths[0];
            const destName = await fsManager.saveFile(sourcePath);
            return destName;
        }
        return null;
    });

    ipcMain.handle('fs:downloadFile', async (event, url: string, filename?: string) => {
        return await downloadFile(url, filename);
    });

    ipcMain.handle('fs:deleteFile', async (event, filename: string) => {
        await fsManager.deleteFile(filename);
    });
}
