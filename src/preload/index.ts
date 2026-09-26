import { contextBridge, ipcRenderer } from 'electron';

const api = {
    getFiles: () => ipcRenderer.invoke('fs:getFiles'),
    addFile: () => ipcRenderer.invoke('fs:addFile'),
    downloadFile: (url: string, filename?: string) => ipcRenderer.invoke('fs:downloadFile', url, filename),
    deleteFile: (filename: string) => ipcRenderer.invoke('fs:deleteFile', filename)
};

contextBridge.exposeInMainWorld('api', api);

export type ElectronAPI = typeof api;
